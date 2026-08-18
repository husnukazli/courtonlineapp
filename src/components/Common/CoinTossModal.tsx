import React, { useState } from 'react';
import { X, Award, RotateCcw, CheckCircle2, Trophy } from 'lucide-react';

interface CoinTossModalProps {
  isOpen: boolean;
  onClose: () => void;
  p1Name: string;
  p2Name: string;
  onConfirm: (winner: string, choice: string, side: string) => void;
}

export const CoinTossModal: React.FC<CoinTossModalProps> = ({
  isOpen,
  onClose,
  p1Name,
  p2Name,
  onConfirm,
}) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipRotation, setFlipRotation] = useState(0);
  const [tossWinner, setTossWinner] = useState<string>('');
  const [choice, setChoice] = useState<string>('Servis');
  const [side, setSide] = useState<string>('Sandalyenin Sağı');

  if (!isOpen) return null;

  const flipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);

    const isP1 = Math.random() > 0.5;
    const winner = isP1 ? p1Name : p2Name;
    
    // DİKKAT: Paranın dik durmasını (90/270 derece) %100 engelleyen matematik!
    // 1. Oyuncu için tam 1800 derece (5 tam tur - düz)
    // 2. Oyuncu için 1980 derece (5.5 tur - tam tersi düz)
    const targetAngle = isP1 ? 1800 : 1980;
    
    setFlipRotation((prev) => {
      const normalized = prev - (prev % 360);
      return normalized + targetAngle;
    });

    setTimeout(() => {
      setTossWinner(winner);
      setIsFlipping(false);
    }, 1400);
  };

  const handleSave = () => {
    if (!tossWinner) {
      alert('Lütfen kura kazananını seçin veya kurayı atın.');
      return;
    }
    onConfirm(tossWinner, choice, side);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in">
      {/* Pop-up genişliği max-w-md'den max-w-2xl'ye çıkarıldı */}
      <div className="bg-slate-900 border-2 border-amber-500/60 w-full max-w-2xl max-h-[100vh] overflow-y-auto rounded-[2rem] shadow-2xl space-y-6 p-6 sm:p-8 relative flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🪙</span>
            <div>
              <h3 className="font-black text-2xl sm:text-3xl text-white">Canlı Kura Atışı</h3>
              <p className="text-sm text-amber-400 font-semibold">Tüm oyuncuların net görebileceği dev kura ekranı</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* 3D DEV Animated Coin Stage */}
        <div className="flex flex-col items-center justify-center gap-6 py-8 sm:py-12 bg-gradient-to-b from-slate-950 to-slate-900 rounded-[2rem] border border-slate-800 relative">
          <button
            type="button"
            onClick={flipCoin}
            disabled={isFlipping}
            className="relative group focus:outline-none"
          >
            <div className={`absolute inset-0 rounded-full blur-2xl transition duration-500 ${
              isFlipping ? 'bg-amber-400/50 animate-pulse' : tossWinner === p1Name ? 'bg-lime-400/40' : tossWinner === p2Name ? 'bg-cyan-400/40' : 'bg-amber-500/30'
            }`}></div>

            {/* Para boyutu w-28'den w-56 sm:w-72 dev boyutuna çıkarıldı */}
            <div
              style={{
                transform: `rotateY(${flipRotation}deg) scale(${isFlipping ? 1.1 : 1})`,
                transition: 'transform 1.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transformStyle: 'preserve-3d',
              }}
              className={`relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-[8px] flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-pointer select-none transition-colors ${
                isFlipping
                  ? 'border-yellow-300 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 text-slate-950'
                  : tossWinner === p1Name
                  ? 'border-lime-400 bg-gradient-to-tr from-emerald-700 via-lime-500 to-emerald-400 text-slate-950'
                  : tossWinner === p2Name
                  ? 'border-cyan-400 bg-gradient-to-tr from-blue-700 via-cyan-400 to-teal-400 text-slate-950'
                  : 'border-amber-400 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 text-slate-950 group-hover:scale-105'
              }`}
            >
              {isFlipping ? (
                <div className="text-center">
                  <span className="text-6xl sm:text-7xl animate-bounce block">🪙</span>
                  <span className="text-base sm:text-xl font-black uppercase tracking-widest mt-2 block">DÖNÜYOR</span>
                </div>
              ) : tossWinner ? (
                <div className="text-center p-4">
                  <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-slate-950 mx-auto mb-2" />
                  <div className="text-sm sm:text-base uppercase font-black tracking-widest text-slate-900/80 mb-1">KAZANAN</div>
                  <div className="text-xl sm:text-3xl font-black max-w-[180px] leading-tight break-words">
                    {tossWinner}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-6xl sm:text-7xl block">🪙</span>
                  <span className="text-base sm:text-xl font-black uppercase tracking-wider mt-2 block">KURA AT</span>
                </div>
              )}
              <div className="absolute inset-2 sm:inset-3 rounded-full border-2 border-white/40 pointer-events-none"></div>
            </div>
          </button>

          <button
            type="button"
            onClick={flipCoin}
            disabled={isFlipping}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-base sm:text-xl rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`w-6 h-6 ${isFlipping ? 'animate-spin' : ''}`} />
            <span>{isFlipping ? 'Havada Dönüyor...' : '🪙 DEV PARAYI FIRLAT'}</span>
          </button>
        </div>

        {/* Manuel Seçim (İsimler Büyütüldü) */}
        <div>
          <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Veya Kurayı Doğrudan Seçin
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTossWinner(p1Name)}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition flex items-center justify-between ${
                tossWinner === p1Name
                  ? 'border-lime-400 bg-lime-400/20 text-lime-300 ring-4 ring-lime-400/30'
                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="text-left">
                <div className="text-xs sm:text-sm text-slate-400 font-normal mb-1">1. Oyuncu</div>
                <div className="text-base sm:text-xl font-black break-words">{p1Name}</div>
              </div>
              {tossWinner === p1Name && <CheckCircle2 className="w-8 h-8 text-lime-400 flex-shrink-0 ml-2" />}
            </button>

            <button
              type="button"
              onClick={() => setTossWinner(p2Name)}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition flex items-center justify-between ${
                tossWinner === p2Name
                  ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 ring-4 ring-cyan-400/30'
                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="text-left">
                <div className="text-xs sm:text-sm text-slate-400 font-normal mb-1">2. Oyuncu</div>
                <div className="text-base sm:text-xl font-black break-words">{p2Name}</div>
              </div>
              {tossWinner === p2Name && <CheckCircle2 className="w-8 h-8 text-cyan-400 flex-shrink-0 ml-2" />}
            </button>
          </div>
        </div>

        {/* Tercih ve Saha - Form elemanları büyütüldü */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Kura Tercihi</label>
            <select
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-4 py-4 text-base sm:text-lg text-white font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="Servis">🎾 Servis</option>
              <option value="Karşılama">🛡️ Karşılama</option>
              <option value="Kort Seçimi">🏟️ Kort Seçimi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Saha Tarafı</label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-4 py-4 text-base sm:text-lg text-white font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="Sandalyenin Sağı">🪑 Sandalyenin Sağı</option>
              <option value="Sandalyenin Solu">🪑 Sandalyenin Solu</option>
              <option value="Güneş Tarafı">☀️ Güneş Tarafı</option>
              <option value="Rüzgar Tarafı">💨 Rüzgar Tarafı</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-4 text-base sm:text-lg font-bold text-slate-400 hover:text-white rounded-2xl bg-slate-800 transition"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!tossWinner}
            className="w-2/3 py-4 px-6 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-lg sm:text-xl rounded-2xl shadow-xl transition disabled:opacity-50"
          >
            KURAYI ONAYLA
          </button>
        </div>
      </div>
    </div>
  );
};
