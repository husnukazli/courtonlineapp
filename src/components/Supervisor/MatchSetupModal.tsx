import React, { useState } from 'react';
import { MatchItem, ScoreFormatType } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import { Play, Clock, X, RotateCcw, Sparkles, CheckCircle2, Trophy } from 'lucide-react';

const SCORE_FORMATS: ScoreFormatType[] = [
  '3 Normal Set',
  '3 Kısa Set',
  '2 Normal Set, 3. Set 10 Puanlık Maç Tie-Break',
  '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  '2 Kısa Set, 3. Set 7 Puanlık Maç Tie-Break',
];

interface MatchSetupModalProps {
  match: MatchItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (matchId: string) => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  match,
  isOpen,
  onClose,
  onStartMatch,
}) => {
  const { saveMatchSetup } = useTennisData();

  const [kuraKazanan, setKuraKazanan] = useState<string>('Secilmedi');
  const [kuraTercih, setKuraTercih] = useState<string>('Servis');
  const [sahaTarafi, setSahaTarafi] = useState<string>('Sandalyenin Sağı');
  const [baslangicSaati, setBaslangicSaati] = useState<string>('');
  const [bitisSaati, setBitisSaati] = useState<string>('');
  const [skorFormati, setSkorFormati] = useState<string>('3 Normal Set');
  
  // YEPYENİ DEV KURA EKRANI KONTROLÜ
  const [isCoinTossFullscreenOpen, setIsCoinTossFullscreenOpen] = useState<boolean>(false);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [displaySide, setDisplaySide] = useState<1 | 2>(1);

  React.useEffect(() => {
    if (match) {
      setKuraKazanan(match.Kura_Kazanan || 'Secilmedi');
      setKuraTercih(match.Kura_Tercih || 'Servis');
      setSahaTarafi(match.Saha_Tarafi || 'Sandalyenin Sağı');
      setSkorFormati(match.Skor_Formati || '3 Normal Set');

      if (match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi') {
        setBaslangicSaati(match.Baslangic_Saati);
      } else {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setBaslangicSaati(`${hh}:${mm}`);
      }
      setBitisSaati(match.Bitis_Saati || '');
    }
  }, [match, isOpen]);

  if (!isOpen || !match) return null;

  const p1Name = match['Oyuncu 1'];
  const p2Name = match['Oyuncu 2'];

  const handleSetTimeNow = (field: 'start' | 'end') => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    if (field === 'start') setBaslangicSaati(timeStr);
    else setBitisSaati(timeStr);
  };

  const handleAdjustTime = (field: 'start' | 'end', deltaMinutes: number) => {
    const currentStr = field === 'start' ? baslangicSaati : bitisSaati;
    let [h, m] = (currentStr || '10:00').split(':').map(Number);
    if (isNaN(h) || isNaN(m)) {
      const now = new Date();
      h = now.getHours();
      m = now.getMinutes();
    }
    const date = new Date();
    date.setHours(h, m + deltaMinutes, 0, 0);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const newStr = `${hh}:${mm}`;
    if (field === 'start') setBaslangicSaati(newStr);
    else setBitisSaati(newStr);
  };

  // TAM EKRAN DEV KURA FONKSİYONU
  const triggerFullscreenCoinToss = () => {
    setIsCoinTossFullscreenOpen(true);
  };

  const executeCoinTossFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);

    // Hızlı renk/taraf değişimi efekti
    const interval = setInterval(() => {
      setDisplaySide((prev) => (prev === 1 ? 2 : 1));
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setIsFlipping(false);
      const isP1 = Math.random() > 0.5;
      const winner = isP1 ? p1Name : p2Name;
      setKuraKazanan(winner);
      setDisplaySide(isP1 ? 1 : 2);
    }, 1800);
  };

  const handleSaveAndStart = () => {
    saveMatchSetup(match.id, {
      durum: 'Oynaniyor',
      kuraKazanan,
      kuraTercih,
      sahaTarafi,
      baslangicSaati: baslangicSaati || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      bitisSaati,
      skorFormati,
      ilkServisOyuncusu:
        kuraKazanan === p1Name
          ? kuraTercih === 'Servis' ? 1 : 2
          : kuraKazanan === p2Name
          ? kuraTercih === 'Servis' ? 2 : 1
          : 1,
    });

    onClose();
    onStartMatch(match.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-4 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 my-auto relative">
        
        {/* DEV EKRAN KURA MODALI (AÇILIR PENCERE İÇİNDE TAM EKRAN) */}
        {isCoinTossFullscreenOpen && (
          <div className="absolute inset-0 z-[999] bg-slate-950/98 rounded-3xl flex flex-col items-center justify-center p-6 animate-in fade-in">
            <button 
              onClick={() => setIsCoinTossFullscreenOpen(false)} 
              className="absolute top-6 right-6 p-3 bg-slate-800 hover:bg-rose-500 rounded-full text-white transition-colors shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl font-black text-amber-400 tracking-widest mb-6">KURA ATIŞI</h2>

            {/* DEVASA PARA */}
            <button
              type="button"
              onClick={executeCoinTossFlip}
              disabled={isFlipping}
              className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-[12px] shadow-[0_0_80px_rgba(255,255,255,0.2)] transition-transform flex items-center justify-center my-4
                ${!isFlipping ? 'active:scale-95 hover:scale-[1.02]' : ''}
                ${displaySide === 1 ? 'border-lime-400 bg-gradient-to-br from-emerald-600 to-lime-500' : 'border-cyan-400 bg-gradient-to-br from-blue-600 to-cyan-500'}
              `}
            >
              {isFlipping ? (
                <span className="text-7xl animate-spin">🪙</span>
              ) : kuraKazanan !== 'Secilmedi' ? (
                <div className="flex flex-col items-center p-4">
                  <Trophy className="w-10 h-10 text-slate-950 mb-1" />
                  <span className="text-xs font-black text-slate-900/60 uppercase tracking-widest mb-1">KAZANAN</span>
                  <span className="text-2xl sm:text-3xl font-black text-white text-center leading-tight line-clamp-2">
                    {kuraKazanan}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-7xl mb-2">🪙</span>
                  <span className="text-xl font-black text-white tracking-widest">DOKUN VE AT</span>
                </div>
              )}
            </button>

            {kuraKazanan !== 'Secilmedi' && !isFlipping && (
              <div className="mt-6 text-center">
                <p className="text-emerald-400 font-bold text-lg mb-4">✅ Kazanan Belirlendi!</p>
                <button 
                  onClick={() => setIsCoinTossFullscreenOpen(false)} 
                  className="px-8 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl shadow-lg transition"
                >
                  Kapat ve Seçimlere Dön
                </button>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0 shadow-lg">
              🪙
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Maç Öncesi Kura & Kurulum</h2>
              <p className="text-xs text-amber-400 font-semibold mt-0.5">
                {match.Kort} • {match.Kategori} • Planlanan: {match.Saat}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Players Card */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
          <div className="flex-1">
            <div className="text-[10px] text-lime-400 font-extrabold uppercase">1. Oyuncu</div>
            <div className="font-black text-sm sm:text-base text-white truncate mt-0.5">{p1Name}</div>
          </div>
          <div className="px-3 text-xs font-black text-slate-600 bg-slate-900 py-1 rounded-lg border border-slate-800">VS</div>
          <div className="flex-1 text-right">
            <div className="text-[10px] text-cyan-400 font-extrabold uppercase">2. Oyuncu</div>
            <div className="font-black text-sm sm:text-base text-white truncate mt-0.5">{p2Name}</div>
          </div>
        </div>

        {/* YENİ DEV KURA AÇMA BUTONU */}
        <div className="bg-slate-950 p-4 rounded-3xl border-2 border-amber-500/40 text-center space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-300 uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Canlı Kura Atışı</span>
            </span>
            <span className="text-[10px] text-slate-400">Tam ekran dev para ile atın</span>
          </div>

          <button
            type="button"
            onClick={triggerFullscreenCoinToss}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition active:scale-95"
          >
            <span>🪙 Dev Ekran Kura Atışını Aç</span>
          </button>

          {kuraKazanan !== 'Secilmedi' && (
            <div className="text-xs font-black text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              ✨ Kura Kazananı: <strong>{kuraKazanan}</strong>
            </div>
          )}
        </div>

        {/* Elle Seçim */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">
            Veya Kura Kazananını Elle Seçin:
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setKuraKazanan(p1Name)}
              className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                kuraKazanan === p1Name ? 'bg-lime-400/20 border-lime-400 text-lime-300 ring-2 ring-lime-400/30' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="truncate text-xs sm:text-sm font-bold text-white">{p1Name}</div>
              {kuraKazanan === p1Name && <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => setKuraKazanan(p2Name)}
              className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                kuraKazanan === p2Name ? 'bg-cyan-400/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400/30' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="truncate text-xs sm:text-sm font-bold text-white">{p2Name}</div>
              {kuraKazanan === p2Name && <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Tercih & Saha Tarafı */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Tercih</label>
            <select
              value={kuraTercih}
              onChange={(e) => setKuraTercih(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-amber-400"
            >
              <option value="Servis">🎾 Servis Atacak</option>
              <option value="Karşılama">🛡️ Karşılayacak</option>
              <option value="Saha Seçimi">🏟️ Saha Seçti</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Saha Tarafı</label>
            <select
              value={sahaTarafi}
              onChange={(e) => setSahaTarafi(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-amber-400"
            >
              <option value="Sandalyenin Sağı">🪑 Sandalyenin Sağı</option>
              <option value="Sandalyenin Solu">🪑 Sandalyenin Solu</option>
            </select>
          </div>
        </div>

        {/* Başlangıç Saati */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-lime-400" />
            <span>Maç Başlangıç Saati</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={baslangicSaati}
              onChange={(e) => setBaslangicSaati(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white shrink-0 w-28 text-center"
            />
            <button type="button" onClick={() => handleSetTimeNow('start')} className="px-3 py-2 rounded-lg bg-lime-400 text-slate-950 text-xs font-black">Şimdi</button>
            <button type="button" onClick={() => handleAdjustTime('start', -5)} className="px-2 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">-5 dk</button>
            <button type="button" onClick={() => handleAdjustTime('start', +5)} className="px-2 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">+5 dk</button>
          </div>
        </div>

        {/* Skor Formatı */}
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
          <label className="text-xs font-bold text-slate-300 block">Skor Formatı</label>
          <select
            value={skorFormati}
            onChange={(e) => setSkorFormati(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-lime-400 font-bold"
          >
            {SCORE_FORMATS.map((fmt) => (
              <option key={fmt} value={fmt} className="text-white">{fmt}</option>
            ))}
          </select>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs">İptal</button>
          <button type="button" onClick={handleSaveAndStart} className="flex-2 py-3 px-5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl">
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Maçı Başlat & Canlı Skora Geç</span>
          </button>
        </div>
      </div>
    </div>
  );
};
