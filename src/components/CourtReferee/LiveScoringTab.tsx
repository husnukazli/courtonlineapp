import React, { useState, useRef } from 'react';
import {
  RotateCcw, Clock, ChevronDown, Flag, Settings,
} from 'lucide-react';
import { useTennisData } from '../../context/TennisDataContext';
import { MatchTimer } from './MatchTimer';
import { MatchLiveTimer } from '../Common/MatchLiveTimer';

interface LiveScoringTabProps {
  onBackToSetup: () => void;
}

export const LiveScoringTab: React.FC<LiveScoringTabProps> = ({ onBackToSetup }) => {
  const {
    activeMatch,
    awardPointToMatch,
    undoLastPoint,
    setMatchStatus,
    resetMatchScore,
  } = useTennisData();

  const [showTimer, setShowTimer]       = useState(false);
  const [showEndOptions, setShowEndOptions] = useState(false);
  const lastPointClickRef = useRef<number>(0);

  if (!activeMatch) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl">
        Seçili maç bulunamadı. Lütfen <strong>Kurulum / Kura</strong> sekmesinden bir maç seçin.
      </div>
    );
  }

  const p1Name = activeMatch['Oyuncu 1'] || '—';
  const p2Name = activeMatch['Oyuncu 2'] || '—';

  const handlePoint = (playerWon: 1 | 2) => {
    const now = Date.now();
    if (now - lastPointClickRef.current < 400) return;
    lastPointClickRef.current = now;
    awardPointToMatch(activeMatch.id, playerWon, 'NORMAL');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
  };

  // Kısa kort kodu (K1, K2 …)
  const kortKod = (() => {
    const k = activeMatch.Kort || '';
    const n = k.match(/\d+/)?.[0] || '';
    return n ? `K${n}` : k.slice(0, 2).toUpperCase() || 'K?';
  })();

  const state = activeMatch.detailedState || {
    currentSet: 1,
    set1_p1: 0, set1_p2: 0,
    set2_p1: 0, set2_p2: 0,
    set3_p1: 0, set3_p2: 0,
    gamePoint_p1: '0', gamePoint_p2: '0',
    currentServer: 1,
    isTiebreak: false, tiebreak_p1: 0, tiebreak_p2: 0,
    lastActionMessage: '',
  };

  // Akıllı ve esnek durum kontrolleri (Büyük/küçük harf duyarlılığını yoksayar)
  const currentStatus = (activeMatch.Durum || '').toLowerCase().trim();
  const isDone = ['bitti', 'retired', 'walkover'].includes(currentStatus);
  const isLive = currentStatus === 'oynaniyor';
  const isPaused = currentStatus === 'duraklatildi';

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">

      {/* Kuruluma Geri Dön */}
      <button type="button" onClick={onBackToSetup}
        className="w-full py-3.5 bg-amber-950/40 hover:bg-amber-950/60 border border-amber-700/40 rounded-2xl flex items-center justify-center gap-2 text-amber-300 font-black text-sm shadow transition active:scale-95">
        <Settings className="w-4 h-4" />
        Kurulum / Kura Ekranına Dön
      </button>

      {/* Üst bilgi: Kort + Durum + Süre + Mola */}
      <div className="bg-emerald-950/40 border border-emerald-700/40 rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-400 border border-lime-400/30 flex items-center justify-center font-bold text-sm shrink-0">
            {kortKod}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">{activeMatch.Kort}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isLive ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                : isPaused ? 'bg-amber-500/20 text-amber-400'
                : isDone ? 'bg-rose-500/20 text-rose-400'
                : 'bg-slate-800 text-slate-400'}`}>
                {activeMatch.Durum}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-xs">
              {activeMatch.Kategori} • {activeMatch.Skor_Formati}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MatchLiveTimer match={activeMatch} size="sm" />
          <button type="button" onClick={() => setShowTimer(!showTimer)}
            className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${showTimer ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white'}`}>
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Mola</span>
          </button>
        </div>
      </div>

      {showTimer && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <MatchTimer onClose={() => setShowTimer(false)} />
        </div>
      )}

      {/* Skor Tablosu */}
      <div className="bg-slate-900 border-2 border-emerald-700/60 rounded-3xl p-3 sm:p-5 shadow-2xl shadow-emerald-900/20 space-y-3">

        {/* Başlık */}
        <div className="grid grid-cols-12 gap-1 text-center text-[10px] text-slate-500 font-bold border-b border-slate-800 pb-2">
          <div className="col-span-6 text-left pl-1 uppercase tracking-wider">Oyuncu</div>
          <div className={`col-span-1 text-center ${state.currentSet === 1 ? 'text-lime-400 font-black' : ''}`}>S1</div>
          <div className={`col-span-1 text-center ${state.currentSet === 2 ? 'text-lime-400 font-black' : ''}`}>S2</div>
          <div className={`col-span-1 text-center ${state.currentSet === 3 ? 'text-lime-400 font-black' : ''}`}>S3</div>
          <div className="col-span-3 text-center text-amber-400 font-black">Puan</div>
        </div>

        {/* Oyuncu 1 */}
        {[{ name: p1Name, server: 1, sets: [state.set1_p1, state.set2_p1, state.set3_p1], gp: state.isTiebreak ? String(state.tiebreak_p1) : state.gamePoint_p1, color: 'lime' },
          { name: p2Name, server: 2, sets: [state.set1_p2, state.set2_p2, state.set3_p2], gp: state.isTiebreak ? String(state.tiebreak_p2) : state.gamePoint_p2, color: 'cyan' }
        ].map((p, i) => (
          <div key={i} className={`grid grid-cols-12 gap-1 items-center p-2 rounded-2xl border transition
            ${state.currentServer === p.server && !isDone
              ? p.color === 'lime' ? 'bg-slate-950 border-lime-400/50' : 'bg-slate-950 border-cyan-400/50'
              : 'bg-slate-950/60 border-slate-800/60'}`}>
            <div className="col-span-6 flex items-center gap-2 min-w-0">
              {state.currentServer === p.server && !isDone
                ? <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 animate-bounce ${p.color === 'lime' ? 'bg-lime-400 text-slate-950' : 'bg-cyan-400 text-slate-950'}`}>🎾</div>
                : <div className="w-4 h-4 rounded-full bg-slate-800 shrink-0" />}
              <span className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1">
                {activeMatch.Kazanan === p.name && isDone && <span className={p.color === 'lime' ? 'text-lime-400' : 'text-cyan-400'}>✓</span>}
                {p.name}
              </span>
            </div>
            {p.sets.map((s, si) => (
              <div key={si} className="col-span-1 text-center font-mono font-bold text-base text-white">{s}</div>
            ))}
            <div className={`col-span-3 text-center font-mono font-black text-xl rounded-xl py-1 border
              ${p.color === 'lime' ? 'text-lime-400 bg-lime-950/40 border-lime-400/30' : 'text-cyan-400 bg-cyan-950/40 border-cyan-400/30'}`}>
              {p.gp}
            </div>
          </div>
        ))}

        {/* Son hareket mesajı */}
        {state.lastActionMessage && (
          <div className="text-center text-[11px] text-slate-500 italic pt-1 border-t border-slate-800">
            {state.lastActionMessage}
          </div>
        )}
      </div>

      {/* Sayı Butonları — sadece oynaniyor ise aktif */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button type="button" onClick={() => handlePoint(1)}
          disabled={isDone || isPaused}
          className="flex flex-col items-center justify-center p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 active:scale-95 text-slate-950 font-black shadow-xl transition border-2 border-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed">
          <span className="text-xs uppercase tracking-wider font-extrabold mb-1">+1 SAYI</span>
          <span className="text-base sm:text-lg font-black text-center line-clamp-2">{p1Name}</span>
        </button>
        <button type="button" onClick={() => handlePoint(2)}
          disabled={isDone || isPaused}
          className="flex flex-col items-center justify-center p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-cyan-500 to-cyan-700 hover:from-cyan-400 active:scale-95 text-slate-950 font-black shadow-xl transition border-2 border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed">
          <span className="text-xs uppercase tracking-wider font-extrabold mb-1">+1 SAYI</span>
          <span className="text-base sm:text-lg font-black text-center line-clamp-2">{p2Name}</span>
        </button>
      </div>

      {/* Geri Al */}
      <button type="button" onClick={() => undoLastPoint(activeMatch.id)}
        disabled={!activeMatch.pointHistory || activeMatch.pointHistory.length === 0 || isDone}
        className="w-full flex items-center justify-center gap-2 p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-95 text-slate-200 rounded-2xl text-sm font-bold shadow transition disabled:opacity-40">
        <RotateCcw className="w-4 h-4 text-cyan-400" /> Geri Al (Son Sayı)
      </button>

      {/* Maç Bitiriş */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl overflow-hidden">
        <button type="button" onClick={() => setShowEndOptions(!showEndOptions)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white bg-slate-900">
          <span className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-slate-400" />
            Maç Durumu & Bitiriş
          </span>
          <ChevronDown className={`w-4 h-4 transition ${showEndOptions ? 'rotate-180' : ''}`} />
        </button>

        {showEndOptions && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">

            {/* Maç Bitti — iki oyuncu */}
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1.5">Maç Bitti — Kazanan:</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setMatchStatus(activeMatch.id, 'Bitti', p1Name); setShowEndOptions(false); }}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-lime-500 rounded-xl text-xs font-bold text-left transition">
                  <div className="text-[10px] text-slate-500">Kazanan</div>
                  <div className="truncate text-lime-400 font-black">{p1Name}</div>
                </button>
                <button type="button" onClick={() => { setMatchStatus(activeMatch.id, 'Bitti', p2Name); setShowEndOptions(false); }}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded-xl text-xs font-bold text-left transition">
                  <div className="text-[10px] text-slate-500">Kazanan</div>
                  <div className="truncate text-cyan-400 font-black">{p2Name}</div>
                </button>
              </div>
            </div>

            {/* Retired — çekilen oyuncu (kaybeden) seçilir */}
            <div>
              <div className="text-[10px] text-amber-500 font-bold uppercase mb-1.5">Retired (Çekildi) — Çekilen:</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setMatchStatus(activeMatch.id, 'Retired', p2Name); setShowEndOptions(false); }}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-amber-500 rounded-xl text-xs font-bold text-left transition">
                  <div className="text-[10px] text-amber-500">Çekildi → Kazanan</div>
                  <div className="truncate text-amber-300">{p1Name} çekildi</div>
                  <div className="text-[10px] text-slate-400">→ {p2Name} kazandı</div>
                </button>
                <button type="button" onClick={() => { setMatchStatus(activeMatch.id, 'Retired', p1Name); setShowEndOptions(false); }}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-amber-500 rounded-xl text-xs font-bold text-left transition">
                  <div className="text-[10px] text-amber-500">Çekildi → Kazanan</div>
                  <div className="truncate text-amber-300">{p2Name} çekildi</div>
                  <div className="text-[10px] text-slate-400">→ {p1Name} kazandı</div>
                </button>
              </div>
            </div>

            {/* Walkover — gelmeyen (kaybeden) seçilir */}
            <div>
              <div className="text-[10px] text-rose-400 font-bold uppercase mb-1.5">Walkover (Hükmen) — Gelmeyen:</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setMatchStatus(activeMatch.id, 'Walkover', p2Name); setShowEndOptions(false); }}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-rose-500 rounded-xl text-xs font-bold text-left transition">
                  <div className="text-[10px] text-rose-400">Gelmedi → Kazanan</div>
                  <div className="truncate text-rose-300">{p1Name} gelmedi</div>
                  <div className="text-[10px] text-slate-400">→ {p2Name} kazandı</div>
                </button>
                <button type="button" onClick={() => { setMatchStatus(activeMatch.id, 'Walkover', p1Name); setShowEndOptions(false); }}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-rose-500 rounded-xl text-xs font-bold text-left transition">
                  <div className="text-[10px] text-rose-400">Gelmedi → Kazanan</div>
                  <div className="truncate text-rose-300">{p2Name} gelmedi</div>
                  <div className="text-[10px] text-slate-400">→ {p1Name} kazandı</div>
                </button>
              </div>
            </div>

            {/* Skoru Sıfırla */}
            <div className="flex justify-end pt-1 border-t border-slate-800">
              <button type="button"
                onClick={() => { if (confirm('Bu maçın skorunu sıfırlamak istediğinize emin misiniz?')) { resetMatchScore(activeMatch.id); setShowEndOptions(false); } }}
                className="text-xs text-rose-400 hover:text-rose-300 underline font-medium">
                Skoru Sıfırla (0-0 Başa Dön)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
