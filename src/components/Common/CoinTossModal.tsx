import React, { useState } from 'react';
import { X, Award, RotateCcw, CheckCircle2, Sparkles, Trophy } from 'lucide-react';

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
    const extraRotations = 1800 + Math.floor(Math.random() * 360);
    setFlipRotation((prev) => prev + extraRotations);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border-2 border-amber-500/50 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden space-y-4 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪙</span>
            <div>
              <h3 className="font-black text-lg text-white">Canlı Kura Atışı (Coin Toss)</h3>
              <p className="text-xs text-amber-400 font-semibold">Oyuncunun gözü önünde tura atışı</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Animated Coin Stage */}
        <div className="flex flex-col items-center justify-center gap-3 py-5 bg-gradient-to-b from-slate-950 to-slate-900 rounded-3xl border border-slate-800 relative">
          <button
            type="button"
            onClick={flipCoin}
            disabled={isFlipping}
            className="relative group focus:outline-none"
          >
            <div className={`absolute inset-0 rounded-full blur-xl transition duration-500 ${
              isFlipping ? 'bg-amber-400/40 animate-pulse' : tossWinner === p1Name ? 'bg-lime-400/30' : tossWinner === p2Name ? 'bg-cyan-400/30' : 'bg-amber-500/20'
            }`}></div>

            <div
              style={{
                transform: `rotateY(${flipRotation}deg) scale(${isFlipping ? 1.15 : 1})`,
                transition: 'transform 1.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transformStyle: 'preserve-3d',
              }}
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl cursor-pointer select-none transition-colors ${
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
                  <span className="text-3xl animate-bounce block">🪙</span>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-1 block">DÖNÜYOR</span>
                </div>
              ) : tossWinner ? (
                <div className="text-center p-2">
                  <Trophy className="w-6 h-6 text-slate-950 mx-auto mb-0.5" />
                  <div className="text-[9px] uppercase font-black tracking-widest text-slate-900/80">KAZANAN</div>
                  <div className="text-xs sm:text-sm font-black truncate max-w-[90px] leading-tight">
                    {tossWinner.split(' ')[0]}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-3xl block">🪙</span>
                  <span className="text-xs font-black uppercase tracking-wider mt-0.5 block">KURA AT</span>
                </div>
              )}
              <div className="absolute inset-1.5 rounded-full border border-white/40 pointer-events-none"></div>
            </div>
          </button>

          <button
            type="button"
            onClick={flipCoin}
            disabled={isFlipping}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isFlipping ? 'animate-spin' : ''}`} />
            <span>{isFlipping ? 'Kura Havada Dönüyor...' : '🪙 Bozuk Parayı Fırlat'}</span>
          </button>

          {tossWinner && !isFlipping && (
            <div className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/30">
              Kazanan: <strong>{tossWinner}</strong>
            </div>
          )}
        </div>

        {/* Manual Winner Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Veya Kura Kazananını Doğrudan Seçin
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTossWinner(p1Name)}
              className={`p-3 rounded-2xl border text-sm font-bold text-left transition flex items-center justify-between ${
                tossWinner === p1Name
                  ? 'border-lime-400 bg-lime-400/20 text-lime-300 ring-2 ring-lime-400/30'
                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="truncate">
                <div className="text-[10px] text-slate-400 font-normal">1. Oyuncu</div>
                <div className="truncate">{p1Name}</div>
              </div>
              {tossWinner === p1Name && <CheckCircle2 className="w-5 h-5 text-lime-400 flex-shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => setTossWinner(p2Name)}
              className={`p-3 rounded-2xl border text-sm font-bold text-left transition flex items-center justify-between ${
                tossWinner === p2Name
                  ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 ring-2 ring-cyan-400/30'
                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="truncate">
                <div className="text-[10px] text-slate-400 font-normal">2. Oyuncu</div>
                <div className="truncate">{p2Name}</div>
              </div>
              {tossWinner === p2Name && <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />}
            </button>
          </div>
        </div>

        {/* Tercih & Saha Tarafı */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Kura Tercihi
            </label>
            <select
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="Servis">🎾 Servis</option>
              <option value="Karşılama">🛡️ Karşılama</option>
              <option value="Kort Seçimi">🏟️ Kort Seçimi</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Saha Tarafı
            </label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="Sandalyenin Sağı">🪑 Sandalyenin Sağı</option>
              <option value="Sandalyenin Solu">🪑 Sandalyenin Solu</option>
              <option value="Güneş Tarafı">☀️ Güneş Tarafı</option>
              <option value="Rüzgar Tarafı">💨 Rüzgar Tarafı</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-white rounded-xl bg-slate-800 transition"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!tossWinner}
            className="flex-2 py-3 px-5 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-sm rounded-xl shadow-lg transition disabled:opacity-50"
          >
            Kurayı Onayla
          </button>
        </div>
      </div>
    </div>
  );
};
