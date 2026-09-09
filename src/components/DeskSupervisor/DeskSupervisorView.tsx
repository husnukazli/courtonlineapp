import React, { useState, useEffect, useRef } from 'react';
import {
  Tv, Filter, Search, ZoomIn, ZoomOut, RefreshCw, Plus, Trash2, CheckCircle2,
  Clock, Award, Layers, Users, FileSpreadsheet, Download, Upload, AlertCircle,
  Eye, Lock, KeyRound, ShieldCheck, FileText, RotateCcw, Sun, Moon
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
    categoryNoAdSettings,
    deskPin,
    cloudSyncStatus,
    lastCloudSync,
    updateDeskPin,
    addReferee,
    deleteReferee,
    bulkApplyCategoryFormats,
    bulkApplyCategoryNoAdSettings,
    tournamentInfo,
    saveTournamentInfo,
    purgeOrphanMatches,
    importMatchesList,
    wipeAllMatchesForTournament,
    resetAllScores,
    forcePushAllToCloud,
    pullFromCloudNow,
  } = useTennisData();

  // GECE / GÜNDÜZ MODU
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('courtonline_light_mode') === 'true';
  });

  const toggleTheme = () => {
    setIsLightMode(prev => {
      const newVal = !prev;
      localStorage.setItem('courtonline_light_mode', String(newVal));
      return newVal;
    });
  };

  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'stats' | 'formats' | 'referees' | 'manage' | 'info'>('grid');
  const [localInfo, setLocalInfo] = React.useState(() => tournamentInfo);
  const [infoSavedMsg, setInfoSavedMsg] = React.useState('');
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
  const [localNoAdSettings, setLocalNoAdSettings] = useState<Record<string, boolean>>(() => categoryNoAdSettings || {});
  const [formatSavedMsg, setFormatSavedMsg] = useState<string>('');

  const [jsonInput, setJsonInput] = useState<string>('');
  const [importMsg, setImportMsg] = useState<string>('');
  const [isSyncingAction, setIsSyncingAction] = useState(false);

  const [raporAlindi, setRaporAlindi] = useState<boolean>(false);

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

  // 4-YÖNLÜ SÜRÜKLE KAYDIR (DRAG-TO-SCROLL) MANTIĞI
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const scrollStartX = useRef(0);
  const scrollStartY = useRef(0);
  const hasDragged = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    dragStartX.current = e.pageX;
    dragStartY.current = e.pageY;
    if (scrollContainerRef.current) {
      scrollStartX.current = scrollContainerRef.current.scrollLeft;
      scrollStartY.current = scrollContainerRef.current.scrollTop;
      scrollContainerRef.current.style.userSelect = 'none'; // Sürüklerken yazı seçilmesini önle
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    
    const dx = e.pageX - dragStartX.current;
    const dy = e.pageY - dragStartY.current;
    
    // Eğer mouse 5 pikselden fazla hareket ederse, bu bir "Tıklama" değil "Sürükleme" eylemidir.
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDragged.current = true;
    }

    scrollContainerRef.current.scrollLeft = scrollStartX.current - dx;
    scrollContainerRef.current.scrollTop = scrollStartY.current - dy;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.userSelect = 'auto';
    }
  };

  useEffect(() => {
    setLocalInfo(tournamentInfo);
  }, [tournamentInfo]);

  useEffect(() => {
    if (categoryFormats && Object.keys(categoryFormats).length > 0) {
      setLocalFormats(categoryFormats);
    }
    if (categoryNoAdSettings) {
      setLocalNoAdSettings(categoryNoAdSettings);
    }
  }, [categoryFormats, categoryNoAdSettings]);

  const handleApplyFormats = () => {
    bulkApplyCategoryFormats(localFormats);
    bulkApplyCategoryNoAdSettings(localNoAdSettings);
    saveTournamentInfo(localInfo);

    const updatedMatches = matches.map(m => {
      let changed = false;
      let newM = { ...m };
      
      if (localFormats[m.Kategori] && m.Skor_Formati !== localFormats[m.Kategori]) {
        newM.Skor_Formati = localFormats[m.Kategori];
        changed = true;
      }
      
      const currentNoAd = !!m.isNoAd;
      const newNoAd = !!localNoAdSettings[m.Kategori];
      if (currentNoAd !== newNoAd) {
        newM.isNoAd = newNoAd;
        changed = true;
      }

      return changed ? newM : m;
    });

    if (JSON.stringify(updatedMatches) !== JSON.stringify(matches)) {
        importMatchesList(updatedMatches);
    }

    setFormatSavedMsg('✅ Kategori formatları, No-Ad ve Tie-Break ayarları kaydedildi!');
    setTimeout(() => setFormatSavedMsg(''), 4000);
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

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setIsSyncingAction(true);
        await wipeAllMatchesForTournament();
        importMatchesList(parsed);
        setImportMsg(`✅ ${parsed.length} maç başarıyla içe aktarıldı!`);
        setJsonInput('');
        setRaporAlindi(false); 
        setTimeout(() => setImportMsg(''), 3000);
        setIsSyncingAction(false);
      } else {
        setImportMsg('❌ JSON geçerli bir maç dizisi [ { ... } ] olmalıdır.');
      }
    } catch (e: any) {
      setImportMsg('❌ Geçersiz JSON formatı: ' + e.message);
    }
  };

  const handlePrintDailyReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("⚠️ Tarayıcınız açılır pencereleri (pop-up) engelliyor. Lütfen bu site için izin verin.");
      return;
    }

    const bugun = new Date().toLocaleDateString('tr-TR');
    const saat = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    let html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Gün Sonu Raporu - ${tournamentInfo?.ad || 'Turnuva'}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #222; font-size: 12px; }
          .header-container { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
          h2 { margin: 5px 0 0 0; font-size: 14px; font-weight: normal; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #aaa; padding: 8px 6px; text-align: left; }
          th { background-color: #eee; font-weight: bold; text-transform: uppercase; font-size: 11px; }
          .winner { font-weight: bold; background-color: #f9f9f9; }
          .status-bitti { color: #166534; font-weight: bold; }
          .footer-signature { margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; }
          .signature-box { text-align: center; }
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <h1>${tournamentInfo?.ad || 'CourtOnline Tenis Turnuvası'}</h1>
          <h2>Resmi Gün Sonu Raporu | Tarih: ${bugun} - Saat: ${saat}</h2>
          ${tournamentInfo?.yer ? `<h3>Yer: ${tournamentInfo.yer}</h3>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th width="8%">Kort</th>
              <th width="8%">Saat</th>
              <th width="15%">Kategori</th>
              <th width="20%">Oyuncu 1</th>
              <th width="20%">Oyuncu 2</th>
              <th width="15%">Kazanan</th>
              <th width="14%">Skor</th>
            </tr>
          </thead>
          <tbody>
    `;

    const sortedMatches = [...matches].sort((a, b) => a.Kort.localeCompare(b.Kort) || (a.Saat || '').localeCompare(b.Saat || ''));

    sortedMatches.forEach(m => {
      const p1Winner = m.Kazanan === m['Oyuncu 1'];
      const p2Winner = m.Kazanan === m['Oyuncu 2'];
      
      html += `
        <tr>
          <td>${m.Kort}</td>
          <td>${m.Saat}</td>
          <td>${m.Kategori}</td>
          <td class="${p1Winner ? 'winner' : ''}">${p1Winner ? '✓ ' : ''}${m['Oyuncu 1']}</td>
          <td class="${p2Winner ? 'winner' : ''}">${p2Winner ? '✓ ' : ''}${m['Oyuncu 2']}</td>
          <td class="winner">${m.Kazanan !== 'Secilmedi' ? m.Kazanan : '-'}</td>
          <td class="status-bitti">${m.Skor}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        
        <div class="footer-signature">
          <div class="signature-box">
            <p><strong>Turnuva Başhakemi</strong></p>
            <p>İmza</p>
            <p><br>.......................................</p>
          </div>
          <div class="signature-box">
            <p><strong>Turnuva Direktörü / Kulüp Yetkilisi</strong></p>
            <p>İmza</p>
            <p><br>.......................................</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      setRaporAlindi(true);
    }, 250);
  };

  return (
    <div className={`max-w-7xl mx-auto space-y-6 overflow-hidden transition-colors duration-300 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
      
      <div className={`border rounded-3xl p-4 sm:p-5 shadow-xl space-y-4 transition-colors ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
        <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className={`flex flex-wrap items-center gap-1.5 p-1 rounded-2xl border ${isLightMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'}`}>
            <button type="button" onClick={() => setActiveSubTab('grid')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'grid' ? (isLightMode ? 'bg-cyan-600 text-white shadow-md font-black' : 'bg-cyan-400 text-slate-950 shadow-md font-black') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')}`}>
              <Tv className="w-3.5 h-3.5" /><span>Canlı Kortlar Akışı</span>
            </button>
            <button type="button" onClick={() => setActiveSubTab('stats')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'stats' ? (isLightMode ? 'bg-cyan-600 text-white shadow-md font-black' : 'bg-cyan-400 text-slate-950 shadow-md font-black') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')}`}>
              <Award className="w-3.5 h-3.5" /><span>Turnuva İstatistikleri</span>
            </button>
            <button type="button" onClick={() => setActiveSubTab('formats')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'formats' ? (isLightMode ? 'bg-cyan-600 text-white shadow-md font-black' : 'bg-cyan-400 text-slate-950 shadow-md font-black') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')}`}>
              <Layers className="w-3.5 h-3.5" /><span>Format Hafızası</span>
            </button>
            <button type="button" onClick={() => setActiveSubTab('referees')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'referees' ? (isLightMode ? 'bg-cyan-600 text-white shadow-md font-black' : 'bg-cyan-400 text-slate-950 shadow-md font-black') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')}`}>
              <Users className="w-3.5 h-3.5" /><span>Hakem Yönetimi</span>
            </button>
            <button type="button" onClick={() => setActiveSubTab('manage')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'manage' ? (isLightMode ? 'bg-cyan-600 text-white shadow-md font-black' : 'bg-cyan-400 text-slate-950 shadow-md font-black') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')}`}>
              <FileSpreadsheet className="w-3.5 h-3.5" /><span>Program & JSON</span>
            </button>
            <button type="button" onClick={() => { setLocalInfo(tournamentInfo); setActiveSubTab('info'); }} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'info' ? (isLightMode ? 'bg-cyan-600 text-white shadow-md font-black' : 'bg-cyan-400 text-slate-950 shadow-md font-black') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')}`}>
              <span>🏆</span><span>Turnuva Bilgileri</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono ml-auto">
            <span className={`px-2.5 py-1 rounded-lg border font-bold ${isLightMode ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'}`}>{liveMatches} Canlı</span>
            <span className={`px-2.5 py-1 rounded-lg border font-bold ${isLightMode ? 'bg-cyan-100 border-cyan-300 text-cyan-800' : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300'}`}>%{completionRate} Bitti</span>
            <button onClick={toggleTheme} className={`ml-2 p-1.5 rounded-xl border transition flex items-center justify-center ${isLightMode ? 'bg-white hover:bg-slate-100 border-slate-300 text-amber-600 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'}`} title="Temayı Değiştir">
              {isLightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {activeSubTab === 'grid' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Oyuncu veya hakem ara..." className={`pl-8 pr-3 py-1.5 border rounded-xl text-xs w-44 sm:w-56 focus:outline-none focus:border-cyan-400 ${isLightMode ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'}`} />
                <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 pointer-events-none ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <select value={selectedCourtFilter} onChange={(e) => setSelectedCourtFilter(e.target.value)} className={`px-3 py-1.5 border rounded-xl text-xs focus:outline-none focus:border-cyan-400 ${isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'}`}>
                <option value="ALL">Tüm Kortlar ({distinctCourts.length})</option>
                {distinctCourts.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className={`px-3 py-1.5 border rounded-xl text-xs focus:outline-none focus:border-cyan-400 ${isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'}`}>
                <option value="ALL">Tüm Durumlar</option>
                <option value="Oynaniyor">Devam Edenler (Canlı)</option>
                <option value="Baslamadi">Başlamayanlar</option>
                <option value="Bitti">Bitenler</option>
                <option value="Retired">Retired (Çekildi)</option>
                <option value="Walkover">Walkover (Hükmen)</option>
              </select>
            </div>

            <div className={`flex items-center gap-2 text-xs p-2 rounded-xl border ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
              <ZoomOut className={`w-4 h-4 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
              <input type="range" min="40" max="150" step="1" value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} className={`w-24 sm:w-32 cursor-pointer ${isLightMode ? 'accent-cyan-600' : 'accent-cyan-400'}`} />
              <ZoomIn className={`w-4 h-4 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
              <span className={`font-mono text-[12px] w-10 text-right font-black ${isLightMode ? 'text-cyan-700' : 'text-cyan-400'}`}>%{zoomLevel}</span>
            </div>
          </div>
        )}
      </div>

      {activeSubTab === 'grid' && (
        <div 
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="w-full overflow-auto max-h-[75vh] pb-6 cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', minWidth: 'min-content' }} className="transition-transform duration-150 p-2">
            
            <div className="flex flex-nowrap gap-4">
              {(selectedCourtFilter === 'ALL' ? distinctCourts : [selectedCourtFilter]).map((courtName) => {
                
                const courtMatches = filteredMatches
                  .filter((m) => m.Kort === courtName)
                  .sort((a, b) => {
                    const aIsFinished = ['bitti', 'retired', 'walkover'].includes((a.Durum || '').toLowerCase());
                    const bIsFinished = ['bitti', 'retired', 'walkover'].includes((b.Durum || '').toLowerCase());
                    
                    if (aIsFinished && !bIsFinished) return -1;
                    if (!aIsFinished && bIsFinished) return 1; 
                    
                    return (a.Saat || '').localeCompare(b.Saat || '');
                  });

                return (
                  <div key={courtName} className={`border rounded-3xl p-3 sm:p-4 space-y-3 flex flex-col shadow-xl min-w-[280px] w-[300px] ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
                    <div className={`flex items-center justify-between pb-2 border-b ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${isLightMode ? 'bg-cyan-500' : 'bg-cyan-400'}`}></div>
                        <h3 className={`font-extrabold text-sm tracking-wide ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{courtName}</h3>
                      </div>
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${isLightMode ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>{courtMatches.length} Maç</span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {courtMatches.length > 0 ? (
                        courtMatches.map((m) => {
                          const stat = (m.Durum || '').toLowerCase();
                          const isFinished = ['bitti', 'retired', 'walkover'].includes(stat);
                          const isLive = stat === 'oynaniyor';
                          const isPaused = stat === 'duraklatildi';
                          const isUpcoming = stat === 'baslamadi';
                          
                          const state = m.detailedState;
                          const p1Name = m['Oyuncu 1'];
                          const p2Name = m['Oyuncu 2'];

                          const cardClass = isLive 
                            ? (isLightMode ? 'bg-white border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400/50 z-10 scale-[1.01]' : 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50 z-10 scale-[1.01]')
                            : isPaused 
                            ? (isLightMode ? 'bg-white border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50 z-10 scale-[1.01]' : 'bg-gradient-to-br from-amber-950/60 to-slate-900 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50 z-10 scale-[1.01]')
                            : isUpcoming 
                            ? (isLightMode ? 'bg-slate-50 border-2 border-slate-300 border-dashed hover:border-slate-400' : 'bg-slate-900 border-2 border-slate-600 border-dashed opacity-85 hover:opacity-100')
                            : (isLightMode ? 'bg-rose-50 border border-rose-200 hover:border-rose-300' : 'bg-gradient-to-br from-rose-950/30 to-slate-950 border-2 border-rose-900/50 opacity-85 hover:opacity-100');

                          const statusBadgeClass = isLive 
                            ? (isLightMode ? 'bg-emerald-100 text-emerald-700 border-emerald-300 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse')
                            : isPaused 
                            ? (isLightMode ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/40')
                            : isUpcoming 
                            ? (isLightMode ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700')
                            : (isLightMode ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-rose-500/20 text-rose-400 border-rose-500/40');

                          const statusText = isLive ? 'CANLI' : isPaused ? 'ASKIDA' : isUpcoming ? 'BEKLİYOR' : m.Durum.toUpperCase();
                          
                          const timeClass = isLive ? (isLightMode ? 'text-emerald-700 text-[10px]' : 'text-emerald-400 text-[10px]')
                            : isPaused ? (isLightMode ? 'text-amber-700 text-[10px]' : 'text-amber-400 text-[10px]')
                            : isUpcoming ? (isLightMode ? 'text-slate-800 text-[12px] font-black tracking-wider' : 'text-white text-[12px] font-black tracking-wider')
                            : (isLightMode ? 'text-rose-700 text-[10px]' : 'text-rose-300 text-[10px]');

                          const playerTextClass = (isWinner: boolean) => 
                            isFinished && !isWinner ? (isLightMode ? 'text-slate-400 line-through' : 'text-slate-400 line-through')
                            : isFinished && isWinner ? (isLightMode ? 'text-cyan-700 font-black' : 'text-lime-300 font-black drop-shadow-sm')
                            : (isLightMode ? 'text-slate-900 font-bold' : 'text-white font-bold');

                          const scoreNumberClass = (isWinner: boolean) =>
                            isFinished && !isWinner ? 'text-slate-400'
                            : isFinished ? (isLightMode ? 'text-cyan-700' : 'text-lime-200')
                            : (isLightMode ? 'text-slate-900' : 'text-white');

                          return (
                            <div 
                              key={m.id} 
                              onClick={(e) => {
                                // Sürükleme yapılmışsa tıklamayı yoksay (Modal açılmasını engelle)
                                if (hasDragged.current) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return;
                                }
                                setSelectedMatchForModal(m);
                              }} 
                              className={`p-3 rounded-2xl transition-all cursor-pointer relative overflow-hidden group ${cardClass}`}
                            >
                              
                              <div className={`flex items-center justify-between text-[10px] font-bold mb-2 gap-1 pb-2 border-b ${isLightMode ? 'border-slate-200' : 'border-slate-800/50'}`}>
                                <span className={`${timeClass} font-mono flex items-center gap-1.5`}><Clock className={`${isUpcoming ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />{m.Saat}</span>
                                <div className="flex items-center gap-1.5">
                                  {isLive && <MatchLiveTimer match={m} size="sm" />}
                                  <span className={`px-2 py-0.5 rounded-md border uppercase text-[9px] font-black tracking-widest ${statusBadgeClass}`}>
                                    {statusText}
                                  </span>
                                </div>
                              </div>

                              <div className={`text-[10px] font-black uppercase tracking-wider truncate mb-2 ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`}>{m.Kategori}</div>

                              <div className="space-y-1.5 my-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 truncate pr-2">
                                    {state?.currentServer === 1 && isLive && <span className="text-lime-400 text-[10px] animate-bounce">🎾</span>}
                                    <span className={`truncate ${playerTextClass(m.Kazanan === p1Name)}`}>{isFinished && m.Kazanan === p1Name ? '🏆 ' : ''}{p1Name}</span>
                                  </div>
                                  <span className={`font-mono text-xs font-black shrink-0 ${scoreNumberClass(m.Kazanan === p1Name)}`}>
                                    {state ? `${state.set1_p1} ${state.set2_p1} ${state.set3_p1}` : m.Skor !== '-' ? m.Skor.split(' ').map((s) => s.split('/')[0]).join(' ') : '-'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 truncate pr-2">
                                    {state?.currentServer === 2 && isLive && <span className="text-cyan-400 text-[10px] animate-bounce">🎾</span>}
                                    <span className={`truncate ${playerTextClass(m.Kazanan === p2Name)}`}>{isFinished && m.Kazanan === p2Name ? '🏆 ' : ''}{p2Name}</span>
                                  </div>
                                  <span className={`font-mono text-xs font-black shrink-0 ${scoreNumberClass(m.Kazanan === p2Name)}`}>
                                    {state ? `${state.set1_p2} ${state.set2_p2} ${state.set3_p2}` : m.Skor !== '-' ? m.Skor.split(' ').map((s) => s.split('/')[1]).join(' ') : '-'}
                                  </span>
                                </div>
                              </div>

                              <div className={`pt-2 mt-2 border-t flex items-center justify-between text-[10px] ${isLightMode ? 'border-slate-200' : 'border-slate-800/50'}`}>
                                {isLive && state ? (
                                  <div className={`font-mono font-bold px-2 py-0.5 rounded border ${isLightMode ? 'text-emerald-700 bg-emerald-50 border-emerald-300' : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'}`}>
                                    {state.isTiebreak ? `TB: ${state.tiebreak_p1}-${state.tiebreak_p2}` : `${state.gamePoint_p1} - ${state.gamePoint_p2}`}
                                  </div>
                                ) : (
                                  <div className={`font-mono font-bold ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Skor: <span className={isFinished ? (isLightMode ? 'text-slate-900 font-black text-[11px]' : 'text-white font-black text-[11px]') : (isLightMode ? 'text-slate-600' : 'text-slate-200')}>{m.Skor}</span></div>
                                )}
                                <div className={`truncate max-w-[110px] text-right ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {m.Son_Hakem && m.Son_Hakem !== '-' ? <span className={`font-medium ${isLightMode ? 'text-amber-600' : 'text-amber-300/90'}`}>👤 {m.Son_Hakem.split(' ')[0]}</span> : <span className={isLightMode ? 'text-slate-400' : 'text-slate-600'}>Hakem Yok</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className={`p-6 text-center text-xs border border-dashed rounded-2xl ${isLightMode ? 'text-slate-500 border-slate-300' : 'text-slate-500 border-slate-800'}`}>Bu kortta maç bulunamadı.</div>
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
            <div className={`p-4 border rounded-2xl shadow ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
              <div className={`text-xs font-bold uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Toplam Maç</div>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{totalMatches}</div>
            </div>
            <div className={`p-4 border rounded-2xl shadow ${isLightMode ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-950/20 border-emerald-500/30'}`}>
              <div className={`text-xs font-bold uppercase ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>Devam Eden</div>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${isLightMode ? 'text-emerald-600' : 'text-emerald-400'}`}>{liveMatches}</div>
            </div>
            <div className={`p-4 border rounded-2xl shadow ${isLightMode ? 'bg-rose-50 border-rose-300' : 'bg-rose-950/20 border-rose-500/30'}`}>
              <div className={`text-xs font-bold uppercase ${isLightMode ? 'text-rose-700' : 'text-rose-400'}`}>Tamamlanan</div>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${isLightMode ? 'text-rose-600' : 'text-rose-400'}`}>{finishedMatches}</div>
            </div>
            <div className={`p-4 border rounded-2xl shadow ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
              <div className={`text-xs font-bold uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Başlamayan</div>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>{pendingMatches}</div>
            </div>
            <div className={`p-4 border rounded-2xl shadow col-span-2 sm:col-span-1 ${isLightMode ? 'bg-cyan-50 border-cyan-300' : 'bg-cyan-950/20 border-cyan-500/30'}`}>
              <div className={`text-xs font-bold uppercase ${isLightMode ? 'text-cyan-700' : 'text-cyan-400'}`}>Oran</div>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`}>%{completionRate}</div>
            </div>
          </div>
          <div className={`p-5 border rounded-3xl space-y-2 ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
            <div className={`flex items-center justify-between text-xs font-bold ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>
              <span>Günlük Turnuva İlerlemesi</span>
              <span className={`font-mono ${isLightMode ? 'text-cyan-700' : 'text-cyan-400'}`}>{finishedMatches} / {totalMatches} Maç Bitti (%{completionRate})</span>
            </div>
            <div className={`w-full h-3 rounded-full overflow-hidden border ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'formats' && (
        <div className={`border rounded-3xl p-6 space-y-6 ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
          
          <div className={`p-5 border rounded-2xl ${isLightMode ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'}`}>
             <h3 className={`font-bold text-base mb-1 ${isLightMode ? 'text-amber-800' : 'text-amber-400'}`}>🏆 Turnuva Varsayılan Tie-Break Kuralı</h3>
             <p className={`text-xs mb-4 ${isLightMode ? 'text-amber-700/80' : 'text-amber-400/70'}`}>
               Bu ayar, tüm maçların "Kule Hakemi Kurulum" ekranında varsayılan olarak seçili gelecektir. Kule hakemi maç sırasında dilerse kendi tabletinden değiştirebilir.
             </p>
             <select
               value={localInfo.tbType || 'standard'}
               onChange={(e) => setLocalInfo(prev => ({ ...prev, tbType: e.target.value as 'standard' | 'coman' }))}
               className={`w-full sm:w-2/3 px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:border-cyan-400 transition ${
                 isLightMode ? 'bg-white border-amber-300 text-slate-800' : 'bg-slate-950 border-amber-500/50 text-amber-300'
               }`}
             >
               <option value="standard">Standart Tie-Break (6'da bir saha değişimi)</option>
               <option value="coman">Coman Tie-Break (1-5-9 Asimetrik saha değişimi)</option>
             </select>
          </div>

          <div>
            <h3 className={`font-bold text-base ${isLightMode ? 'text-slate-900' : 'text-white'}`}>🎾 Kategori ve Maç Formatı Eşleştirme</h3>
            <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Her kategori için formatı ve Karar Puanı (No-Ad) ayarını buradan yönetebilirsiniz.</p>
          </div>
          {formatSavedMsg && <div className={`p-3 border rounded-xl text-xs font-bold ${isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'}`}>{formatSavedMsg}</div>}
          <div className={`space-y-3 divide-y ${isLightMode ? 'divide-slate-200' : 'divide-slate-800'}`}>
            <div className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-[10px] font-extrabold uppercase px-2 pb-2 ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`}>
               <div className="sm:col-span-4">Kategori Adı</div>
               <div className="sm:col-span-5">Skor Formatı</div>
               <div className="sm:col-span-3">Karar Puanı (Avantaj Yok)</div>
            </div>
            {distinctCategories.map((kat) => (
              <div key={kat} className="pt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className={`sm:col-span-4 font-bold text-sm truncate pr-2 ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>🎾 {kat}</div>
                <div className="sm:col-span-5">
                  <select value={localFormats[kat] || '3 Normal Set'} onChange={(e) => setLocalFormats((prev) => ({ ...prev, [kat]: e.target.value }))} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold focus:border-cyan-400 ${isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-lime-300'}`}>
                    {SCORE_FORMAT_OPTIONS.map((fmt) => (<option key={fmt} value={fmt}>{fmt}</option>))}
                  </select>
                </div>
                <div className={`sm:col-span-3 flex items-center gap-2.5 p-2.5 rounded-xl border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'}`}>
                  <input 
                    type="checkbox" 
                    id={`noad-${kat}`} 
                    checked={!!localNoAdSettings[kat]} 
                    onChange={(e) => setLocalNoAdSettings(prev => ({ ...prev, [kat]: e.target.checked }))} 
                    className={`w-4 h-4 rounded cursor-pointer ${isLightMode ? 'border-slate-300 text-cyan-600 focus:ring-cyan-600 bg-white' : 'border-slate-700 text-cyan-400 focus:ring-cyan-400 bg-slate-950'}`} 
                  />
                  <label htmlFor={`noad-${kat}`} className={`text-xs font-bold cursor-pointer select-none ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>No-Ad Oyna</label>
                </div>
              </div>
            ))}
          </div>
          <div className={`pt-4 border-t flex justify-end ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
            <button type="button" onClick={handleApplyFormats} className={`px-6 py-3 font-bold rounded-xl shadow-lg transition ${isLightMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'}`}>Formatları Kaydet ve Tüm Maçlara Uygula</button>
          </div>
        </div>
      )}

      {activeSubTab === 'referees' && (
        <div className="space-y-6">
          <div className={`border rounded-3xl p-6 space-y-4 ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold ${isLightMode ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30'}`}><ShieldCheck className="w-5 h-5" /></div>
                <div><h3 className={`font-bold text-base ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Turnuva Masası Güvenlik & Ana Şifre</h3></div>
              </div>
              <div className={`font-mono text-xs px-3 py-1.5 rounded-xl font-bold border ${isLightMode ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30'}`}>Aktif Şifre: {deskPin}</div>
            </div>
            {deskPinSuccessMsg && <div className={`p-3 border rounded-xl text-xs font-bold flex items-center gap-2 ${isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'}`}><CheckCircle2 className="w-4 h-4" /><span>{deskPinSuccessMsg}</span></div>}
            <form onSubmit={(e) => { e.preventDefault(); if (!editingDeskPin.trim()) return; updateDeskPin(editingDeskPin.trim()); setDeskPinSuccessMsg('✅ Turnuva Masası şifresi başarıyla güncellendi!'); setTimeout(() => setDeskPinSuccessMsg(''), 3500); }} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
              <div className="flex-1 space-y-1">
                <label className={`block text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Yeni Turnuva Masası Şifresi / PIN</label>
                <input type="text" maxLength={10} value={editingDeskPin} onChange={(e) => setEditingDeskPin(e.target.value)} className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-cyan-400 ${isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'}`} />
              </div>
              <button type="submit" className={`px-6 py-2.5 font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2 ${isLightMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'}`}><KeyRound className="w-4 h-4" /><span>Şifreyi Güncelle</span></button>
            </form>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`border rounded-3xl p-6 space-y-4 ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
              <h3 className={`font-bold text-base ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Yeni Saha Hakemi Ekle</h3>
              <form onSubmit={handleAddRefereeSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Hakem Adı & Soyadı</label>
                  <input type="text" value={newRefName} onChange={(e) => setNewRefName(e.target.value)} className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-cyan-400 ${isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Giriş PIN / Şifre</label>
                  <input type="text" maxLength={6} value={newRefPin} onChange={(e) => setNewRefPin(e.target.value)} className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono focus:outline-none focus:border-cyan-400 ${isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'}`} />
                </div>
                <button type="submit" className={`w-full py-3 font-bold rounded-xl shadow transition ${isLightMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'}`}>Hakemi Kaydet</button>
              </form>
            </div>
            <div className={`border rounded-3xl p-6 space-y-4 ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
              <h3 className={`font-bold text-base ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Kayıtlı Saha Hakemleri ({referees.length})</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {referees.map((ref) => (
                  <div key={ref.name} className={`p-3 rounded-xl border flex items-center justify-between ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    <div>
                      <div className={`font-bold text-sm ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>{ref.name}</div>
                      <div className={`text-xs font-mono ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>PIN: {ref.pin}</div>
                    </div>
                    <button type="button" onClick={() => deleteReferee(ref.name)} className={`p-2 rounded-lg transition ${isLightMode ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-950/30'}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'manage' && (
        <div className="space-y-6">
          <div className={`border rounded-3xl p-5 sm:p-6 space-y-4 ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'}`}><RefreshCw className={`w-5 h-5 ${isSyncingAction ? 'animate-spin' : ''}`} /></div>
                <div><h3 className={`font-bold text-base ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Canlı Bulut Senkronizasyonu</h3></div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${isLightMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'}`}><span className={`w-2 h-2 rounded-full animate-pulse ${isLightMode ? 'bg-emerald-500' : 'bg-emerald-400'}`} /><span>{cloudSyncStatus === 'connected' ? 'Buluta Bağlı' : cloudSyncStatus === 'syncing' ? 'Eşitleniyor...' : 'Çevrimdışı'}</span></span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button type="button" disabled={isSyncingAction} onClick={async () => { setIsSyncingAction(true); try { await forcePushAllToCloud(); setImportMsg('✅ Buluta zorla yazıldı!'); setTimeout(() => setImportMsg(''), 4000); } catch { setImportMsg('❌ Başarısız.'); } finally { setIsSyncingAction(false); } }} className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-2xl text-xs font-bold transition shadow ${isLightMode ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-300'}`}><Upload className="w-4 h-4" /><span>Zorla Yayınla</span></button>
              <button type="button" disabled={isSyncingAction} onClick={async () => { setIsSyncingAction(true); try { const n = await purgeOrphanMatches(); setImportMsg(n > 0 ? '🧹 ' + n + ' hayalet döküman silindi!' : '✅ Hayalet yok, temiz!'); setTimeout(() => setImportMsg(''), 4000); } catch { setImportMsg('❌ Temizlenemedi.'); } finally { setIsSyncingAction(false); } }} className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-2xl text-xs font-bold transition shadow ${isLightMode ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' : 'bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/40 text-amber-300'}`}><span>🧹</span><span>Hayalet Temizle</span></button>
              <button type="button" disabled={isSyncingAction} onClick={async () => { setIsSyncingAction(true); try { await pullFromCloudNow(); setImportMsg('✅ Veri çekildi!'); setTimeout(() => setImportMsg(''), 4000); } catch { setImportMsg('❌ Başarısız.'); } finally { setIsSyncingAction(false); } }} className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-2xl text-xs font-bold transition shadow ${isLightMode ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700' : 'bg-cyan-600/20 hover:bg-cyan-600/30 border-cyan-500/40 text-cyan-300'}`}><Download className="w-4 h-4" /><span>Buluttan Çek</span></button>
            </div>
          </div>
          
          <div className={`border rounded-3xl p-6 space-y-6 ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div><h3 className={`font-bold text-base ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Raporlama, Program Yükleme & Sıfırlama</h3></div>
              
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={handlePrintDailyReport} 
                  className={`flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl transition shadow ${isLightMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Gün Sonu Raporu Al (PDF)</span>
                </button>

                <button 
                  type="button" 
                  onClick={handleExportJson} 
                  className={`flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl transition shadow ${isLightMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-800 hover:bg-slate-700'}`}
                  title="Ham JSON Yedeği İndir"
                >
                  <Download className="w-4 h-4" />
                  <span>Yedek (JSON)</span>
                </button>
              </div>
            </div>
            
            {importMsg && <div className={`p-3.5 border rounded-2xl text-xs font-bold shadow-lg animate-in fade-in ${isLightMode ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'}`}>{importMsg}</div>}
            
            <div className="space-y-3">
              <textarea 
                rows={8} 
                value={jsonInput} 
                onChange={(e) => setJsonInput(e.target.value)} 
                placeholder="Yeni günün maç programı (JSON) verisini buraya yapıştırın..." 
                className={`w-full p-3.5 border rounded-2xl text-xs font-mono focus:outline-none focus:border-cyan-400 ${isLightMode ? 'bg-slate-50 border-slate-300 text-cyan-700' : 'bg-slate-950 border-slate-800 text-cyan-300'}`} 
              />
              
              <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
                <button 
                  type="button" 
                  disabled={isSyncingAction} 
                  onClick={async () => {
                    const onay = window.confirm("DİKKAT: Bu turnuvaya ait TÜM MAÇLAR silinecek!\n\nYeni bir maç programı yüklemeden önce her şeyi sıfırlamak istediğinize emin misiniz?");
                    if (onay) {
                      setIsSyncingAction(true);
                      const success = await wipeAllMatchesForTournament();
                      if (success) {
                        setImportMsg('🧹 Bütün maç verileri kökten silindi! Yeni maç listesini güvenle yükleyebilirsiniz.');
                        setJsonInput('');
                      } else {
                        setImportMsg('❌ Veriler silinirken hata oluştu.');
                      }
                      setIsSyncingAction(false);
                      setTimeout(() => setImportMsg(''), 5000);
                    }
                  }} 
                  className={`flex items-center gap-1.5 px-4 py-2.5 border font-bold text-xs rounded-xl transition disabled:opacity-50 ${isLightMode ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700' : 'bg-rose-600/20 hover:bg-rose-600/40 border-rose-500/50 text-rose-300'}`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Tüm Maçları Kökten Sil (Sıfırla)</span>
                </button>

                <button 
                  type="button" 
                  disabled={isSyncingAction} 
                  onClick={() => {
                    const onay = window.confirm("DİKKAT: Bütün maçların SKORLARI sıfırlanacak!\n\nMaçlar ve fikstür silinmeyecek, sadece hepsi 'Başlamadı' durumuna dönüp skorları silinecektir. Deneme/Test sonrası temizlik için idealdir. Emin misiniz?");
                    if (onay) {
                      setIsSyncingAction(true);
                      resetAllScores();
                      setImportMsg('🔄 Bütün skorlar başarıyla sıfırlandı! Fikstür ilk haline döndü.');
                      setIsSyncingAction(false);
                      setTimeout(() => setImportMsg(''), 5000);
                    }
                  }} 
                  className={`flex items-center gap-1.5 px-4 py-2.5 border font-bold text-xs rounded-xl transition disabled:opacity-50 ${isLightMode ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' : 'bg-amber-600/20 hover:bg-amber-600/40 border-amber-500/50 text-amber-300'}`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Sadece Skorları Sıfırla (Fikstürü Koru)</span>
                </button>

                <button 
                  type="button" 
                  onClick={async () => {
                    try {
                      const parsed = JSON.parse(jsonInput);
                      if (Array.isArray(parsed) && parsed.length > 0) {
                        setIsSyncingAction(true);
                        await wipeAllMatchesForTournament();
                        importMatchesList(parsed);
                        setImportMsg(`✅ ${parsed.length} maç başarıyla içe aktarıldı!`);
                        setJsonInput('');
                        setRaporAlindi(false); 
                        setTimeout(() => setImportMsg(''), 3000);
                        setIsSyncingAction(false);
                      } else {
                        setImportMsg('❌ JSON geçerli bir maç dizisi [ { ... } ] olmalıdır.');
                      }
                    } catch (e: any) {
                      setImportMsg('❌ Geçersiz JSON formatı: ' + e.message);
                    }
                  }}
                  disabled={!jsonInput.trim() || isSyncingAction} 
                  className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2 ${isLightMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'}`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Yeni Maçları Yükle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'info' && (
        <div className="space-y-5 max-w-lg">
          <div>
            <h3 className={`font-bold text-base mb-4 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>🏆 Turnuva Bilgileri</h3>
            <div className="space-y-3">
              {[
                { key: 'ad', label: 'Turnuva Adı', placeholder: 'örn. 2025 Türkiye Tenis Şampiyonası' },
                { key: 'yer', label: 'Lokasyon / Tesis', placeholder: 'örn. Ankara Tenis Kulübü' },
                { key: 'tarih', label: 'Tarih / Dönem', placeholder: 'örn. 15-20 Ağustos 2025' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</label>
                  <input type="text" value={(localInfo as any)[key]} placeholder={placeholder}
                    onChange={e => setLocalInfo(prev => ({ ...prev, [key]: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-cyan-400 ${isLightMode ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-slate-950 border-slate-800 text-white'}`} />
                </div>
              ))}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Turnuva Notu (İzleyici Ekranı Alt Bölümü)</label>
                <textarea value={localInfo.not} placeholder="örn. Tüm oyunculara başarılar dileriz!"
                  onChange={e => setLocalInfo(prev => ({ ...prev, not: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-cyan-400 resize-none ${isLightMode ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-slate-950 border-slate-800 text-white'}`} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={() => { saveTournamentInfo(localInfo); setInfoSavedMsg('✅ Kaydedildi!'); setTimeout(() => setInfoSavedMsg(''), 3000); }}
              className={`px-6 py-3 font-bold rounded-xl shadow-lg transition ${isLightMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'}`}>
              Turnuva Bilgilerini Kaydet
            </button>
            {infoSavedMsg && <span className="text-emerald-500 text-sm font-bold">{infoSavedMsg}</span>}
          </div>
        </div>
      )}

      <MatchDetailModal match={selectedMatchForModal} onClose={() => setSelectedMatchForModal(null)} />
    </div>
  );
};
