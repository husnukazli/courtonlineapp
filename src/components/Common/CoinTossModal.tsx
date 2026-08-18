import React, { useState, useEffect } from 'react';
import { X, Trophy, CheckCircle2 } from 'lucide-react';

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
  const [tossWinner, setTossWinner] = useState<string>('');
  const [choice, setChoice] = useState<string>('Servis');
  const [side, setSide] = useState<string>('Sandalyenin Sağı');
  const [displaySide, setDisplaySide] = useState<1 | 2>(1);

  // Hızlı dönme efekti (Yan durma ihtimalini %0'a indiren güvenli animasyon)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFlipping) {
      interval = setInterval(() => {
        setDisplaySide((prev) => (prev === 1 ? 2 : 1));
      }, 100); // Saniyede 10 kere yüz değiştirir
    }
    return () => clearInterval(interval);
  }, [isFlipping]);

  if (!isOpen) return null;

  const flipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTossWinner('');

    setTimeout(() => {
      setIsFlipping(false);
      const isP1 = Math.random() > 0.5;
      const winner = isP1 ? p1Name : p2Name;
      setTossWinner(winner);
      setDisplaySide(isP1 ? 1 : 2);
    }, 1500);
  };

  const handleSave = () => {
    if (!tossWinner) {
      alert('Lütfen önce kurayı atın veya kazananı seçin.');
      return;
    }
    onConfirm(tossWinner, choice, side);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in p-4 sm:p-8">
      {/* Kapatma Butonu */}
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 p-3 bg-slate-800 hover:bg-rose-500 rounded-2xl text-white transition shadow-lg"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="w-full max-w-2xl flex flex-col items-center space-y-8">
        <h2 className="text-4xl sm:text-5xl font-black text-amber-400 tracking-widest uppercase text-center drop-shadow-lg">
          KURA ATIŞI
        </h2>

        {/* DEV PARA ALANI */}
        <button
          type="button"
          onClick={flipCoin}
          disabled={isFlipping}
          className="relative focus:outline-none group active:scale-95 transition-transform"
        >
          <div className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full border-[12px] flex flex-col items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.15)] transition-colors duration-200 ${
            displaySide === 1 
              ? 'border-lime-400 bg-gradient-to-br from-emerald-600 to-lime-500' 
              : 'border-cyan-400 bg-gradient-to-br from-blue-600 to-cyan-500'
          }`}>
            {isFlipping ? (
              <span className="text-5xl animate-bounce">🪙</span>
            ) : tossWinner ? (
              <div className="flex flex-col items-center p-4">
                <Trophy className="w-12 h-12 text-slate-950 mb-2" />
                <span className="text-sm font-black text-slate-900/70 uppercase tracking-widest mb-1">KAZANAN</span>
                <span className="text-3xl sm:text-4xl font-black text-slate-950 text-center leading-tight line-clamp-2">
                  {tossWinner}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-7xl mb-2">🪙</span>
                <span className="text-xl font-black text-slate-950 uppercase">DOKUN VE AT</span>
              </div>
            )}
          </div>
        </button>

        {/* Kura Tercihleri */}
        <div className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-2xl">
          <div>
            <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
              Kura Tercihi
            </label>
            <select
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-4 text-base text-white font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="Servis">🎾 Servis Atacak</option>
              <option value="Karşılama">🛡️ Karşılayacak</option>
              <option value="Kort Seçimi">🏟️ Kort Seçecek</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
              Saha Tarafı
            </label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-4 text-base text-white font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="Sandalyenin Sağı">🪑 Sandalyenin Sağı</option>
              <option value="Sandalyenin Solu">🪑 Sandalyenin Solu</option>
              <option value="Güneş Tarafı">☀️ Güneş Tarafı</option>
              <option value="Rüzgar Tarafı">💨 Rüzgar Tarafı</option>
            </select>
          </div>
        </div>

        {/* Manuel Kazanan Seçimi & Onay */}
        <div className="w-full flex flex-col sm:flex-row gap-4">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setTossWinner(p1Name); setDisplaySide(1); }} className={`p-4 rounded-2xl border-2 font-black text-sm transition flex items-center justify-center gap-2 ${tossWinner === p1Name ? 'border-lime-400 bg-lime-400/20 text-lime-400' : 'border-slate-800 bg-slate-900 text-slate-400'}`}>
              <div className="truncate">{p1Name.split(' ')[0]}</div>
              {tossWinner === p1Name && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            </button>
            <button type="button" onClick={() => { setTossWinner(p2Name); setDisplaySide(2); }} className={`p-4 rounded-2xl border-2 font-black text-sm transition flex items-center justify-center gap-2 ${tossWinner === p2Name ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400' : 'border-slate-800 bg-slate-900 text-slate-400'}`}>
              <div className="truncate">{p2Name.split(' ')[0]}</div>
              {tossWinner === p2Name && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!tossWinner || isFlipping}
            className="sm:w-48 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500"
          >
            ONAYLA
          </button>
        </div>
      </div>
    </div>
  );
};
