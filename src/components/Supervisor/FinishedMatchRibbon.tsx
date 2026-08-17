import React, { useState } from 'react';
import { MatchItem } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import { Trophy, Clock, Edit3, Play, RotateCcw } from 'lucide-react';

interface FinishedMatchRibbonProps {
  match: MatchItem;
  onClick: (match: MatchItem) => void;
}

export const FinishedMatchRibbon: React.FC<FinishedMatchRibbonProps> = ({ match, onClick }) => {
  const { resumeMatchToLive } = useTennisData();
  const [resuming, setResuming] = useState(false);

  const p1Name = match['Oyuncu 1'];
  const p2Name = match['Oyuncu 2'];
  const winner = match.Kazanan || '';
  const isP1Winner = winner === p1Name;
  const isP2Winner = winner === p2Name;

  const statusLabel =
    match.Durum === 'Retired'
      ? 'ÇEKİLDİ'
      : match.Durum === 'Walkover'
      ? 'HÜKMEN'
      : 'BİTTİ';

  const handleQuickResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResuming(true);
    resumeMatchToLive(match.id);
    setTimeout(() => setResuming(false), 500);
  };

  return (
    <div
      onClick={() => onClick(match)}
      className="group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-3 sm:p-4 transition-all duration-150 cursor-pointer shadow-md hover:shadow-cyan-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"
    >
      {/* Left accent indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-500 to-teal-400" />

      {/* Left section: Court & Status */}
      <div className="flex items-center gap-3 pl-1.5">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-black text-xs shrink-0">
          {match.Kort.replace('KORT', 'K').trim()}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400">
              {match.Kategori}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {match.Baslangic_Saati || '--:--'} - {match.Bitis_Saati || '--:--'}
            </span>
          </div>

          {/* Players Inline */}
          <div className="flex items-center gap-2 text-xs sm:text-sm mt-0.5">
            <span className={`font-black flex items-center gap-1 ${isP1Winner ? 'text-lime-300' : 'text-slate-400 line-through opacity-75'}`}>
              {isP1Winner && <Trophy className="w-3.5 h-3.5 text-lime-400 shrink-0" />}
              <span>{p1Name}</span>
            </span>
            <span className="text-slate-600 font-bold">vs</span>
            <span className={`font-black flex items-center gap-1 ${isP2Winner ? 'text-cyan-300' : 'text-slate-400 line-through opacity-75'}`}>
              {isP2Winner && <Trophy className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              <span>{p2Name}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right section: Score & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pl-1.5 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
        {/* Score pill */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
            {statusLabel}
          </span>
          <span className="font-mono text-sm sm:text-base font-black text-white px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 tracking-wide">
            {match.Skor || '0/0 0/0'}
          </span>
        </div>

        {/* Quick Resume Button */}
        <button
          type="button"
          onClick={handleQuickResume}
          title="Maçı tekrar canlı yayına al ve devam ettir"
          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1 shrink-0 active:scale-95"
        >
          {resuming ? (
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span className="text-xs">Canlıya Al</span>
        </button>

        {/* Edit affordance */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(match);
          }}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-300 text-xs font-bold transition flex items-center gap-1 shrink-0 active:scale-95"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Düzelt</span>
        </button>
      </div>
    </div>
  );
};
