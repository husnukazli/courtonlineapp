import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const isLiveMatch = (status?: string) => ['oynaniyor', 'duraklatildi'].includes((status || '').toLowerCase().trim());
const isFinishedMatch = (status?: string) => ['bitti', 'retired', 'walkover'].includes((status || '').toLowerCase().trim());
const isUpcomingMatch = (status?: string) => ['baslamadi'].includes((status || '').toLowerCase().trim());

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

  // Kaydırma (Swipe) ve Mıknatıs (Snap) Referansları
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pillsContainerRef = useRef<HTMLDivElement>(null);
  const courtRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const uniqueCourts = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.Kort) set.add(m.Kort);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [matches]);

  useEffect(() => {
    if (uniqueCourts.length > 0 && !uniqueCourts.includes(selectedCourt)) {
      setSelectedCourt(uniqueCourts[0]);
    }
  }, [uniqueCourts, selectedCourt]);

  // Kaydırma Sensörü (Intersection Observer)
  // Ekranın %60'ına hangi kort girdiyse, üst menüyü ona göre günceller
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const courtId = entry.target.getAttribute('data-court-id');
            if (courtId) {
              setSelectedCourt(courtId);
              // Üstteki hap (pill) menüsünü de aktif korta doğru kaydır
              const pillElement = document.getElementById(`pill-${courtId}`);
              if (pillElement && pillsContainerRef.current) {
                pillElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.6, // Kort ekranın %60'ını kapladığında tetiklenir
      }
    );

    Object.values(courtRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [uniqueCourts]);

  const liveMatchesCount = matches.filter((m) => isLiveMatch(m.Durum)).length;
  const finishedMatchesCount = matches.filter((m) => isFinishedMatch(m.Durum)).length;
  const upcomingMatchesCount = matches.filter((m) => isUpcomingMatch(m.Durum)).length;

  // ARTIK KORT FİLTRESİ YOK: Çünkü tüm kortlar yan yana dizili
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (statusFilter === 'LIVE' && !isLiveMatch(m.Durum)) return false;
      if (statusFilter === 'UPCOMING' && !isUpcomingMatch(m.Durum)) return false;
      if (statusFilter === 'FINISHED' && !isFinishedMatch(m.Durum)) return false;

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
    }).sort((a, b) => (a.Saat || '').localeCompare(b.Saat || '')); 
  }, [matches, statusFilter, searchQuery]);

  const liveMatches = useMemo(() => filteredMatches.filter((m) => isLiveMatch(m.Durum)), [filteredMatches]);
  const upcomingMatches = useMemo(() => filteredMatches.filter((m) => isUpcomingMatch(m.Durum)), [filteredMatches]);
  const finishedMatches = useMemo(() => filteredMatches.filter((m) => isFinishedMatch(m.Durum)), [filteredMatches]);

  const handleCopyReport = () => {
    const completedMatches = matches.filter((m) => isFinishedMatch(m.Durum));

    let reportText = `🎾 TURNUVA MAÇ SONUÇLARI (CourtOnline)\n`;
    reportText += `Tarih: ${new Date().toLocaleDateString('tr-TR')} • ${completedMatches.length}/${matches.length} Maç Tamamlandı\n`;
    reportText += `----------------------------------------\n`;

    completedMatches.forEach((m) => {
      const winner = m.Kazanan || 'Bilinmiyor';
      const loser = winner === m['Oyuncu 1'] ? m['Oyuncu 2'] : m['Oyuncu 1'];
      const statusNote = ['retired', 'walkover'].includes((m.Durum || '').toLowerCase().trim()) ? ` [${m.Durum.toUpperCase()}]` : '';
      reportText += `• ${m.Kort} | ${winner} d. ${loser} | ${m.Skor}${statusNote} (${m.Kategori})\n`;
    });

    if (completedMatches.length === 0) {
      reportText += `Henüz tamamlanan maç bulunmamaktadır.\n`;
    }

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Butona tıklandığında ilgili korta pürüzsüzce kaydır
  const handleCourtSelect = (court: string) => {
    setSelectedCourt(court);
    const el = courtRefs.current[court];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className="space-y-4 pb-14">
      
      {/* Kaydırma çubuklarını gizleyen sihirli CSS */}
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border border-emerald-500/30 rounded-3xl p-3.5 sm:p-4 shadow-lg mx-3 sm:mx-0 mt-3 sm:mt-0">
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
                {lastCloudSync ? `Son güncelleme: ${lastCloudSync}` : 'Masaüstü ve hakem telefonları canlı bağlı.'}
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
              <span>Son Verileri Çek</span>
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

      <div className="bg-slate-900 border-y sm:border border-slate-800 sm:rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight flex items-center gap-2">
              <span>🎾 Kort & Hakem Masası</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" />
              Kortlar arası geçiş yapmak için sağa/sola kaydırın
              <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400">{liveMatchesCount} Canlı / Askıda</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-amber-400">{upcomingMatchesCount} Başlamadı</span>
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

        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tümü ({matches.length})
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
              <span>Canlı / Askıda</span>
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
              <span>Başlamadı</span>
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
              <span>Bitti / Hükmen</span>
            </button>
          </div>

          <div className="relative flex-1 max-w-xs shrink-0">
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

      {/* YENİ: KORT SEÇİM HAPLARI (PILLS) */}
      <div className="px-3 sm:px-0">
        <div 
          ref={pillsContainerRef}
          className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth"
        >
          {uniqueCourts.map((court) => {
            const courtMatches = matches.filter((m) => m.Kort === court);
            const hasLive = courtMatches.some((m) => isLiveMatch(m.Durum));
            const isSelected = selectedCourt === court;

            return (
              <button
                key={court}
                id={`pill-${court}`}
                type="button"
                onClick={() => handleCourtSelect(court)}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs transition shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-lime-400 to-emerald-400 text-slate-950 border-lime-400 shadow-lg shadow-lime-400/25 scale-[1.02]'
                    : hasLive
                    ? 'bg-slate-950 hover:bg-slate-800 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 shadow-sm'
                }`}
              >
                {hasLive && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                )}
                <span>{court}</span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    isSelected ? 'bg-slate-950/80 text-lime-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {courtMatches.length} Maç
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* YENİ: KAYDIRILABİLİR (SWIPE) KORT KONTEYNERİ */}
      <div 
        ref={scrollContainerRef}
        className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory scroll-smooth w-full no-scrollbar pb-6"
      >
        {uniqueCourts.map((courtName) => {
          // Bu korta ait ve filtrelere uyan maçlar
          const courtMatches = filteredMatches.filter((m) => m.Kort === courtName);
          
          const courtLive = courtMatches.filter((m) => isLiveMatch(m.Durum));
          const courtUpcoming = courtMatches.filter((m) => isUpcomingMatch(m.Durum));
          const courtFinished = courtMatches.filter((m) => isFinishedMatch(m.Durum));

          return (
            <div 
              key={courtName}
              data-court-id={courtName}
              ref={(el) => (courtRefs.current[courtName] = el)}
              className="w-full shrink-0 snap-center snap-always px-3 sm:px-0 sm:pr-6 md:w-[450px]" 
            >
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-2 sm:p-4 min-h-[50vh]">
                
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-black text-lg text-white tracking-wide">{courtName}</h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                    Sola/Sağa Kaydır
                  </span>
                </div>

                {courtMatches.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl p-10 text-center space-y-3 mt-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-xl">🎾</div>
                    <h3 className="font-bold text-white text-sm">Eşleşen Maç Yok</h3>
                    <p className="text-xs text-slate-400">Bu kortta seçili filtreye uygun maç bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {courtLive.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Canlı ({courtLive.length})</span>
                          </h2>
                        </div>
                        <div className="space-y-4">
                          {courtLive.map((match) => (
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

                    {courtUpcoming.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Başlamadı ({courtUpcoming.length})</span>
                          </h2>
                        </div>
                        <div className="space-y-4">
                          {courtUpcoming.map((match) => (
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

                    {courtFinished.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between px-1">
                          <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Bitti ({courtFinished.length})</span>
                          </h2>
                        </div>
                        <div className="space-y-2.5">
                          {courtFinished.map((match) => (
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
              </div>
            </div>
          );
        })}
      </div>

      <MatchSetupModal
        match={setupModalMatch}
        isOpen={Boolean(setupModalMatch)}
        onClose={() => setSetupModalMatch(null)}
        onStartMatch={(matchId) => {
          setSetupModalMatch(null);
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
