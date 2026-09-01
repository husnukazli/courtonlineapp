import React, { useRef, useState, useEffect } from 'react';
import { MatchItem } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import { parseScoreString, validateSingleSet } from '../../utils/tennisScoringEngine';
import {
  Trophy,
  Clock,
  CheckCircle2,
  PlayCircle,
  Plus,
  Minus,
  RotateCcw,
  Swords,
  PauseCircle,
  Timer,
  X,
  ArrowRightLeft,
  Settings,
  LogOut
} from 'lucide-react';

interface CourtCardProps {
  match: MatchItem;
  onFinishMatch: (match: MatchItem) => void;
  onEditScore?: (match: MatchItem) => void; 
  onOpenSetup?: (match: MatchItem) => void;
}

export const CourtCard: React.FC<CourtCardProps> = ({
  match,
  onFinishMatch,
  onOpenSetup,
}) => {
  const { updateGameScore, setMatchStatus, awardPointToMatch, undoLastPoint } = useTennisData();
  const lastScoreClickRef = useRef<number>(0);

  // Kort Hakemi Modu için Set Seçici
  const [selectedSet, setSelectedSet] = useState<1 | 2 | 3>(1);
  
  // Kule Hakemi Modu (Tam Ekran) Anahtarı
  const [isChairMode, setIsChairMode] = useState<boolean>(false);

  // Kule Hakemi - Form ve Kurulum Hafızası
  const [setupForm, setSetupForm] = useState<{server: 1 | 2 | null; left: 1 | 2 | null; tbType: 'standard' | 'coman'}>({ server: null, left: null, tbType: 'standard' });
  const [chairSetup, setChairSetup] = useState<{ server: 1 | 2; left: 1 | 2; tbType: 'standard' | 'coman' } | null>(null);

  // Kule Hakemi Modu - Servis Hatası & Sayaç Hafızası
  const [firstFault, setFirstFault] = useState<boolean>(false);
  const [activeTimer, setActiveTimer] = useState<{ label: string; seconds: number } | null>(null);

  const parsed = parseScoreString(match.Skor);
  const state = match.detailedState;
  const s1_p1 = state?.set1_p1 ?? parsed.s1_p1;
  const s1_p2 = state?.set1_p2 ?? parsed.s1_p2;
  const s2_p1 = state?.set2_p1 ?? parsed.s2_p1;
  const s2_p2 = state?.set2_p2 ?? parsed.s2_p2;
  const s3_p1 = state?.set3_p1 ?? parsed.s3_p1;
  const s3_p2 = state?.set3_p2 ?? parsed.s3_p2;

  const isLive = match.Durum === 'Oynaniyor';
  const isFinished = match.Durum === 'Bitti' || match.Durum === 'Retired' || match.Durum === 'Walkover';
  const isPaused = match.Durum === 'Duraklatildi';
  const isUpcoming = match.Durum === 'Baslamadi';

  const format = match.Skor_Formati || '3 Normal Set';

  // --- KULE HAKEMİ: ÇIKIŞ, GERİ TUŞU VE YENİLEME KORUMASI ---
  useEffect(() => {
    const handlePopState = () => {
      if (isChairMode) {
        const confirmExit = window.confirm('Kule hakemi modundan çıkmak istiyor musunuz? (Maç ayarlarınız kaybolmaz)');
        if (confirmExit) {
          setIsChairMode(false);
        } else {
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isChairMode) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    if (isChairMode) {
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isChairMode]);

  const handleExitChairMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Kule hakemi modundan çıkıp genel maç ekranına dönmek istiyor musunuz?')) {
      setIsChairMode(false);
    }
  };
  // ------------------------------------------------

  // --- AKILLI MATEMATİK MOTORU ---
  const totalGamesCompleted = s1_p1 + s1_p2 + s2_p1 + s2_p2 + s3_p1 + s3_p2;
  const isTB = state?.isTiebreak || false;
  const tbPoints = isTB ? (state?.tiebreak_p1 || 0) + (state?.tiebreak_p2 || 0) : 0;
  
  let computedServer: 1 | 2 = 1;
  let computedLeftSide: 1 | 2 = 1;
  let isSideChangePoint = false;

  if (chairSetup) {
    const isComan = chairSetup.tbType === 'coman';

    if (!isTB) {
      computedServer = totalGamesCompleted % 2 === 0 ? chairSetup.server : (chairSetup.server === 1 ? 2 : 1);
      computedLeftSide = (totalGamesCompleted % 4 === 1 || totalGamesCompleted % 4 === 2) ? (chairSetup.left === 1 ? 2 : 1) : chairSetup.left;
      
      if ((totalGamesCompleted % 2 === 1) && (state?.gamePoint_p1 === '0' && state?.gamePoint_p2 === '0')) {
          isSideChangePoint = true;
      }
    } else {
      const tbGameServer = totalGamesCompleted % 2 === 0 ? chairSetup.server : (chairSetup.server === 1 ? 2 : 1);
      if (tbPoints === 0) {
        computedServer = tbGameServer;
      } else {
        const block = Math.floor((tbPoints - 1) / 2);
        computedServer = block % 2 === 0 ? (tbGameServer === 1 ? 2 : 1) : tbGameServer;
      }

      const tbStartSide = (totalGamesCompleted % 4 === 1 || totalGamesCompleted % 4 === 2) ? (chairSetup.left === 1 ? 2 : 1) : chairSetup.left;
      if (tbPoints === 0) {
        computedLeftSide = tbStartSide;
      } else if (isComan) {
        const block = Math.floor((tbPoints - 1) / 4);
        computedLeftSide = block % 2 === 0 ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
        isSideChangePoint = ((tbPoints - 1) % 4 === 0) && tbPoints > 0;
      } else {
        const block = Math.floor(tbPoints / 6);
        computedLeftSide = block % 2 === 1 ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
        isSideChangePoint = (tbPoints > 0 && tbPoints % 6 === 0);
      }
    }
  }

  const leftPlayerId = computedLeftSide;
  const rightPlayerId = computedLeftSide === 1 ? 2 : 1;
  // ------------------------------------------------

  const handleSaveSetup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!setupForm.server || !setupForm.left) return;

    let initialServer: 1 | 2 = setupForm.server;
    let initialLeft: 1 | 2 = setupForm.left;

    if (!isTB) {
      initialServer = totalGamesCompleted % 2 === 0 ? setupForm.server : (setupForm.server === 1 ? 2 : 1);
      initialLeft = (totalGamesCompleted % 4 === 1 || totalGamesCompleted % 4 === 2) ? (setupForm.left === 1 ? 2 : 1) : setupForm.left;
    } else {
      let tbGameServer = setupForm.server;
      if (tbPoints > 0) {
        const block = Math.floor((tbPoints - 1) / 2);
        tbGameServer = block % 2 === 0 ? (setupForm.server === 1 ? 2 : 1) : setupForm.server;
      }
      initialServer = totalGamesCompleted % 2 === 0 ? tbGameServer : (tbGameServer === 1 ? 2 : 1);

      let tbStartSide = setupForm.left;
      if (tbPoints > 0) {
        if (setupForm.tbType === 'coman') {
          const block = Math.floor((tbPoints - 1) / 4);
          tbStartSide = block % 2 === 0 ? (setupForm.left === 1 ? 2 : 1) : setupForm.left;
        } else {
          const block = Math.floor(tbPoints / 6);
          tbStartSide = block % 2 === 1 ? (setupForm.left === 1 ? 2 : 1) : setupForm.left;
        }
      }
      initialLeft = (totalGamesCompleted % 4 === 1 || totalGamesCompleted % 4 === 2) ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
    }

    setChairSetup({ server: initialServer, left: initialLeft, tbType: setupForm.tbType });
  };

  useEffect(() => {
    if (isLive) {
      const val1 = validateSingleSet(s1_p1, s1_p2, 1, format);
      const val2 = validateSingleSet(s2_p1, s2_p2, 2, format);
      let activeSet: 1 | 2 | 3 = 1;
      if (val1.isComplete && !val2.isComplete) activeSet = 2;
      else if (val1.isComplete && val2.isComplete && val1.winner !== val2.winner) activeSet = 3;
      else if (s3_p1 > 0 || s3_p2 > 0) activeSet = 3;
      else if (s2_p1 > 0 || s2_p2 > 0) activeSet = 2;
      setSelectedSet(activeSet);
    }
  }, [match.Skor, match.detailedState, isLive, format, s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2]);

  useEffect(() => {
    let interval: any;
    if (activeTimer && activeTimer.seconds > 0) {
      interval = setInterval(() => setActiveTimer((prev) => prev ? { ...prev, seconds: prev.seconds - 1 } : null), 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleQuickScore = (e: React.MouseEvent, player: 1 | 2, delta: number) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastScoreClickRef.current < 400) return; 
    lastScoreClickRef.current = now;
    updateGameScore(match.id, selectedSet, player, delta);
  };

  const handlePointScore = (e: React.MouseEvent, player: 1 | 2) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastScoreClickRef.current < 400) return; 
    lastScoreClickRef.current = now;
    setFirstFault(false); 
    awardPointToMatch(match.id, player, 'NORMAL');
  };

  const handleFault = (e: React.MouseEvent, serverPlayer: 1 | 2) => {
    e.stopPropagation();
    if (!firstFault) setFirstFault(true);
    else {
      const receiver = serverPlayer === 1 ? 2 : 1;
      setFirstFault(false);
      awardPointToMatch(match.id, receiver, 'NORMAL');
    }
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFirstFault(false); 
    undoLastPoint(match.id);
  };

  const startTimer = (e: React.MouseEvent, label: string, seconds: number) => {
    e.stopPropagation();
    setActiveTimer({ label, seconds });
  };

  const toggleSuspend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLive) setMatchStatus(match.id, 'Duraklatildi');
    else if (isPaused) setMatchStatus(match.id, 'Oynaniyor');
  };

  // EKSİK OLAN VE GERİ EKLENEN FONKSİYONLAR
  const handleCardClick = () => {
    if (isUpcoming && onOpenSetup) {
      onOpenSetup(match);
    }
  };

  const handleStartMatchDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenSetup) {
      onOpenSetup(match);
    } else {
      setMatchStatus(match.id, 'Oynaniyor', undefined, undefined);
    }
  };

  // Aktif setteki oyun skorları
  const currentSetP1Games = selectedSet === 1 ? s1_p1 : selectedSet === 2 ? s2_p1 : s3_p1;
  const currentSetP2Games = selectedSet === 1 ? s1_p2 : selectedSet === 2 ? s2_p2 : s3_p2;

  return (
    <>
      {/* 1. KORT HAKEMİ KART GÖRÜNÜMÜ */}
      <div
        onClick={handleCardClick}
        className={`rounded-3xl transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-lg ${
          isLive || isPaused
            ? 'bg-slate-900/95 border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.18)]'
            : isUpcoming
            ? 'bg-gradient-to-b from-slate-900 to-amber-950/20 border-2 border-amber-500/50 cursor-pointer'
            : 'bg-rose-950/20 border border-rose-800/50'
        }`}
      >
        <div className={`h-1.5 w-full ${isLive ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse' : isPaused ? 'bg-gradient-to-r from-amber-400 to-amber-600' : isUpcoming ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-rose-500 to-rose-700'}`} />

        <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${isLive || isPaused ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/30' : isUpcoming ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' : 'bg-rose-500/20 text-rose-300'}`}>
              {match.Kort.replace('KORT', 'K').trim()}
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-1.5">
                <span>{match.Kort}</span>
                {isLive && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 animate-pulse">CANLI</span>}
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">{match.Kategori}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black tracking-wide uppercase ${isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : isPaused ? 'bg-amber-500/20 text-amber-300' : isUpcoming ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {match.Durum === 'Retired' ? '✕ RET' : match.Durum === 'Walkover' ? '✕ W/O' : match.Durum === 'Bitti' ? '✕ BİTTİ' : match.Durum === 'Duraklatildi' ? 'ASKIYA ALINDI' : match.Durum}
          </span>
        </div>

        <div className="px-4 sm:px-5 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-lime-400" />{match.Saat && <span className="text-slate-500 text-[10px]">{match.Saat}</span>} <strong className="text-white font-bold ml-1">{match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi' ? match.Baslangic_Saati : '--:--'}</strong></span>
          </div>
          <div className="text-slate-400 font-sans text-[11px] truncate pl-2 max-w-[110px]">{match.Skor_Formati}</div>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div className="bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-900/80 text-[10px] font-extrabold uppercase text-slate-400 py-1.5 px-3 border-b border-slate-800">
              <div className="col-span-6">Oyuncu</div><div className="col-span-2 text-center">1. Set</div><div className="col-span-2 text-center">2. Set</div><div className="col-span-2 text-center">3. Set</div>
            </div>
            <div className={`grid grid-cols-12 items-center py-2.5 px-3 border-b border-slate-800/50 ${match.Kazanan === match['Oyuncu 1'] && isFinished ? 'bg-lime-500/10' : ''}`}>
              <div className="col-span-6 flex items-center gap-2 pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0"></span>
                <span className="text-xs sm:text-sm font-bold text-white truncate">{match['Oyuncu 1']}</span>
              </div>
              <div className="col-span-2 text-center font-mono font-black text-lime-300">{isUpcoming ? '-' : s1_p1}</div><div className="col-span-2 text-center font-mono font-black text-lime-300">{isUpcoming ? '-' : s2_p1}</div><div className="col-span-2 text-center font-mono font-black text-lime-300">{isUpcoming ? '-' : s3_p1}</div>
            </div>
            <div className={`grid grid-cols-12 items-center py-2.5 px-3 ${match.Kazanan === match['Oyuncu 2'] && isFinished ? 'bg-cyan-500/10' : ''}`}>
              <div className="col-span-6 flex items-center gap-2 pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0"></span>
                <span className="text-xs sm:text-sm font-bold text-white truncate">{match['Oyuncu 2']}</span>
              </div>
              <div className="col-span-2 text-center font-mono font-black text-cyan-300">{isUpcoming ? '-' : s1_p2}</div><div className="col-span-2 text-center font-mono font-black text-cyan-300">{isUpcoming ? '-' : s2_p2}</div><div className="col-span-2 text-center font-mono font-black text-cyan-300">{isUpcoming ? '-' : s3_p2}</div>
            </div>
          </div>

          {(isLive || isPaused) && (
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 mt-2 shadow-inner">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsChairMode(true); }}
                className="w-full py-3 mb-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" /> Kule Hakemi Moduna Geç
              </button>

              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="flex bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedSet(1); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedSet === 1 ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}>1. SET</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedSet(2); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedSet === 2 ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}>2. SET</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedSet(3); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedSet === 3 ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}>3. SET</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={(e) => handleQuickScore(e, 1, 1)} className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm flex items-center justify-center gap-1 transition"><Plus className="w-5 h-5" />+1 OYUN</button>
                    <button type="button" onClick={(e) => handleQuickScore(e, 1, -1)} className="w-full py-2 rounded-xl bg-rose-500/10 text-rose-400 font-bold text-xs flex items-center justify-center gap-1 transition"><Minus className="w-4 h-4" />-1 Düş</button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={(e) => handleQuickScore(e, 2, 1)} className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm flex items-center justify-center gap-1 transition"><Plus className="w-5 h-5" />+1 OYUN</button>
                    <button type="button" onClick={(e) => handleQuickScore(e, 2, -1)} className="w-full py-2 rounded-xl bg-rose-500/10 text-cyan-400 font-bold text-xs flex items-center justify-center gap-1 transition"><Minus className="w-4 h-4" />-1 Düş</button>
                  </div>
                </div>
                <div className="text-center mt-2"><span className="text-[10px] font-medium text-slate-500">Düzenlenen Set: {selectedSet}. Set</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-slate-950/70 border-t border-slate-800 flex items-center gap-2">
          {isUpcoming ? (
            <div className="flex items-center gap-2 w-full">
              {onOpenSetup && <button type="button" onClick={(e) => { e.stopPropagation(); onOpenSetup(match); }} className="py-2.5 px-3 rounded-xl bg-slate-800 text-amber-300 font-bold text-xs">🪙 Kura</button>}
              <button type="button" onClick={handleStartMatchDirect} className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5"><PlayCircle className="w-4 h-4" /> Maçı Başlat</button>
            </div>
          ) : isLive || isPaused ? (
            <div className="flex items-center gap-2 w-full">
              <button type="button" onClick={(e) => { e.stopPropagation(); onFinishMatch(match); }} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl flex justify-center items-center gap-2"><Trophy className="w-4 h-4 text-cyan-400" /> Maçı Sonlandır / Bitir</button>
            </div>
          ) : null}
        </div>
      </div>

      {/* 2. TAM EKRAN KULE HAKEMİ MODU */}
      {isChairMode && (
        <div className="fixed inset-0 z-[100] bg-slate-950 overflow-y-auto overscroll-contain flex flex-col animate-in fade-in zoom-in-95 duration-200 select-none">
          
          {/* ÜST BİLGİ VE ÇIKIŞ BARI */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sm:py-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/30">
                {match.Kort.replace('KORT', 'K').trim()}
              </span>
              <div className="flex flex-col">
                <span className="text-white font-extrabold text-sm sm:text-base leading-none mb-1">Kule Hakemi Modu</span>
                <span className="text-[10px] sm:text-xs text-emerald-400 font-black tracking-widest uppercase">Canlı Yayın</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               {chairSetup && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setChairSetup(null); }}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5"
                    title="Kurulumu Sıfırla"
                  >
                    <Settings className="w-4 h-4" /> <span className="hidden sm:inline text-xs font-bold">Ayarlar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExitChairMode}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 shadow-sm border border-rose-500/30"
                >
                  <LogOut className="w-4 h-4" /> Çıkış Yap
                </button>
            </div>
          </div>

          <div className="flex-1 p-3 sm:p-6 w-full max-w-5xl mx-auto flex flex-col justify-center gap-4">
              
              {!chairSetup ? (
                /* KURULUM EKRANI */
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl">
                  <div>
                    <h4 className="text-amber-400 font-black text-lg sm:text-xl mb-2">⚙️ Anlık Kule Kurulumu</h4>
                    <p className="text-sm text-slate-400">Maçın <strong>ŞU ANKİ</strong> durumunu (anlık sahadaki düzeni) aşağıdan seçin, sistem kalanını kendi hesaplar.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-xs font-black uppercase text-slate-500 tracking-wider">1. Şu An Servisi Kim Atıyor?</div>
                    <div className="flex gap-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, server: 1}); }} className={`flex-1 py-4 sm:py-5 rounded-2xl text-sm sm:text-base font-black transition active:scale-95 ${setupForm.server === 1 ? 'bg-lime-500 text-slate-950 shadow-lg shadow-lime-500/20 scale-105' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>{match['Oyuncu 1']}</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, server: 2}); }} className={`flex-1 py-4 sm:py-5 rounded-2xl text-sm sm:text-base font-black transition active:scale-95 ${setupForm.server === 2 ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 scale-105' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>{match['Oyuncu 2']}</button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <div className="text-xs font-black uppercase text-slate-500 tracking-wider">2. Şu An Sandalyenin Solunda Kim Var?</div>
                    <div className="flex gap-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, left: 1}); }} className={`flex-1 py-4 sm:py-5 rounded-2xl text-sm sm:text-base font-black transition active:scale-95 ${setupForm.left === 1 ? 'bg-lime-500 text-slate-950 shadow-lg shadow-lime-500/20 scale-105' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>{match['Oyuncu 1']}</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, left: 2}); }} className={`flex-1 py-4 sm:py-5 rounded-2xl text-sm sm:text-base font-black transition active:scale-95 ${setupForm.left === 2 ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 scale-105' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>{match['Oyuncu 2']}</button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <div className="text-xs font-black uppercase text-slate-500 tracking-wider">3. Tie-Break Türü</div>
                    <div className="flex gap-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, tbType: 'standard'}); }} className={`flex-1 py-4 rounded-2xl text-sm font-black transition active:scale-95 ${setupForm.tbType === 'standard' ? 'bg-amber-500 text-slate-950 shadow-lg scale-105' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>Standart (6'da Bir)</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, tbType: 'coman'}); }} className={`flex-1 py-4 rounded-2xl text-sm font-black transition active:scale-95 ${setupForm.tbType === 'coman' ? 'bg-amber-500 text-slate-950 shadow-lg scale-105' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>Coman (1-5-9)</button>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button type="button" disabled={!setupForm.server || !setupForm.left} onClick={handleSaveSetup} className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-slate-950 font-black text-lg rounded-2xl disabled:opacity-50 transition active:scale-95 shadow-xl">Kaydet ve Maçı Yönet</button>
                  </div>
                </div>
              ) : (
                
                /* MAÇ EKRANI */
                <div className="flex flex-col h-full gap-3 sm:gap-4">
                  {/* BİLGİ ÇUBUĞU (OYUNCU İSİMLERİ İLE NET SET SKORU) */}
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 rounded-2xl px-4 py-3 border border-slate-800 shadow-md gap-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold flex-wrap justify-center">
                      <span className="text-slate-400">{selectedSet}. Set:</span>
                      <span className="text-lime-400 font-extrabold truncate max-w-[120px]">{match['Oyuncu 1']}</span>
                      <span className="text-white font-mono text-base sm:text-lg font-black px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800">
                        {currentSetP1Games} - {currentSetP2Games}
                      </span>
                      <span className="text-cyan-400 font-extrabold truncate max-w-[120px]">{match['Oyuncu 2']}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {isTB && <div className="px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-black uppercase rounded-lg animate-pulse border border-amber-500/30">{chairSetup.tbType === 'coman' ? 'Coman Tie-Break' : 'Standart Tie-Break'}</div>}
                       {isSideChangePoint && <div className="flex items-center gap-1.5 text-rose-300 font-black text-xs sm:text-sm uppercase animate-pulse bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded-lg"><ArrowRightLeft className="w-4 h-4"/> Saha Değişimi!</div>}
                    </div>
                  </div>

                  {activeTimer && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 sm:p-4 rounded-2xl flex items-center justify-between shadow-lg shrink-0">
                      <span className="text-amber-400 font-black text-sm sm:text-base flex items-center gap-2"><Timer className="w-5 h-5" />{activeTimer.label}</span>
                      <div className="flex items-center gap-4">
                        <span className={`font-mono font-black text-3xl sm:text-4xl ${activeTimer.seconds === 0 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                          {Math.floor(activeTimer.seconds / 60)}:{(activeTimer.seconds % 60).toString().padStart(2, '0')}
                        </span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setActiveTimer(null); }} className="text-amber-500 hover:text-amber-300 p-2 bg-amber-500/10 rounded-xl"><X className="w-6 h-6" /></button>
                      </div>
                    </div>
                  )}

                  {/* DEV EKRAN: SOL OYUNCU vs SAĞ OYUNCU */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 flex-1 min-h-0">
                    
                    {/* SOL SAHA */}
                    <div className={`bg-slate-900 rounded-3xl p-3 sm:p-5 border-4 flex flex-col justify-between shadow-2xl overflow-hidden ${computedServer === leftPlayerId ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.15)]' : 'border-slate-800'}`}>
                      <div className="flex flex-col items-center justify-center min-h-[4rem] sm:min-h-[5rem] border-b border-slate-800/80 pb-3 mb-2">
                        <div className={`flex items-start justify-center gap-1.5 w-full ${leftPlayerId === 1 ? 'text-lime-400' : 'text-cyan-400'}`}>
                           {computedServer === leftPlayerId && <span className="text-amber-400 animate-bounce mt-1 sm:mt-1.5 shrink-0 text-base sm:text-xl">🎾</span>}
                           <span className="font-black text-sm sm:text-xl text-center leading-tight line-clamp-2 break-words whitespace-normal">
                             {match[`Oyuncu ${leftPlayerId}` as keyof MatchItem]}
                           </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 uppercase font-black mt-1.5">Sol Saha</div>
                      </div>
                      
                      <div className="flex-1 flex justify-center items-center py-4 min-h-0">
                         <span className="text-[5rem] sm:text-[9rem] font-mono font-black tracking-tighter text-white leading-none">
                           {isTB ? (leftPlayerId === 1 ? state?.tiebreak_p1 : state?.tiebreak_p2) || '0' : (leftPlayerId === 1 ? state?.gamePoint_p1 : state?.gamePoint_p2) || '0'}
                         </span>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button type="button" disabled={isPaused} onClick={(e) => handlePointScore(e, leftPlayerId)} className="w-full py-8 sm:py-12 bg-gradient-to-t from-emerald-600 to-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-2xl sm:text-3xl rounded-2xl shadow-lg active:scale-95 transition disabled:opacity-50">
                          +1 PUAN
                        </button>
                        <div className="h-12 sm:h-14 w-full">
                           {computedServer === leftPlayerId ? (
                             <button type="button" disabled={isPaused} onClick={(e) => handleFault(e, leftPlayerId)} className={`w-full h-full rounded-xl text-sm sm:text-base font-black transition active:scale-95 disabled:opacity-50 ${firstFault ? 'bg-rose-500 border-2 border-rose-400 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                               {firstFault ? '2. Hata (Puan Rakibe)' : '1. Servis Hatası'}
                             </button>
                           ) : (
                             <div className="w-full h-full invisible"></div>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* SAĞ SAHA */}
                    <div className={`bg-slate-900 rounded-3xl p-3 sm:p-5 border-4 flex flex-col justify-between shadow-2xl overflow-hidden ${computedServer === rightPlayerId ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.15)]' : 'border-slate-800'}`}>
                       <div className="flex flex-col items-center justify-center min-h-[4rem] sm:min-h-[5rem] border-b border-slate-800/80 pb-3 mb-2">
                        <div className={`flex items-start justify-center gap-1.5 w-full ${rightPlayerId === 1 ? 'text-lime-400' : 'text-cyan-400'}`}>
                           {computedServer === rightPlayerId && <span className="text-amber-400 animate-bounce mt-1 sm:mt-1.5 shrink-0 text-base sm:text-xl">🎾</span>}
                           <span className="font-black text-sm sm:text-xl text-center leading-tight line-clamp-2 break-words whitespace-normal">
                             {match[`Oyuncu ${rightPlayerId}` as keyof MatchItem]}
                           </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 uppercase font-black mt-1.5">Sağ Saha</div>
                      </div>
                      
                      <div className="flex-1 flex justify-center items-center py-4 min-h-0">
                         <span className="text-[5rem] sm:text-[9rem] font-mono font-black tracking-tighter text-white leading-none">
                           {isTB ? (rightPlayerId === 1 ? state?.tiebreak_p1 : state?.tiebreak_p2) || '0' : (rightPlayerId === 1 ? state?.gamePoint_p1 : state?.gamePoint_p2) || '0'}
                         </span>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button type="button" disabled={isPaused} onClick={(e) => handlePointScore(e, rightPlayerId)} className="w-full py-8 sm:py-12 bg-gradient-to-t from-emerald-600 to-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-2xl sm:text-3xl rounded-2xl shadow-lg active:scale-95 transition disabled:opacity-50">
                          +1 PUAN
                        </button>
                        <div className="h-12 sm:h-14 w-full">
                           {computedServer === rightPlayerId ? (
                             <button type="button" disabled={isPaused} onClick={(e) => handleFault(e, rightPlayerId)} className={`w-full h-full rounded-xl text-sm sm:text-base font-black transition active:scale-95 disabled:opacity-50 ${firstFault ? 'bg-rose-500 border-2 border-rose-400 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                               {firstFault ? '2. Hata (Puan Rakibe)' : '1. Servis Hatası'}
                             </button>
                           ) : (
                             <div className="w-full h-full invisible"></div>
                           )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ALT AKSİYON ÇUBUĞU */}
                  <div className="pt-2 border-t border-slate-800 flex flex-col gap-3 shrink-0">
                    <div className="flex gap-3">
                      <button type="button" onClick={(e) => startTimer(e, 'Saha Değişimi', 90)} className="flex-1 py-3 sm:py-4 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-black rounded-xl transition shadow-md">90sn Değişim</button>
                      <button type="button" onClick={(e) => startTimer(e, 'Set Arası', 120)} className="flex-1 py-3 sm:py-4 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-black rounded-xl transition shadow-md">120sn Set Arası</button>
                      <button type="button" onClick={(e) => startTimer(e, 'Sağlık Molası', 180)} className="flex-1 py-3 sm:py-4 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-black rounded-xl transition shadow-md">3dk MTO</button>
                    </div>

                    <div className="flex gap-3">
                      <button type="button" onClick={handleUndo} className="flex-1 flex items-center justify-center gap-2 py-4 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-sm sm:text-base font-black rounded-2xl transition active:scale-95 shadow-sm">
                        <RotateCcw className="w-5 h-5" /> Son Puanı Geri Al
                      </button>
                      <button type="button" onClick={toggleSuspend} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm sm:text-base font-black rounded-2xl transition active:scale-95 shadow-sm ${isPaused ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                        {isPaused ? <><PlayCircle className="w-5 h-5" /> Oyuna Devam Et</> : <><PauseCircle className="w-5 h-5" /> Oyunu Askıya Al</>}
                      </button>
                    </div>
                  </div>

                </div>
              )}
          </div>
        </div>
      )}
    </>
  );
};
