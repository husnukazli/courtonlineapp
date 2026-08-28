import React, { useState, useMemo, useEffect } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { MatchItem, MatchStatus } from '../../types/tennis';
import { CourtCard } from './CourtCard';
import { FinishedMatchRibbon } from './FinishedMatchRibbon';
import { FinishMatchModal } from './FinishMatchModal';
import { QuickScoreEditModal } from './QuickScoreEditModal';
import { MatchSetupModal } from './MatchSetupModal';
import {
 Smartphone,
 Search,
 Filter,
 CheckCircle2,
 Clock,
 PlayCircle,
 Copy,
 Check,
 Trophy,
 Activity,
 Layers,
 Sparkles,
 RefreshCw,
 Trash2,
 Cloud,
} from 'lucide-react';

export const CourtSupervisorView: React.FC = () => {
 const {
 matches,
 cloudSyncStatus,
 lastCloudSync,
 pullFromCloudNow,
 } = useTennisData();

 const [searchQuery, setSearchQuery] = useState('');
 const [selectedCourt, setSelectedCourt] = useState<string>('KORT 1');
 const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'FINISHED'>('ALL');

 const [finishModalMatch, setFinishModalMatch] = useState<MatchItem | null>(null);
 const [editScoreModalMatch, setEditScoreModalMatch] = useState<MatchItem | null>(null);
 const [setupModalMatch, setSetupModalMatch] = useState<MatchItem | null>(null);
 const [copiedReport, setCopiedReport] = useState(false);
 const [isSyncing, setIsSyncing] = useState(false);
 const [syncStatusMsg, setSyncStatusMsg] = useState('');

 const uniqueCourts = useMemo(() => {
 const set = new Set<string>();
 matches.forEach((m) => {
 if (m.Kort) set.add(m.Kort);
 });
 return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
 }, [matches]);

 useEffect(() => {
 if (uniqueCourts.length > 0 && selectedCourt !== 'ALL' && !uniqueCourts.includes(selectedCourt)) {
 setSelectedCourt(uniqueCourts[0]);
 }
 }, [uniqueCourts, selectedCourt]);

 const liveMatchesCount = matches.filter((m) => m.Durum === 'Oynaniyor').length;
 const finishedMatchesCount = matches.filter((m) =>
 ['Bitti', 'Retired', 'Walkover'].includes(m.Durum)
 ).length;
 const upcomingMatchesCount = matches.filter((m) => m.Durum === 'Baslamadi').length;

 const filteredMatches = useMemo(() => {
 return matches.filter((m) => {
 if (selectedCourt !== 'ALL' && m.Kort !== selectedCourt) {
 return false;
 }

 if (statusFilter === 'LIVE' && m.Durum !== 'Oynaniyor') return false;
 if (statusFilter === 'UPCOMING' && m.Durum !== 'Baslamadi') return false;
 if (
 statusFilter === 'FINISHED' &&
 !['Bitti', 'Retired', 'Walkover'].includes(m.Durum)
 ) {
 return false;
 }

 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase().trim();
 const p1 = (m['Oyuncu 1'] || '').toLowerCase();
 const p2 = (m['Oyuncu 2'] || '').toLowerCase();
 const cat = (m.Kategori || '').toLowerCase();
 const court = (m.Kort || '').toLowerCase();
 if (!p1.includes(q) && !p2.includes(q) && !cat.includes(q) && !court.includes(q)) {
 return false;
 }
 }

 return true;
 });
 }, [matches, selectedCourt, statusFilter, searchQuery]);

 const liveMatches = useMemo(
 () => filteredMatches.filter((m) => m.Durum === 'Oynaniyor'),
 [filteredMatches]
 );
 const upcomingMatches = useMemo(
 () => filteredMatches.filter((m) => m.Durum === 'Baslamadi'),
 [filteredMatches]
 );
 const finishedMatches = useMemo(
 () => filteredMatches.filter((m) => ['Bitti', 'Retired', 'Walkover'].includes(m.Durum)),
 [filteredMatches]
 );

 const handleCopyReport = () => {
 const completedMatches = matches.filter((m) =>
 ['Bitti', 'Retired', 'Walkover'].includes(m.Durum)
 );

 let reportText = `🎾 TURNUVA MAÇ SONUÇLARI (CourtOnline)\n`;
 reportText += `Tarih: ${new Date().toLocaleDateString('tr-TR')} • ${completedMatches.length}/${matches.length} Maç Tamamlandı\n`;
 reportText += `----------------------------------------\n`;

 completedMatches.forEach((m) => {
 const winner = m.Kazanan || 'Bilinmiyor';
 const loser =
 winner === m['Oyuncu 1'] ? m['Oyuncu 2'] : m['Oyuncu 1'];
 reportText += `• ${m.Kort} | ${winner} d. ${loser} | ${m.Skor} (${m.Kategori})\n`;
 });

 if (completedMatches.length === 0) {
 reportText += `Henüz tamamlanan maç bulunmamaktadır.\n`;
 }

 navigator.clipboard.writeText(reportText);
 setCopiedReport(true);
 setTimeout(() => setCopiedReport(false), 2500);
 };

 return (
 <div className="space-y-6 pb-14">
 <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border border-emerald-500/30 rounded-3xl p-3.5 sm:p-4 shadow-lg">
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
 <Cloud className={`w-5 h-5 ${isSyncing ? 'animate-bounce' : ''}`} />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="font-extrabold text-xs sm:text-sm text-white">Canlı Bulut Senkronizasyonu</span>
 <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
 {cloudSyncStatus === 'connected' ? 'Bağlı' : cloudSyncStatus === 'syncing' ? 'Eşitleniyor...' : 'Çevrimdışı'}
 </span>
 </div>
 <p className="text-[11px] text-slate-400">
 {lastCloudSync ? `Son canlı güncelleme: ${lastCloudSync}` : 'Masaüstü ve hakem telefonları canlı bağlı.'}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 disabled={isSyncing}
 onClick={async () => {
 setIsSyncing(true);
 setSyncStatusMsg('');
 const success = await pullFromCloudNow();
 setIsSyncing(false);
 if (success) {
 setSyncStatusMsg('✅ Buluttaki en son turnuva maçları başarıyla telefonunuza yüklendi!');
 } else {
 setSyncStatusMsg('⚠️ Buluttan veri çekilemedi. İnternet bağlantınızı kontrol edin.');
 }
 setTimeout(() => setSyncStatusMsg(''), 4000);
 }}
 className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow transition active:scale-95 disabled:opacity-50"
 >
 <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
 <span>Buluttan Son Verileri Çek</span>
 </button>
 </div>
 </div>

 {syncStatusMsg && (
 <div className="mt-2.5 p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold shadow-lg animate-in fade-in flex items-center justify-between">
 <span>{syncStatusMsg}</span>
 <button onClick={() => setSyncStatusMsg('')} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
 </div>
 )}
 </div>

 <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight flex items-center gap-2">
 <span>🎾 Kort & Hakem Masası</span>
 {selectedCourt !== 'ALL' && (
 <span className="px-2.5 py-0.5 rounded-full bg-lime-400 text-slate-950 text-xs font-black shadow-sm shadow-lime-400/20">
 {selectedCourt}
 </span>
 )}
 </h1>
 <p className="text-xs text-slate-400 mt-0.5">
 İstediğiniz kortu seçin. Sadece o kortun maçları açılır. Bitmiş maçlar bant halinde listelenir.
 </p>
 </div>

 <div className="flex items-center gap-2 shrink-0 flex-wrap">
 <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold">
 <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
 <span className="text-emerald-400">{liveMatchesCount} Oynanıyor</span>
 </div>

 <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold">
 <span className="w-2 h-2 rounded-full bg-amber-400"></span>
 <span className="text-amber-400">{upcomingMatchesCount} Başlamadı</span>
 </div>

 <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold">
 <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
 <span className="text-cyan-400">{finishedMatchesCount} Bitti</span>
 </div>

 <button
 onClick={handleCopyReport}
 className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
 title="Sonuç raporunu kopyala"
 >
 {copiedReport ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
 <span>{copiedReport ? 'Kopyalandı' : 'Rapor'}</span>
 </button>
 </div>
 </div>

 <div className="pt-2 border-t border-slate-800/80">
 <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
 <Filter className="w-3.5 h-3.5 text-lime-400" />
 <span>Kort Seçiniz (Yalnızca Seçili Kort Gösterilir):</span>
 </div>

 <div className="flex items-center gap-2 overflow-x-auto pb-1">
 {uniqueCourts.map((court) => {
 const courtMatches = matches.filter((m) => m.Kort === court);
 const hasLive = courtMatches.some((m) => m.Durum === 'Oynaniyor');
 const isSelected = selectedCourt === court;

 return (
 <button
 key={court}
 type="button"
 onClick={() => setSelectedCourt(court)}
 className={`px-4 sm:px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition shrink-0 flex items-center gap-2.5 border ${
 isSelected
 ? 'bg-gradient-to-r from-lime-400 to-emerald-400 text-slate-950 border-lime-400 shadow-lg shadow-lime-400/25 scale-[1.02]'
 : hasLive
 ? 'bg-slate-950 hover:bg-slate-800 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
 : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
 }`}
 >
 {hasLive && (
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
 )}
 <span>{court}</span>
 <span
 className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
 isSelected ? 'bg-slate-950 text-lime-400' : 'bg-slate-800 text-slate-400'
 }`}
 >
 {courtMatches.length} Maç
 </span>
 </button>
 );
 })}

 <button
 type="button"
 onClick={() => setSelectedCourt('ALL')}
 className={`px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition shrink-0 flex items-center gap-2 border ${
 selectedCourt === 'ALL'
 ? 'bg-slate-800 text-white border-slate-600 shadow'
 : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
 }`}
 >
 <span>Tüm Kortlar</span>
 <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-slate-400">
 {matches.length}
 </span>
 </button>
 </div>
 </div>

 <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto text-xs">
 <button
 onClick={() => setStatusFilter('ALL')}
 className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
 statusFilter === 'ALL'
 ? 'bg-slate-800 text-white shadow'
 : 'text-slate-400 hover:text-slate-200'
 }`}
 >
 Tümü ({selectedCourt === 'ALL' ? matches.length : matches.filter(m => m.Kort === selectedCourt).length})
 </button>

 <button
 onClick={() => setStatusFilter('LIVE')}
 className={`px-3 py-1.5 rounded-xl font-black transition shrink-0 flex items-center gap-1.5 ${
 statusFilter === 'LIVE'
 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
 : 'text-emerald-400 hover:bg-slate-900'
 }`}
 >
 <span className={`w-2 h-2 rounded-full ${statusFilter === 'LIVE' ? 'bg-slate-950' : 'bg-emerald-400 animate-pulse'}`}></span>
 <span>Oynanıyor ({liveMatches.length})</span>
 </button>

 <button
 onClick={() => setStatusFilter('UPCOMING')}
 className={`px-3 py-1.5 rounded-xl font-black transition shrink-0 flex items-center gap-1.5 ${
 statusFilter === 'UPCOMING'
 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
 : 'text-amber-400 hover:bg-slate-900'
 }`}
 >
 <Clock className="w-3.5 h-3.5" />
 <span>Başlamadı ({upcomingMatches.length})</span>
 </button>

 <button
 onClick={() => setStatusFilter('FINISHED')}
 className={`px-3 py-1.5 rounded-xl font-black transition shrink-0 flex items-center gap-1.5 ${
 statusFilter === 'FINISHED'
 ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
 : 'text-cyan-400 hover:bg-slate-900'
 }`}
 >
 <CheckCircle2 className="w-3.5 h-3.5" />
 <span>Bitti ({finishedMatches.length})</span>
 </button>
 </div>

 <div className="relative flex-1 max-w-xs">
 <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 placeholder="Oyuncu veya kategori ara..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-400"
 />
 </div>
 </div>
 </div>

 {filteredMatches.length === 0 ? (
 <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
 <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-xl">
 🎾
 </div>
 <h3 className="font-bold text-white text-base">Bu Kortta Eşleşen Maç Bulunamadı</h3>
 <p className="text-xs text-slate-400 max-w-sm mx-auto">
 {selectedCourt !== 'ALL' ? `${selectedCourt} için seçili filtrede maç bulunmuyor.` : 'Filtreleri sıfırlayabilirsiniz.'}
 </p>
 <button
 onClick={() => {
 setStatusFilter('ALL');
 setSearchQuery('');
 }}
 className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
 >
 Filtreleri Temizle
 </button>
 </div>
 ) : (
 <div className="space-y-6">
 {liveMatches.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
 <span>Canlı Oynanan Maçlar ({liveMatches.length})</span>
 </h2>
 <span className="text-[11px] text-slate-400">Skor girmek için doğrudan kartı kullanın</span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
 {liveMatches.map((match) => (
 <CourtCard
 key={match.id}
 match={match}
 onFinishMatch={(m) => setFinishModalMatch(m)}
 onEditScore={(m) => setEditScoreModalMatch(m)}
 onOpenSetup={(m) => setSetupModalMatch(m)}
 />
 ))}
 </div>
 </div>
 )}

 {upcomingMatches.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
 <Clock className="w-4 h-4 text-amber-400" />
 <span>Sıradaki / Başlamamış Maçlar ({upcomingMatches.length})</span>
 </h2>
 <span className="text-[11px] text-slate-400">Kura ve saha seçimi yapıp başlatabilirsiniz</span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
 {upcomingMatches.map((match) => (
 <CourtCard
 key={match.id}
 match={match}
 onFinishMatch={(m) => setFinishModalMatch(m)}
 onEditScore={(m) => setEditScoreModalMatch(m)}
 onOpenSetup={(m) => setSetupModalMatch(m)}
 />
 ))}
 </div>
 </div>
 )}

 {finishedMatches.length > 0 && (
 <div className="space-y-3 pt-2">
 <div className="flex items-center justify-between">
 <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
 <CheckCircle2 className="w-4 h-4 text-cyan-400" />
 <span>Tamamlanan Maçlar ({finishedMatches.length})</span>
 </h2>
 <span className="text-[11px] text-slate-400">Skoru düzeltmek için şeride tıklayın</span>
 </div>

 <div className="space-y-2.5">
 {finishedMatches.map((match) => (
 <FinishedMatchRibbon
 key={match.id}
 match={match}
 onClick={(m) => setEditScoreModalMatch(m)}
 />
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 <MatchSetupModal
 match={setupModalMatch}
 isOpen={Boolean(setupModalMatch)}
 onClose={() => setSetupModalMatch(null)}
 onStartMatch={(matchId) => {
 const started = matches.find((m) => m.id === matchId);
 if (started) {
 setEditScoreModalMatch(started);
 }
 }}
 />

 <FinishMatchModal
 match={finishModalMatch}
 isOpen={Boolean(finishModalMatch)}
 onClose={() => setFinishModalMatch(null)}
 />

 <QuickScoreEditModal
 match={editScoreModalMatch}
 isOpen={Boolean(editScoreModalMatch)}
 onClose={() => setEditScoreModalMatch(null)}
 />
 </div>
 );
};
