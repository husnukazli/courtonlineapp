import React, { useState } from 'react';
import { MatchItem, ScoreFormatType } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import { Play, Clock, X, CheckCircle2 } from 'lucide-react';

const SCORE_FORMAT_OPTIONS: ScoreFormatType[] = [
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
  const { saveMatchSetup, categoryFormats } = useTennisData();

  const [kuraKazanan, setKuraKazanan] = useState<string>('Secilmedi');
  const [kuraTercih, setKuraTercih] = useState<string>('Servis');
  const [sahaTarafi, setSahaTarafi] = useState<string>('Sandalyenin Sağı');
  const [ilkServisiAtan, setIlkServisiAtan] = useState<string>('Secilmedi');
  const [baslangicSaati, setBaslangicSaati] = useState<string>('');
  const [bitisSaati, setBitisSaati] = useState<string>('');
  const [skorFormati, setSkorFormati] = useState<string>('3 Normal Set');
  
  const [isCoinTossFullscreenOpen, setIsCoinTossFullscreenOpen] = useState<boolean>(false);
  
  // 3D Para Atışı İçin Yeni Durum Yönetimi (State)
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);

  React.useEffect(() => {
    if (match) {
      setKuraKazanan(match.Kura_Kazanan || 'Secilmedi');
      setKuraTercih(match.Kura_Tercih || 'Servis');
      setSahaTarafi(match.Saha_Tarafi || 'Sandalyenin Sağı');

      const headUmpireFormat = categoryFormats[match.Kategori];
      setSkorFormati(headUmpireFormat || match.Skor_Formati || '3 Normal Set');

      const savedFirstServer = (match as any).ilkServisOyuncusu;
      if (savedFirstServer === 1) setIlkServisiAtan(match['Oyuncu 1']);
      else if (savedFirstServer === 2) setIlkServisiAtan(match['Oyuncu 2']);
      else setIlkServisiAtan('Secilmedi');

      if (match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi') {
        setBaslangicSaati(match.Baslangic_Saati);
      } else {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setBaslangicSaati(`${hh}:${mm}`);
      }
      setBitisSaati(match.Bitis_Saati || '');
      
      // Modal her açıldığında paranın rotasyonunu sıfırla (Ön yüze getir)
      setRotation(0);
      setIsFlipping(false);
    }
  }, [match, isOpen, categoryFormats]);

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

  const triggerFullscreenCoinToss = () => {
    setIsCoinTossFullscreenOpen(true);
  };

  // 3D Para Atışı Motoru
  const executeCoinTossFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);

    const isP1 = Math.random() > 0.5;
    const winner = isP1 ? p1Name : p2Name;
    
    // Açıyı 360'ın katlarına yuvarla (kayma olmaması için)
    const baseRotation = Math.floor(rotation / 360) * 360;
    
    // 5 tam tur kendi etrafında fırıl fırıl dönecek (1800 derece)
    const spins = 5 * 360; 
    
    let finalRotation;
    if (isP1) {
      // 1. Oyuncu kazandıysa paranın ön yüzü gelecek (0, 360, vb.)
      finalRotation = baseRotation + spins; 
    } else {
      // 2. Oyuncu kazandıysa paranın arka yüzü gelecek (180, 540, vb.)
      finalRotation = baseRotation + spins + 180; 
    }
    
    setRotation(finalRotation);

    // Animasyon (Transition) 2 saniye sürüyor, bitince kazananı yaz
    setTimeout(() => {
      setIsFlipping(false);
      setKuraKazanan(winner);
    }, 2000); 
  };

  const handleSaveAndStart = () => {
    let finalFirstServer = 1;
    if (kuraTercih === 'Saha Seçimi') {
      finalFirstServer = ilkServisiAtan === p2Name ? 2 : 1;
    } else if (kuraKazanan === p1Name) {
      finalFirstServer = kuraTercih === 'Servis' ? 1 : 2;
    } else if (kuraKazanan === p2Name) {
      finalFirstServer = kuraTercih === 'Servis' ? 2 : 1;
    }

    saveMatchSetup(match.id, {
      durum: 'Oynaniyor',
      kuraKazanan,
      kuraTercih,
      sahaTarafi,
      baslangicSaati: baslangicSaati || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      bitisSaati,
      skorFormati,
      ilkServisOyuncusu: finalFirstServer,
    });

    onClose();
    onStartMatch(match.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-4 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 my-auto relative">
        
        {/* YENİ NESİL 3D TAM EKRAN KURA MODALI */}
        {isCoinTossFullscreenOpen && (
          <div className="absolute inset-0 z-[999] bg-slate-950/98 rounded-3xl flex flex-col items-center justify-center p-6 animate-in fade-in">
            <button 
              onClick={() => setIsCoinTossFullscreenOpen(false)} 
              className="absolute top-6 right-6 p-3 bg-slate-800 hover:bg-rose-500 rounded-full text-white transition-colors shadow-lg z-50"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl font-black text-amber-400 tracking-widest mb-10 text-center">KURA ATIŞI</h2>

            {/* 3D Para Konteyneri */}
            <div className="flex flex-col items-center justify-center">
              <div 
                onClick={!isFlipping ? executeCoinTossFlip : undefined}
                className={`relative w-48 h-48 sm:w-64 sm:h-64 ${!isFlipping ? 'cursor-pointer hover:scale-105' : ''} transition-transform`}
                style={{ perspective: '1000px' }}
              >
                {/* Paranın Kendisi (CSS 3D Engine) */}
                <div 
                  className="w-full h-full absolute top-0 left-0 transition-all ease-out"
                  style={{ 
                    transformStyle: 'preserve-3d', 
                    transitionDuration: '2000ms',
                    // Atıldığında scale ile havaya kalkıyormuş efekti yaratıyoruz
                    transform: `rotateY(${rotation}deg) ${isFlipping ? 'scale(1.3) translateY(-40px)' : 'scale(1) translateY(0)'}`
                  }}
                >
                  {/* ÖN YÜZ (1. Oyuncu - Yeşil) */}
                  <div 
                    className="w-full h-full absolute top-0 left-0 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-lime-400 to-emerald-600 border-[8px] sm:border-[12px] border-emerald-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.4),0_15px_30px_rgba(0,0,0,0.6)]"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="w-[85%] h-[85%] rounded-full border border-emerald-200/50 flex flex-col items-center justify-center p-4 text-center">
                      <span className="text-4xl sm:text-6xl mb-1 drop-shadow-md">🎾</span>
                      <span className="text-white font-black text-sm sm:text-base leading-tight drop-shadow-md line-clamp-2 px-2">{p1Name}</span>
                    </div>
                  </div>

                  {/* ARKA YÜZ (2. Oyuncu - Mavi) */}
                  <div 
                    className="w-full h-full absolute top-0 left-0 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-600 border-[8px] sm:border-[12px] border-blue-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.4),0_15px_30px_rgba(0,0,0,0.6)]"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="w-[85%] h-[85%] rounded-full border border-blue-200/50 flex flex-col items-center justify-center p-4 text-center">
                      <span className="text-4xl sm:text-6xl mb-1 drop-shadow-md">🎾</span>
                      <span className="text-white font-black text-sm sm:text-base leading-tight drop-shadow-md line-clamp-2 px-2">{p2Name}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Para Altı Mesajı / Kazanan Bildirimi */}
              <div className="mt-10 h-20 flex items-center justify-center">
                {isFlipping ? (
                  <div className="bg-slate-800/80 px-8 py-3 rounded-full border border-slate-700">
                    <span className="text-amber-400 font-black text-lg sm:text-xl tracking-widest animate-pulse">Kura Atılıyor...</span>
                  </div>
                ) : kuraKazanan !== 'Secilmedi' ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in slide-in-from-bottom-4">
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">🏆 KAZANAN</span>
                    <span className="text-2xl sm:text-3xl font-black text-white bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-3 rounded-2xl border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-center line-clamp-1 max-w-[90vw]">
                      {kuraKazanan}
                    </span>
                  </div>
                ) : (
                  <span className="text-white font-black text-lg sm:text-xl tracking-widest bg-slate-800/60 px-8 py-3.5 rounded-full border border-slate-700 animate-bounce cursor-pointer" onClick={executeCoinTossFlip}>
                    👆 DOKUN VE AT
                  </span>
                )}
              </div>
            </div>

            {kuraKazanan !== 'Secilmedi' && !isFlipping && (
              <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4">
                <button 
                  onClick={() => setIsCoinTossFullscreenOpen(false)} 
                  className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-lg rounded-2xl shadow-xl transition active:scale-95"
                >
                  Onayla ve Seçimlere Dön
                </button>
              </div>
            )}
          </div>
        )}

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

        <div className="bg-slate-950 p-4 rounded-3xl border-2 border-amber-500/40 text-center space-y-3 shadow-xl">
          <button
            type="button"
            onClick={triggerFullscreenCoinToss}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition active:scale-95"
          >
            <span>🪙 3D Dev Ekran Kura Atışını Aç</span>
          </button>

          {kuraKazanan !== 'Secilmedi' && (
            <div className="text-xs font-black text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              ✨ Kura Kazananı: <strong>{kuraKazanan}</strong>
            </div>
          )}
        </div>

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

        {kuraTercih === 'Saha Seçimi' && (
          <div className="mt-3 pt-3 border-t border-slate-800 animate-in fade-in text-left">
            <label className="text-[10px] font-extrabold uppercase text-lime-400 block mb-1.5">
              Rakip Ne Seçti? (İlk Servisi Atacak Oyuncu/Takım)
            </label>
            <select
              value={ilkServisiAtan}
              onChange={(e) => setIlkServisiAtan(e.target.value)}
              className="w-full bg-slate-900 border border-lime-500/50 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-lime-400 shadow-inner"
            >
              <option value="Secilmedi">Seçilmedi</option>
              <option value={p1Name}>{p1Name} (O1)</option>
              <option value={p2Name}>{p2Name} (O2)</option>
            </select>
          </div>
        )}

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

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
          <label className="text-xs font-bold text-slate-300 block">Skor Formatı</label>
          <select
            value={skorFormati}
            onChange={(e) => setSkorFormati(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-lime-400 font-bold"
          >
            {SCORE_FORMAT_OPTIONS.map((fmt) => (
              <option key={fmt} value={fmt} className="text-white">{fmt}</option>
            ))}
          </select>
        </div>

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
