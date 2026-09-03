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
  LogOut,
  Info
} from 'lucide-react';

interface CourtCardProps {
  match: MatchItem;
  onFinishMatch: (match: MatchItem) => void;
  onEditScore?: (match: MatchItem) => void; 
  onOpenSetup?: (match: MatchItem) => void;
}

type ChairSetup = {
  setupSetNum: number;
  firstServingTeam: 1 | 2;
  leftTeam: 1 | 2;
  tbType: 'standard' | 'coman';
  t1ServerIdx: 0 | 1; 
  t2ServerIdx: 0 | 1;
  t1DeuceReceiverIdx: 0 | 1; 
  t2DeuceReceiverIdx: 0 | 1;
};

// Titreşim (Haptic Feedback) Yardımcısı
const vibrateDevice = (pattern: number | number[] = 50) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const CourtCard: React.FC<CourtCardProps> = ({
  match,
  onFinishMatch,
  onOpenSetup,
}) => {
  const { updateGameScore, setMatchStatus, awardPointToMatch, undoLastPoint } = useTennisData();
  const lastScoreClickRef = useRef<number>(0);

  const [selectedSet, setSelectedSet] = useState<1 | 2 | 3>(1);
  const [isChairMode, setIsChairMode] = useState<boolean>(false);
  const [isEditingSetup, setIsEditingSetup] = useState<boolean>(false);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const prevSetRef = useRef<number>(1);
  const [thirdSetWarning, setThirdSetWarning] = useState<{show: boolean, text: string}>({show: false, text: ''});

  const [setupsBySet, setSetupsBySet] = useState<Record<number, ChairSetup>>({});
  const chairSetup = setupsBySet[selectedSet] || null;
  const isSetupValid = !!chairSetup;
  const showSetupOverlay = isEditingSetup || !isSetupValid;

  const [setupForm, setSetupForm] = useState<{
    firstServingTeam: 1 | 2 | null; 
    leftTeam: 1 | 2 | null; 
    tbType: 'standard' | 'coman'; 
    t1ServerIdx: 0 | 1; 
    t2ServerIdx: 0 | 1;
    t1RecIdx: 0 | 1;
    t2RecIdx: 0 | 1;
  }>({ 
    firstServingTeam: null, leftTeam: null, tbType: 'standard', t1ServerIdx: 0, t2ServerIdx: 0, t1RecIdx: 0, t2RecIdx: 0 
  });

  const [firstFault, setFirstFault] = useState<boolean>(false);
  const [activeTimer, setActiveTimer] = useState<{ label: string; seconds: number } | null>(null);

  const parsed = parseScoreString(match.Skor);
  const state = match.detailedState;
  
  const s1_p1 = Number(state?.set1_p1 ?? parsed.s1_p1 ?? 0);
  const s1_p2 = Number(state?.set1_p2 ?? parsed.s1_p2 ?? 0);
  const s2_p1 = Number(state?.set2_p1 ?? parsed.s2_p1 ?? 0);
  const s2_p2 = Number(state?.set2_p2 ?? parsed.s2_p2 ?? 0);
  const s3_p1 = Number(state?.set3_p1 ?? parsed.s3_p1 ?? 0);
  const s3_p2 = Number(state?.set3_p2 ?? parsed.s3_p2 ?? 0);

  const isLive = match.Durum === 'Oynaniyor';
  const isFinished = match.Durum === 'Bitti' || match.Durum === 'Retired' || match.Durum === 'Walkover';
  const isPaused = match.Durum === 'Duraklatildi';
  const isUpcoming = match.Durum === 'Baslamadi';
  const format = match.Skor_Formati || '3 Normal Set';

  const isDoubles = match['Oyuncu 1'].includes('/') || match['Oyuncu 2'].includes('/');
  const t1Players = isDoubles ? match['Oyuncu 1'].split('/').map(p => p.trim()) : [match['Oyuncu 1']];
  const t2Players = isDoubles ? match['Oyuncu 2'].split('/').map(p => p.trim()) : [match['Oyuncu 2']];

  const val1 = validateSingleSet(s1_p1, s1_p2, 1, format);
  const val2 = validateSingleSet(s2_p1, s2_p2, 2, format);
  const val3 = validateSingleSet(s3_p1, s3_p2, 3, format);
  const isCurrentSetComplete = selectedSet === 1 ? val1.isComplete : selectedSet === 2 ? val2.isComplete : val3.isComplete;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExitChairMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Kule hakemi modundan çıkıp genel maç ekranına dönmek istiyor musunuz?')) setIsChairMode(false);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (isChairMode) {
        if (window.confirm('Kule hakemi modundan çıkmak istiyor musunuz?')) setIsChairMode(false);
        else window.history.pushState(null, '', window.location.href);
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (isChairMode) { e.preventDefault(); e.returnValue = ''; } };

    if (isChairMode) {
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.body.style.overscrollBehaviorY = 'none';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overscrollBehaviorY = 'auto';
      document.body.style.overflow = 'auto';
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.body.style.overscrollBehaviorY = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, [isChairMode]);

  useEffect(() => {
    if (isLive) {
      let activeSet: 1 | 2 | 3 = 1;
      if (val1.isComplete) {
        activeSet = 2;
        if (val2.isComplete && val1.winner !== val2.winner) {
          activeSet = 3;
        }
      }
      setSelectedSet(activeSet);
    }
  }, [val1.isComplete, val2.isComplete, val1.winner, isLive]);

  useEffect(() => {
    setSetupsBySet(prev => {
      const next = { ...prev };
      let changed = false;
      
      if (!val1.isComplete) {
        if (next[2]) { delete next[2]; changed = true; }
        if (next[3]) { delete next[3]; changed = true; }
      } 
      else if (!val2.isComplete) {
        if (next[3]) { delete next[3]; changed = true; }
      }
      
      return changed ? next : prev;
    });
  }, [val1.isComplete, val2.isComplete]);

  useEffect(() => {
    if (selectedSet === 3 && prevSetRef.current !== 3) {
      let msg = "3. Set NORMAL SET olarak planlanmıştır.";
      if (format.includes('10 Puanlık')) {
        msg = "3. Set 10 PUANLIK MAÇ TİE-BREAK olarak planlanmıştır.";
      } else if (format.includes('7 Puanlık')) {
        msg = "3. Set 7 PUANLIK MAÇ TİE-BREAK olarak planlanmıştır.";
      } else if (format.includes('3 Kısa Set')) {
        msg = "3. Set KISA SET olarak planlanmıştır.";
      }

      setThirdSetWarning({ show: true, text: msg });
      vibrateDevice([100, 50, 100]); 

      const timer = setTimeout(() => {
        setThirdSetWarning(prev => ({ ...prev, show: false }));
      }, 6000);

      prevSetRef.current = selectedSet;
      return () => clearTimeout(timer);
    }
    prevSetRef.current = selectedSet;
  }, [selectedSet, format]);

  useEffect(() => {
    if (!isDoubles && selectedSet > 1 && !setupsBySet[selectedSet] && setupsBySet[selectedSet - 1]) {
      const prevSet = selectedSet - 1;
      const prevSetup = setupsBySet[prevSet];
      
      const prevS1 = prevSet === 1 ? s1_p1 : prevSet === 2 ? s2_p1 : s3_p1;
      const prevS2 = prevSet === 1 ? s1_p2 : prevSet === 2 ? s2_p2 : s3_p2;
      const totalGamesPrevSet = prevS1 + prevS2;
      
      if (totalGamesPrevSet > 0) {
        const nextServerTeam = totalGamesPrevSet % 2 === 0 ? prevSetup.firstServingTeam : (prevSetup.firstServingTeam === 1 ? 2 : 1);
        const lastGameOpposite = ((totalGamesPrevSet - 1) % 4 === 1 || (totalGamesPrevSet - 1) % 4 === 2);
        const changeEnds = totalGamesPrevSet % 2 !== 0; 
        const nextInitialOpposite = changeEnds ? !lastGameOpposite : lastGameOpposite;
        const nextLeftTeam = nextInitialOpposite ? (prevSetup.leftTeam === 1 ? 2 : 1) : prevSetup.leftTeam;

        setSetupsBySet(prev => ({
          ...prev,
          [selectedSet]: {
            ...prevSetup,
            setupSetNum: selectedSet,
            firstServingTeam: nextServerTeam,
            leftTeam: nextLeftTeam
          }
        }));
      }
    }
  }, [selectedSet, isDoubles, setupsBySet, s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2]);

  useEffect(() => {
    if (showSetupOverlay && !isEditingSetup && setupForm.firstServingTeam === null) {
      if (state?.currentServer === 1 || state?.currentServer === 2) {
        setSetupForm(prev => ({ ...prev, firstServingTeam: state.currentServer as 1 | 2 }));
      }
    }
  }, [showSetupOverlay, isEditingSetup, state?.currentServer]);

  const currentSetGames = selectedSet === 1 ? s1_p1 + s1_p2 : selectedSet === 2 ? s2_p1 + s2_p2 : s3_p1 + s3_p2;
  const isTB = state?.isTiebreak || false;
  const tbPoints = isTB ? Number(state?.tiebreak_p1 || 0) + Number(state?.tiebreak_p2 || 0) : 0;
  
  let computedServerTeam: 1 | 2 = 1;
  let computedLeftTeam: 1 | 2 = 1;
  let activeServerName = '';
  let activeReceiverName = '';
  let isSideChangePoint = false;
  let currentT1ServerIdx: 0 | 1 = 0;
  let currentT2ServerIdx: 0 | 1 = 0;

  if (isSetupValid) {
    const isComan = chairSetup.tbType === 'coman';
    const otherTeam = chairSetup.firstServingTeam === 1 ? 2 : 1;

    const parsePoint = (str: string) => {
      if (str === '15') return 1;
      if (str === '30') return 2;
      if (str === '40') return 3;
      if (str === 'A') return 4;
      return 0;
    };
    const p1Pts = parsePoint(String(state?.gamePoint_p1 || '0'));
    const p2Pts = parsePoint(String(state?.gamePoint_p2 || '0'));
    
    let isDeuceCourt = true;
    if (isTB) isDeuceCourt = tbPoints % 2 === 0;
    else isDeuceCourt = (p1Pts + p2Pts) % 2 === 0;

    if (!isTB) {
      computedServerTeam = currentSetGames % 2 === 0 ? chairSetup.firstServingTeam : otherTeam;
      computedLeftTeam = (currentSetGames % 4 === 1 || currentSetGames % 4 === 2) ? (chairSetup.leftTeam === 1 ? 2 : 1) : chairSetup.leftTeam;
      if ((currentSetGames % 2 === 1) && (state?.gamePoint_p1 === '0' && state?.gamePoint_p2 === '0')) isSideChangePoint = true;
      
      if (isDoubles) {
        const teamServiceRounds = Math.floor(currentSetGames / 2);
        currentT1ServerIdx = (chairSetup.t1ServerIdx + teamServiceRounds) % 2 as 0 | 1;
        currentT2ServerIdx = (chairSetup.t2ServerIdx + teamServiceRounds) % 2 as 0 | 1;
        if (computedServerTeam === 1) {
          activeServerName = t1Players[currentT1ServerIdx] || t1Players[0];
        } else {
          activeServerName = t2Players[currentT2ServerIdx] || t2Players[0];
        }
      } else {
        activeServerName = match[`Oyuncu ${computedServerTeam}` as keyof MatchItem];
      }
    } else {
      const tbGameServerTeam = currentSetGames % 2 === 0 ? chairSetup.firstServingTeam : otherTeam;
      const tbOtherTeam = tbGameServerTeam === 1 ? 2 : 1;
      
      if (tbPoints === 0) computedServerTeam = tbGameServerTeam;
      else {
        const block = Math.floor((tbPoints - 1) / 2);
        computedServerTeam = block % 2 === 0 ? tbOtherTeam : tbGameServerTeam;
      }

      const tbStartSide = (currentSetGames % 4 === 1 || currentSetGames % 4 === 2) ? (chairSetup.leftTeam === 1 ? 2 : 1) : chairSetup.leftTeam;
      if (tbPoints === 0) computedLeftTeam = tbStartSide;
      else if (isComan) {
        const block = Math.floor((tbPoints - 1) / 4);
        computedLeftTeam = block % 2 === 0 ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
        isSideChangePoint = ((tbPoints - 1) % 4 === 0) && tbPoints > 0;
      } else {
        const block = Math.floor(tbPoints / 6);
        computedLeftTeam = block % 2 === 1 ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
        isSideChangePoint = (tbPoints > 0 && tbPoints % 6 === 0);
      }

      if (isDoubles) {
        const teamServicesBeforeTB = Math.floor(currentSetGames / 2);
        const tbTeamBlocksT1 = Math.floor((tbPoints + (tbGameServerTeam === 1 ? 3 : 1)) / 4);
        const tbTeamBlocksT2 = Math.floor((tbPoints + (tbGameServerTeam === 2 ? 3 : 1)) / 4);
        
        currentT1ServerIdx = (chairSetup.t1ServerIdx + teamServicesBeforeTB + tbTeamBlocksT1) % 2 as 0 | 1;
        currentT2ServerIdx = (chairSetup.t2ServerIdx + teamServicesBeforeTB + tbTeamBlocksT2) % 2 as 0 | 1;
        
        if (computedServerTeam === 1) {
          activeServerName = t1Players[currentT1ServerIdx] || t1Players[0];
        } else {
          activeServerName = t2Players[currentT2ServerIdx] || t2Players[0];
        }
      } else {
        activeServerName = match[`Oyuncu ${computedServerTeam}` as keyof MatchItem];
      }
    }

    if (isDoubles) {
      const receivingTeam = computedServerTeam === 1 ? 2 : 1;
      const recPlayers = receivingTeam === 1 ? t1Players : t2Players;
      const deuceRecIdx = receivingTeam === 1 ? chairSetup.t1DeuceReceiverIdx : chairSetup.t2DeuceReceiverIdx;
      const adRecIdx = deuceRecIdx === 0 ? 1 : 0;
      const activeRecIdx = isDeuceCourt ? deuceRecIdx : adRecIdx;
      activeReceiverName = recPlayers[activeRecIdx] || recPlayers[0];
    }
  }

  const leftTeamId = computedLeftTeam;
  const rightTeamId = computedLeftTeam === 1 ? 2 : 1;

  const handleCancelSetup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSetupValid) {
      setIsEditingSetup(false);
    } else {
      if (selectedSet > 1 && setupsBySet[selectedSet - 1]) {
        setSelectedSet((selectedSet - 1) as 1 | 2 | 3);
      } else {
        setIsChairMode(false);
      }
    }
  };

  const handleSaveSetup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!setupForm.firstServingTeam || !setupForm.leftTeam) return;

    let initialServer: 1 | 2 = setupForm.firstServingTeam;
    let initialLeft: 1 | 2 = setupForm.leftTeam;

    if (!isTB) {
      initialServer = currentSetGames % 2 === 0 ? setupForm.firstServingTeam : (setupForm.firstServingTeam === 1 ? 2 : 1);
      initialLeft = (currentSetGames % 4 === 1 || currentSetGames % 4 === 2) ? (setupForm.leftTeam === 1 ? 2 : 1) : setupForm.leftTeam;
    } else {
      let tbGameServer = setupForm.firstServingTeam;
      if (tbPoints > 0) {
        const block = Math.floor((tbPoints - 1) / 2);
        tbGameServer = block % 2 === 0 ? setupForm.firstServingTeam : (setupForm.firstServingTeam === 1 ? 2 : 1);
      }
      initialServer = currentSetGames % 2 === 0 ? tbGameServer : (tbGameServer === 1 ? 2 : 1);

      let tbStartSide = setupForm.leftTeam;
      if (tbPoints > 0) {
        if (setupForm.tbType === 'coman') {
          const block = Math.floor((tbPoints - 1) / 4);
          tbStartSide = block % 2 === 0 ? setupForm.leftTeam : (setupForm.leftTeam === 1 ? 2 : 1);
        } else {
          const block = Math.floor(tbPoints / 6);
          tbStartSide = block % 2 === 1 ? (setupForm.leftTeam === 1 ? 2 : 1) : setupForm.leftTeam;
        }
      }
      initialLeft = (currentSetGames % 4 === 1 || currentSetGames % 4 === 2) ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
    }

    let t1InitSrvIdx = setupForm.t1ServerIdx;
    let t2InitSrvIdx = setupForm.t2ServerIdx;

    if (isDoubles) {
      let teamServicesBeforeNowT1 = Math.floor(currentSetGames / 2);
      let teamServicesBeforeNowT2 = Math.floor(currentSetGames / 2);
      if (isTB) {
        teamServicesBeforeNowT1 += Math.floor((tbPoints + (initialServer === 1 ? 3 : 1)) / 4);
        teamServicesBeforeNowT2 += Math.floor((tbPoints + (initialServer === 2 ? 3 : 1)) / 4);
      }
      t1InitSrvIdx = ((setupForm.t1ServerIdx - teamServicesBeforeNowT1) % 2 + 2) % 2 as 0 | 1;
      t2InitSrvIdx = ((setupForm.t2ServerIdx - teamServicesBeforeNowT2) % 2 + 2) % 2 as 0 | 1;
    }

    setSetupsBySet(prev => ({
      ...prev,
      [selectedSet]: {
        setupSetNum: selectedSet,
        firstServingTeam: initialServer,
        leftTeam: initialLeft,
        tbType: setupForm.tbType,
        t1ServerIdx: t1InitSrvIdx,
        t2ServerIdx: t2InitSrvIdx,
        t1DeuceReceiverIdx: setupForm.t1RecIdx,
        t2DeuceReceiverIdx: setupForm.t2RecIdx
      }
    }));

    setIsEditingSetup(false);
  };

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
    vibrateDevice(40); 
    updateGameScore(match.id, selectedSet, player, delta);
  };

  const handlePointScore = (e: React.MouseEvent, teamId: 1 | 2) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastScoreClickRef.current < 400) return; 
    lastScoreClickRef.current = now;
    vibrateDevice(50); 
    setFirstFault(false); 
    awardPointToMatch(match.id, teamId, 'NORMAL'); 
  };

  const handleFault = (e: React.MouseEvent, serverTeamId: 1 | 2) => {
    e.stopPropagation();
    vibrateDevice(50); 
    if (!firstFault) setFirstFault(true);
    else {
      const receiverTeamId = serverTeamId === 1 ? 2 : 1;
      setFirstFault(false);
      awardPointToMatch(match.id, receiverTeamId, 'NORMAL');
    }
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    vibrateDevice(60); 
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

  const handleCardClick = () => { if (isUpcoming && onOpenSetup) onOpenSetup(match); };

  const handleStartMatchDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenSetup) onOpenSetup(match);
    else setMatchStatus(match.id, 'Oynaniyor', undefined, undefined);
  };

  const currentSetP1Games = selectedSet === 1 ? s1_p1 : selectedSet === 2 ? s2_p1 : s3_p1;
  const currentSetP2Games = selectedSet === 1 ? s1_p2 : selectedSet === 2 ? s2_p2 : s3_p2;

  let isP1PlusDisabled = isPaused || isFinished || isCurrentSetComplete;
  let isP2PlusDisabled = isPaused || isFinished || isCurrentSetComplete;

  if (selectedSet === 3) {
      if (format.includes('10 Puanlık') || format.includes('7 Puanlık')) {
          const target = format.includes('10 Puanlık') ? 10 : 7;
          if ((s3_p1 >= target && s3_p1 - s3_p2 >= 2) || (s3_p2 >= target && s3_p2 - s3_p1 >= 2)) {
             isP1PlusDisabled = true;
             isP2PlusDisabled = true;
          } else {
             isP1PlusDisabled = false;
             isP2PlusDisabled = false;
          }
      } else {
          isP1PlusDisabled = isPaused || isFinished || val3.isComplete;
          isP2PlusDisabled = isPaused || isFinished || val3.isComplete;
      }
  }

  return (
    <>
      {thirdSetWarning.show && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/95 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300" style={{ touchAction: 'none' }}>
          <div className="bg-slate-900 border-4 border-amber-500 rounded-3xl p-6 sm:p-8 w-full max-w-lg text-center shadow-[0_0_80px_rgba(245,158,11,0.2)]">
            <span className="text-6xl sm:text-7xl mb-3 sm:mb-4 block animate-bounce">⚠️</span>
            <div className="text-amber-500 font-extrabold text-sm sm:text-base tracking-widest mb-1">{match.Kort}</div>
            <h2 className="text-2xl sm:text-4xl font-black text-amber-400 uppercase tracking-widest mb-4">3. SETE GEÇİLİYOR</h2>
            <p className="text-base sm:text-xl text-white font-bold mb-2">Lütfen planlanan maça formatına dikkat ediniz:</p>
            <div className="bg-amber-500/20 border border-amber-500/50 rounded-2xl p-4 sm:p-5 my-4 sm:my-6 shadow-inner">
              <span className="text-lg sm:text-2xl font-black text-amber-300">{thirdSetWarning.text}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mb-6 sm:mb-8 font-medium px-2 sm:px-4">Yanlışlık olduğunu düşünüyorsanız, Ayarlar (⚙️) menüsünden formatı düzeltebilirsiniz.</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setThirdSetWarning({show: false, text: ''}); }}
              className="w-full py-4 sm:py-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-base sm:text-xl rounded-2xl shadow-xl transition active:scale-95"
            >
              Anladım, Maça Dön
            </button>
          </div>
        </div>
      )}

      {/* 1. KORT HAKEMİ KART GÖRÜNÜMÜ */}
      <div
        onClick={handleCardClick}
        className={`rounded-3xl transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-lg relative ${
          isLive || isPaused ? 'bg-slate-900/95 border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.18)]'
          : isUpcoming ? 'bg-gradient-to-b from-slate-900 to-amber-950/20 border-2 border-amber-500/50 cursor-pointer'
          : 'bg-rose-950/20 border border-rose-800/50'
        }`}
      >
        <div className={`h-1.5 w-full ${isLive ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse' : isPaused ? 'bg-gradient-to-r from-amber-400 to-amber-600' : isUpcoming ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-rose-500 to-rose-700'}`} />

        <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${isLive || isPaused ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/30' : isUpcoming ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' : 'bg-rose-500/20 text-rose-300'}`}>
              {match.Kort.replace('KORT', 'K').trim()}
            </span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-1.5 truncate">
                <span>{match.Kort}</span>
                {isLive && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 animate-pulse shrink-0">CANLI</span>}
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">{match.Kategori}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black tracking-wide uppercase shrink-0 ${isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : isPaused ? 'bg-amber-500/20 text-amber-300' : isUpcoming ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {match.Durum === 'Retired' ? '✕ RET' : match.Durum === 'Walkover' ? '✕ W/O' : match.Durum === 'Bitti' ? '✕ BİTTİ' : match.Durum === 'Duraklatildi' ? 'ASKIYA' : match.Durum}
          </span>
        </div>

        {/* DÜZELTME UYGULANAN ALAN: Devasa Parlak Saat Tasarımı */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between font-mono shadow-inner">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/50">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              {match.Saat && (
                <span className="text-white font-black text-sm sm:text-lg tracking-widest drop-shadow-md">
                  {match.Saat}
                </span>
              )}
            </div>
            
            {(isLive || isPaused || isFinished) && (
               <div className="flex flex-col justify-center border-l border-slate-700/80 pl-2 sm:pl-3">
                 <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase leading-none mb-0.5">Fiili Başlama</span>
                 <strong className="text-slate-300 text-xs sm:text-sm leading-none">{match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi' ? match.Baslangic_Saati : '--:--'}</strong>
               </div>
            )}
          </div>
          <div className="text-slate-400 font-sans text-[11px] sm:text-xs font-bold truncate pl-2 max-w-[120px] sm:max-w-[150px] text-right leading-tight">
            {match.Skor_Formati}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div className="bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-900/80 text-[10px] font-extrabold uppercase text-slate-400 py-1.5 px-3 border-b border-slate-800">
              <div className="col-span-6">Oyuncu / Takım</div><div className="col-span-2 text-center">1. Set</div><div className="col-span-2 text-center">2. Set</div><div className="col-span-2 text-center">3. Set</div>
            </div>
            
            <div className={`grid grid-cols-12 items-center py-2 px-3 border-b border-slate-800/50 ${match.Kazanan === match['Oyuncu 1'] && isFinished ? 'bg-lime-500/10' : ''}`}>
              <div className="col-span-6 flex items-center gap-2 pr-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0"></span>
                <span className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center gap-1.5 min-w-0 flex-1">
                    {computedServerTeam === 1 && computedLeftTeam === 1 && (isLive || isPaused) && (
                        <span className="text-amber-400 animate-bounce text-[10px] sm:text-xs shrink-0" title="Servis Atan (Sol Saha)">🎾</span>
                    )}
                    <span className="truncate">{match['Oyuncu 1']}</span>
                    {computedServerTeam === 1 && computedLeftTeam !== 1 && (isLive || isPaused) && (
                        <span className="text-amber-400 animate-bounce text-[10px] sm:text-xs shrink-0" title="Servis Atan (Sağ Saha)">🎾</span>
                    )}
                </span>
              </div>
              <div className="col-span-2 text-center font-mono font-black text-lime-300">{isUpcoming ? '-' : s1_p1}</div><div className="col-span-2 text-center font-mono font-black text-lime-300">{isUpcoming ? '-' : s2_p1}</div><div className="col-span-2 text-center font-mono font-black text-lime-300">{isUpcoming ? '-' : s3_p1}</div>
            </div>
            
            <div className={`grid grid-cols-12 items-center py-2 px-3 ${match.Kazanan === match['Oyuncu 2'] && isFinished ? 'bg-cyan-500/10' : ''}`}>
              <div className="col-span-6 flex items-center gap-2 pr-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0"></span>
                <span className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center gap-1.5 min-w-0 flex-1">
                    {computedServerTeam === 2 && computedLeftTeam === 2 && (isLive || isPaused) && (
                        <span className="text-amber-400 animate-bounce text-[10px] sm:text-xs shrink-0" title="Servis Atan (Sol Saha)">🎾</span>
                    )}
                    <span className="truncate">{match['Oyuncu 2']}</span>
                    {computedServerTeam === 2 && computedLeftTeam !== 2 && (isLive || isPaused) && (
                        <span className="text-amber-400 animate-bounce text-[10px] sm:text-xs shrink-0" title="Servis Atan (Sağ Saha)">🎾</span>
                    )}
                </span>
              </div>
              <div className="col-span-2 text-center font-mono font-black text-cyan-300">{isUpcoming ? '-' : s1_p2}</div><div className="col-span-2 text-center font-mono font-black text-cyan-300">{isUpcoming ? '-' : s2_p2}</div><div className="col-span-2 text-center font-mono font-black text-cyan-300">{isUpcoming ? '-' : s3_p2}</div>
            </div>
          </div>

          {(isLive || isPaused) && (
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 mt-2 shadow-inner">
              <button type="button" onClick={(e) => { e.stopPropagation(); setIsChairMode(true); }} className="w-full py-3 mb-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2">
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
                    <button type="button" disabled={isP1PlusDisabled} onClick={(e) => handleQuickScore(e, 1, 1)} className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm flex items-center justify-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-5 h-5" />+1 OYUN</button>
                    <button type="button" disabled={isPaused} onClick={(e) => handleQuickScore(e, 1, -1)} className="w-full py-2 rounded-xl bg-rose-500/10 text-rose-400 font-bold text-xs flex items-center justify-center gap-1 transition disabled:opacity-50"><Minus className="w-4 h-4" />-1 Düş</button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button type="button" disabled={isP2PlusDisabled} onClick={(e) => handleQuickScore(e, 2, 1)} className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm flex items-center justify-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-5 h-5" />+1 OYUN</button>
                    <button type="button" disabled={isPaused} onClick={(e) => handleQuickScore(e, 2, -1)} className="w-full py-2 rounded-xl bg-rose-500/10 text-cyan-400 font-bold text-xs flex items-center justify-center gap-1 transition disabled:opacity-50"><Minus className="w-4 h-4" />-1 Düş</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-slate-950/70 border-t border-slate-800 flex items-center gap-2">
          {isUpcoming ? (
            <div className="flex items-center gap-2 w-full">
              {onOpenSetup && <button type="button" onClick={(e) => { e.stopPropagation(); onOpenSetup(match); }} className="py-2.5 px-3 rounded-xl bg-slate-800 text-amber-300 font-bold text-xs border border-slate-700 transition">🪙 Kura</button>}
              <button type="button" onClick={handleStartMatchDirect} className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5"><PlayCircle className="w-4 h-4" /> Maçı Başlat</button>
            </div>
          ) : isLive || isPaused ? (
            <div className="flex items-center gap-2 w-full">
              {onOpenSetup && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onOpenSetup(match); }} className="h-12 w-12 flex items-center justify-center shrink-0 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl transition active:scale-95" title="Maç Formatı ve Kura Ayarları">
                  <Settings className="w-5 h-5" />
                </button>
              )}
              <button type="button" onClick={(e) => { e.stopPropagation(); onFinishMatch(match); }} className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl flex justify-center items-center gap-2 transition"><Trophy className="w-4 h-4 text-cyan-400" /> Maçı Sonlandır</button>
            </div>
          ) : null}
        </div>
      </div>

      {isChairMode && (
        <div className="fixed inset-0 z-[50000] bg-slate-950 flex flex-col animate-in fade-in zoom-in-95 duration-200 select-none" style={{ touchAction: 'none' }}>
          
          {toastMessage && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[50000] bg-slate-800 text-white px-5 py-3 rounded-2xl border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-bold text-[11px] sm:text-sm">{toastMessage}</span>
            </div>
          )}

          <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-3 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/30 shrink-0">
                {match.Kort.replace('KORT', 'K').trim()}
              </span>
              <div className="flex flex-col">
                <span className="text-white font-extrabold text-sm sm:text-base leading-none mb-1">Kule Hakemi</span>
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-black tracking-widest uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>Canlı</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               {isSetupValid && (
                  <button type="button" onClick={(e) => { 
                    e.stopPropagation(); 
                    if (chairSetup) {
                      setSetupForm({
                        firstServingTeam: computedServerTeam,
                        leftTeam: computedLeftTeam,
                        tbType: chairSetup.tbType,
                        t1ServerIdx: isDoubles ? currentT1ServerIdx : 0,
                        t2ServerIdx: isDoubles ? currentT2ServerIdx : 0,
                        t1RecIdx: chairSetup.t1DeuceReceiverIdx,
                        t2RecIdx: chairSetup.t2DeuceReceiverIdx,
                      });
                    }
                    setIsEditingSetup(true); 
                  }} className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition flex items-center gap-1.5" title="Saha ve Servis Rotasyonunu Düzenle">
                    <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline text-xs font-bold">Rotasyon</span>
                  </button>
                )}
                {onOpenSetup && (
                  <button type="button" onClick={(e) => { 
                    e.stopPropagation(); 
                    onOpenSetup(match); 
                    showToast('Ayarlara geçmek için lütfen Kule Hakemi modundan çıkış yapınız.');
                  }} className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 transition flex items-center gap-1.5" title="Maç Formatı ve Kura Ayarları">
                    <Settings className="w-4 h-4" /> <span className="hidden sm:inline text-xs font-bold">Kurulum</span>
                  </button>
                )}
                <button type="button" onClick={handleExitChairMode} className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 shadow-sm border border-rose-500/30">
                  <LogOut className="w-4 h-4" /> Çıkış Yap
                </button>
            </div>
          </div>

          <div className="flex-1 p-2 sm:p-6 w-full max-w-5xl mx-auto flex flex-col justify-center gap-3 overflow-y-auto">
              
              {showSetupOverlay ? (
                <div className="bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-800 text-center space-y-4 sm:space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
                  
                  <button 
                    type="button" 
                    onClick={handleCancelSetup} 
                    className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 transition active:scale-95 flex items-center justify-center"
                    title="İptal Et / Kapat"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div>
                    <h4 className="text-amber-400 font-black text-base sm:text-xl mb-1 sm:mb-2 flex items-center justify-center gap-2">⚙️ {selectedSet}. Set Anlık Kurulumu</h4>
                    <p className="text-[11px] sm:text-sm text-slate-400">Lütfen sahadaki <strong>ŞU ANKİ</strong> durumu seçin. Sistem geri kalanını hesaplar.</p>
                  </div>
                  
                  {isDoubles ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                         <h5 className="text-lime-400 font-black text-sm uppercase mb-1">1. Takım (Lime)</h5>
                         <div className="text-left">
                           <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">Şu Anki (Sıradaki) Servisçi:</label>
                           <div className="flex gap-2">
                             {t1Players.map((player, idx) => (
                                <button key={`s1-${idx}`} type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, t1ServerIdx: idx as 0|1}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition border ${setupForm.t1ServerIdx === idx ? 'bg-lime-500 border-lime-400 text-slate-950 shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{player.split(' ')[0]}</button>
                             ))}
                           </div>
                         </div>
                         <div className="text-left">
                           <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">Sağda (Berabere) Karşılayan Kişi:</label>
                           <div className="flex gap-2">
                             {t1Players.map((player, idx) => (
                                <button key={`r1-${idx}`} type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, t1RecIdx: idx as 0|1}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition border ${setupForm.t1RecIdx === idx ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{player.split(' ')[0]}</button>
                             ))}
                           </div>
                         </div>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                         <h5 className="text-cyan-400 font-black text-sm uppercase mb-1">2. Takım (Mavi)</h5>
                         <div className="text-left">
                           <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">Şu Anki (Sıradaki) Servisçi:</label>
                           <div className="flex gap-2">
                             {t2Players.map((player, idx) => (
                                <button key={`s2-${idx}`} type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, t2ServerIdx: idx as 0|1}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition border ${setupForm.t2ServerIdx === idx ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{player.split(' ')[0]}</button>
                             ))}
                           </div>
                         </div>
                         <div className="text-left">
                           <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">Sağda (Berabere) Karşılayan Kişi:</label>
                           <div className="flex gap-2">
                             {t2Players.map((player, idx) => (
                                <button key={`r2-${idx}`} type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, t2RecIdx: idx as 0|1}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition border ${setupForm.t2RecIdx === idx ? 'bg-blue-500 border-blue-400 text-slate-950 shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{player.split(' ')[0]}</button>
                             ))}
                           </div>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider">Şu An Servisi Kim Atıyor?</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, firstServingTeam: 1}); }} className={`flex-1 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 border-2 ${setupForm.firstServingTeam === 1 ? 'bg-lime-500 border-lime-400 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>{match['Oyuncu 1']}</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, firstServingTeam: 2}); }} className={`flex-1 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 border-2 ${setupForm.firstServingTeam === 2 ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>{match['Oyuncu 2']}</button>
                      </div>
                    </div>
                  )}

                  {isDoubles && (
                    <div className="space-y-2 pt-3 border-t border-slate-800/80">
                      <div className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider">Genel: Şu An Hangi Takım Servis Atıyor?</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, firstServingTeam: 1}); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition border-2 ${setupForm.firstServingTeam === 1 ? 'bg-lime-500 border-lime-400 text-slate-950 shadow-md' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>1. Takım (Lime)</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, firstServingTeam: 2}); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition border-2 ${setupForm.firstServingTeam === 2 ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>2. Takım (Mavi)</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <div className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider">Şu An Sandalyenin Solunda Kim (Hangi Takım) Var?</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, leftTeam: 1}); }} className={`flex-1 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 border-2 ${setupForm.leftTeam === 1 ? 'bg-lime-500 border-lime-400 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>{isDoubles ? '1. Takım' : match['Oyuncu 1']}</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, leftTeam: 2}); }} className={`flex-1 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 border-2 ${setupForm.leftTeam === 2 ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>{isDoubles ? '2. Takım' : match['Oyuncu 2']}</button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <div className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider">Tie-Break Kuralı</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, tbType: 'standard'}); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition active:scale-95 border-2 ${setupForm.tbType === 'standard' ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>Standart (6'da Bir)</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, tbType: 'coman'}); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition active:scale-95 border-2 ${setupForm.tbType === 'coman' ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>Coman (1-5-9)</button>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={handleCancelSetup} className="px-5 py-4 sm:py-5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 font-black text-sm sm:text-lg rounded-xl transition active:scale-95 shadow-md border border-slate-700">İptal</button>
                    <button type="button" disabled={!setupForm.firstServingTeam || !setupForm.leftTeam || (isDoubles && (setupForm.t1ServerIdx === undefined || setupForm.t2ServerIdx === undefined))} onClick={handleSaveSetup} className="flex-1 py-4 sm:py-5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-slate-950 font-black text-sm sm:text-lg rounded-xl disabled:opacity-50 transition active:scale-95 shadow-xl">Kaydet ve Devam Et</button>
                  </div>
                </div>
              ) : (
                
                <div className="flex flex-col h-full gap-2 sm:gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 border border-slate-800 shadow-md gap-2 shrink-0">
                    <div className="flex flex-col items-center sm:flex-row gap-2 sm:gap-3 text-[10px] sm:text-sm font-bold w-full sm:w-auto">
                      
                      <div className="flex flex-col items-center justify-center bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-700/80 shadow-inner">
                        <span className="text-amber-400 font-extrabold text-xs sm:text-sm tracking-wider uppercase">{selectedSet}. SET</span>
                        {selectedSet > 1 && (
                          <div className="flex items-center gap-2.5 mt-1 text-xs sm:text-sm font-mono">
                            {selectedSet >= 2 && <span className="text-slate-300 font-bold">S1: <strong className="text-lime-300 font-black">{s1_p1}-{s1_p2}</strong></span>}
                            {selectedSet >= 3 && <span className="text-slate-300 font-bold">S2: <strong className="text-cyan-300 font-black">{s2_p1}-{s2_p2}</strong></span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full justify-center">
                        <span className="text-lime-400 font-extrabold truncate max-w-[90px] sm:max-w-[150px]">{String(match['Oyuncu 1'] || '')}</span>
                        <span className="text-white font-mono text-lg sm:text-2xl font-black px-3 py-1 bg-slate-950 rounded-xl border-2 border-slate-700 shadow-inner">
                          {currentSetP1Games} - {currentSetP2Games}
                        </span>
                        <span className="text-cyan-400 font-extrabold truncate max-w-[90px] sm:max-w-[150px]">{String(match['Oyuncu 2'] || '')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                       {isTB && <div className="px-2 sm:px-3 py-1 bg-amber-500/20 text-amber-400 text-[9px] sm:text-xs font-black uppercase rounded-lg animate-pulse border border-amber-500/30">{chairSetup.tbType === 'coman' ? 'Coman Tie-Break' : 'Standart Tie-Break'}</div>}
                       {isSideChangePoint && <div className="flex items-center gap-1.5 text-rose-300 font-black text-[9px] sm:text-sm uppercase animate-pulse bg-rose-500/20 border border-rose-500/40 px-2 sm:px-3 py-1 rounded-lg"><ArrowRightLeft className="w-3 h-3 sm:w-4 sm:h-4"/> Saha Değişimi!</div>}
                    </div>
                  </div>

                  {activeTimer && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2 sm:p-4 rounded-2xl flex items-center justify-between shadow-lg shrink-0">
                      <span className="text-amber-400 font-black text-sm sm:text-base flex items-center gap-2"><Timer className="w-4 h-4 sm:w-5 sm:h-5" />{activeTimer.label}</span>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className={`font-mono font-black text-2xl sm:text-4xl ${activeTimer.seconds === 0 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                          {Math.floor(activeTimer.seconds / 60)}:{(activeTimer.seconds % 60).toString().padStart(2, '0')}
                        </span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setActiveTimer(null); }} className="text-amber-500 hover:text-amber-300 p-2 bg-amber-500/10 rounded-xl"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                      </div>
                    </div>
                  )}

                  {/* DEV EKRAN: SOL OYUNCU vs SAĞ OYUNCU */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-6 flex-1 min-h-0">
                    
                    {/* SOL SAHA */}
                    <div className={`bg-slate-900 rounded-3xl p-2 sm:p-5 border-4 flex flex-col justify-between shadow-2xl overflow-hidden ${computedServerTeam === leftTeamId ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.15)]' : 'border-slate-800'}`}>
                      <div className="flex flex-col items-center justify-center min-h-[4rem] sm:min-h-[5.5rem] border-b border-slate-800/80 pb-2 mb-2">
                        <div className={`flex items-start justify-center gap-1 w-full ${leftTeamId === 1 ? 'text-lime-400' : 'text-cyan-400'}`}>
                           {computedServerTeam === leftTeamId && <span className="text-amber-400 animate-bounce mt-0.5 sm:mt-1.5 shrink-0 text-sm sm:text-xl">🎾</span>}
                           <div className="flex flex-col items-center">
                             <span className="font-black text-xs sm:text-xl text-center leading-tight line-clamp-3 break-words whitespace-normal px-1">
                               {isDoubles ? String(match[`Oyuncu ${leftTeamId}` as keyof MatchItem] || '') : (leftTeamId === computedServerTeam ? activeServerName : String(match[`Oyuncu ${leftTeamId}` as keyof MatchItem] || ''))}
                             </span>
                             <div className="flex flex-wrap justify-center gap-1 mt-1">
                               {isDoubles && computedServerTeam === leftTeamId && (
                                 <span className="text-[9px] sm:text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-black uppercase border border-amber-500/30">Servis: {activeServerName.split(' ')[0]}</span>
                               )}
                               {isDoubles && computedServerTeam !== leftTeamId && (
                                 <span className="text-[9px] sm:text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-black uppercase border border-blue-500/30">Karşılama: {activeReceiverName.split(' ')[0]}</span>
                               )}
                             </div>
                           </div>
                        </div>
                        <div className="text-[8px] sm:text-xs text-slate-500 uppercase font-black mt-1">Sol Saha</div>
                      </div>
                      
                      <div className="flex-1 flex justify-center items-center py-2 sm:py-4 min-h-0">
                         <span className="text-[4.5rem] sm:text-[9rem] font-mono font-black tracking-tighter text-white leading-none">
                           {isTB ? (leftTeamId === 1 ? state?.tiebreak_p1 : state?.tiebreak_p2) || '0' : (leftTeamId === 1 ? state?.gamePoint_p1 : state?.gamePoint_p2) || '0'}
                         </span>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
                        <button type="button" disabled={isPaused || isFinished || isCurrentSetComplete} onClick={(e) => handlePointScore(e, leftTeamId)} className="w-full py-8 sm:py-12 bg-gradient-to-t from-emerald-600 to-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xl sm:text-3xl rounded-2xl shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
                          +1 PUAN
                        </button>
                        <div className="h-10 sm:h-14 w-full">
                           {computedServerTeam === leftTeamId ? (
                             <button type="button" disabled={isPaused || isFinished || isCurrentSetComplete} onClick={(e) => handleFault(e, leftTeamId)} className={`w-full h-full rounded-xl text-[10px] sm:text-base font-black transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${firstFault ? 'bg-rose-500 border-2 border-rose-400 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                               {firstFault ? '2. Hata (Rakibe Puan)' : '1. Servis Hatası'}
                             </button>
                           ) : (
                             <div className="w-full h-full invisible"></div>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* SAĞ SAHA */}
                    <div className={`bg-slate-900 rounded-3xl p-2 sm:p-5 border-4 flex flex-col justify-between shadow-2xl overflow-hidden ${computedServerTeam === rightTeamId ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.15)]' : 'border-slate-800'}`}>
                      <div className="flex flex-col items-center justify-center min-h-[4rem] sm:min-h-[5.5rem] border-b border-slate-800/80 pb-2 mb-2">
                        <div className={`flex items-start justify-center gap-1 w-full ${rightTeamId === 1 ? 'text-lime-400' : 'text-cyan-400'}`}>
                           {computedServerTeam === rightTeamId && <span className="text-amber-400 animate-bounce mt-0.5 sm:mt-1.5 shrink-0 text-sm sm:text-xl">🎾</span>}
                           <div className="flex flex-col items-center">
                             <span className="font-black text-xs sm:text-xl text-center leading-tight line-clamp-3 break-words whitespace-normal px-1">
                               {isDoubles ? String(match[`Oyuncu ${rightTeamId}` as keyof MatchItem] || '') : (rightTeamId === computedServerTeam ? activeServerName : String(match[`Oyuncu ${rightTeamId}` as keyof MatchItem] || ''))}
                             </span>
                             <div className="flex flex-wrap justify-center gap-1 mt-1">
                               {isDoubles && computedServerTeam === rightTeamId && (
                                 <span className="text-[9px] sm:text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-black uppercase border border-amber-500/30">Servis: {activeServerName.split(' ')[0]}</span>
                               )}
                               {isDoubles && computedServerTeam !== rightTeamId && (
                                 <span className="text-[9px] sm:text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-black uppercase border border-blue-500/30">Karşılama: {activeReceiverName.split(' ')[0]}</span>
                               )}
                             </div>
                           </div>
                        </div>
                        <div className="text-[8px] sm:text-xs text-slate-500 uppercase font-black mt-1">Sağ Saha</div>
                      </div>
                      
                      <div className="flex-1 flex justify-center items-center py-2 sm:py-4 min-h-0">
                         <span className="text-[4.5rem] sm:text-[9rem] font-mono font-black tracking-tighter text-white leading-none">
                           {isTB ? (rightTeamId === 1 ? state?.tiebreak_p1 : state?.tiebreak_p2) || '0' : (rightTeamId === 1 ? state?.gamePoint_p1 : state?.gamePoint_p2) || '0'}
                         </span>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
                        <button type="button" disabled={isPaused || isFinished || isCurrentSetComplete} onClick={(e) => handlePointScore(e, rightTeamId)} className="w-full py-8 sm:py-12 bg-gradient-to-t from-emerald-600 to-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xl sm:text-3xl rounded-2xl shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
                          +1 PUAN
                        </button>
                        <div className="h-10 sm:h-14 w-full">
                           {computedServerTeam === rightTeamId ? (
                             <button type="button" disabled={isPaused || isFinished || isCurrentSetComplete} onClick={(e) => handleFault(e, rightTeamId)} className={`w-full h-full rounded-xl text-[10px] sm:text-base font-black transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${firstFault ? 'bg-rose-500 border-2 border-rose-400 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                               {firstFault ? '2. Hata (Rakibe Puan)' : '1. Servis Hatası'}
                             </button>
                           ) : (
                             <div className="w-full h-full invisible"></div>
                           )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ALT AKSİYON ÇUBUĞU */}
                  <div className="pt-2 border-t border-slate-800 flex flex-col gap-2 sm:gap-3 shrink-0 pb-4">
                    <div className="flex gap-2 sm:gap-3">
                      <button type="button" onClick={(e) => startTimer(e, 'Saha Değişimi', 90)} className="flex-1 py-3 sm:py-4 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] sm:text-sm font-black rounded-xl transition shadow-md">90s Değişim</button>
                      <button type="button" onClick={(e) => startTimer(e, 'Set Arası', 120)} className="flex-1 py-3 sm:py-4 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] sm:text-sm font-black rounded-xl transition shadow-md">120s Set</button>
                      <button type="button" onClick={(e) => startTimer(e, 'Sağlık Molası', 180)} className="flex-1 py-3 sm:py-4 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] sm:text-sm font-black rounded-xl transition shadow-md">3dk MTO</button>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                      <button type="button" onClick={handleUndo} disabled={isPaused} className="flex-1 flex items-center justify-center gap-1.5 py-3 sm:py-4 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-[11px] sm:text-base font-black rounded-xl transition active:scale-95 shadow-sm disabled:opacity-50">
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" /> Geri Al
                      </button>
                      <button type="button" onClick={toggleSuspend} className={`flex-1 flex items-center justify-center gap-1.5 py-3 sm:py-4 text-[11px] sm:text-base font-black rounded-xl transition active:scale-95 shadow-sm ${isPaused ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                        {isPaused ? <><PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Devam Et</> : <><PauseCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Askıya Al</>}
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
