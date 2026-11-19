import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Plus, CheckCircle2, Clock, Users, User, Layers, Shield,
  AlertCircle, Sparkles, PlusCircle
} from 'lucide-react';
import { MatchItem, RefereeUser, ScoreFormatType } from '../../types/tennis';

const SCORE_FORMAT_OPTIONS: ScoreFormatType[] = [
  '3 Normal Set',
  '3 Kısa Set',
  '2 Normal Set, 3. Set 10 Puanlık Maç Tie-Break',
  '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  '2 Kısa Set, 3. Set 7 Puanlık Maç Tie-Break',
];

const QUICK_TIME_PRESETS = [
  '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:00', '14:00', '15:00', 'Takiben', 'NB 11:00',
];

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMatch: (matchData: Partial<MatchItem>) => MatchItem;
  distinctCourts: string[];
  distinctCategories: string[];
  matches: MatchItem[];
  referees: RefereeUser[];
  categoryFormats: Record<string, string>;
  categoryNoAdSettings: Record<string, boolean>;
  defaultTbType?: 'standard' | 'coman';
  isLightMode?: boolean;
  initialCourt?: string;
}

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({
  isOpen,
  onClose,
  onCreateMatch,
  distinctCourts,
  distinctCategories,
  matches,
  referees,
  categoryFormats,
  categoryNoAdSettings,
  defaultTbType = 'standard',
  isLightMode = false,
  initialCourt,
}) => {
  const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles');

  // Oyuncu isimleri
  const [player1, setPlayer1] = useState('');
  const [player1Partner, setPlayer1Partner] = useState('');
  const [player2, setPlayer2] = useState('');
  const [player2Partner, setPlayer2Partner] = useState('');

  // Kort seçimi veya yeni kort
  const [isCustomCourtMode, setIsCustomCourtMode] = useState<boolean>(distinctCourts.length === 0);
  const [selectedCourt, setSelectedCourt] = useState<string>(initialCourt || distinctCourts[0] || 'KORT 1');
  const [customCourtInput, setCustomCourtInput] = useState<string>('');

  // Program alanları
  const [saat, setSaat] = useState<string>('09:30');
  const [kategori, setKategori] = useState<string>(distinctCategories[0] || '');
  const [skorFormati, setSkorFormati] = useState<string>('3 Normal Set');
  const [isNoAd, setIsNoAd] = useState<boolean>(false);
  const [tbKurali, setTbKurali] = useState<'standard' | 'coman'>(defaultTbType);
  const [gorevliHakem, setGorevliHakem] = useState<string>('Atanmadı');

  // Geri bildirim & Hata
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [addedCount, setAddedCount] = useState<number>(0);

  // Modal açıldığında varsayılanları senkronize et
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setAddedCount(0);
      setTbKurali(defaultTbType);
      if (initialCourt) {
        setSelectedCourt(initialCourt);
        setIsCustomCourtMode(false);
      } else if (distinctCourts.length > 0 && !distinctCourts.includes(selectedCourt)) {
        setSelectedCourt(distinctCourts[0]);
        setIsCustomCourtMode(false);
      } else if (distinctCourts.length === 0) {
        setIsCustomCourtMode(true);
        if (!customCourtInput) setCustomCourtInput('KORT 1');
      }
    }
  }, [isOpen, initialCourt, distinctCourts.length]);

  // Kort başına mevcut maç sayıları (başhakeme yoğunluğu göstermek için)
  const courtMatchCounts = useMemo(() => {
    const map: Record<string, number> = {};
    matches.forEach((m) => {
      if (m.Kort) {
        map[m.Kort] = (map[m.Kort] || 0) + 1;
      }
    });
    return map;
  }, [matches]);

  // Kategori değiştiğinde varsa Format Hafızasından format ve No-Ad çek
  const handleCategoryChange = (val: string) => {
    setKategori(val);
    const trimmed = val.trim();
    if (trimmed && categoryFormats[trimmed]) {
      setSkorFormati(categoryFormats[trimmed]);
    }
    if (trimmed && typeof categoryNoAdSettings[trimmed] === 'boolean') {
      setIsNoAd(categoryNoAdSettings[trimmed]);
    }
  };

  // Form doğrulama ve maç nesnesi oluşturma
  const buildAndSaveMatch = (): boolean => {
    setErrorMsg('');

    const finalCourt = isCustomCourtMode ? customCourtInput.trim() : selectedCourt.trim();
    if (!finalCourt) {
      setErrorMsg('Lütfen bir kort seçin veya yeni kort adı girin.');
      return false;
    }

    let finalP1 = '';
    let finalP2 = '';

    if (matchType === 'singles') {
      finalP1 = player1.trim();
      finalP2 = player2.trim();
      if (!finalP1 || !finalP2) {
        setErrorMsg('Lütfen hem 1. Oyuncu hem de 2. Oyuncu adını girin.');
        return false;
      }
    } else {
      const p1a = player1.trim();
      const p1b = player1Partner.trim();
      const p2a = player2.trim();
      const p2b = player2Partner.trim();

      if (!p1a || !p2a) {
        setErrorMsg('Lütfen her iki takım için en az birer oyuncu adı girin.');
        return false;
      }
      finalP1 = p1b ? `${p1a} / ${p1b}` : p1a;
      finalP2 = p2b ? `${p2a} / ${p2b}` : p2a;
    }

    const finalSaat = saat.trim() || 'Takiben';
    const finalKategori = kategori.trim() || (matchType === 'doubles' ? 'Çiftler' : 'Genel');

    onCreateMatch({
      Kort: finalCourt,
      Saat: finalSaat,
      'Oyuncu 1': finalP1,
      'Oyuncu 2': finalP2,
      Kategori: finalKategori,
      Skor_Formati: skorFormati,
      isNoAd,
      tbKurali,
      Gorevli_Hakem: gorevliHakem || 'Atanmadı',
      Durum: 'Baslamadi',
      Skor: '-',
    });

    // Eğer yeni kort oluşturduysa sonraki maç için o kort seçili kalsın
    if (isCustomCourtMode) {
      setSelectedCourt(finalCourt);
      setIsCustomCourtMode(false);
      setCustomCourtInput('');
    }

    return true;
  };

  const handleSubmitAndClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (buildAndSaveMatch()) {
      setPlayer1('');
      setPlayer1Partner('');
      setPlayer2('');
      setPlayer2Partner('');
      onClose();
    }
  };

  const handleSubmitAndContinue = () => {
    if (buildAndSaveMatch()) {
      const p1Label = matchType === 'doubles' && player1Partner.trim()
        ? `${player1.trim()} / ${player1Partner.trim()}`
        : player1.trim();
      const p2Label = matchType === 'doubles' && player2Partner.trim()
        ? `${player2.trim()} / ${player2Partner.trim()}`
        : player2.trim();

      setAddedCount((c) => c + 1);
      setSuccessMsg(`"${p1Label} vs ${p2Label}" programa eklendi! Yeni maç girebilirsiniz.`);
      setPlayer1('');
      setPlayer1Partner('');
      setPlayer2('');
      setPlayer2Partner('');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  if (!isOpen) return null;

  const inputBase = isLightMode
    ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
    : 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400';

  const labelBase = isLightMode
    ? 'text-[11px] font-black uppercase tracking-wider text-slate-600'
    : 'text-[11px] font-black uppercase tracking-wider text-slate-400';

  const sectionCard = isLightMode
    ? 'bg-slate-50 border-slate-200'
    : 'bg-slate-950/60 border-slate-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl max-h-[93vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Manuel Maç Oluştur</h2>
                {addedCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    +{addedCount} Eklendi
                  </span>
                )}
              </div>
              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                JSON yüklemeden programa yeni bir maç ekleyin ve anında buluta yayınlayın
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition ${
              isLightMode
                ? 'hover:bg-slate-200 text-slate-600 border-slate-200'
                : 'hover:bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitAndClose} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Geri bildirim mesajları */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl border bg-rose-500/10 border-rose-500/40 text-rose-400 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl border bg-emerald-500/15 border-emerald-500/40 text-emerald-400 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. MAÇ TÜRÜ (TEKLER / ÇİFTLER) */}
          <div className="space-y-2">
            <label className={labelBase}>Maç Türü</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMatchType('singles')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-black transition ${
                  matchType === 'singles'
                    ? isLightMode
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow'
                      : 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                    : isLightMode
                    ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Tekler (Singles)</span>
              </button>
              <button
                type="button"
                onClick={() => setMatchType('doubles')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-black transition ${
                  matchType === 'doubles'
                    ? isLightMode
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow'
                      : 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                    : isLightMode
                    ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Çiftler (Doubles)</span>
              </button>
            </div>
          </div>

          {/* 2. OYUNCULAR / TAKIMLAR */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${sectionCard}`}>
            <div className="flex items-center justify-between">
              <span className={labelBase}>
                {matchType === 'singles' ? '🎾 Oyuncular' : '🎾 Takımlar & Partnerler'}
              </span>
              {matchType === 'doubles' && (
                <span className="text-[10px] text-cyan-400 font-semibold">
                  Otomatik &ldquo;Oyuncu A / Oyuncu B&rdquo; olarak kaydedilir
                </span>
              )}
            </div>

            {matchType === 'singles' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold block">1. Oyuncu *</label>
                  <input
                    type="text"
                    value={player1}
                    onChange={(e) => setPlayer1(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none ${inputBase}`}
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold block">2. Oyuncu *</label>
                  <input
                    type="text"
                    value={player2}
                    onChange={(e) => setPlayer2(e.target.value)}
                    placeholder="Örn: Mehmet Demir"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none ${inputBase}`}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Takım */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-emerald-500">1. Takım *</span>
                  <input
                    type="text"
                    value={player1}
                    onChange={(e) => setPlayer1(e.target.value)}
                    placeholder="1. Oyuncu (Örn: A. Yılmaz)"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                    autoFocus
                  />
                  <input
                    type="text"
                    value={player1Partner}
                    onChange={(e) => setPlayer1Partner(e.target.value)}
                    placeholder="Partneri (Örn: M. Demir)"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                  />
                </div>

                {/* 2. Takım */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-cyan-500">2. Takım *</span>
                  <input
                    type="text"
                    value={player2}
                    onChange={(e) => setPlayer2(e.target.value)}
                    placeholder="1. Oyuncu (Örn: C. Kaya)"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                  />
                  <input
                    type="text"
                    value={player2Partner}
                    onChange={(e) => setPlayer2Partner(e.target.value)}
                    placeholder="Partneri (Örn: E. Çelik)"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. KORT & SAAT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kort */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${sectionCard}`}>
              <div className="flex items-center justify-between">
                <label className={labelBase}>🏟️ Kort *</label>
                {distinctCourts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCustomCourtMode((prev) => !prev)}
                    className="text-[11px] font-bold text-cyan-500 hover:underline"
                  >
                    {isCustomCourtMode ? 'Listeden Seç' : '+ Yeni Kort Yaz'}
                  </button>
                )}
              </div>

              {isCustomCourtMode ? (
                <input
                  type="text"
                  value={customCourtInput}
                  onChange={(e) => setCustomCourtInput(e.target.value)}
                  placeholder="Örn: KORT 5 veya MERKEZ KORT"
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                />
              ) : (
                <select
                  value={selectedCourt}
                  onChange={(e) => setSelectedCourt(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                >
                  {distinctCourts.map((court) => (
                    <option key={court} value={court}>
                      {court} ({courtMatchCounts[court] || 0} maç)
                    </option>
                  ))}
                </select>
              )}
              <p className={`text-[10px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Yeni kort adı yazılırsa kort listesine otomatik eklenir.
              </p>
            </div>

            {/* Saat / Sıra */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${sectionCard}`}>
              <label className={`${labelBase} flex items-center gap-1`}>
                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                <span>Saat / Sıra *</span>
              </label>
              <input
                type="text"
                value={saat}
                onChange={(e) => setSaat(e.target.value)}
                placeholder="Örn: 09:30, Takiben, NB 14:00"
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none ${inputBase}`}
              />
              <div className="flex flex-wrap gap-1">
                {QUICK_TIME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSaat(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition ${
                      saat === preset
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : isLightMode
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. KATEGORİ & SKOR FORMATI */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${sectionCard}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Kategori */}
              <div className="space-y-1.5">
                <label className={`${labelBase} flex items-center gap-1`}>
                  <Layers className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Kategori</span>
                </label>
                <input
                  type="text"
                  value={kategori}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  placeholder="Örn: 14 Yaş Tek Erkekler"
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                />
                {distinctCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5 max-h-20 overflow-y-auto">
                    {distinctCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                          kategori === cat
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                            : isLightMode
                            ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Skor Formatı */}
              <div className="space-y-1.5">
                <label className={`${labelBase} flex items-center gap-1`}>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Skor Formatı</span>
                </label>
                <select
                  value={skorFormati}
                  onChange={(e) => setSkorFormati(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                >
                  {SCORE_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {kategori.trim() && categoryFormats[kategori.trim()] && (
                  <p className="text-[10px] text-emerald-500 font-semibold">
                    ✓ Format hafızasından otomatik eşleştirildi
                  </p>
                )}
              </div>
            </div>

            {/* No-Ad, Tie-Break ve Görevli Hakem */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/20">
              {/* No-Ad Karar Puanı */}
              <label
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border cursor-pointer ${
                  isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Karar Puanı</span>
                  <span className="text-[10px] text-slate-400">No-Ad (40-40)</span>
                </div>
                <input
                  type="checkbox"
                  checked={isNoAd}
                  onChange={(e) => setIsNoAd(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
              </label>

              {/* Tie-Break Kuralı */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Tie-Break Kuralı</span>
                <select
                  value={tbKurali}
                  onChange={(e) => setTbKurali(e.target.value as 'standard' | 'coman')}
                  className={`w-full px-2.5 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                >
                  <option value="standard">Standart (6 Puan)</option>
                  <option value="coman">Coman (1-4-4)</option>
                </select>
              </div>

              {/* Görevli Hakem */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-500" />
                  <span>Görevli Hakem</span>
                </span>
                <select
                  value={gorevliHakem}
                  onChange={(e) => setGorevliHakem(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputBase}`}
                >
                  <option value="Atanmadı">Atanmadı (Serbest)</option>
                  {referees.map((ref) => (
                    <option key={ref.name} value={ref.name}>
                      {ref.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Buttons */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t shrink-0 ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
              isLightMode
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {addedCount > 0 ? 'Tamamla & Kapat' : 'Vazgeç'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSubmitAndContinue}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition active:scale-95 ${
                isLightMode
                  ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300'
              }`}
              title="Maçı ekler ve pencereyi kapatmadan bir sonraki maçı girmenizi sağlar"
            >
              <Plus className="w-4 h-4" />
              <span>Kaydet & Yeni Ekle</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitAndClose}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Maçı Programa Ekle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
