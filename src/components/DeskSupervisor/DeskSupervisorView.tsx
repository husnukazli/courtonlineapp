import React, { useState } from 'react';
import {
  Tv, Filter, Search, ZoomIn, ZoomOut, RefreshCw, Plus, Trash2, CheckCircle2,
  Clock, Award, Layers, Users, FileSpreadsheet, Download, Upload, AlertCircle,
  Eye, Lock, KeyRound, ShieldCheck, FileText, Calendar, MapPin, Trophy
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
    tournamentName, tournamentDate, tournamentLocation, updateTournamentDetails
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

  // Turnuva Bilgileri Giriş Stateleri
  const [tNameInput, setTNameInput] = useState<string>(tournamentName || '');
  const [tDateInput, setTDateInput] = useState<string>(tournamentDate || '');
  const [tLocInput, setTLocationInput] = useState<string>(tournamentLocation || '');
  const [tDetailsSuccessMsg, setTDetailsSuccessMsg] = useState<string>('');

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

  const handleSaveTournamentDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTournamentDetails(tNameInput.trim(), tDateInput.trim(), tLocInput.trim());
    setTDetailsSuccessMsg('✅ Turnuva künye bilgileri güncellendi ve panoya gönderildi!');
    setTimeout(() => setTDetailsSuccessMsg(''), 3500);
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
    if (confirm('KRİTİK UYARI: Tüm önbellek ve buluttaki maç geçmişi kökten silinecektir! Emin misiniz?')) {
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
              <Users className="w-3.5 h-3.5" /><span>Hakem, Format & Turnuva Yönetimi</span>
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
                <option value="Retired">Retired (Çekildi)</option>
                <option value="Walkover">Walkover (Hükmen)</option>
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
          {/* Turnuva Masa Şifre Paneli */}
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
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {referees.map((ref) => (
                  <div key={ref.name} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div><div className="font-bold text-sm text-slate-200">{ref.name}</div><div className="text-xs text-slate-400 font-mono">PIN: {ref.pin}</div></div>
                    <button type="button" onClick={() => deleteReferee(ref.name)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DİNAMİK DİPNOT EDİTÖRÜ */}
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

          {/* DİNAMİK TURNUVA BİLGİLERİ KAYIT FORMU */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center">🏆</div>
              <div>
                <h3 className="font-black text-base text-white">Turnuva Künye Bilgileri Girişi</h3>
                <p className="text-xs text-slate-400 mt-0.5">İzleyici ana portalında listelenen turnuva adını, tarihini ve kompleks bilgisini buradan özelleştirin.</p>
              </div>
            </div>
            {tDetailsSuccessMsg && <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold">{tDetailsSuccessMsg}</div>}
            <form onSubmit={handleSaveTournamentDetailsSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Turnuva Adı</label>
                <input type="text" value={tNameInput} onChange={(e) => setTNameInput(e.target.value)} placeholder="Örn: Kulüpler Arası Yaz Kupası" className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Turnuva Tarihi</label>
                <input type="text" value={tDateInput} onChange={(e) => setTDateInput(e.target.value)} placeholder="Örn: 29 Ağustos 2026" className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Müsabaka Lokasyonu Kompleksi</label>
                <input type="text" value={tLocInput} onChange={(e) => setTLocationInput(e.target.value)} placeholder="Örn: Merkez Kortlar Kompleksi" className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none" />
              </div>
              <div className="md:col-span-3 flex justify-end pt-2">
                <button type="submit" className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition uppercase">Künye Bilgilerini Kaydet ve Yayınla</button>
              </div>
            </form>
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
              <div className="flex justify-between items-center">
                <button type="button" disabled={isSyncingAction} onClick={handleAbsoluteReset} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs">Tüm Turnuvayı Sıfırla</button>
                <button type="button" onClick={handleImportJson} disabled={!jsonInput.trim() || isSyncingAction} className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2"><Upload className="w-4 h-4" /><span>JSON Yükle</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MatchDetailModal match={selectedMatchForModal} onClose={() => setSelectedMatchForModal(null)} />
    </div>
  );
};
2. İzleyici Portalı Tam Gövde (MainPortalGate.tsx)
Bu kod bloğunda, uydurma turnuva künyesi arındırılmış; Başhakem Masası formundan kaydedilen dinamik turnuva bilgileri (tournamentName, tournamentDate, tournamentLocation) çağrılarak sisteme dinamik olarak bağlanmıştır.
import React, { useState, useEffect } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { ShareRefereeLinkModal } from '../Common/ShareRefereeLinkModal';
import {
  Smartphone, Tv, X, User, KeyRound, Eye, EyeOff,
  AlertCircle, CheckCircle2, RefreshCw, Trash2, Cloud, QrCode, Activity, Clock,
  Trophy, Circle, Calendar, MapPin, Info
} from 'lucide-react';

export const MainPortalGate: React.FC = () => {
  const {
    referees, matches, loginSupervisorByPin, loginDesk, deskPin,
    cloudSyncStatus, lastCloudSync, pullFromCloudNow, tournamentNotice,
    tournamentName, tournamentDate, tournamentLocation
  } = useTennisData();

  const [activeModal, setActiveModal] = useState<'supervisor' | 'desk' | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedRefName, setSelectedRefName] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterKort, setFilterKort] = useState('TUMU');
  const [filterDurum, setFilterDurum] = useState('TUMU');
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const openSupervisorModal = () => { setActiveModal('supervisor'); setPin(''); setSelectedRefName(''); setErrorMsg(''); setSuccessMsg(''); setShowPin(false); };
  const openDeskModal = () => { setActiveModal('desk'); setPin(''); setSelectedRefName(''); setErrorMsg(''); setSuccessMsg(''); setShowPin(false); };
  const closeModal = () => { setActiveModal(null); setPin(''); setErrorMsg(''); setSuccessMsg(''); };
  const handleKeypadPress = (d: string) => { if (pin.length < 8) { setPin(p => p + d); setErrorMsg(''); } };
  const handleKeypadBackspace = () => setPin(p => p.slice(0, -1));
  const handleKeypadClear = () => setPin('');

  const handleSupervisorSubmit = () => {
    if (!selectedRefName) { setErrorMsg('Lütfen hakem adınızı seçin.'); return; }
    if (!pin) { setErrorMsg('PIN şifresi boş olamaz.'); return; }
    const ok = loginSupervisorByPin(pin, selectedRefName);
    if (ok) { setSuccessMsg('✅ Giriş başarılı!'); setTimeout(closeModal, 800); }
    else setErrorMsg('❌ PIN hatalı.');
  };

  const handleDeskSubmit = () => {
    if (!pin) { setErrorMsg('Şifre boş olamaz.'); return; }
    const ok = loginDesk(pin);
    if (ok) { setSuccessMsg('✅ Giriş başarılı!'); setTimeout(closeModal, 800); }
    else setErrorMsg('❌ Şifre hatalı.');
  };

  const distinctKortlar = Array.from(new Set(matches.map(m => m.Kort).filter(Boolean))).sort();
  const live = matches.filter(m => m.Durum === 'Oynaniyor');
  const waiting = matches.filter(m => m.Durum === 'Baslamadi');
  const done = matches.filter(m => m.Durum === 'Bitti' || m.Durum === 'Retired' || m.Durum === 'Walkover');

  const statusLabel = (d: string) => {
    if (d === 'Oynaniyor') return 'CANLI';
    if (d === 'Baslamadi') return 'BEKL.';
    if (d === 'Bitti') return 'BİTTİ';
    if (d === 'Retired') return 'RET.';
    if (d === 'Walkover') return 'W/O';
    return d;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 w-full overflow-x-auto selection:bg-lime-400 selection:text-slate-950 flex flex-col justify-between">
      <div className="w-full">
        <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800/60 w-full">
          <div className="max-w-7xl mx-auto px-3 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-base shadow shadow-lime-400/20">🎾</div>
              <span className="font-extrabold text-base tracking-tight text-white hidden sm:block">CourtOnline</span>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Activity className="w-2.5 h-2.5" /> Canlı
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={openSupervisorModal} className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-lime-400/15 hover:bg-lime-400/25 text-lime-300 text-xs font-black border border-lime-400/20 transition active:scale-95">
                <Smartphone className="w-3.5 h-3.5" /> <span>Hakem</span>
              </button>
              <button onClick={openDeskModal} className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 text-xs font-black border border-cyan-400/20 transition active:scale-95">
                <Tv className="w-3.5 h-3.5" /> <span>Masa</span>
              </button>
              <button onClick={() => setIsShareModalOpen(true)} className="p-2 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 hover:text-white transition">
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-3 space-y-4 min-w-max md:min-w-0 md:max-w-7xl md:mx-auto">
          {/* ── BAŞHAKEMDEN GELEN DİNAMİK TURNUVA BİLGİ BANDI (Saf Metin Hiyerarşisi) ── */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
            <div>
              <h2 className="font-black text-white text-base sm:text-lg tracking-wide uppercase">
                {tournamentName || 'Henüz Turnuva İsmi Girilmedi'}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-cyan-400" /> {tournamentDate || 'Tarih Belirtilmedi'}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {tournamentLocation || 'Lokasyon Belirtilmedi'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
              <Circle className="w-2 h-2 fill-emerald-400 animate-pulse" /> {live.length} Canlı
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black">
              <Clock className="w-3 h-3" /> {waiting.length} Bekliyor
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/60 border border-slate-700 text-slate-400 text-xs font-black">
              <Trophy className="w-3 h-3" /> {done.length} Bitti
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <div className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-[10px] text-slate-400">{lastCloudSync ? `Uyum: ${lastCloudSync}` : 'Bağlanıyor...'}</span>
              <button onClick={async () => { setIsSyncing(true); await pullFromCloudNow(); setIsSyncing(false); }} disabled={isSyncing} className="p-1 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-40">
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {matches.length > 0 && (
            <div className="flex gap-2 p-2 bg-slate-900/40 rounded-2xl border border-slate-800/60 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-500">Kort:</span>
                <button onClick={() => setFilterKort('TUMU')} className={`px-2 py-0.5 rounded-md text-[11px] font-black ${filterKort === 'TUMU' ? 'bg-slate-700 text-white' : 'bg-slate-800/60 text-slate-400'}`}>Tümü</button>
                {distinctKortlar.map(k => (
                  <button key={k} onClick={() => setFilterKort(k)} className={`px-2 py-0.5 rounded-md text-[11px] font-black ${filterKort === k ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800/60 text-slate-400'}`}>{k}</button>
                ))}
              </div>
              <div className="w-px h-4 bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-500">Durum:</span>
                {[
                  { key: 'TUMU', label: 'Tümü', cls: 'bg-slate-700 text-white', inact: 'bg-slate-800/60 text-slate-400' },
                  { key: 'Oynaniyor', label: '● Canlı', cls: 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40', inact: 'bg-slate-800/60 text-slate-400' },
                  { key: 'Baslamadi', label: '◐ Bekliyor', cls: 'bg-amber-500/30 text-amber-300 border border-amber-500/40', inact: 'bg-slate-800/60 text-slate-400' },
                  { key: 'Bitti', label: '✕ Bitti', cls: 'bg-rose-500/30 text-rose-300 border border-rose-500/40', inact: 'bg-slate-800/60 text-slate-400' },
                ].map(({ key, label, cls, inact }) => (
                  <button key={key} onClick={() => setFilterDurum(key)} className={`px-2 py-0.5 rounded-md text-[11px] font-black ${filterDurum === key ? cls : inact}`}>{label}</button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-nowrap gap-4 items-start">
            {(filterKort === 'TUMU' ? distinctKortlar : [filterKort]).map((courtName) => {
              const courtMatches = matches
                .filter(m => m.Kort === courtName)
                .filter(m => {
                  if (filterDurum === 'TUMU') return true;
                  if (filterDurum === 'Oynaniyor') return m.Durum === 'Oynaniyor';
                  if (filterDurum === 'Baslamadi') return m.Durum === 'Baslamadi';
                  if (filterDurum === 'Bitti') return ['Bitti', 'Retired', 'Walkover'].includes(m.Durum || '');
                  return true;
                })
                .sort((a, b) => (a.Saat || '99:99').localeCompare(b.Saat || '99:99'));

              if (courtMatches.length === 0 && filterKort !== 'TUMU') return null;

              return (
                <div key={courtName} className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-3 flex flex-col shadow-xl w-[290px] shrink-0">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/50 mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <h3 className="font-extrabold text-xs text-white uppercase">{courtName}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-950">{courtMatches.length} Maç</span>
                  </div>

                  <div className="space-y-2">
                    {courtMatches.map((m) => {
                      const isLive = m.Durum === 'Oynaniyor';
                      const isDone = ['Bitti', 'Retired', 'Walkover'].includes(m.Durum || '');
                      const state = m.detailedState;

                      return (
                        <div key={m.id} className={`rounded-xl border p-2.5 space-y-2 transition relative overflow-hidden ${isLive ? 'bg-emerald-950/20 border-emerald-600/50 shadow-md' : isDone ? 'bg-slate-950/30 border-slate-800/60 opacity-55' : 'bg-slate-900/70 border-slate-800/70'}`}>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              {m.Saat && <span className="text-cyan-400 font-mono text-[11px] font-black bg-cyan-950/80 px-2.5 py-0.5 rounded-md ring-1 ring-cyan-500/40 shadow-sm">{m.Saat}</span>}
                            </div>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border transition-colors
                            ${isLive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : isDone ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-sm' 
                            : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                              {isLive && <Circle className="w-1 h-1 fill-emerald-400 animate-pulse" />} {statusLabel(m.Durum || '')}
                            </span>
                          </div>

                          <div className="space-y-1 bg-slate-950/40 p-1.5 rounded-lg border border-slate-900/60">
                            {[
                              { name: m['Oyuncu 1'] || m['Takım 1'] || '—', won: isDone && m.Kazanan === (m['Oyuncu 1'] || m['Takım 1']), isServer: state?.currentServer === 1 },
                              { name: m['Oyuncu 2'] || m['Takım 2'] || '—', won: isDone && m.Kazanan === (m['Oyuncu 2'] || m['Takım 2']), isServer: state?.currentServer === 2 },
                            ].map((p, i) => (
                              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                <span className={`truncate font-bold ${p.won ? 'text-lime-300 font-extrabold' : isLive && p.isServer ? 'text-white' : 'text-slate-400'}`}>{p.won && '✓ '}{p.name}</span>
                                <span className="font-mono text-xs font-black text-white tracking-wide shrink-0">
                                  {state ? (i === 0 ? `${state.set1_p1} ${state.set2_p1} ${state.set3_p1}` : `${state.set1_p2} ${state.set2_p2} ${state.set3_p2}`) : m.Skor && m.Skor !== '-' ? m.Skor.split(' ').map((s: string) => s.split('/')[i] ?? '0').join(' ') : '-'}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-slate-500 px-0.5">
                            <span className="truncate max-w-[120px]">{m.Kategori || ''}</span>
                            {isLive && state ? (
                              <span className="font-mono font-bold text-lime-400 bg-lime-950/40 px-1 rounded border border-lime-500/20">{state.isTiebreak ? `TB: ${state.tiebreak_p1}-${state.tiebreak_p2}` : `${state.gamePoint_p1}-${state.gamePoint_p2}`}</span>
                            ) : (
                              <span className="truncate font-mono max-w-[100px]">{m.Son_Hakem && m.Son_Hakem !== '-' ? `👤 ${m.Son_Hakem.split(' ')[0]}` : ''}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* ── DİNAMİK DUYURU / DİPNOT BANTI ── */}
      <div className="w-full bg-slate-900 border-t border-slate-800 px-4 py-3 mt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-cyan-400 shrink-0 font-black text-xs uppercase tracking-wider bg-cyan-950/60 border border-cyan-500/20 px-2.5 py-1 rounded-xl shadow-inner animate-pulse">
            <Info className="w-3.5 h-3.5" />
            <span>Açıklama Notu:</span>
          </div>
          <div className="text-xs text-slate-300 font-semibold tracking-wide truncate pr-4">
            {tournamentNotice}
          </div>
        </div>
      </div>

      <ShareRefereeLinkModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />

      {/* ŞİFRELİ GİRİŞ MODALLARI */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-black text-white text-sm">{activeModal === 'supervisor' ? 'Kort Hakemi Girişi' : 'Başhakem Girişi'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            {activeModal === 'supervisor' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Hakem Seçin</label>
                <select value={selectedRefName} onChange={(e) => { setSelectedRefName(e.target.value); setErrorMsg(''); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none">
                  <option value="">-- Seçiniz --</option>
                  {referees.map((ref) => <option key={ref.name} value={ref.name}>{ref.name}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400">PIN Şifresi</label>
                <button type="button" onClick={() => setShowPin(!showPin)} className="text-[10px] text-slate-500">
                  {showPin ? 'Gizle' : 'Göster'}
                </button>
              </div>
              <input type={showPin ? 'text' : 'password'} maxLength={10} value={pin}
                onChange={(e) => { setPin(e.target.value); setErrorMsg(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { activeModal === 'supervisor' ? handleSupervisorSubmit() : handleDeskSubmit(); } }}
                placeholder="••••" autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 text-center text-xl text-white font-mono focus:outline-none" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {['1','2','3','4','5','6','7','8','9'].map((d) => (
                <button key={d} type="button" onClick={() => handleKeypadPress(d)}
                  className="py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-mono font-bold text-base transition">{d}</button>
              ))}
              <button type="button" onClick={handleKeypadClear} className="py-2 rounded-xl bg-slate-950 text-slate-500 text-xs font-bold">C</button>
              <button type="button" onClick={() => handleKeypadPress('0')} className="py-2 rounded-xl bg-slate-950 text-white font-mono font-bold text-base">0</button>
              <button type="button" onClick={handleKeypadBackspace} className="py-2 rounded-xl bg-slate-950 text-slate-500 text-xs font-bold">⌫</button>
            </div>

            {errorMsg && <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">{errorMsg}</div>}
            {successMsg && <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">{successMsg}</div>}

            <button type="button" onClick={() => activeModal === 'supervisor' ? handleSupervisorSubmit() : handleDeskSubmit()}
              className={`w-full py-3 rounded-xl font-black text-xs text-slate-950 text-center transition ${activeModal === 'supervisor' ? 'bg-lime-400' : 'bg-cyan-400'}`}>
              Sorumlu Girişi Yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
