import React from 'react';
import { MatchItem } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import { parseScoreString, validateSingleSet } from '../../utils/tennisScoringEngine';
import {
  Trophy,
  Edit3,
  Clock,
  CheckCircle2,
  PlayCircle,
  Plus,
  Minus,
} from 'lucide-react';

interface CourtCardProps {
  match: MatchItem;
  onFinishMatch: (match: MatchItem) => void;
  onEditScore: (match: MatchItem) => void;
  onOpenSetup?: (match: MatchItem) => void;
}

export const CourtCard: React.FC<CourtCardProps> = ({
  match,
  onFinishMatch,
  onEditScore,
  onOpenSetup,
}) => {
  const { updateGameScore, setMatchStatus } = useTennisData();

  const parsed = parseScoreString(match.Skor);
  const s1_p1 = match.detailedState?.set1_p1 ?? parsed.s1_p1;
  const s1_p2 = match.detailedState?.set1_p2 ?? parsed.s1_p2;
  const s2_p1 = match.detailedState?.set2_p1 ?? parsed.s2_p1;
  const s2_p2 = match.detailedState?.set2_p2 ?? parsed.s2_p2;
  const s3_p1 = match.detailedState?.set3_p1 ?? parsed.s3_p1;
  const s3_p2 = match.detailedState?.set3_p2 ?? parsed.s3_p2;

  const isLive = match.Durum === 'Oynaniyor';
  const isFinished = match.Durum === 'Bitti' || match.Durum === 'Retired' || match.Durum === 'Walkover';
  const isUpcoming = match.Durum === 'Baslamadi';

  // Determine current active set for quick tallying
  const format = match.Skor_Formati || '3 Normal Set';
  const val1 = validateSingleSet(s1_p1, s1_p2, 1, format);
  const val2 = validateSingleSet(s2_p1, s2_p2, 2, format);
  
  let currentSetIndex: 1 | 2 | 3 = 1;
  if (val1.isComplete && !val2.isComplete) {
    currentSetIndex = 2;
  } else if (val1.isComplete && val2.isComplete && val1.winner !== val2.winner) {
    currentSetIndex = 3;
  } else if (s3_p1 > 0 || s3_p2 > 0) {
    currentSetIndex = 3;
  } else if (s2_p1 > 0 || s2_p2 > 0) {
    currentSetIndex = 2;
  }

  // Handle card click: If not started, prompt setup modal first. If started/finished, open score modal.
  const handleCardClick = () => {
    if (isUpcoming) {
      if (onOpenSetup) {
        onOpenSetup(match);
        return;
      }
    }
    onEditScore(match);
  };

  const handleStartMatchDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenSetup) {
      onOpenSetup(match);
    } else {
      setMatchStatus(match.id, 'Oynaniyor', undefined, undefined);
      onEditScore(match);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-3xl transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group shadow-lg ${
        isLive
          ? 'bg-slate-900/95 border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.18)] ring-1 ring-emerald-400/30 hover:border-emerald-300'
          : isUpcoming
          ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20 border-2 border-amber-500/50 hover:border-amber-400/90 shadow-md shadow-amber-950/20'
          : 'bg-slate-900/80 border border-slate-700/80 hover:border-slate-600'
      }`}
    >
      {/* Top Status Accent Bar */}
      <div
        className={`h-1.5 w-full ${
          isLive
            ? 'bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500 animate-pulse'
            : isUpcoming
            ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
            : 'bg-gradient-to-r from-cyan-400 to-blue-500'
        }`}
      />

      {/* Card Header: Court & Status */}
      <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
              isLive
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/30'
                : isUpcoming
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                : 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
            }`}
          >
            {match.Kort.replace('KORT', 'K').trim()}
          </span>
          <div>
            <h3 className="font-extrabold text-white text-base sm:text-lg leading-tight flex items-center gap-1.5">
              <span>{match.Kort}</span>
              {isLive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  CANLI
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">
              {match.Kategori}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-black tracking-wide uppercase ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : isUpcoming
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            {match.Durum}
          </span>
        </div>
      </div>

      {/* Start / End Time Strip */}
      <div className="px-4 sm:px-5 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-lime-400" />
            <span>Başlangıç:</span>
            <strong className="text-white font-bold">
              {match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi' ? match.Baslangic_Saati : '--:--'}
            </strong>
          </span>

          {isFinished && (
            <span className="text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bitiş:</span>
              <strong className="text-white font-bold">
                {match.Bitis_Saati && match.Bitis_Saati !== 'Secilmedi' ? match.Bitis_Saati : '--:--'}
              </strong>
            </span>
          )}
        </div>

        <div className="text-slate-400 font-sans text-[11px]">
          {match.Skor_Formati}
        </div>
      </div>

      {/* Main Body: Players & Set Scores */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Score Table */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 bg-slate-900/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 py-1.5 px-3 border-b border-slate-800">
            <div className="col-span-6">Oyuncu</div>
            <div className="col-span-2 text-center">1. Set</div>
            <div className="col-span-2 text-center">2. Set</div>
            <div className="col-span-2 text-center">3. Set</div>
          </div>

          {/* Player 1 Row */}
          <div
            className={`grid grid-cols-12 items-center py-2.5 px-3 border-b border-slate-800/50 ${
              match.Kazanan === match['Oyuncu 1'] && isFinished ? 'bg-lime-500/10' : ''
            }`}
          >
            <div className="col-span-6 flex items-center gap-2 pr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0"></span>
              <span className="text-xs sm:text-sm font-bold text-white truncate">
                {match['Oyuncu 1']}
              </span>
              {match.Kazanan === match['Oyuncu 1'] && isFinished && (
                <Trophy className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              )}
            </div>
            <div className={`col-span-2 text-center font-mono text-base font-black ${s1_p1 > 0 ? 'text-lime-300' : 'text-slate-500'}`}>
              {isUpcoming ? '-' : s1_p1}
            </div>
            <div className={`col-span-2 text-center font-mono text-base font-black ${s2_p1 > 0 ? 'text-lime-300' : 'text-slate-500'}`}>
              {isUpcoming ? '-' : s2_p1}
            </div>
            <div className={`col-span-2 text-center font-mono text-base font-black ${s3_p1 > 0 ? 'text-lime-300' : 'text-slate-500'}`}>
              {isUpcoming ? '-' : s3_p1}
            </div>
          </div>

          {/* Player 2 Row */}
          <div
            className={`grid grid-cols-12 items-center py-2.5 px-3 ${
              match.Kazanan === match['Oyuncu 2'] && isFinished ? 'bg-cyan-500/10' : ''
            }`}
          >
            <div className="col-span-6 flex items-center gap-2 pr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0"></span>
              <span className="text-xs sm:text-sm font-bold text-white truncate">
                {match['Oyuncu 2']}
              </span>
              {match.Kazanan === match['Oyuncu 2'] && isFinished && (
                <Trophy className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              )}
            </div>
            <div className={`col-span-2 text-center font-mono text-base font-black ${s1_p2 > 0 ? 'text-cyan-300' : 'text-slate-500'}`}>
              {isUpcoming ? '-' : s1_p2}
            </div>
            <div className={`col-span-2 text-center font-mono text-base font-black ${s2_p2 > 0 ? 'text-cyan-300' : 'text-slate-500'}`}>
              {isUpcoming ? '-' : s2_p2}
            </div>
            <div className={`col-span-2 text-center font-mono text-base font-black ${s3_p2 > 0 ? 'text-cyan-300' : 'text-slate-500'}`}>
              {isUpcoming ? '-' : s3_p2}
            </div>
          </div>
        </div>

        {/* Live Match Quick Buttons (+1 and -1 Oyun for referee single-tap convenience) */}
        {isLive && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400">
              <span>Hızlı Skor ({currentSetIndex}. Set)</span>
              <span className="text-emerald-400 font-mono text-[10px] uppercase">Tek Dokunuş</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Player 1 (+1 / -1) */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateGameScore(match.id, currentSetIndex, 1, -1);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-800 active:scale-95 transition shrink-0"
                  title="-1 Oyun"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateGameScore(match.id, currentSetIndex, 1, 1);
                  }}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow-md shadow-lime-400/20 active:scale-95 transition truncate"
                  title="+1 Oyun"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">+1 ({match['Oyuncu 1'].split(' ')[0]})</span>
                </button>
              </div>

              {/* Player 2 (+1 / -1) */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateGameScore(match.id, currentSetIndex, 2, -1);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-800 active:scale-95 transition shrink-0"
                  title="-1 Oyun"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateGameScore(match.id, currentSetIndex, 2, 1);
                  }}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow-md shadow-cyan-400/20 active:scale-95 transition truncate"
                  title="+1 Oyun"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">+1 ({match['Oyuncu 2'].split(' ')[0]})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Action Buttons */}
      <div className="p-3 sm:p-4 bg-slate-950/70 border-t border-slate-800 flex items-center gap-2">
        {isUpcoming ? (
          <div className="flex items-center gap-2 w-full">
            {onOpenSetup && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSetup(match);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                title="Kura, saha seçimi ve saat ayarları"
              >
                <span>🪙 Kurulum & Kura</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStartMatchDirect}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-400/20 transition active:scale-95"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Maçı Başlat</span>
            </button>
          </div>
        ) : isLive ? (
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditScore(match);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-lime-400/20 transition active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Skor Gir / Düzenle</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFinishMatch(match);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 transition"
            >
              <Trophy className="w-4 h-4 text-cyan-400" />
              <span>Bitir</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditScore(match);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition"
          >
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span>Sonucu Gör / Düzenle</span>
          </button>
        )}
      </div>
    </div>
  );
};
