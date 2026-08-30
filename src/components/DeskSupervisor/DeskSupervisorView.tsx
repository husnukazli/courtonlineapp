import React, { useState } from 'react';
import {
  Tv,
  Filter,
  Search,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Users,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  Eye,
  Lock,
  KeyRound,
  ShieldCheck,
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
    matches,
    referees,
    categoryFormats,
    deskPin,
    cloudSyncStatus,
    lastCloudSync,
    updateDeskPin,
    addReferee,
    deleteReferee,
    bulkApplyCategoryFormats,
    tournamentInfo,
    saveTournamentInfo,
    purgeOrphanMatches,
    importMatchesList,
    resetTournamentToDefault,
    resetAllScores,
    forcePushAllToCloud,
    pullFromCloudNow,
  } = useTennisData();

  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'stats' | 'formats' | 'referees' | 'manage' | 'info'>('grid');
  const [localInfo, setLocalInfo] = React.useState(() => tournamentInfo);
  const [infoSavedMsg, setInfoSavedMsg] = React.useState('');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // YENİ ZOOM LİMİTİ: %40 ile %150 arası
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<MatchItem | null>(null);

  const [newRefName, setNewRefName] = useState<string>('');
  const [newRefPin, setNewRefPin] = useState<string>('');

  const [editingDeskPin, setEditingDeskPin] = useState<string>(deskPin);
  const [deskPinSuccessMsg, setDeskPinSuccessMsg] = useState<string>('');

  const [localFormats, setLocalFormats] = useState<Record<string, string>>(() => categoryFormats);
  const [formatSavedMsg, setFormatSavedMsg] = useState<string>('');

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
              <Users className="w-3.5 h-3.5" /><span>Hakem Yönetimi</span>
            </button>
            <button type="button" onClick={() => setActiveSubTab('manage')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'manage' ? 'bg-cyan-400 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}>
              <FileSpreadsheet className="w-3.5 h-3.5" /><span>Program & JSON</span>
            </button>
            <button type="button" onClick={() => { setLocalInfo(tournamentInfo); setActiveSubTab('info'); }} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'info' ? 'bg-cyan-400 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}>
              <span>🏆</span><span>Turnuva Bilgileri</span>
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
                <option value="Retired">Retired (Çekildi)</option>
                <option value="Walkover">Walkover (Hükmen)</option>
              </select>
            </div>

            {/* YENİ: GENİŞLETİLMİŞ ZOOM ÇUBUĞU */}
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
        /* YENİ: YATAY KAYDIRMA İZNİ (overflow-x-auto) VE SABİT GENİŞLİK MATRİSİ */
        <div className="w-full overflow-x-auto pb-6">
          <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', minWidth: 'min-content' }} className="transition-transform duration-150 p-2">
            
            {/* Kortların Yanyana Dizilimi: Asla alt satıra geçmez (flex-nowrap) */}
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
                          const p1Name = m['Oyuncu 1'];
                          const p2Name = m['Oyuncu 2'];

                          return (
                            <div key={m.id} onClick={() => setSelectedMatchForModal(m)} className={`p-3 rounded-2xl border transition cursor-pointer relative overflow-hidden group hover:scale-[1.02] ${isLive ? 'bg-slate-950 border-l-4 border-l-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20' : m.Durum === 'Duraklatildi' ? 'bg-slate-950 border-l-4 border-l-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20' : isFinished ? 'bg-slate-950/70 border-l-4 border-l-cyan-500 border-slate-800' : 'bg-slate-950/50 border-l-4 border-l-slate-700 border-slate-800/80 hover:border-slate-700'}`}>
                              <div className="flex items-center justify-between text-[10px] font-bold mb-1.5 gap-1">
                                <span className="text-amber-400 font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{m.Saat}</span>
                                <div className="flex items-center gap-1.5">
                                  <MatchLiveTimer match={m} size="sm" />
                                  <span className={`px-2 py-0.5 rounded-full uppercase text-[9px] font-extrabold ${isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' : m.Durum === 'Duraklatildi' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : m.Durum === 'Retired' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : m.Durum === 'Walkover' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : isFinished ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'}`}>
                                    {isLive ? 'DEVAM' : m.Durum === 'Duraklatildi' ? 'MOLA' : m.Durum === 'Baslamadi' ? 'BEKLİYOR' : m.Durum}
                                  </span>
                                </div>
                              </div>

                              <div className="text-[10px] text-slate-400 truncate mb-1.5">{m.Kategori}</div>

                              <div className="space-y-1 my-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 truncate pr-2">
                                    {state?.currentServer === 1 && isLive && <span className="text-lime-400 text-[10px]">🎾</span>}
                                    <span className={`truncate ${m.Kazanan === p1Name ? 'text-white font-extrabold' : 'text-slate-300 font-medium'}`}>{m.Kazanan === p1Name ? '✓ ' : ''}{p1Name}</span>
                                  </div>
                                  <span className="font-mono text-xs font-bold text-white flex-shrink-0">
                                    {state ? `${state.set1_p1} ${state.set2_p1} ${state.set3_p1}` : m.Skor !== '-' ? m.Skor.split(' ').map((s) => s.split('/')[0]).join(' ') : '-'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 truncate pr-2">
                                    {state?.currentServer === 2 && isLive && <span className="text-cyan-400 text-[10px]">🎾</span>}
                                    <span className={`truncate ${m.Kazanan === p2Name ? 'text-white font-extrabold' : 'text-slate-300 font-medium'}`}>{m.Kazanan === p2Name ? '✓ ' : ''}{p2Name}</span>
                                  </div>
                                  <span className="font-mono text-xs font-bold text-white flex-shrink-0">
                                    {state ? `${state.set1_p2} ${state.set2_p2} ${state.set3_p2}` : m.Skor !== '-' ? m.Skor.split(' ').map((s) => s.split('/')[1]).join(' ') : '-'}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                                {isLive && state ? (
                                  <div className="font-mono font-bold text-lime-400 bg-lime-950/40 px-2 py-0.5 rounded border border-lime-500/30">
                                    {state.isTiebreak ? `TB: ${state.tiebreak_p1}-${state.tiebreak_p2}` : `${state.gamePoint_p1} - ${state.gamePoint_p2}`}
                                  </div>
                                ) : (
                                  <div className="text-slate-500 font-mono">Skor: <span className="text-slate-300">{m.Skor}</span></div>
                                )}
                                <div className="text-slate-400 truncate max-w-[110px] text-right">
                                  {m.Son_Hakem && m.Son_Hakem !== '-' ? <span className="text-amber-300/90 font-medium">👤 {m.Son_Hakem.split(' ')[0]}</span> : <span className="text-slate-600">Hakem Yok</span>}
                                </div>
                              </div>
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

      {/* SUB-TAB 2, 3, 4, 5 ARE THE SAME AS BEFORE */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow">
              <div className="text-xs font-bold text-slate-400 uppercase">Toplam Maç</div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">{totalMatches}</div>
            </div>
            <div className="p-4 bg-slate-900 border border-emerald-500/30 bg-emerald-950/20 rounded-2xl shadow">
              <div className="text-xs font-bold text-emerald-400 uppercase">Devam Eden</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{liveMatches}</div>
            </div>
            <div className="p-4 bg-slate-900 border border-rose-500/30 bg-rose-950/20 rounded-2xl shadow">
              <div className="text-xs font-bold text-rose-400 uppercase">Tamamlanan</div>
              <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">{finishedMatches}</div>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow">
              <div className="text-xs font-bold text-slate-400 uppercase">Başlamayan</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-300 mt-1">{pendingMatches}</div>
            </div>
            <div className="p-4 bg-slate-900 border border-cyan-500/30 bg-cyan-950/20 rounded-2xl shadow col-span-2 sm:col-span-1">
              <div className="text-xs font-bold text-cyan-400 uppercase">Oran</div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1">%{completionRate}</div>
            </div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Günlük Turnuva İlerlemesi</span>
              <span className="font-mono text-cyan-400">{finishedMatches} / {totalMatches} Maç Bitti (%{completionRate})</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'formats' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div><h3 className="font-bold text-base text-white">🎾 Kategori ve Maç Formatı Eşleştirme</h3></div>
          {formatSavedMsg && <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold">{formatSavedMsg}</div>}
          <div className="space-y-3 divide-y divide-slate-800">
            {distinctCategories.map((kat) => (
              <div key={kat} className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="font-bold text-sm text-slate-200">🎾 {kat}</div>
                <div>
                  <select value={localFormats[kat] || '3 Normal Set'} onChange={(e) => setLocalFormats((prev) => ({ ...prev, [kat]: e.target.value }))} className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-lime-300 font-bold focus:border-cyan-400">
                    {SCORE_FORMAT_OPTIONS.map((fmt) => (<option key={fmt} value={fmt}>{fmt}</option>))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button type="button" onClick={handleApplyFormats} className="px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl shadow-lg transition">Formatları Kaydet ve Tüm Maçlara Uygula</button>
          </div>
        </div>
      )}

      {activeSubTab === 'referees' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center font-bold"><ShieldCheck className="w-5 h-5" /></div>
                <div><h3 className="font-bold text-base text-white">Turnuva Masası Güvenlik & Ana Şifre</h3></div>
              </div>
              <div className="font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-bold">Aktif Şifre: {deskPin}</div>
            </div>
            {deskPinSuccessMsg && <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>{deskPinSuccessMsg}</span></div>}
            <form onSubmit={(e) => { e.preventDefault(); if (!editingDeskPin.trim()) return; updateDeskPin(editingDeskPin.trim()); setDeskPinSuccessMsg('✅ Turnuva Masası şifresi başarıyla güncellendi!'); setTimeout(() => setDeskPinSuccessMsg(''), 3500); }} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
              <div className="flex-1 space-y-1"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Yeni Turnuva Masası Şifresi / PIN</label><input type="text" maxLength={10} value={editingDeskPin} onChange={(e) => setEditingDeskPin(e.target.value)} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400" /></div>
              <button type="submit" className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" /><span>Şifreyi Güncelle</span></button>
            </form>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-base text-white">Yeni Saha Hakemi Ekle</h3>
              <form onSubmit={handleAddRefereeSubmit} className="space-y-4">
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hakem Adı & Soyadı</label><input type="text" value={newRefName} onChange={(e) => setNewRefName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Giriş PIN / Şifre</label><input type="text" maxLength={6} value={newRefPin} onChange={(e) => setNewRefPin(e.target.value)} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-cyan-400" /></div>
                <button type="submit" className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl shadow transition">Hakemi Kaydet</button>
              </form>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-base text-white">Kayıtlı Saha Hakemleri ({referees.length})</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {referees.map((ref) => (
                  <div key={ref.name} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div><div className="font-bold text-sm text-slate-200">{ref.name}</div><div className="text-xs text-slate-400 font-mono">PIN: {ref.pin}</div></div>
                    <button type="button" onClick={() => deleteReferee(ref.name)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'manage' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"><RefreshCw className={`w-5 h-5 ${isSyncingAction ? 'animate-spin' : ''}`} /></div>
                <div><h3 className="font-bold text-base text-white">Canlı Bulut Senkronizasyonu</h3></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>{cloudSyncStatus === 'connected' ? 'Buluta Bağlı' : cloudSyncStatus === 'syncing' ? 'Eşitleniyor...' : 'Çevrimdışı'}</span></span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button type="button" disabled={isSyncingAction} onClick={async () => { setIsSyncingAction(true); try { await forcePushAllToCloud(); setImportMsg('✅ Buluta zorla yazıldı!'); setTimeout(() => setImportMsg(''), 4000); } catch { setImportMsg('❌ Başarısız.'); } finally { setIsSyncingAction(false); } }} className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold transition shadow"><Upload className="w-4 h-4 text-emerald-400" /><span>Zorla Yayınla</span></button>
              <button type="button" disabled={isSyncingAction} onClick={async () => { setIsSyncingAction(true); try { const n = await purgeOrphanMatches(); setImportMsg(n > 0 ? '🧹 ' + n + ' hayalet döküman silindi!' : '✅ Hayalet yok, temiz!'); setTimeout(() => setImportMsg(''), 4000); } catch { setImportMsg('❌ Temizlenemedi.'); } finally { setIsSyncingAction(false); } }} className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-2xl text-xs font-bold transition shadow"><span>🧹</span><span>Hayalet Temizle</span></button>
              <button type="button" disabled={isSyncingAction} onClick={async () => { setIsSyncingAction(true); try { await pullFromCloudNow(); setImportMsg('✅ Veri çekildi!'); setTimeout(() => setImportMsg(''), 4000); } catch { setImportMsg('❌ Başarısız.'); } finally { setIsSyncingAction(false); } }} className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded-2xl text-xs font-bold transition shadow"><Download className="w-4 h-4 text-cyan-400" /><span>Buluttan Çek</span></button>
              <button type="button" disabled={isSyncingAction} onClick={() => { if (confirm('Sıfırlansın mı?')) { resetAllScores(); } }} className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-2xl text-xs font-bold transition shadow"><RefreshCw className="w-4 h-4 text-amber-400" /><span>Skorları Sıfırla</span></button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div><h3 className="font-bold text-base text-white">Maç Programı (JSON)</h3></div>
              <button type="button" onClick={handleExportJson} className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition shadow"><Download className="w-4 h-4" /><span>İndir</span></button>
            </div>
            {importMsg && <div className="p-3.5 bg-cyan-950/70 border border-cyan-500/40 rounded-2xl text-cyan-300 text-xs font-bold shadow-lg animate-in fade-in">{importMsg}</div>}
            <div className="space-y-3">
              <textarea rows={8} value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => { if (confirm('Varsayılana dön?')) resetTournamentToDefault(); }} className="text-xs text-rose-400 hover:text-rose-300 underline font-medium">Varsayılana Sıfırla</button>
                <button type="button" onClick={handleImportJson} disabled={!jsonInput.trim()} className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2"><Upload className="w-4 h-4" /><span>JSON Yükle</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'info' && (
        <div className="space-y-5 max-w-lg">
          <div>
            <h3 className="font-bold text-base text-white mb-4">🏆 Turnuva Bilgileri</h3>
            <div className="space-y-3">
              {[
                { key: 'ad', label: 'Turnuva Adı', placeholder: 'örn. 2025 Türkiye Tenis Şampiyonası' },
                { key: 'yer', label: 'Lokasyon / Tesis', placeholder: 'örn. Ankara Tenis Kulübü' },
                { key: 'tarih', label: 'Tarih / Dönem', placeholder: 'örn. 15-20 Ağustos 2025' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type="text" value={(localInfo as any)[key]} placeholder={placeholder}
                    onChange={e => setLocalInfo(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Turnuva Notu (İzleyici Ekranı Alt Bölümü)</label>
                <textarea value={localInfo.not} placeholder="örn. Tüm oyunculara başarılar dileriz!"
                  onChange={e => setLocalInfo(prev => ({ ...prev, not: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 resize-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={() => { saveTournamentInfo(localInfo); setInfoSavedMsg('✅ Kaydedildi!'); setTimeout(() => setInfoSavedMsg(''), 3000); }}
              className="px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl shadow-lg transition">
              Turnuva Bilgilerini Kaydet
            </button>
            {infoSavedMsg && <span className="text-emerald-400 text-sm font-bold">{infoSavedMsg}</span>}
          </div>
        </div>
      )}

      <MatchDetailModal match={selectedMatchForModal} onClose={() => setSelectedMatchForModal(null)} />
    </div>
  );
};
