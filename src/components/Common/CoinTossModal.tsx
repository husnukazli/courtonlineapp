import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CoinTossModalProps {
  isOpen: boolean;
  onClose: () => void;
  p1Name: string;
  p2Name: string;
  onConfirm: (winner: string) => void;
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
  const [displaySide, setDisplaySide] = useState<1 | 2>(1);

  // Animasyon esnasında paranın renk/taraf değiştirmesi
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFlipping) {
      interval = setInterval(() => {
        setDisplaySide((prev) => (prev === 1 ? 2 : 1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isFlipping]);

  if (!isOpen) return null;

  const handleTapCoin = () => {
    if (isFlipping || tossWinner) return; // Zaten atıldıysa veya dönüyorsa basılamaz
    setIsFlipping(true);

    setTimeout(() => {
      setIsFlipping(false);
      const isP1 = Math.random() > 0.5;
      const winner = isP1 ? p1Name : p2Name;
      setTossWinner(winner);
      setDisplaySide(isP1 ? 1 : 2);
      onConfirm(winner); // Arka plandaki forma kazananı otomatik gönder
    }, 2000);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Çarpı Butonu */}
      <button 
        onClick={handleClose} 
        className="absolute top-8 right-8 p-4 bg-slate-800 hover:bg-rose-500 rounded-full text-white transition-colors shadow-lg z-50"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="text-center mb-10">
        <h2 className="text-4xl sm:text-5xl font-black text-amber-400 tracking-widest">KURA ATIŞI</h2>
        {!tossWinner && !isFlipping && (
          <p className="text-slate-400 mt-4 text-lg">Atmak için aşağıdaki paraya dokun</p>
        )}
      </div>

      {/* DEVASA BOZUK PARA */}
      <button 
        onClick={handleTapCoin} 
        disabled={isFlipping || !!tossWinner}
        className={`relative w-[85vw] h-[85vw] max-w-[400px] max-h-[400px] rounded-full border-[16px] shadow-[0_0_100px_rgba(255,255,255,0.15)] transition-transform flex items-center justify-center
          ${!tossWinner && !isFlipping ? 'active:scale-95 hover:scale-[1.02]' : ''}
          ${displaySide === 1 ? 'border-lime-400 bg-gradient-to-br from-emerald-600 to-lime-500' : 'border-cyan-400 bg-gradient-to-br from-blue-600 to-cyan-500'}
        `}
      >
        {isFlipping ? (
          <span className="text-8xl sm:text-9xl animate-spin">🪙</span>
        ) : tossWinner ? (
          <div className="flex flex-col items-center p-4">
            <span className="text-xl font-black text-slate-900/50 mb-2 tracking-widest">KAZANAN</span>
            <span className="text-4xl sm:text-5xl font-black text-white text-center leading-tight line-clamp-3">
              {tossWinner}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-8xl sm:text-9xl mb-4">🪙</span>
            <span className="text-2xl font-black text-white/50 tracking-widest">DOKUN</span>
          </div>
        )}
      </button>

      {/* Kura Bittiğinde Çıkan Uyarı */}
      {tossWinner && !isFlipping && (
        <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-4">
          <p className="text-emerald-400 font-bold text-2xl mb-6">✅ Kazanan Belirlendi!</p>
          <button onClick={handleClose} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold text-lg shadow-lg">
            Kapat ve Seçimlere Geç
          </button>
        </div>
      )}
    </div>
  );
};
