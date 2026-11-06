import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer, X, ChevronLeft, ChevronRight, Check, Settings2,
  FileText, Columns, Rows, Eye, Calendar, MapPin, Award,
  Plus, Minus, Sliders, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { MatchItem } from '../../types/tennis';
import { compareMatchesChronologically, parsePlayerDoublesNames } from '../../utils/timerUtils';

interface PrintScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: MatchItem[];
  customCourts?: string[];
  tournamentInfo?: {
    ad: string;
    yer: string;
    tarih: string;
    not: string;
  };
  isLightMode?: boolean;
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  isOpen,
  onClose,
  matches,
  customCourts = [],
  tournamentInfo,
  isLightMode = false,
}) => {
  // --- Çıktı Ayarları State'leri ---
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [courtsPerPage, setCourtsPerPage] = useState<number>(4);
  const [matchesPerPage, setMatchesPerPage] = useState<number>(5);
  
  // Yazı boyutu: 70% - 150% arası sürekli ölçeklenebilir slider & hazır butonlar
  const [fontScalePercent, setFontScalePercent] = useState<number>(100);

  const [showScores, setShowScores] = useState<boolean>(true);
  const [showReferees, setShowReferees] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [stackDoubles, setStackDoubles] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState<string>(() => tournamentInfo?.ad || 'Tenis Turnuvası');
  const [customSubtitle, setCustomSubtitle] = useState<string>('GÜNLÜK MAÇ PROGRAMI / ORDER OF PLAY');
  const [customDate, setCustomDate] = useState<string>(() => {
    if (tournamentInfo?.tarih && tournamentInfo.tarih.trim()) return tournamentInfo.tarih;
    return new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  });
  const [customVenue, setCustomVenue] = useState<string>(() => tournamentInfo?.yer || '');
  const [customNotes, setCustomNotes] = useState<string>(() => tournamentInfo?.not || '');
  const [chiefRefereeName, setChiefRefereeName] = useState<string>('Başhakemlik');

  // Sayfa Gezinme State'i
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [printTargetPage, setPrintTargetPage] = useState<'ALL' | number>('ALL');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Tüm Kortların Listesi (Doğal Sıralı)
  const distinctCourts = useMemo(() => {
    const list = new Set<string>();
    customCourts.forEach((c) => { if (c && c.trim()) list.add(c.trim()); });
    matches.forEach((m) => { if (m.Kort && m.Kort.trim()) list.add(m.Kort.trim()); });
    return Array.from(list).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [customCourts, matches]);

  // Seçilen Kortlar (Varsayılan olarak hepsi seçili)
  const [selectedCourts, setSelectedCourts] = useState<string[]>(() => distinctCourts);

  // Kort listesi değiştiğinde eksik kalanları güncelle
  React.useEffect(() => {
    setSelectedCourts((prev) => {
      const valid = prev.filter((c) => distinctCourts.includes(c));
      return valid.length > 0 ? valid : distinctCourts;
    });
  }, [distinctCourts]);

  const toggleCourtSelection = (courtName: string) => {
    setSelectedCourts((prev) => {
      if (prev.includes(courtName)) {
        if (prev.length <= 1) return prev; // En az bir kort seçili kalmalı
        return prev.filter((c) => c !== courtName);
      } else {
        return [...prev, courtName].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      }
    });
  };

  const selectAllCourts = () => setSelectedCourts(distinctCourts);

  // Kort başına sıralanmış maçlar haritası
  const courtMatchesMap = useMemo(() => {
    const map = new Map<string, MatchItem[]>();
    selectedCourts.forEach((court) => {
      const courtMatches = matches
        .filter((m) => m.Kort === court)
        .sort((a, b) => compareMatchesChronologically(a, b, matches));
      map.set(court, courtMatches);
    });
    return map;
  }, [matches, selectedCourts]);

  // Maksimum maç sayısı
  const maxMatchesInSelectedCourts = useMemo(() => {
    let max = 0;
    selectedCourts.forEach((c) => {
      const count = courtMatchesMap.get(c)?.length || 0;
      if (count > max) max = count;
    });
    return Math.max(1, max);
  }, [selectedCourts, courtMatchesMap]);

  // --- SAYFALANDIRMA HESAPLAMA (PAGINATION SLICES) ---
  interface PageSlice {
    pageNumber: number;
    totalCalculatedPages: number;
    courts: string[];
    matchStartIndex: number; // 0-indexed
    matchEndIndex: number;   // exclusive
    matchRangeLabel: string;
    courtRangeLabel: string;
  }

  const generatedPages = useMemo<PageSlice[]>(() => {
    if (selectedCourts.length === 0) return [];

    // 1. Yatay Dilimler (Kortlar)
    const effectiveCourtsPerPage = courtsPerPage >= 99 ? selectedCourts.length : Math.max(1, courtsPerPage);
    const courtChunks: string[][] = [];
    for (let i = 0; i < selectedCourts.length; i += effectiveCourtsPerPage) {
      courtChunks.push(selectedCourts.slice(i, i + effectiveCourtsPerPage));
    }

    // 2. Dikey Dilimler (Maç Sıraları)
    const effectiveMatchesPerPage = matchesPerPage >= 99 ? maxMatchesInSelectedCourts : Math.max(1, matchesPerPage);
    const matchRowChunks: { start: number; end: number }[] = [];
    for (let i = 0; i < maxMatchesInSelectedCourts; i += effectiveMatchesPerPage) {
      matchRowChunks.push({
        start: i,
        end: Math.min(i + effectiveMatchesPerPage, maxMatchesInSelectedCourts),
      });
    }

    const pages: PageSlice[] = [];
    let pageNum = 1;

    // Sayfa akışı: Teniste standart format: Önce yatay kort blokları, sonra alt sıralar
    matchRowChunks.forEach((rowChunk) => {
      courtChunks.forEach((courtChunk) => {
        const firstCourt = courtChunk[0];
        const lastCourt = courtChunk[courtChunk.length - 1];
        const courtRangeLabel = firstCourt === lastCourt ? firstCourt : `${firstCourt} - ${lastCourt}`;
        const matchRangeLabel = `${rowChunk.start + 1}. - ${rowChunk.end}. Sıra Maçlar`;

        pages.push({
          pageNumber: pageNum++,
          totalCalculatedPages: 0,
          courts: courtChunk,
          matchStartIndex: rowChunk.start,
          matchEndIndex: rowChunk.end,
          matchRangeLabel,
          courtRangeLabel,
        });
      });
    });

    const total = pages.length;
    return pages.map((p) => ({ ...p, totalCalculatedPages: total }));
  }, [selectedCourts, courtsPerPage, matchesPerPage, maxMatchesInSelectedCourts]);

  // Sayfa indeksi sınır koruması
  const totalPages = generatedPages.length;
  const safeCurrentIndex = Math.min(Math.max(0, currentPageIndex), Math.max(0, totalPages - 1));
  const activePreviewPage = generatedPages[safeCurrentIndex];

  // Yazdırılacak sayfalar listesi
  const pagesToPrint = useMemo(() => {
    if (printTargetPage === 'ALL') return generatedPages;
    return generatedPages.filter((p) => p.pageNumber === printTargetPage);
  }, [generatedPages, printTargetPage]);

  // --- YAZDIRMA İŞLEMİ (WINDOW.PRINT İLE KESİNTİSİZ PORTAL YAZDIRMA) ---
  const handlePrint = () => {
    setIsPrinting(true);
    // Küçük bir gecikmeyle tarayıcının DOM stillerini işlemesini bekle ve yazdır
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. KULLANICI ARAYÜZÜ MODAL KAPSAYICISI */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
        <div className={`flex flex-col w-full max-w-[1460px] h-[95vh] rounded-3xl shadow-2xl border overflow-hidden ${
          isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}>
          
          {/* ÜST BAŞLIK & EYLEMLER */}
          <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b shrink-0 ${
            isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Printer className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight">Maç Programı Çıktısı (PDF / Yazdır)</h2>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    A4 {orientation === 'landscape' ? 'Yatay' : 'Dikey'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Toplam {totalPages} Sayfa
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Kort başı maç sayısı, yazı boyutu ve sayfa dağılımını özelleştirip çok sayfalı tam A4 PDF alın
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Yazdır Butonu */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/25 active:scale-95 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Yazdır / PDF Olarak Kaydet</span>
              </button>

              {/* Kapat Butonu */}
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl border transition ${
                  isLightMode ? 'hover:bg-slate-100 text-slate-600 border-slate-200' : 'hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ANA GÖVDE: SOL PANEL (AYARLAR) + SAĞ PANEL (CANLI A4 ÖNİZLEME) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* SOL PANEL: ÇIKTI AYARLARI (KULLANICI TALEBİNE GÖRE GENİŞLETİLMİŞ) */}
            <div className={`w-full lg:w-[410px] p-4 sm:p-5 border-r overflow-y-auto space-y-5 shrink-0 ${
              isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900/95 border-slate-800'
            }`}>
              
              {/* 1. SAYFA YÖNÜ (ORIENTATION) */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>1. Sayfa Yönü (A4)</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400 capitalize">{orientation}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOrientation('landscape');
                      if (courtsPerPage === 3) setCourtsPerPage(4);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition gap-1.5 ${
                      orientation === 'landscape'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                        : isLightMode ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-9 h-5 border-2 border-current rounded-sm"></div>
                    <span>Yatay (Landscape)</span>
                    <span className="text-[10px] opacity-75 font-normal">Çoklu Kort İçin İdeal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrientation('portrait');
                      if (courtsPerPage === 4) setCourtsPerPage(3);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition gap-1.5 ${
                      orientation === 'portrait'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                        : isLightMode ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-5 h-9 border-2 border-current rounded-sm"></div>
                    <span>Dikey (Portrait)</span>
                    <span className="text-[10px] opacity-75 font-normal">Az Kort İçin İdeal</span>
                  </button>
                </div>
              </div>

              {/* 2. KORT BAŞINA MAÇ SIRA SAYISI (GENİŞLETİLMİŞ SEÇENEKLER + STEPPER) */}
              <div className="space-y-2.5 p-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Rows className="w-3.5 h-3.5" />
                    <span>2. Kort Başı Maç Sayısı (Sıra)</span>
                  </label>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {matchesPerPage >= 99 ? 'Sınırsız (Tümü)' : `${matchesPerPage} Maç`}
                  </span>
                </div>

                {/* Hızlı Seçim Butonları (1'den 12'ye kadar zengin seçenekler) */}
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMatchesPerPage(num)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                        matchesPerPage === num
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow'
                          : isLightMode ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Hassas Ayar: Artı/Eksi Stepper ve Özel Değer */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMatchesPerPage((prev) => Math.max(1, (prev >= 99 ? maxMatchesInSelectedCourts : prev) - 1))}
                      className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white active:scale-95"
                      title="1 Azalt"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold px-2">
                      Özel: {matchesPerPage >= 99 ? 'Tümü' : matchesPerPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMatchesPerPage((prev) => Math.min(30, (prev >= 99 ? 1 : prev) + 1))}
                      className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white active:scale-95"
                      title="1 Arttır"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMatchesPerPage(99)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      matchesPerPage >= 99
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                        : isLightMode ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Tümünü Tek Sayfaya Sığdır
                  </button>
                </div>
              </div>

              {/* 3. YAZI BOYUTU (GENİŞLETİLMİŞ ÖLÇEK & HASSAS SLIDER) */}
              <div className="space-y-2.5 p-3 rounded-2xl border border-amber-500/30 bg-amber-950/15">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>3. Yazı Boyutu (Font Ölçeği)</span>
                  </label>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    %{fontScalePercent}
                  </span>
                </div>

                {/* Hazır Önayarlı Ölçekler */}
                <div className="grid grid-cols-6 gap-1">
                  {[
                    { label: 'XS', val: 75, name: 'Çok Küçük (%75)' },
                    { label: 'SM', val: 85, name: 'Küçük (%85)' },
                    { label: 'MD', val: 100, name: 'Normal (%100)' },
                    { label: 'LG', val: 115, name: 'Büyük (%115)' },
                    { label: 'XL', val: 130, name: 'Çok Büyük (%130)' },
                    { label: '2XL', val: 150, name: 'Pano Boyutu (%150)' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setFontScalePercent(preset.val)}
                      title={preset.name}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                        fontScalePercent === preset.val
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                          : isLightMode ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Hassas Slider Çubuğu (%70 - %160) */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-mono text-slate-400">%70</span>
                  <input
                    type="range"
                    min="70"
                    max="160"
                    step="5"
                    value={fontScalePercent}
                    onChange={(e) => setFontScalePercent(Number(e.target.value))}
                    className="flex-1 accent-amber-400 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                  />
                  <span className="text-[10px] font-mono text-slate-400">%160</span>
                </div>
              </div>

              {/* 4. SAYFA BAŞINA KORT SAYISI (GENİŞLETİLMİŞ & ESNEK SEÇENEKLER) */}
              <div className="space-y-2.5 p-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5" />
                    <span>4. Sayfa Başına Kort Sayısı</span>
                  </label>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {courtsPerPage >= 99 ? 'Tüm Kortlar' : `${courtsPerPage} Kort`}
                  </span>
                </div>

                {/* Hızlı Seçim Butonları (1'den 16'ya kadar zengin seçenekler) */}
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCourtsPerPage(num)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                        courtsPerPage === num
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow'
                          : isLightMode ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {num} Kort
                    </button>
                  ))}
                </div>

                {/* Hassas Ayar: Artı/Eksi Stepper ve Özel Değer */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCourtsPerPage((prev) => Math.max(1, (prev >= 99 ? selectedCourts.length : prev) - 1))}
                      className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white active:scale-95"
                      title="1 Kort Azalt"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold px-2">
                      Özel: {courtsPerPage >= 99 ? 'Tümü' : courtsPerPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCourtsPerPage((prev) => Math.min(30, (prev >= 99 ? 1 : prev) + 1))}
                      className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white active:scale-95"
                      title="1 Kort Arttır"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCourtsPerPage(99)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      courtsPerPage >= 99
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                        : isLightMode ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Tüm Kortları Sığdır ({selectedCourts.length})
                  </button>
                </div>
              </div>

              {/* SAYFA BÖLÜMÜ BİLGİ ROZETİ */}
              <div className={`p-3 rounded-2xl border space-y-1 ${
                isLightMode ? 'bg-emerald-50/80 border-emerald-200 text-slate-800' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
              }`}>
                <div className="flex items-center justify-between font-black text-xs">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Sayfalandırma Durumu:</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs">
                    Toplam {totalPages} Sayfa
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Seçili {selectedCourts.length} kort ve en çok {maxMatchesInSelectedCourts} maç sırası için {courtsPerPage >= 99 ? selectedCourts.length : courtsPerPage}&apos;er kort ve {matchesPerPage >= 99 ? maxMatchesInSelectedCourts : matchesPerPage}&apos;er sıra olarak düzenlendi.
                </p>
              </div>

              {/* DAHİL EDİLECEK KORTLAR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>🏟️ Kort Filtresi ({selectedCourts.length}/{distinctCourts.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={selectAllCourts}
                    className="text-[11px] font-bold text-cyan-400 hover:underline"
                  >
                    Tümünü Seç
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-xl border bg-slate-950/40 border-slate-800">
                  {distinctCourts.map((c) => {
                    const isChecked = selectedCourts.includes(c);
                    const count = courtMatchesMap.get(c)?.length || 0;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCourtSelection(c)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                          isChecked
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded flex items-center justify-center border ${isChecked ? 'bg-cyan-400 text-slate-950 border-cyan-400' : 'border-slate-600'}`}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span>{c}</span>
                        <span className="text-[10px] opacity-70 font-mono">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GÖSTERİM VE DETAY AYARLARI */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>5. Görünüm & İçerik Tercihleri</span>
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-xl border bg-slate-950/40 border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showScores}
                      onChange={(e) => setShowScores(e.target.checked)}
                      className="rounded accent-cyan-500"
                    />
                    <span className="font-bold">Skorları Dahil Et</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl border bg-slate-950/40 border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showReferees}
                      onChange={(e) => setShowReferees(e.target.checked)}
                      className="rounded accent-cyan-500"
                    />
                    <span className="font-bold">Hakem İsimleri</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl border bg-slate-950/40 border-slate-800 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={showSignatures}
                      onChange={(e) => setShowSignatures(e.target.checked)}
                      className="rounded accent-cyan-500"
                    />
                    <span className="font-bold">Alt Kısımda Yetkili İmza Kutuları</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border bg-cyan-950/30 border-cyan-500/40 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={stackDoubles}
                      onChange={(e) => setStackDoubles(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <div className="flex flex-col">
                      <span className="font-black text-cyan-300">👥 Çiftler Partnerlerini Alt Alta Yaz</span>
                      <span className="text-[10px] text-slate-400 font-normal">Dar kort sütunlarında 2. oyuncu isminin sığmama sorununu önler</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* BAŞLIK & METİN DÜZENLEME */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>📝 Turnuva Başlık Bilgileri</span>
                </label>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Turnuva Başlığı:</span>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold ${
                        isLightMode ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-800'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400">Tarih:</span>
                      <input
                        type="text"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold ${
                          isLightMode ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Tesis / Yer:</span>
                      <input
                        type="text"
                        value={customVenue}
                        onChange={(e) => setCustomVenue(e.target.value)}
                        placeholder="Örn: Merkez Kortlar"
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold ${
                          isLightMode ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Duyuru / Özel Not (Opsiyonel):</span>
                    <input
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Örn: Maçlar takiben oynanacaktır..."
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs ${
                        isLightMode ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* YAZDIRILACAK SAYFA HEDEFİ */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>6. Yazdırılacak Sayfa Hedefi</span>
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPrintTargetPage('ALL')}
                    className={`flex-1 py-1.5 rounded-xl border font-bold transition ${
                      printTargetPage === 'ALL'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Tüm Sayfalar ({totalPages} Sayfa)
                  </button>
                  <select
                    value={printTargetPage === 'ALL' ? 'ALL' : printTargetPage}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'ALL') setPrintTargetPage('ALL');
                      else {
                        const num = Number(val);
                        setPrintTargetPage(num);
                        setCurrentPageIndex(num - 1);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl border bg-slate-950 border-slate-800 text-slate-200 font-bold"
                  >
                    <option value="ALL">Tümü</option>
                    {generatedPages.map((p) => (
                      <option key={p.pageNumber} value={p.pageNumber}>
                        Sayfa {p.pageNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* SAĞ PANEL: CANLI A4 ÖNİZLEME & SAYFA KONTROLLERİ */}
            <div className="flex-1 flex flex-col bg-slate-950/70 overflow-hidden">
              
              {/* ÖNİZLEME ÜST KONTROL ÇUBUĞU */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-950/95 shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-300">Canlı A4 Sayfa Önizlemesi</span>
                  {activePreviewPage && (
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800">
                      {activePreviewPage.courtRangeLabel} • {activePreviewPage.matchRangeLabel}
                    </span>
                  )}
                </div>

                {/* SAYFA DEĞİŞTİRME BUTONLARI & HIZLI SAYFA NUMARALARI */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeCurrentIndex <= 0}
                    onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                    className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Önceki Sayfa"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {generatedPages.map((p, idx) => (
                      <button
                        key={p.pageNumber}
                        type="button"
                        onClick={() => setCurrentPageIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition border ${
                          idx === safeCurrentIndex
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {p.pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={safeCurrentIndex >= totalPages - 1}
                    onClick={() => setCurrentPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                    className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Sonraki Sayfa"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ÖNİZLEME KAĞIT ALANI (SCROLLABLE VIEWPORT) */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center">
                {activePreviewPage ? (
                  <div
                    className={`bg-white text-slate-900 shadow-2xl transition-all rounded-sm border border-slate-400 flex flex-col justify-between ${
                      orientation === 'landscape'
                        ? 'w-[990px] h-[700px] min-h-[700px] max-h-[700px]'
                        : 'w-[700px] h-[990px] min-h-[990px] max-h-[990px]'
                    }`}
                    style={{
                      padding: '24px 28px',
                      boxSizing: 'border-box',
                      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    }}
                  >
                    <SingleSchedulePageContent
                      slice={activePreviewPage}
                      courtMatchesMap={courtMatchesMap}
                      tournamentTitle={customTitle}
                      subtitle={customSubtitle}
                      date={customDate}
                      venue={customVenue}
                      notes={customNotes}
                      fontScalePercent={fontScalePercent}
                      showScores={showScores}
                      showReferees={showReferees}
                      showSignatures={showSignatures}
                      stackDoubles={stackDoubles}
                      chiefReferee={chiefRefereeName}
                    />
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    Gösterilecek maç veya seçili kort bulunamadı.
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* 2. DEDİKE YAZDIRMA PORTALI (REACT PORTAL TO DOCUMENT.BODY) */}
      {/* Bu portal doğrudan <body> elementine bağlanır, modal içerisindeki overflow-hidden ve fixed kısıtlamalarından tamamen muaftır! */}
      {typeof document !== 'undefined' && createPortal(
        <div id="printable-schedule-portal">
          <style dangerouslySetInnerHTML={{
            __html: `
              /* Normal ekran görünümünde portal DOM'da hazır bekler, görünmez */
              #printable-schedule-portal {
                position: fixed;
                left: -9999px;
                top: -9999px;
                width: 297mm;
                visibility: hidden;
                pointer-events: none;
                z-index: -100;
              }

              /* SADECE YAZDIRMA (PRINT & PDF) SIRASINDA AKTİF OLUR */
              @media print {
                @page {
                  size: A4 ${orientation};
                  margin: 6mm 8mm;
                }

                html, body {
                  background: #fff !important;
                  color: #000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: visible !important;
                  height: auto !important;
                  min-height: auto !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                /* Ana sayfa ve modal ağacını gizle */
                #root,
                .fixed.inset-0,
                [role="dialog"] {
                  display: none !important;
                  visibility: hidden !important;
                }

                /* Sadece ve sadece yazdırılacak sayfalar portalını göster */
                #printable-schedule-portal {
                  display: block !important;
                  visibility: visible !important;
                  position: static !important;
                  left: auto !important;
                  top: auto !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  z-index: auto !important;
                }

                #printable-schedule-portal * {
                  visibility: visible !important;
                }

                /* HER A4 SAYFASI İÇİN KESİN BOYUT VE SAYFA SONU (PAGE BREAK) */
                .print-a4-page {
                  width: 100% !important;
                  /* A4 kenar payları düşülmüş tam sayfa yüksekliği */
                  height: ${orientation === 'landscape' ? '194mm' : '281mm'} !important;
                  max-height: ${orientation === 'landscape' ? '194mm' : '281mm'} !important;
                  min-height: ${orientation === 'landscape' ? '194mm' : '281mm'} !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  box-sizing: border-box !important;
                  overflow: hidden !important;
                  padding: 4mm 2mm !important;
                  background: #fff !important;
                  color: #000 !important;
                }

                .print-a4-page:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                }
              }
            `
          }} />

          {pagesToPrint.map((slice) => (
            <div key={slice.pageNumber} className="print-a4-page">
              <SingleSchedulePageContent
                slice={slice}
                courtMatchesMap={courtMatchesMap}
                tournamentTitle={customTitle}
                subtitle={customSubtitle}
                date={customDate}
                venue={customVenue}
                notes={customNotes}
                fontScalePercent={fontScalePercent}
                showScores={showScores}
                showReferees={showReferees}
                showSignatures={showSignatures}
                stackDoubles={stackDoubles}
                chiefReferee={chiefRefereeName}
              />
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

// =========================================================================
// TEK BİR SAYFANIN ŞIK VE SADE TENNIS ORDER OF PLAY ÇIKTI BİLEŞENİ
// =========================================================================

interface SinglePageContentProps {
  slice: {
    pageNumber: number;
    totalCalculatedPages: number;
    courts: string[];
    matchStartIndex: number;
    matchEndIndex: number;
    matchRangeLabel: string;
    courtRangeLabel: string;
  };
  courtMatchesMap: Map<string, MatchItem[]>;
  tournamentTitle: string;
  subtitle: string;
  date: string;
  venue: string;
  notes: string;
  fontScalePercent: number; // 70 - 160
  showScores: boolean;
  showReferees: boolean;
  showSignatures: boolean;
  stackDoubles?: boolean;
  chiefReferee: string;
}

const SingleSchedulePageContent: React.FC<SinglePageContentProps> = ({
  slice,
  courtMatchesMap,
  tournamentTitle,
  subtitle,
  date,
  venue,
  notes,
  fontScalePercent,
  showScores,
  showReferees,
  showSignatures,
  stackDoubles = true,
  chiefReferee,
}) => {
  // Dinamik oransal font ve boşluk hesabı
  const scale = fontScalePercent / 100;
  const courtCount = slice.courts.length;
  // Çoklu kort sıkıştırma katsayısı: 7 ve üzeri kortta sütunların rahat sığması için fontları ve dolguları oransal dengeler
  const courtFactor = courtCount <= 4 ? 1 : courtCount <= 6 ? 0.96 : courtCount <= 8 ? 0.9 : courtCount <= 10 ? 0.82 : 0.74;
  const effectiveScale = scale * courtFactor;
  
  const dynStyles = useMemo(() => ({
    title: `${Math.round(20 * scale)}px`,
    subtitle: `${Math.max(10, Math.round(11 * scale))}px`,
    courtHeader: `${Math.max(9, Math.round(13 * effectiveScale))}px`,
    matchNum: `${Math.max(8.5, Math.round(11 * effectiveScale))}px`,
    matchTime: `${Math.max(8, Math.round(10.5 * effectiveScale))}px`,
    category: `${Math.max(7.5, Math.round(10 * effectiveScale))}px`,
    playerName: `${Math.max(8.5, Math.round(12 * effectiveScale))}px`,
    score: `${Math.max(8, Math.round(10.5 * effectiveScale))}px`,
    referee: `${Math.max(7.5, Math.round(9.5 * effectiveScale))}px`,
    padding: courtCount >= 9
      ? '2px 2px'
      : courtCount >= 7
        ? '3px 3px'
        : scale < 0.85 
          ? '3px 4px' 
          : scale > 1.25 
            ? '7px 8px' 
            : '5px 6px',
  }), [scale, effectiveScale, courtCount]);

  // Bu sayfadaki maksimum satır sayısı
  const rowCount = Math.max(1, slice.matchEndIndex - slice.matchStartIndex);
  const rowIndices = Array.from({ length: rowCount }, (_, i) => slice.matchStartIndex + i);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      
      {/* 1. ÜST BAŞLIK (OFFICIAL TENNIS ORDER OF PLAY HEADER) */}
      <div className="border-b-2 border-black pb-2 mb-2 shrink-0">
        <div className="flex items-start justify-between gap-3">
          
          {/* Sol: Turnuva ve Düzen Bilgisi */}
          <div>
            <h1
              className="font-black uppercase tracking-wider text-black leading-tight"
              style={{ fontSize: dynStyles.title }}
            >
              {tournamentTitle || 'TENİS TURNUVASI'}
            </h1>
            <div
              className="font-bold tracking-widest text-slate-700 uppercase mt-0.5"
              style={{ fontSize: dynStyles.subtitle }}
            >
              {subtitle}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 font-bold text-black">
                <Calendar className="w-3.5 h-3.5" />
                <span>{date}</span>
              </span>
              {venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{venue}</span>
                </span>
              )}
            </div>
          </div>

          {/* Sağ: Sayfa Numarası & Resmi Rozet */}
          <div className="text-right flex flex-col items-end shrink-0">
            <div className="px-3 py-1 bg-black text-white font-mono font-black text-xs rounded-sm tracking-widest uppercase">
              SAYFA {slice.pageNumber} / {slice.totalCalculatedPages || 1}
            </div>
            <div className="text-[10px] text-slate-700 font-mono mt-1 font-bold">
              Kortlar: {slice.courtRangeLabel}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {slice.matchRangeLabel}
            </div>
          </div>

        </div>

        {/* Özel Duyuru / Not Varsa */}
        {notes && (
          <div className="mt-1.5 text-xs bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-slate-800 rounded font-medium italic">
            📢 <strong>Duyuru / Not:</strong> {notes}
          </div>
        )}
      </div>

      {/* 2. ANA TABLO: KORT SÜTUNLARI & MAÇ SATIRLARI */}
      {/* flex-1 ve min-h-0 ile sayfadan asla taşmaz */}
      <div className="flex-1 min-h-0 flex flex-col border-2 border-black overflow-hidden mb-2">
        
        {/* Sütun Başlıkları (Kort İsimleri) */}
        <div
          className="grid border-b-2 border-black bg-slate-900 text-white font-black uppercase tracking-wider text-center shrink-0"
          style={{ gridTemplateColumns: `repeat(${slice.courts.length}, minmax(0, 1fr))` }}
        >
          {slice.courts.map((court) => (
            <div
              key={court}
              className="border-r border-slate-700 last:border-r-0 py-1.5 truncate"
              style={{ fontSize: dynStyles.courtHeader }}
            >
              {court}
            </div>
          ))}
        </div>

        {/* Maç Satırları (Her satır eşit dikey pay alır) */}
        <div
          className="flex-1 min-h-0 grid"
          style={{
            gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
          }}
        >
          {rowIndices.map((rowIndex, rowIdx) => (
            <div
              key={rowIndex}
              className={`grid border-b border-black last:border-b-0 min-h-0 overflow-hidden ${
                rowIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
              }`}
              style={{ gridTemplateColumns: `repeat(${slice.courts.length}, minmax(0, 1fr))` }}
            >
              {slice.courts.map((court) => {
                const courtMatches = courtMatchesMap.get(court) || [];
                const match = courtMatches[rowIndex];

                if (!match) {
                  return (
                    <div
                      key={court}
                      className="border-r border-slate-300 last:border-r-0 p-1 flex items-center justify-center text-[10px] text-slate-300 italic select-none"
                    >
                      —
                    </div>
                  );
                }

                const isFinished = ['Bitti', 'Retired', 'Walkover'].includes(match.Durum);
                const isLive = match.Durum === 'Oynaniyor';
                const p1Winner = match.Kazanan === match['Oyuncu 1'];
                const p2Winner = match.Kazanan === match['Oyuncu 2'];

                return (
                  <div
                    key={court}
                    className="border-r border-black last:border-r-0 flex flex-col justify-between overflow-hidden"
                    style={{ padding: dynStyles.padding }}
                  >
                    {/* Hücre Üstü: Sıra & Saat & Kategori */}
                    <div className="shrink-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-0.5">
                        <span
                          className="font-mono font-black text-black"
                          style={{ fontSize: dynStyles.matchNum }}
                        >
                          {rowIndex + 1}. MAÇ
                        </span>
                        <span
                          className="font-mono font-bold text-slate-800 px-1 py-0.2 bg-slate-100 rounded border border-slate-300"
                          style={{ fontSize: dynStyles.matchTime }}
                        >
                          {match.Saat || 'Takiben'}
                        </span>
                      </div>

                      {match.Kategori && (
                        <div
                          className="font-bold text-slate-600 truncate uppercase leading-tight"
                          style={{ fontSize: dynStyles.category }}
                        >
                          {match.Kategori}
                        </div>
                      )}
                    </div>

                    {/* Hücre Ortası: Oyuncular */}
                    {(() => {
                      const renderTeamMember = (name: string, isWinner: boolean) => {
                        const { isDoubles, partners } = parsePlayerDoublesNames(name);
                        if (!stackDoubles || !isDoubles || partners.length <= 1) {
                          return (
                            <div className="flex items-center gap-1 truncate">
                              {isWinner && <span className="text-black font-black shrink-0">✓</span>}
                              <span className="truncate" style={{ fontSize: dynStyles.playerName }}>
                                {name}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col min-w-0 leading-tight">
                            {partners.map((partner, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1 truncate">
                                {pIdx === 0 && isWinner ? (
                                  <span className="text-black font-black shrink-0">✓</span>
                                ) : isWinner ? (
                                  <span className="w-2.5 shrink-0"></span>
                                ) : null}
                                <span className="truncate" style={{ fontSize: dynStyles.playerName }}>
                                  {partner}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      };

                      return (
                        <div className="py-0.5 space-y-0.5 min-h-0 flex flex-col justify-center">
                          {/* Oyuncu 1 */}
                          <div className={p1Winner ? 'font-black text-black' : 'font-medium text-slate-800'}>
                            {renderTeamMember(match['Oyuncu 1'], p1Winner)}
                          </div>

                          {/* VS Ayracı */}
                          <div className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-widest leading-none my-0.5">
                            vs
                          </div>

                          {/* Oyuncu 2 */}
                          <div className={p2Winner ? 'font-black text-black' : 'font-medium text-slate-800'}>
                            {renderTeamMember(match['Oyuncu 2'], p2Winner)}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Hücre Altı: Skor / Durum / Hakem */}
                    <div className="pt-0.5 border-t border-slate-200 space-y-0.5 shrink-0">
                      {showScores && (
                        <div>
                          {isFinished ? (
                            <div
                              className="flex items-center justify-between bg-slate-100 px-1 py-0.5 rounded border border-slate-300 font-mono"
                              style={{ fontSize: dynStyles.score }}
                            >
                              <span className="font-bold text-black">SKOR:</span>
                              <span className="font-black text-black">{match.Skor || 'Bitti'}</span>
                            </div>
                          ) : isLive ? (
                            <div
                              className="flex items-center justify-between bg-emerald-50 px-1 py-0.5 rounded border border-emerald-300 font-mono"
                              style={{ fontSize: dynStyles.score }}
                            >
                              <span className="font-bold text-emerald-800">CANLI:</span>
                              <span className="font-black text-emerald-900">{match.Skor || 'Oynanıyor'}</span>
                            </div>
                          ) : (
                            <div className="h-3.5 border border-dashed border-slate-300 rounded bg-white flex items-center justify-center text-[8px] text-slate-400">
                              Skor Notu
                            </div>
                          )}
                        </div>
                      )}

                      {showReferees && (match.Gorevli_Hakem || match.Son_Hakem) && (
                        <div
                          className="text-slate-500 truncate text-right font-medium leading-none"
                          style={{ fontSize: dynStyles.referee }}
                        >
                          H: {match.Gorevli_Hakem || match.Son_Hakem}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </div>

      {/* 3. ALT BİLGİ & İMZALAR */}
      <div className="pt-1.5 border-t-2 border-black shrink-0">
        <div className="flex items-end justify-between gap-4">
          
          {/* Sol: Bilgi Metni & Tarih Saat */}
          <div className="text-[9px] text-slate-500 font-mono space-y-0.5">
            <div>Program Basım Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div>* Maç saatleri tahmini olup maçlar önceki maçın bitimini takiben başlayabilir.</div>
          </div>

          {/* Sağ: Resmi Yetkili İmzaları */}
          {showSignatures && (
            <div className="flex items-center gap-6 text-center">
              <div className="space-y-3">
                <div className="font-black text-black uppercase tracking-wider text-[10px]">
                  Turnuva Başhakemi
                </div>
                <div className="border-b border-black w-32 pb-0.5 text-[9px] text-slate-400 italic">
                  İmza
                </div>
              </div>
              <div className="space-y-3">
                <div className="font-black text-black uppercase tracking-wider text-[10px]">
                  Turnuva Direktörü
                </div>
                <div className="border-b border-black w-32 pb-0.5 text-[9px] text-slate-400 italic">
                  İmza
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
