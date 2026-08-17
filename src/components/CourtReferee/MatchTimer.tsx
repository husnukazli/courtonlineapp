import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, Volume2 } from 'lucide-react';

interface MatchTimerProps {
  initialSeconds?: number;
  label?: string;
  onClose?: () => void;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({
  initialSeconds = 90,
  label = 'Saha Değişimi Molası',
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      // Play web audio beep if available
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {
        // ignore
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const setTimerPreset = (secs: number) => {
    setSecondsLeft(secs);
    setIsRunning(false);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">{label}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            Kapat
          </button>
        )}
      </div>

      {/* Big Countdown Display */}
      <div className="flex items-center justify-center py-2">
        <span
          className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-wider ${
            secondsLeft <= 15
              ? 'text-rose-400 animate-pulse'
              : isRunning
              ? 'text-amber-400'
              : 'text-slate-100'
          }`}
        >
          {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-4 gap-1.5 my-3">
        {[
          { label: '90s Mola', sec: 90 },
          { label: '120s Set', sec: 120 },
          { label: '5dk Isınma', sec: 300 },
          { label: '3dk Sağlık', sec: 180 },
        ].map((p) => (
          <button
            key={p.sec}
            type="button"
            onClick={() => setTimerPreset(p.sec)}
            className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition ${
              secondsLeft === p.sec
                ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mt-2">
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition ${
            isRunning
              ? 'bg-rose-500 hover:bg-rose-400 text-white'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'Durdur' : 'Başlat'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setSecondsLeft(initialSeconds);
          }}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Sıfırla"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
