import React, { useState, useMemo } from 'react';
import {
  Printer, X, ChevronLeft, ChevronRight, Check, Settings2,
  FileText, Columns, Rows, Eye, Calendar, MapPin, Award
} from 'lucide-react';
import { MatchItem } from '../../types/tennis';
import { compareMatchesChronologically } from '../../utils/timerUtils';

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
  const [fontSize, setFontSize] = useState<'compact' | 'normal' | 'large'>('normal');
  const [showScores, setShowScores] = useState<boolean>(true);
  const [showReferees, setShowReferees] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
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
    const effectiveCourtsPerPage = courtsPerPage >= 99 ? selectedCourts.length : courtsPerPage;
    const courtChunks: string[][] = [];
    for (let i = 0; i < selectedCourts.length; i += effectiveCourtsPerPage) {
      courtChunks.push(selectedCourts.slice(i, i + effectiveCourtsPerPage));
    }

    // 2. Dikey Dilimler (Maç Sıraları)
    const effectiveMatchesPerPage = matchesPerPage >= 99 ? maxMatchesInSelectedCourts : matchesPerPage;
    const matchRowChunks: { start: number; end: number }[] = [];
    for (let i = 0; i < maxMatchesInSelectedCourts; i += effectiveMatchesPerPage) {
      matchRowChunks.push({
        start: i,
        end: Math.min(i + effectiveMatchesPerPage, maxMatchesInSelectedCourts),
      });
    }

    const pages: PageSlice[] = [];
    let pageNum = 1;

    // Sayfa yapısı: Önce dikey sıralar, sonra yatay kortlar veya tam tersi.
    // Teniste standart: Sayfa 1: Kort 1-4 (Maç 1-5), Sayfa 2: Kort 5-8 (Maç 1-5), sonra Maç 6-10.
    matchRowChunks.forEach((rowChunk) => {
      courtChunks.forEach((courtChunk) => {
        const firstCourt = courtChunk[0];
        const lastCourt = courtChunk[courtChunk.length - 1];
        const courtRangeLabel = firstCourt === lastCourt ? firstCourt : `${firstCourt} - ${lastCourt}`;
        const matchRangeLabel = `${rowChunk.start + 1}. - ${rowChunk.end}. Maçlar`;

        pages.push({
          pageNumber: pageNum++,
          totalCalculatedPages: 0, // Aşağıda güncellenecek
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

  // Yazdırma İşlemi (A4 Print / Save as PDF)
  const handlePrint = () => {
    // Tarayıcının yazdırma penceresini aç
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
      {/* MODAL KAPSAYICI */}
      <div className={`flex flex-col w-full max-w-[1440px] h-[95vh] rounded-3xl shadow-2xl border overflow-hidden ${
        isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        
        {/* ÜST BAŞLIK & EYLEMLER */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b shrink-0 ${
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
                  A4 Düzen
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Turnuva panosu, kort kapıları veya resmi duyuru için şık ve sade Order of Play çıktısı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Hızlı Yazdır Butonu */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow-lg shadow-cyan-500/25 active:scale-95 transition"
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
          
          {/* SOL PANEL: ÇIKTI AYARLARI (SCROLLABLE) */}
          <div className={`w-full lg:w-96 p-4 sm:p-5 border-r overflow-y-auto space-y-5 shrink-0 ${
            isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}>
            
            {/* SAYFA YÖNÜ (ORIENTATION) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>1. Sayfa Yönü (A4)</span>
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
                  <div className="w-8 h-5 border-2 border-current rounded-sm"></div>
                  <span>Yatay (Landscape)</span>
                  <span className="text-[10px] opacity-75 font-normal">Önerilen (Çoklu Kort)</span>
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
                  <div className="w-5 h-8 border-2 border-current rounded-sm"></div>
                  <span>Dikey (Portrait)</span>
                  <span className="text-[10px] opacity-75 font-normal">Tek / Az Kort</span>
                </button>
              </div>
            </div>

            {/* SAYFA BAŞINA KORT SAYISI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2. Sayfa Başına Kort</span>
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {courtsPerPage >= 99 ? 'Tümü' : `${courtsPerPage} Kort`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCourtsPerPage(num)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      courtsPerPage === num
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow'
                        : isLightMode ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {num} Kort
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCourtsPerPage(99)}
                className={`w-full py-1.5 rounded-xl text-[11px] font-bold border transition ${
                  courtsPerPage >= 99
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                    : isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Tüm Kortları Tek Sayfa Genişliğinde Göster ({selectedCourts.length} Kort)
              </button>
            </div>

            {/* SAYFA BAŞINA MAÇ SIRA SAYISI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Rows className="w-3.5 h-3.5 text-cyan-400" />
                  <span>3. Sayfa Başına Maç Sırası</span>
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {matchesPerPage >= 99 ? 'Sınırsız' : `${matchesPerPage} Sıra`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[3, 4, 5, 6, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMatchesPerPage(num)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      matchesPerPage === num
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow'
                        : isLightMode ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {num} Sıra
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMatchesPerPage(99)}
                className={`w-full py-1.5 rounded-xl text-[11px] font-bold border transition ${
                  matchesPerPage >= 99
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                    : isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Tüm Maç Sıralarını Sayfaya Sığdır (Sınırsız)
              </button>
            </div>

            {/* SAYFA HESABI BİLGİLENDİRME KUTUSU */}
            <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
              isLightMode ? 'bg-cyan-50/70 border-cyan-200 text-slate-800' : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-100'
            }`}>
              <div className="flex items-center justify-between font-black text-xs">
                <span>📄 Toplam Sayfa Sayısı:</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black text-xs">
                  {totalPages} Sayfa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {selectedCourts.length} kort ve en çok {maxMatchesInSelectedCourts} maç sırası için {courtsPerPage >= 99 ? selectedCourts.length : courtsPerPage}&apos;er kort ve {matchesPerPage >= 99 ? maxMatchesInSelectedCourts : matchesPerPage}&apos;er sıra olarak bölündü.
              </p>
            </div>

            {/* DAHİL EDİLECEK KORTLAR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>🏟️ Dahil Edilecek Kortlar</span>
                </label>
                <button
                  type="button"
                  onClick={selectAllCourts}
                  className="text-[11px] font-bold text-cyan-400 hover:underline"
                >
                  Tümünü Seç
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl border bg-slate-950/40 border-slate-800">
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
                <span>4. Detay & İçerik Ayarları</span>
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Yazı Boyutu */}
                <div className="col-span-2 flex items-center justify-between p-2 rounded-xl border bg-slate-950/40 border-slate-800">
                  <span className="font-bold">Yazı Tipi Ölçeği:</span>
                  <div className="flex gap-1">
                    {(['compact', 'normal', 'large'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFontSize(s)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                          fontSize === s
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        {s === 'compact' ? 'Küçük' : s === 'normal' ? 'Normal' : 'Büyük'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skorları Göster */}
                <label className="flex items-center gap-2 p-2 rounded-xl border bg-slate-950/40 border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScores}
                    onChange={(e) => setShowScores(e.target.checked)}
                    className="rounded accent-cyan-500"
                  />
                  <span className="font-bold">Skorları Dahil Et</span>
                </label>

                {/* Hakem İsimleri */}
                <label className="flex items-center gap-2 p-2 rounded-xl border bg-slate-950/40 border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showReferees}
                    onChange={(e) => setShowReferees(e.target.checked)}
                    className="rounded accent-cyan-500"
                  />
                  <span className="font-bold">Hakem İsimleri</span>
                </label>

                {/* İmzalar */}
                <label className="flex items-center gap-2 p-2 rounded-xl border bg-slate-950/40 border-slate-800 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="rounded accent-cyan-500"
                  />
                  <span className="font-bold">Alt Kısımda Yetkili İmza Alanları</span>
                </label>
              </div>
            </div>

            {/* BAŞLIK & METİN DÜZENLEME */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>📝 Çıktı Başlık Bilgileri</span>
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

            {/* YAZDIRILACAK SAYFA SEÇİMİ */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>5. Yazdırma Hedefi</span>
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
          <div className="flex-1 flex flex-col bg-slate-950/60 overflow-hidden">
            
            {/* ÖNİZLEME ÜST KONTROL ÇUBUĞU */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800 bg-slate-950/90 shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">Canlı A4 Sayfa Önizlemesi</span>
                {activePreviewPage && (
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-md border border-cyan-800">
                    {activePreviewPage.courtRangeLabel} • {activePreviewPage.matchRangeLabel}
                  </span>
                )}
              </div>

              {/* SAYFA DEĞİŞTİRME BUTONLARI */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeCurrentIndex <= 0}
                  onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Önceki Sayfa"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-200 px-2">
                  Sayfa <strong className="text-cyan-400">{safeCurrentIndex + 1}</strong> / {totalPages || 1}
                </span>
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
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center">
              {activePreviewPage ? (
                <div
                  className={`bg-white text-slate-900 shadow-2xl transition-all rounded-sm duration-200 border border-slate-300 p-6 sm:p-8 flex flex-col justify-between ${
                    orientation === 'landscape'
                      ? 'w-[980px] min-h-[690px]'
                      : 'w-[680px] min-h-[960px]'
                  }`}
                  style={{
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                  }}
                >
                  {/* SAYFA İÇERİĞİ ŞABLONU (TEK SAYFA ÖNİZLEME) */}
                  <SingleSchedulePageContent
                    slice={activePreviewPage}
                    courtMatchesMap={courtMatchesMap}
                    tournamentTitle={customTitle}
                    subtitle={customSubtitle}
                    date={customDate}
                    venue={customVenue}
                    notes={customNotes}
                    fontSize={fontSize}
                    showScores={showScores}
                    showReferees={showReferees}
                    showSignatures={showSignatures}
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

      {/* --- YAZDIRMA İÇİN GİZLİ DEDİKE ALAN (PRINTABLE SCHEDULE AREA) --- */}
      {/* Bu alan sadece window.print() esnasında tarayıcıda görünür ve tüm seçili sayfaları döker */}
      <div id="printable-schedule-area" className="hidden print:block">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 ${orientation};
                margin: 6mm 8mm;
              }
              body {
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden;
              }
              #printable-schedule-area, #printable-schedule-area * {
                visibility: visible;
              }
              #printable-schedule-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
              }
              .print-page-break {
                page-break-after: always !important;
                break-after: page !important;
                height: 0;
                display: block;
                clear: both;
              }
            }
          `
        }} />

        {(printTargetPage === 'ALL'
          ? generatedPages
          : generatedPages.filter((p) => p.pageNumber === printTargetPage)
        ).map((slice, idx, arr) => (
          <div
            key={slice.pageNumber}
            className={`w-full min-h-[96vh] p-6 bg-white text-slate-900 flex flex-col justify-between ${
              idx < arr.length - 1 ? 'print-page-break' : ''
            }`}
            style={{
              fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
            }}
          >
            <SingleSchedulePageContent
              slice={slice}
              courtMatchesMap={courtMatchesMap}
              tournamentTitle={customTitle}
              subtitle={customSubtitle}
              date={customDate}
              venue={customVenue}
              notes={customNotes}
              fontSize={fontSize}
              showScores={showScores}
              showReferees={showReferees}
              showSignatures={showSignatures}
              chiefReferee={chiefRefereeName}
            />
          </div>
        ))}
      </div>

    </div>
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
  fontSize: 'compact' | 'normal' | 'large';
  showScores: boolean;
  showReferees: boolean;
  showSignatures: boolean;
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
  fontSize,
  showScores,
  showReferees,
  showSignatures,
  chiefReferee,
}) => {
  // Yazı boyutu sınıfları
  const fontConfig = useMemo(() => {
    switch (fontSize) {
      case 'compact':
        return {
          headerTitle: 'text-lg',
          headerSub: 'text-[11px]',
          courtHeader: 'text-xs py-1.5',
          matchBadge: 'text-[10px] py-0.5',
          categoryBadge: 'text-[10px]',
          playerName: 'text-xs',
          scoreText: 'text-[10px]',
          cellPadding: 'p-1.5',
        };
      case 'large':
        return {
          headerTitle: 'text-2xl',
          headerSub: 'text-sm',
          courtHeader: 'text-sm py-2.5',
          matchBadge: 'text-xs py-1',
          categoryBadge: 'text-xs',
          playerName: 'text-sm',
          scoreText: 'text-xs',
          cellPadding: 'p-2.5',
        };
      case 'normal':
      default:
        return {
          headerTitle: 'text-xl',
          headerSub: 'text-xs',
          courtHeader: 'text-xs py-2',
          matchBadge: 'text-[11px] py-0.5',
          categoryBadge: 'text-[11px]',
          playerName: 'text-xs',
          scoreText: 'text-[11px]',
          cellPadding: 'p-2',
        };
    }
  }, [fontSize]);

  // Bu sayfadaki maksimum satır sayısı
  const rowCount = slice.matchEndIndex - slice.matchStartIndex;
  const rowIndices = Array.from({ length: rowCount }, (_, i) => slice.matchStartIndex + i);

  return (
    <div className="w-full flex-1 flex flex-col justify-between">
      
      {/* 1. ÜST BAŞLIK (OFFICIAL TENNIS ORDER OF PLAY HEADER) */}
      <div className="border-b-2 border-black pb-3 mb-3">
        <div className="flex items-start justify-between gap-4">
          
          {/* Sol: Turnuva ve Düzen Bilgisi */}
          <div>
            <h1 className={`font-black uppercase tracking-wider text-black ${fontConfig.headerTitle}`}>
              {tournamentTitle || 'TENİS TURNUVASI'}
            </h1>
            <div className={`font-bold tracking-widest text-slate-700 uppercase mt-0.5 ${fontConfig.headerSub}`}>
              {subtitle}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600 font-medium">
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

          {/* Sağ: Sayfa Numarası & Logo / Resmi Rozet */}
          <div className="text-right flex flex-col items-end">
            <div className="px-3 py-1 bg-black text-white font-mono font-black text-xs rounded-sm tracking-widest uppercase">
              SAYFA {slice.pageNumber} / {slice.totalCalculatedPages || 1}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1 font-semibold">
              Kortlar: {slice.courtRangeLabel}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              CourtOnline Referee System
            </div>
          </div>

        </div>

        {/* Özel Not Varsa */}
        {notes && (
          <div className="mt-2 text-xs bg-slate-100 border border-slate-300 px-3 py-1 text-slate-800 rounded font-medium italic">
            📢 <strong>Duyuru / Not:</strong> {notes}
          </div>
        )}
      </div>

      {/* 2. ANA TABLO: KORT SÜTUNLARI & MAÇ SATIRLARI */}
      <div className="flex-1 flex flex-col border border-black overflow-hidden mb-3">
        
        {/* Sütun Başlıkları (Kort İsimleri) */}
        <div
          className="grid border-b-2 border-black bg-slate-900 text-white font-black uppercase tracking-wider text-center"
          style={{ gridTemplateColumns: `repeat(${slice.courts.length}, minmax(0, 1fr))` }}
        >
          {slice.courts.map((court) => (
            <div
              key={court}
              className={`border-r border-slate-700 last:border-r-0 ${fontConfig.courtHeader}`}
            >
              {court}
            </div>
          ))}
        </div>

        {/* Maç Satırları */}
        <div className="flex-1 flex flex-col">
          {rowIndices.map((rowIndex, rowIdx) => (
            <div
              key={rowIndex}
              className={`flex-1 grid border-b border-black last:border-b-0 min-h-[90px] ${
                rowIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
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
                      className="border-r border-slate-300 last:border-r-0 p-2 flex items-center justify-center text-[10px] text-slate-300 italic select-none"
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
                    className={`border-r border-black last:border-r-0 flex flex-col justify-between ${fontConfig.cellPadding}`}
                  >
                    {/* Hücre Üstü: Sıra & Saat & Kategori */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-1">
                        <span className="font-mono font-black text-black text-[11px]">
                          {rowIndex + 1}. MAÇ
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-[10px] px-1.5 py-0.2 bg-slate-100 rounded border border-slate-300">
                          {match.Saat || 'Takiben'}
                        </span>
                      </div>

                      {match.Kategori && (
                        <div className={`font-bold text-slate-600 truncate uppercase ${fontConfig.categoryBadge}`}>
                          {match.Kategori}
                        </div>
                      )}
                    </div>

                    {/* Hücre Ortası: Oyuncular */}
                    <div className="py-1.5 space-y-1">
                      {/* Oyuncu 1 */}
                      <div className={`flex items-center justify-between gap-1 ${p1Winner ? 'font-black text-black' : 'font-medium text-slate-800'}`}>
                        <div className="flex items-center gap-1 truncate">
                          {p1Winner && <span className="text-black font-black">✓</span>}
                          <span className={`truncate ${fontConfig.playerName}`}>
                            {match['Oyuncu 1']}
                          </span>
                        </div>
                      </div>

                      {/* VS Ayracı */}
                      <div className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest leading-none">
                        vs
                      </div>

                      {/* Oyuncu 2 */}
                      <div className={`flex items-center justify-between gap-1 ${p2Winner ? 'font-black text-black' : 'font-medium text-slate-800'}`}>
                        <div className="flex items-center gap-1 truncate">
                          {p2Winner && <span className="text-black font-black">✓</span>}
                          <span className={`truncate ${fontConfig.playerName}`}>
                            {match['Oyuncu 2']}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hücre Altı: Skor / Durum / Hakem */}
                    <div className="pt-1 border-t border-slate-200 space-y-0.5">
                      {showScores && (
                        <div>
                          {isFinished ? (
                            <div className="flex items-center justify-between text-[10px] bg-slate-100 px-1 py-0.5 rounded border border-slate-300 font-mono">
                              <span className="font-bold text-black">SKOR:</span>
                              <span className="font-black text-black">{match.Skor || 'Bitti'}</span>
                            </div>
                          ) : isLive ? (
                            <div className="flex items-center justify-between text-[10px] bg-emerald-50 px-1 py-0.5 rounded border border-emerald-300 font-mono">
                              <span className="font-bold text-emerald-800">CANLI:</span>
                              <span className="font-black text-emerald-900">{match.Skor || 'Oynanıyor'}</span>
                            </div>
                          ) : (
                            <div className="h-4 border border-dashed border-slate-300 rounded bg-white flex items-center justify-center text-[9px] text-slate-400">
                              Skor Notu
                            </div>
                          )}
                        </div>
                      )}

                      {showReferees && (match.Gorevli_Hakem || match.Son_Hakem) && (
                        <div className="text-[9px] text-slate-500 truncate text-right font-medium">
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
      <div className="pt-2 border-t border-black">
        <div className="flex items-end justify-between gap-6">
          
          {/* Sol: Bilgi Metni & Tarih Saat */}
          <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
            <div>Program Basım Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div>* Maç saatleri tahmini olup, maçlar önceki maçın bitimini takiben başlayabilir.</div>
          </div>

          {/* Sağ: Resmi İmzalar */}
          {showSignatures && (
            <div className="flex items-center gap-8 text-center text-xs">
              <div className="space-y-4">
                <div className="font-black text-black uppercase tracking-wider text-[11px]">
                  Turnuva Başhakemi
                </div>
                <div className="border-b border-black w-36 pb-1 text-[10px] text-slate-500 italic">
                  İmza
                </div>
              </div>
              <div className="space-y-4">
                <div className="font-black text-black uppercase tracking-wider text-[11px]">
                  Turnuva Direktörü
                </div>
                <div className="border-b border-black w-36 pb-1 text-[10px] text-slate-500 italic">
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
