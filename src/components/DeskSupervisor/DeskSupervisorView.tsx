import React, { useState } from 'react';
import {
 Tv, Filter, Search, ZoomIn, ZoomOut, RefreshCw, Plus, Trash2, CheckCircle2,
 Clock, Award, Layers, Users, FileSpreadsheet, Download, Upload, AlertCircle,
 Eye, Lock, KeyRound, ShieldCheck, FileText
} from 'lucide-react';
import { useTennisData } from '../../context/TennisDataContext';
import { MatchItem, ScoreFormatType } from '../../types/tennis';
import { MatchDetailModal } from '../Common/MatchDetailModal';
import { MatchLiveTimer } from '../Common/MatchLiveTimer';

const SCORE_FORMAT_OPTIONS: ScoreFormatType[] = [
 '3 Normal Set',
 '3 Kısa Set',
 '2 Normal Set, 3. Set 10 Puanlık Maç Tie-Break',
 '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
 '2 Kısa Set, 3. Set 7 Puanlık Maç Tie-Break',
];

export const DeskSupervisorView: React.FC = () => {
 const {
 matches, referees, categoryFormats, deskPin, cloudSyncStatus, lastCloudSync,
 tournamentNotice, updateTournamentNotice, updateDeskPin, addReferee, deleteReferee,
 bulkApplyCategoryFormats, importMatchesList, resetTournamentToDefault, resetAllScores,
 forcePushAllToCloud, pullFromCloudNow, clearLocalCacheAndResetFromCloud,
 } = useTennisData();

 const [activeSubTab, setActiveSubTab] = useState<'grid' | 'stats' | 'formats' | 'referees' | 'manage'>('grid');
 const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('ALL');
 const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
 const [searchQuery, setSearchQuery] = useState<string>('');
 
 const [zoomLevel, setZoomLevel] = useState<number>(100);
 const [selectedMatchForModal, setSelectedMatchForModal] = useState<MatchItem | null>(null);

 const [newRefName, setNewRefName] = useState<string>('');
 const [newRefPin, setNewRefPin] = useState<string>('');

 const [editingDeskPin, setEditingDeskPin] = useState<string>(deskPin);
 const [deskPinSuccessMsg, setDeskPinSuccessMsg] = useState<string>('');

 const [localFormats, setLocalFormats] = useState<Record<string, string>>(() => categoryFormats);
 const [formatSavedMsg, setFormatSavedMsg] = useState<string>('');

 const [noticeInput, setNoticeInput] = useState<string>(tournamentNotice);
 const [noticeSuccessMsg, setNoticeSuccessMsg] = useState<string>('');

 const [jsonInput, setJsonInput] = useState<string>('');
 const [importMsg, setImportMsg] = useState<string>('');
 const [isSyncingAction, setIsSyncingAction] = useState(false);

 const distinctCourts = Array.from(new Set(matches.map((m) => m.Kort))).sort();
 const distinctCategories = Array.from(new Set(matches.map((m) => m.Kategori).filter(Boolean))).sort();

 const totalMatches = matches.length;
 const finishedMatches = matches.filter((m) => ['Bitti', 'Retired', 'Walkover'].includes(m.Durum)).length;
 const liveMatches = matches.filter((m) => m.Durum === 'Oynaniyor').length;
 const pendingMatches = matches.filter((m) => m.Durum === 'Baslamadi').length;
 const completionRate = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;

 const filteredMatches = matches.filter((m) => {
 if (selectedCourtFilter !== 'ALL' && m.Kort !== selectedCourtFilter) return false;
 if (selectedStatusFilter !== 'ALL' && m.Durum !== selectedStatusFilter) return false;
 if (searchQuery.trim()) {
  const q = searchQuery.toLowerCase();
  const p1 = m['Oyuncu 1'].toLowerCase();
  const p2 = m['Oyuncu 2'].toLowerCase();
  const kat = m.Kategori.toLowerCase();
  const ref = m.Son_Hakem.toLowerCase();
  return p1.includes(q) || p2.includes(q) || kat.includes(q) || ref.includes(q);
 }
 return true;
 });

 const handleApplyFormats = () => {
 bulkApplyCategoryFormats(localFormats);
 setFormatSavedMsg('✅ Kategori formatları tüm maçlara başarıyla uygulandı!');
 setTimeout(() => setFormatSavedMsg(''), 3000);
 };

 const handleAddRefereeSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newRefName.trim() || !newRefPin.trim()) return;
 addReferee(newRefName.trim(), newRefPin.trim());
 setNewRefName('');
 setNewRefPin('');
 };

 const handleSaveNoticeSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 updateTournamentNotice(noticeInput.trim());
 setNoticeSuccessMsg('✅ Canlı izleyici dipnotu başarıyla güncellendi!');
 setTimeout(() => setNoticeSuccessMsg(''), 3500);
 };

 const handleExportJson = () => {
 const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(matches, null, 2));
 const downloadAnchor = document.createElement('a');
 downloadAnchor.setAttribute('href', dataStr);
 downloadAnchor.setAttribute('download', `courtonline_mac_programi_${new Date().toISOString().slice(0, 10)}.json`);
 document.body.appendChild(downloadAnchor);
 downloadAnchor.click();
 downloadAnchor.remove();
 };

 const handleImportJson = () => {
 try {
  const parsed = JSON.parse(jsonInput);
  if (Array.isArray(parsed) && parsed.length > 0) {
  importMatchesList(parsed);
  setImportMsg(`✅ ${parsed.length} maç başarıyla içe aktarıldı!`);
  setJsonInput('');
  setTimeout(() => setImportMsg(''), 3000);
  } else {
  setImportMsg('❌ JSON geçerli bir maç dizisi [ { ... } ] olmalıdır.');
  }
 } catch (e: any) {
  setImportMsg('❌ Geçersiz JSON formatı: ' + e.message);
 }
 };

 const handleAbsoluteReset = async () => {
 if (confirm('KRİTİK UYARI: Önbellek ve buluttaki tüm maç geçmişi kökten silinecektir! Emin misiniz?')) {
  setIsSyncingAction(true);
  await clearLocalCacheAndResetFromCloud();
  setIsSyncingAction(false);
  setImportMsg('✨ Tüm turnuva geçmişi ve bulut başarıyla temizlendi!');
  setTimeout(() => setImportMsg(''), 4000);
 }
 };

 return (
 <div className="max-w-7xl mx-auto space-y-6 overflow-hidden">
 <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
  <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
  <button type="button" onClick={() => setActiveSubTab('grid')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'grid' ? 'bg-cyan-400 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}>
   <Tv className="w-3.5 h-3.5" /><span>Canlı Kortlar Akışı</span>
  </button>
  <button type="button" onClick={() => setActiveSubTab('stats')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'stats' ? 'bg-cyan-400 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}>
   <Award className="w-3.5 h-3.5" /><span>Turnuva İstatistikleri</span>
  </button>
  <button type="button" onClick={() => setActiveSubTab('formats')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'formats' ? 'bg-cyan-400 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}>
   <Layers className="w-3.5 h-3.5" /><span>Format Hafızası</span>
  </button>
  <button type="button" onClick={() => setActiveSubTab('referees')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'referees' ? 'bg-cyan-400 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}>
   <Users className="w-3.5 h-3.5" /><span>Hakem & Dipnot Yönetimi</span>
  </button>
  <button type="button" onClick={() => setActiveSubTab('manage')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'manage' ? 'bg-cyan-400 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}>
   <FileSpreadsheet className="w-3.5 h-3.5" /><span>Program & JSON</span>
  </button>
  </div>

  <div className="flex items-center gap-2 text-xs font-mono">
  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold">{liveMatches} Canlı</span>
  <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-bold">%{completionRate} Bitti</span>
  <button type="button" onClick={handleExportJson} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Yedek JSON İndir">
   <Download className="w-4 h-4" />
  </button>
  </div>
 </div>

 {activeSubTab === 'grid' && (
  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
  <div className="flex flex-wrap items-center gap-2">
   <div className="relative">
   <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Oyuncu veya hakem ara..." className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 w-44 sm:w-56 focus:outline-none focus:border-cyan-400" />
   <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
   </div>
   <select value={selectedCourtFilter} onChange={(e) => setSelectedCourtFilter(e.target.value)} className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400">
   <option value="ALL">Tüm Kortlar ({distinctCourts.length})</option>
   {distinctCourts.map((c) => (<option key={c} value={c}>{c}</option>))}
   </select>
   <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400">
   <option value="ALL">Tüm Durumlar</option>
   <option value="Oynaniyor">Devam Edenler (Canlı)</option>
   <option value="Baslamadi">Başlamayanlar</option>
   <option value="Bitti">Bitenler</option>
   </select>
  </div>
  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800">
   <ZoomOut className="w-4 h-4 text-cyan-400" />
   <input type="range" min="40" max="150" step="5" value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} className="w-24 sm:w-32 accent-cyan-400 cursor-pointer" />
   <ZoomIn className="w-4 h-4 text-cyan-400" />
   <span className="font-mono text-[12px] w-10 text-right font-black text-cyan-400">%{zoomLevel}</span>
  </div>
  </div>
 )}
 </div>

 {activeSubTab === 'grid' && (
  <div className="w-full overflow-x-auto pb-6">
  <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', minWidth: 'min-content' }} className="transition-transform duration-150 p-2">
   <div className="flex flex-nowrap gap-4">
   {(selectedCourtFilter === 'ALL' ? distinctCourts : [selectedCourtFilter]).map((courtName) => {
   const courtMatches = filteredMatches.filter((m) => m.Kort === courtName);

   return (
   <div key={courtName} className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 space-y-3 flex flex-col shadow-xl min-w-[280px] w-[300px]">
    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
    <div className="flex items-center gap-2">
     <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
     <h3 className="font-extrabold text-sm text-white tracking-wide">{courtName}</h3>
    </div>
    <span className="text-[11px] font-mono text-slate-400 font-bold px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">{courtMatches.length} Maç</span>
    </div>

    <div className="space-y-2.5 flex-1">
    {courtMatches.length > 0 ? (
     courtMatches.map((m) => {
     const isLive = m.Durum === 'Oynaniyor';
     const isFinished = ['Bitti', 'Retired', 'Walkover'].includes(m.Durum);
     const state = m.detailedState;

     return (
     <div key={m.id} onClick={() => setSelectedMatchForModal(m)} className={`p-3 rounded-2xl border transition cursor-pointer relative overflow-hidden group hover:scale-[1.02] ${isLive ? 'bg-slate-950 border-l-4 border-l-emerald-400 border-emerald-500/40 shadow-lg ring-1 ring-emerald-500/20' : isFinished ? 'bg-slate-950/70 border-l-4 border-l-cyan-500 border-slate-800' : 'bg-slate-950/50 border-l-4 border-l-slate-700 border-slate-800/80'}`}>
      <div className="flex items-center justify-between text-[10px] font-bold mb-1.5 gap-1">
      <span className="text-amber-400 font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{m.Saat}</span>
      </div>
      <div className="text-xs font-bold text-white">{m['Oyuncu 1']} vs {m['Oyuncu 2']}</div>
      <div className="text-[10px] text-slate-500 mt-1">Skor: {m.Skor}</div>
     </div>
     );
     })
    ) : (
     <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">Bu kortta maç bulunamadı.</div>
    )}
    </div>
   </div>
   );
   })}
   </div>
  </div>
  </div>
 )}

 {activeSubTab === 'referees' && (
  <div className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
   <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
   <h3 className="font-bold text-base text-white">Yeni Saha Hakemi Ekle</h3>
   <form onSubmit={handleAddRefereeSubmit} className="space-y-4">
    <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hakem Adı</label><input type="text" value={newRefName} onChange={(e) => setNewRefName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400" /></div>
    <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Giriş PIN</label><input type="text" maxLength={6} value={newRefPin} onChange={(e) => setNewRefPin(e.target.value)} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none" /></div>
    <button type="submit" className="w-full py-3 bg-cyan-400 text-slate-950 font-bold rounded-xl">Hakemi Kaydet</button>
   </form>
   </div>
   <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
   <h3 className="font-bold text-base text-white">Kayıtlı Saha Hakemleri ({referees.length})</h3>
   <div className="space-y-2 max-h-52 overflow-y-auto">
    {referees.map((ref) => (
    <div key={ref.name} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
     <div><div className="font-bold text-sm text-slate-200">{ref.name}</div></div>
     <button type="button" onClick={() => deleteReferee(ref.name)} className="p-2 text-slate-500 hover:text-rose-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
    </div>
    ))}
   </div>
   </div>
  </div>

  {/* ── DİNAMİK DİPNOT EDİTÖRÜ ── */}
  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
   <div className="flex items-center gap-3">
   <div className="w-10 h-10 rounded-2xl bg-cyan-400/12 text-cyan-400 border border-cyan-400/20 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
   <div>
    <h3 className="font-black text-base text-white">Canlı İzleyici Panosu Dipnot Mesajı</h3>
    <p className="text-xs text-slate-400 mt-0.5">Ekranın en altında dipnot şeklinde listelenecek açıklama notunu canlı olarak yayınlayın.</p>
   </div>
   </div>
   {noticeSuccessMsg && <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold">{noticeSuccessMsg}</div>}
   <form onSubmit={handleSaveNoticeSubmit} className="space-y-3 pt-1">
   <textarea value={noticeInput} onChange={(e) => setNoticeInput(e.target.value)} rows={3} placeholder="Duyuru giriniz..." className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-400" />
   <div className="flex justify-end"><button type="submit" className="px-6 py-2.5 bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow transition uppercase">Canlı Yayınla</button></div>
   </form>
  </div>
  </div>
 )}

 {activeSubTab === 'manage' && (
  <div className="space-y-6">
  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
   <textarea rows={8} value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none" />
   <div className="flex justify-between items-center">
   <button type="button" disabled={isSyncingAction} onClick={handleAbsoluteReset} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs">Tüm Turnuvayı Sıfırla</button>
   <button type="button" onClick={handleImportJson} disabled={!jsonInput.trim() || isSyncingAction} className="px-6 py-2.5 bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl uppercase">JSON Yükle</button>
   </div>
  </div>
  </div>
 )}

 <MatchDetailModal match={selectedMatchForModal} onClose={() => setSelectedMatchForModal(null)} />
 </div>
 );
};
