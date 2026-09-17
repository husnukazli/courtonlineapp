import React, { useState } from 'react';

interface CoinTossModalProps {
  isOpen: boolean;
  onClose: () => void;
  p1Name: string;
  p2Name: string;
  onConfirm: (winner: string) => void;
}

export const CoinTossModal: React.FC<CoinTossModalProps> = ({ isOpen, onClose, p1Name, p2Name, onConfirm }) => {
  const [winner, setWinner] = useState<string>('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white text-center">Kura Atışı</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setWinner(p1Name)}
            className={`px-4 py-2 rounded-xl ${winner === p1Name ? 'bg-lime-400 text-black' : 'bg-slate-800 text-white'}`}
          >
            {p1Name}
          </button>
          <button
            onClick={() => setWinner(p2Name)}
            className={`px-4 py-2 rounded-xl ${winner === p2Name ? 'bg-lime-400 text-black' : 'bg-slate-800 text-white'}`}
          >
            {p2Name}
          </button>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-white bg-slate-800 rounded-xl">İptal</button>
          <button
            onClick={() => {
              if (winner) {
                onConfirm(winner);
                onClose();
              }
            }}
            className="px-4 py-2 text-black bg-lime-400 rounded-xl font-bold"
          >
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
};
