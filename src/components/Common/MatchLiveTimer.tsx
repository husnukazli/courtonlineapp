import React, { useState, useEffect } from 'react';
import { MatchItem } from '../../types/tennis';
import { calculateMatchDurationSeconds, formatDuration } from '../../utils/timerUtils';
import { useTennisData } from '../../context/TennisDataContext';
import { Clock, Play, Pause, RotateCcw, Activity } from 'lucide-react';

interface MatchLiveTimerProps {
  match: MatchItem;
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
  className?: string;
}

export const MatchLiveTimer: React.FC<MatchLiveTimerProps> = ({
  match,
  size = 'md',
  showControls = false,
  className = '',
}) => {
  const { setMatchStatus } = useTennisData();
  const [now, setNow] = useState<number>(Date.now());

  const isLive = match.Durum === 'Oynaniyor';
  const isPaused = match.Durum === 'Duraklatildi';
  const isFinished = match.Durum === 'Bitti' || match.Durum === 'Retired' || match.Durum === 'Walkover';
  const isUpcoming = match.Durum === 'Baslamadi';

  // Only run 1-second interval if the match is live
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  const durationSeconds = calculateMatchDurationSeconds(match, now);
  const formattedTime = formatDuration(durationSeconds);

  // Quick Controls
  const handleTogglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLive) {
      setMatchStatus(match.id, 'Duraklatildi');
    } else {
      setMatchStatus(match.id, 'Oynaniyor');
    }
  };

  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono font-bold tracking-tight ${
          isLive
            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
            : isPaused
            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
            : isFinished
            ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
        } ${className}`}
        title={`Maç Süresi: ${formattedTime}`}
      >
        {isLive ? (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
        ) : isPaused ? (
          <Pause className="w-3 h-3 text-amber-400 shrink-0" />
        ) : (
          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
        )}
        <span>{isUpcoming && durationSeconds === 0 ? '--:--' : formattedTime}</span>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div
        className={`flex items-center justify-between p-3 rounded-2xl border ${
          isLive
            ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : isPaused
            ? 'bg-amber-950/40 border-amber-500/40'
            : isFinished
            ? 'bg-cyan-950/30 border-cyan-500/30'
            : 'bg-slate-950/50 border-slate-800'
        } ${className}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 shadow-md shadow-emerald-500/20'
                : isPaused
                ? 'bg-amber-500/20 text-amber-400 border border-amber-400/40'
                : isFinished
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isLive ? (
              <Activity className="w-5 h-5 animate-pulse" />
            ) : isPaused ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Maç Süresi</span>
              {isLive && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold animate-pulse">
                  Canlı Sayıyor
                </span>
              )}
              {isPaused && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-extrabold">
                  Duraklatıldı
                </span>
              )}
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black tracking-tight text-white">
              {formattedTime}
            </div>
          </div>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            {!isFinished && (
              <button
                type="button"
                onClick={handleTogglePlayPause}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isLive
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                {isLive ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Mola Ver</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{isPaused ? 'Devam Et' : 'Başlat'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default 'md' size
  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-mono font-extrabold tracking-tight transition ${
        isLive
          ? 'bg-slate-950/90 text-emerald-400 border border-emerald-500/50 shadow-sm shadow-emerald-500/20'
          : isPaused
          ? 'bg-slate-950/90 text-amber-400 border border-amber-500/50 shadow-sm shadow-amber-500/20'
          : isFinished
          ? 'bg-slate-950/70 text-cyan-300 border border-cyan-500/40'
          : 'bg-slate-950/60 text-slate-400 border border-slate-800'
      } ${className}`}
      title={`Canlı Maç Zamanlayıcısı: ${formattedTime}`}
    >
      <div className="flex items-center gap-1.5">
        {isLive ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        ) : isPaused ? (
          <Pause className="w-3 h-3 text-amber-400 shrink-0" />
        ) : (
          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
        )}
        <span className="text-white font-black text-sm">{formattedTime}</span>
      </div>

      {showControls && !isFinished && (
        <button
          type="button"
          onClick={handleTogglePlayPause}
          className="ml-1 p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition"
          title={isLive ? 'Duraklat' : 'Zamanlayıcıyı Başlat'}
        >
          {isLive ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
        </button>
      )}
    </div>
  );
};
