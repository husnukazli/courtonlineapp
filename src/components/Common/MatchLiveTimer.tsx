import React, { useState, useEffect } from 'react';
import { MatchItem } from '../../types/tennis';
import { calculateMatchDurationSeconds, calculatePauseDurationSeconds, formatDuration, formatPauseDurationText } from '../../utils/timerUtils';
import { useTennisData } from '../../context/TennisDataContext';
import { Clock, Play, Pause, Activity, PauseCircle } from 'lucide-react';

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

  // Türkçe karakter ve büyük/küçük harf toleransı (Örn: Oynanıyor vs Oynaniyor)
  const safeDurum = match.Durum ? match.Durum.replace('ı', 'i').toLowerCase() : '';
  
  const isLive = safeDurum === 'oynaniyor';
  const isPaused = safeDurum === 'duraklatildi';
  const isFinished = safeDurum === 'bitti' || safeDurum === 'retired' || safeDurum === 'walkover';
  const isUpcoming = safeDurum === 'baslamadi';

  // Zamanlayıcı motoru HER ZAMAN çalışsın (durum gecikmelerinde donmayı önler)
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Maç süresi (askıya alındığında veya bittiğinde donar)
  let durationSeconds = calculateMatchDurationSeconds(match, now);

  if (!durationSeconds || isNaN(durationSeconds) || durationSeconds < 0) {
    if ((isLive || isPaused || isFinished) && match.Baslangic_Saati && match.Baslangic_Saati.includes(':')) {
      const [h, m] = match.Baslangic_Saati.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const start = new Date();
        start.setHours(h, m, 0, 0);
        
        // Eğer maç bittiyse ve bitiş saati varsa, saati bitişte dondur
        if (isFinished && match.Bitis_Saati && match.Bitis_Saati.includes(':')) {
          const [endH, endM] = match.Bitis_Saati.split(':').map(Number);
          const end = new Date();
          end.setHours(endH, endM, 0, 0);
          durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
        } else {
          // Canlı maçlar için şu anki zamandan çıkar
          durationSeconds = Math.max(0, Math.floor((now - start.getTime()) / 1000));
        }
      } else {
        durationSeconds = 0;
      }
    } else {
      durationSeconds = 0;
    }
  }

  // Askıya alma / mola süresi hesabı
  const pauseDurationSeconds = calculatePauseDurationSeconds(match, now);
  const formattedTime = formatDuration(durationSeconds);
  const formattedPauseTime = formatDuration(pauseDurationSeconds);

  // Hızlı Kontroller
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
            ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20'
            : isFinished
            ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
        } ${className}`}
        title={
          isPaused 
            ? `Maç Durduruldu: ${formattedTime} | Mola Süresi: ${formattedPauseTime}` 
            : pauseDurationSeconds > 0 
            ? `Maç Süresi: ${formattedTime} (Toplam Mola: ${formatPauseDurationText(pauseDurationSeconds)})` 
            : `Maç Süresi: ${formattedTime}`
        }
      >
        {isLive ? (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
        ) : isPaused ? (
          <Pause className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
        ) : (
          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
        )}
        <span>{isUpcoming && durationSeconds === 0 ? '--:--' : formattedTime}</span>
        
        {/* Askıya Alındığında Ayrı Sayaç */}
        {isPaused && (
          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/30 text-amber-200 border border-amber-400/40 flex items-center gap-0.5">
            <span className="font-sans font-bold">Mola:</span> {formattedPauseTime}
          </span>
        )}
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border gap-3 ${
          isLive
            ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : isPaused
            ? 'bg-amber-950/50 border-amber-500/50 shadow-lg shadow-amber-500/10'
            : isFinished
            ? 'bg-cyan-950/30 border-cyan-500/30'
            : 'bg-slate-950/50 border-slate-800'
        } ${className}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 shadow-md shadow-emerald-500/20'
                : isPaused
                ? 'bg-amber-500/20 text-amber-400 border border-amber-400/40 animate-pulse'
                : isFinished
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isLive ? (
              <Activity className="w-5 h-5 animate-pulse" />
            ) : isPaused ? (
              <PauseCircle className="w-6 h-6 text-amber-400" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span>{isPaused ? 'Maç Süresi (Durduruldu)' : 'Maç Süresi'}</span>
              {isLive && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold animate-pulse">
                  Canlı Sayıyor
                </span>
              )}
              {isPaused && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[9px] font-extrabold border border-amber-500/50 animate-pulse">
                  Askıda
                </span>
              )}
              {!isPaused && pauseDurationSeconds > 0 && (
                <span className="text-[9px] text-slate-400 font-medium">
                  • Toplam Mola: {formatPauseDurationText(pauseDurationSeconds)}
                </span>
              )}
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black tracking-tight text-white">
              {formattedTime}
            </div>
          </div>
        </div>

        {/* Askı / Mola Durumunda Özel Ayrı Sayaç Paneli */}
        {isPaused && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200">
            <Pause className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-amber-300">Askı / Mola Süresi</span>
              <span className="font-mono font-black text-base text-amber-100">{formattedPauseTime}</span>
            </div>
          </div>
        )}

        {showControls && (
          <div className="flex items-center gap-2 shrink-0">
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

  // Varsayılan 'md' boyutu
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
      title={
        isPaused 
          ? `Maç Durduruldu: ${formattedTime} | Mola: ${formattedPauseTime}` 
          : pauseDurationSeconds > 0 
          ? `Maç Süresi: ${formattedTime} (Toplam Mola: ${formatPauseDurationText(pauseDurationSeconds)})` 
          : `Canlı Maç Zamanlayıcısı: ${formattedTime}`
      }
    >
      <div className="flex items-center gap-1.5">
        {isLive ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        ) : isPaused ? (
          <Pause className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
        ) : (
          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
        )}
        <span className="text-white font-black text-sm">{formattedTime}</span>

        {isPaused && (
          <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <span className="font-sans font-bold">Mola:</span> {formattedPauseTime}
          </span>
        )}
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
