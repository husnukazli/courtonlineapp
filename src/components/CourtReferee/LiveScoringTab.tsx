import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  Zap,
  Award,
  Clock,
  ChevronDown,
  AlertTriangle,
  History,
  CheckCircle,
  Flag,
  UserX,
  Volume2,
  Settings,
} from 'lucide-react';
import { useTennisData } from '../../context/TennisDataContext';
import { MatchItem, PointType, TennisMatchState } from '../../types/tennis';
import { ChallengeModal } from '../Common/ChallengeModal';
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
    recordChallenge,
    setMatchStatus,
    resetMatchScore,
    currentReferee,
  } = useTennisData();

  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEndOptions, setShowEndOptions] = useState(false);
  const [selectedPointType, setSelectedPointType] = useState<PointType>('NORMAL');
  const lastPointClickRef = useRef<number>(0);

  if (!activeMatch) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl">
        Seçili maç bulunamadı. Lütfen Maç Kurulum sekmesinden bir maç seçin.
      </div>
    );
  }

  const p1Name = activeMatch['Oyuncu 1'];
  const p2Name = activeMatch['Oyuncu 2'];
  const state: TennisMatchState = activeMatch.detailedState || {
    currentSet: 1,
    set1_p1: 0,
    set1_p2: 0,
    set2_p1: 0,
    set2_p2: 0,
    set3_p1: 0,
    set3_p2: 0,
    gamePoint_p1: '0',
    gamePoint_p2: '0',
    currentServer: 1,
    firstServerOfMatch: 1,
    isTiebreak: false,
    isMatchTiebreak: false,
    tiebreak_p1: 0,
    tiebreak_p2: 0,
    tiebreakTarget: 7,
    totalPointsInTiebreak: 0,
    p1ChallengesLeft: 3,
    p2ChallengesLeft: 3,
    p1Aces: 0,
    p2Aces: 0,
    p1DoubleFaults: 0,
    p2DoubleFaults: 0,
    p1Winners: 0,
    p2Winners: 0,
    p1UnforcedErrors: 0,
    p2UnforcedErrors: 0,
    totalPoints_p1: 0,
    totalPoints_p2: 0,
    lastActionMessage: 'Maç başladı.',
    needsChangeover: false,
  };

  const handlePoint = (playerWon: 1 | 2, type: PointType = 'NORMAL') => {
    const now = Date.now();
    if (now - lastPointClickRef.current < 400) return; // Prevent double trigger
    lastPointClickRef.current = now;
    awardPointToMatch(activeMatch.id, playerWon, type);
    // Haptic feedback if on mobile browser
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  };

  const handleChallengeResolve = (
    player: 1 | 2,
    outcome: 'UPHELD' | 'OVERTURNED',
    reason: any,
    notes: string,
    actionType: any
  ) => {
    recordChallenge(activeMatch.id, player, outcome, reason, notes, actionType);
  };

  // Determine Game / Set / Break point status
  const isBreakPoint =
    !state.isTiebreak &&
    ((state.currentServer === 1 && (state.gamePoint_p2 === '40' || state.gamePoint_p2 === 'AD') && state.gamePoint_p1 !== '40') ||
     (state.currentServer === 2 && (state.gamePoint_p1 === '40' || state.gamePoint_p1 === 'AD') && state.gamePoint_p2 !== '40'));

  const isGamePoint =
    !state.isTiebreak &&
    (state.gamePoint_p1 === '40' || state.gamePoint_p1 === 'AD' || state.gamePoint_p2 === '40' || state.gamePoint_p2 === 'AD');

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Banner: Court, Format & Referee Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-400 border border-lime-400/30 flex items-center justify-center font-bold text-sm">
            {activeMatch.Kort.includes('2')
              ? 'K2'
              : activeMatch.Kort.includes('3')
              ? 'K3'
              : activeMatch.Kort.includes('4')
              ? 'K4'
              : 'K1'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{activeMatch.Kort}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  activeMatch.Durum === 'Oynaniyor'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                    : activeMatch.Durum === 'Bitti'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeMatch.Durum}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {activeMatch.Kategori} • {activeMatch.Skor_Formati}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Match Timer */}
          <MatchLiveTimer match={activeMatch} size="sm" />

          <button
            type="button"
            onClick={() => setShowTimer(!showTimer)}
            className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              showTimer
                ? 'border-amber-400 bg-amber-400 text-slate-950 shadow-md'
                : 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white'
            }`}
            title="Mola / Isınma Kronometresi"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Mola Saati</span>
          </button>

          <button
            type="button"
            onClick={onBackToSetup}
            className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
            title="Kura & Ayarlar"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Embedded Timer */}
      {showTimer && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <MatchTimer onClose={() => setShowTimer(false)} />
        </div>
      )}

      {/* Changeover / Saha Değişimi Notice */}
      {state.needsChangeover && activeMatch.Durum === 'Oynaniyor' && (
        <div className="p-3 bg-amber-950/40 border-2 border-amber-500/60 rounded-2xl text-amber-300 flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div>
              <div className="font-bold text-xs sm:text-sm text-white">SAHA DEĞİŞİMİ (CHANGEOVER)</div>
              <div className="text-[10px] text-amber-300/80">
                Oyuncular karşı sahaya geçiyor. (90 saniye dinlenme)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowTimer(true)}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow transition"
          >
            90s Mola Başlat
          </button>
        </div>
      )}

      {/* Point Situation Banner (Break Point / Set Point / Match Point) */}
      {activeMatch.Durum === 'Oynaniyor' && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs font-semibold">
          <div className="flex items-center gap-2">
            {isBreakPoint ? (
              <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded font-bold text-[11px] animate-pulse">
                ⚡ BREAK POINT
              </span>
            ) : isGamePoint ? (
              <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded font-bold text-[11px]">
                GAME POINT
              </span>
            ) : state.isTiebreak ? (
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-bold text-[11px] animate-pulse">
                🎾 TIE-BREAK ({state.tiebreakTarget} Puan)
              </span>
            ) : (
              <span className="text-slate-400">Normal Oyun</span>
            )}
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-mono text-[11px]">
              Set {state.currentSet}
            </span>
          </div>

          <div className="text-slate-400 text-[11px]">
            Servis:{' '}
            <span className="font-bold text-lime-400">
              {state.currentServer === 1 ? p1Name.split(' ')[0] : p2Name.split(' ')[0]} 🎾
            </span>
          </div>
        </div>
      )}

      {/* Main Chair Umpire Dual-Scoreboard */}
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-3 sm:p-5 shadow-2xl space-y-4">
        {/* Set Header Numbers */}
        <div className="grid grid-cols-12 gap-1.5 items-center text-center font-mono text-xs text-slate-500 font-bold border-b border-slate-800 pb-2">
          <div className="col-span-6 text-left pl-2 font-sans uppercase tracking-wider text-[10px]">
            Oyuncu / Servis
          </div>
          <div className={`col-span-1.5 text-center ${state.currentSet === 1 ? 'text-lime-400 font-black' : ''}`}>S1</div>
          <div className={`col-span-1.5 text-center ${state.currentSet === 2 ? 'text-lime-400 font-black' : ''}`}>S2</div>
          <div className={`col-span-1.5 text-center ${state.currentSet === 3 ? 'text-lime-400 font-black' : ''}`}>S3</div>
          <div className="col-span-1.5 text-center text-amber-400 font-black">PUAN</div>
        </div>

        {/* Player 1 Row */}
        <div
          className={`grid grid-cols-12 gap-1.5 items-center p-2 sm:p-3 rounded-2xl transition-all border ${
            state.currentServer === 1 && activeMatch.Durum === 'Oynaniyor'
              ? 'bg-slate-950 border-lime-400/50 shadow-md shadow-lime-400/5'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="col-span-6 flex items-center gap-2 pr-1">
            {state.currentServer === 1 && activeMatch.Durum === 'Oynaniyor' ? (
              <div className="w-5 h-5 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-lg shadow-lime-400 animate-bounce flex-shrink-0">
                🎾
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center text-[10px] flex-shrink-0">
                •
              </div>
            )}
            <div className="truncate">
              <div className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                {activeMatch.Kazanan === p1Name && <span className="text-lime-400">✓</span>}
                <span>{p1Name}</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>Chal: <strong className="text-emerald-400">{state.p1ChallengesLeft}</strong></span>
                <span>Ace: <strong className="text-slate-300">{state.p1Aces}</strong></span>
              </div>
            </div>
          </div>

          <div className="col-span-1.5 text-center font-mono font-bold text-base sm:text-lg text-white">
            {state.set1_p1}
          </div>
          <div className="col-span-1.5 text-center font-mono font-bold text-base sm:text-lg text-white">
            {state.set2_p1}
          </div>
          <div className="col-span-1.5 text-center font-mono font-bold text-base sm:text-lg text-white">
            {state.set3_p1}
          </div>
          <div className="col-span-1.5 text-center font-mono font-black text-xl sm:text-2xl text-lime-400 bg-lime-950/40 rounded-xl py-1 border border-lime-400/30">
            {state.isTiebreak ? state.tiebreak_p1 : state.gamePoint_p1}
          </div>
        </div>

        {/* Player 2 Row */}
        <div
          className={`grid grid-cols-12 gap-1.5 items-center p-2 sm:p-3 rounded-2xl transition-all border ${
            state.currentServer === 2 && activeMatch.Durum === 'Oynaniyor'
              ? 'bg-slate-950 border-cyan-400/50 shadow-md shadow-cyan-400/5'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="col-span-6 flex items-center gap-2 pr-1">
            {state.currentServer === 2 && activeMatch.Durum === 'Oynaniyor' ? (
              <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-lg shadow-cyan-400 animate-bounce flex-shrink-0">
                🎾
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center text-[10px] flex-shrink-0">
                •
              </div>
            )}
            <div className="truncate">
              <div className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                {activeMatch.Kazanan === p2Name && <span className="text-cyan-400">✓</span>}
                <span>{p2Name}</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>Chal: <strong className="text-cyan-400">{state.p2ChallengesLeft}</strong></span>
                <span>Ace: <strong className="text-slate-300">{state.p2Aces}</strong></span>
              </div>
            </div>
          </div>

          <div className="col-span-1.5 text-center font-mono font-bold text-base sm:text-lg text-white">
            {state.set1_p2}
          </div>
          <div className="col-span-1.5 text-center font-mono font-bold text-base sm:text-lg text-white">
            {state.set2_p2}
          </div>
          <div className="col-span-1.5 text-center font-mono font-bold text-base sm:text-lg text-white">
            {state.set3_p2}
          </div>
          <div className="col-span-1.5 text-center font-mono font-black text-xl sm:text-2xl text-cyan-400 bg-cyan-950/40 rounded-xl py-1 border border-cyan-400/30">
            {state.isTiebreak ? state.tiebreak_p2 : state.gamePoint_p2}
          </div>
        </div>

        {/* Last Action Message */}
        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-center">
          <span className="text-xs text-slate-300 font-medium font-sans">
            {state.lastActionMessage || 'Maç devam ediyor...'}
          </span>
        </div>
      </div>

      {/* Primary Touch Scoring Buttons (Large Ergonomic Buttons for Court Referee) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* +1 Puan Oyuncu 1 */}
        <button
          type="button"
          onClick={() => handlePoint(1, selectedPointType)}
          className="group relative flex flex-col items-center justify-center p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 active:scale-95 text-slate-950 font-black shadow-xl shadow-emerald-500/20 transition duration-150 border-2 border-emerald-400"
        >
          <span className="text-xs uppercase tracking-wider text-emerald-950 font-extrabold mb-1">
            +1 SAYI (O1)
          </span>
          <span className="text-lg sm:text-xl font-black text-slate-950 text-center line-clamp-1">
            {p1Name}
          </span>
          <span className="mt-2 text-2xl sm:text-3xl font-mono font-black text-white px-4 py-0.5 rounded-xl bg-slate-950/40 border border-white/20">
            {state.isTiebreak ? state.tiebreak_p1 : state.gamePoint_p1}
          </span>
        </button>

        {/* +1 Puan Oyuncu 2 */}
        <button
          type="button"
          onClick={() => handlePoint(2, selectedPointType)}
          className="group relative flex flex-col items-center justify-center p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-cyan-500 to-cyan-700 hover:from-cyan-400 hover:to-cyan-600 active:scale-95 text-slate-950 font-black shadow-xl shadow-cyan-500/20 transition duration-150 border-2 border-cyan-400"
        >
          <span className="text-xs uppercase tracking-wider text-cyan-950 font-extrabold mb-1">
            +1 SAYI (O2)
          </span>
          <span className="text-lg sm:text-xl font-black text-slate-950 text-center line-clamp-1">
            {p2Name}
          </span>
          <span className="mt-2 text-2xl sm:text-3xl font-mono font-black text-white px-4 py-0.5 rounded-xl bg-slate-950/40 border border-white/20">
            {state.isTiebreak ? state.tiebreak_p2 : state.gamePoint_p2}
          </span>
        </button>
      </div>

      {/* Quick Point Types Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
          <span>Hızlı Vuruş / Puan Türü:</span>
          <span className="text-lime-400 font-mono">{selectedPointType}</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 text-xs font-bold">
          {[
            { id: 'NORMAL', label: 'Normal' },
            { id: 'ACE', label: 'Ace ⚡' },
            { id: 'WINNER', label: 'Winner 💥' },
            { id: 'DOUBLE_FAULT', label: 'Çift Hata' },
            { id: 'UNFORCED_ERROR', label: 'Hata ❌' },
          ].map((pt) => (
            <button
              key={pt.id}
              type="button"
              onClick={() => setSelectedPointType(pt.id as any)}
              className={`py-2 px-1 rounded-xl text-[11px] border text-center transition ${
                selectedPointType === pt.id
                  ? 'border-lime-400 bg-lime-400/20 text-lime-300 font-extrabold'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* CHALLENGE & REVERSAL / UNDO CONTROLS (CRITICAL FOR USER) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Geri Al (Undo Last Point) */}
        <button
          type="button"
          onClick={() => undoLastPoint(activeMatch.id)}
          disabled={!activeMatch.pointHistory || activeMatch.pointHistory.length === 0}
          className="flex items-center justify-center gap-2 p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-95 text-slate-200 rounded-2xl text-xs sm:text-sm font-bold shadow-lg transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span>Geri Al (Son Sayı)</span>
        </button>

        {/* Challenge / Hakem Karar Düzeltme */}
        <button
          type="button"
          onClick={() => setIsChallengeOpen(true)}
          className="flex items-center justify-center gap-2 p-3.5 bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400 text-amber-300 active:scale-95 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/10 transition"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>🚨 CHALLENGE / DÜZELT</span>
        </button>
      </div>

      {/* Match Actions & Special Endings Dropdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEndOptions(!showEndOptions)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white bg-slate-900"
        >
          <span className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-slate-400" />
            Maç Durumu & Özel Bitirişler (Çekildi / Hükmen / Bitti)
          </span>
          <ChevronDown className={`w-4 h-4 transition ${showEndOptions ? 'rotate-180' : ''}`} />
        </button>

        {showEndOptions && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMatchStatus(activeMatch.id, 'Bitti', p1Name)}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-xl text-xs font-bold text-slate-200 text-left"
              >
                <div className="text-[10px] text-slate-500">Maç Bitti</div>
                <div className="truncate text-emerald-400">Kazanan: {p1Name}</div>
              </button>

              <button
                type="button"
                onClick={() => setMatchStatus(activeMatch.id, 'Bitti', p2Name)}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-xl text-xs font-bold text-slate-200 text-left"
              >
                <div className="text-[10px] text-slate-500">Maç Bitti</div>
                <div className="truncate text-cyan-400">Kazanan: {p2Name}</div>
              </button>

              <button
                type="button"
                onClick={() => setMatchStatus(activeMatch.id, 'Retired', p1Name)}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-xl text-xs font-bold text-slate-200 text-left"
              >
                <div className="text-[10px] text-amber-500">Retired (Çekildi)</div>
                <div className="truncate">{p2Name} Çekildi</div>
              </button>

              <button
                type="button"
                onClick={() => setMatchStatus(activeMatch.id, 'Walkover', p1Name)}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-rose-500 rounded-xl text-xs font-bold text-slate-200 text-left"
              >
                <div className="text-[10px] text-rose-400">Walkover (Hükmen)</div>
                <div className="truncate">{p1Name} Hükmen</div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bu maçın skorunu sıfırlamak istediğinize emin misiniz?')) {
                    resetMatchScore(activeMatch.id);
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
              >
                Skoru Sıfırla (0-0 Başa Dön)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Point History Log Dropdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white bg-slate-900"
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Canlı Puan ve Sayı Geçmişi ({activeMatch.pointHistory?.length || 0} Hamle)
          </span>
          <ChevronDown className={`w-4 h-4 transition ${showHistory ? 'rotate-180' : ''}`} />
        </button>

        {showHistory && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2 max-h-60 overflow-y-auto">
            {activeMatch.pointHistory && activeMatch.pointHistory.length > 0 ? (
              activeMatch.pointHistory
                .slice()
                .reverse()
                .map((pt, idx) => (
                  <div
                    key={pt.id}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-sans">{pt.timestamp}</span>
                      <span
                        className={`font-sans font-bold ${
                          pt.playerWon === 1 ? 'text-emerald-400' : 'text-cyan-400'
                        }`}
                      >
                        {pt.playerName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">({pt.pointType})</span>
                    </div>
                    <span className="text-slate-300 text-[11px] font-bold">{pt.scoreDisplay}</span>
                  </div>
                ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-500 font-sans">
                Henüz girilmiş puan bulunmuyor.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Challenge Resolution Modal */}
      <ChallengeModal
        isOpen={isChallengeOpen}
        onClose={() => setIsChallengeOpen(false)}
        match={activeMatch}
        onResolveChallenge={handleChallengeResolve}
      />
    </div>
  );
};
