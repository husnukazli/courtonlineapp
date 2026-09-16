import React, { useRef, useState, useEffect } from 'react';
import { MatchItem } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import { parseScoreString, validateSingleSet } from '../../utils/tennisScoringEngine';
import {
  Trophy, Clock, CheckCircle2, PlayCircle, Plus, Minus, RotateCcw,
  Swords, PauseCircle, Timer, X, ArrowRightLeft, Settings, LogOut, Info, PenLine, Sun, Moon
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

const vibrateDevice = (pattern: number | number[] = 50) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const CourtCard: React.FC<CourtCardProps> = ({
  match,
  onFinishMatch,
  onEditScore,
  onOpenSetup,
}) => {
  const { updateGameScore, setMatchStatus, awardPointToMatch, undoLastPoint, tournamentInfo } = useTennisData();
  const lastScoreClickRef = useRef<number>(0);

  const [selectedSet, setSelectedSet] = useState<1 | 2 | 3>(() => {
    const fmt = match.Skor_Formati || '3 Normal Set';
    const parsed = parseScoreString(match.Skor);
    const s1p1 = Number(match.detailedState?.set1_p1 ?? parsed.s1_p1 ?? 0);
    const s1p2 = Number(match.detailedState?.set1_p2 ?? parsed.s1_p2 ?? 0);
    const s2p1 = Number(match.detailedState?.set2_p1 ?? parsed.s2_p1 ?? 0);
    const s2p2 = Number(match.detailedState?.set2_p2 ?? parsed.s2_p2 ?? 0);
    
    const val1 = validateSingleSet(s1p1, s1p2, 1, fmt);
    const val2 = validateSingleSet(s2p1, s2p2, 2, fmt);
    
    if (val1.isComplete && val2.isComplete && val1.winner !== val2.winner) return 3;
    if (val1.isComplete) return 2;
    return 1;
  });

  const [isEditingSetup, setIsEditingSetup] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isChairMode, setIsChairMode] = useState<boolean>(() => {
    return localStorage.getItem('courtonline_active_chair_match') === match.id;
  });

  useEffect(() => {
    if (isChairMode) {
      localStorage.setItem('courtonline_active_chair_match', match.id);
    } else {
      if (localStorage.getItem('courtonline_active_chair_match') === match.id) {
        localStorage.removeItem('courtonline_active_chair_match');
      }
    }
  }, [isChairMode, match.id]);

  const handleExitChairMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Kule hakemi modundan çıkıp genel maç ekranına dönmek istiyor musunuz?')) {
      setIsChairMode(false);
      localStorage.removeItem('courtonline_active_chair_match');
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (isChairMode) {
        if (window.confirm('Kule hakemi modundan çıkmak istiyor musunuz?')) {
          setIsChairMode(false);
          localStorage.removeItem('courtonline_active_chair_match');
        } else {
          window.history.pushState(null, '', window.location.href);
        }
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
  
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('courtonline_light_mode') === 'true';
  });

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLightMode(prev => {
      const newVal = !prev;
      localStorage.setItem('courtonline_light_mode', String(newVal));
      window.dispatchEvent(new Event('storage'));
      return newVal;
    });
  };

  useEffect(() => {
    const handleStorage = () => {
      setIsLightMode(localStorage.getItem('courtonline_light_mode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isInitialMount = useRef(true);
  const prevSetRef = useRef<number>(selectedSet);
  const [thirdSetWarning, setThirdSetWarning] = useState<{show: boolean, text: string}>({show: false, text: ''});

  const [setupsBySet, setSetupsBySet] = useState<Record<number, ChairSetup>>({});
  const chairSetup = setupsBySet[selectedSet] || null;
  const isSetupValid = !!chairSetup;
  const showSetupOverlay = isEditingSetup || !isSetupValid;

  const globalTbType = (tournamentInfo?.tbType as 'standard' | 'coman') || 'standard';

  const [setupForm, setSetupForm] = useState<{
    firstServingTeam: 1 | 2 | null; 
    leftTeam: 1 | 2 | null; 
    tbType: 'standard' | 'coman'; 
    t1ServerIdx: 0 | 1; 
    t2ServerIdx: 0 | 1;
    t1RecIdx: 0 | 1;
    t2RecIdx: 0 | 1;
  }>({ 
    firstServingTeam: null, leftTeam: null, tbType: globalTbType, t1ServerIdx: 0, t2ServerIdx: 0, t1RecIdx: 0, t2RecIdx: 0 
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
      if (!val1.isComplete) { if (next[2]) { delete next[2]; changed = true; } if (next[3]) { delete next[3]; changed = true; } } 
      else if (!val2.isComplete) { if (next[3]) { delete next[3]; changed = true; } }
      return changed ? next : prev;
    });
  }, [val1.isComplete, val2.isComplete]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSetRef.current = selectedSet;
      return;
    }
    
    if (selectedSet === 3 && prevSetRef.current === 2) {
      if (!isFinished) {
        let msg = "3. Set NORMAL SET olarak planlanmıştır.";
        if (format.includes('10 Puanlık')) msg = "3. Set 10 PUANLIK MAÇ TİE-BREAK olarak planlanmıştır.";
        else if (format.includes('7 Puanlık')) msg = "3. Set 7 PUANLIK MAÇ TİE-BREAK olarak planlanmıştır.";
        else if (format.includes('3 Kısa Set')) msg = "3. Set KISA SET olarak planlanmıştır.";

        setThirdSetWarning({ show: true, text: msg });
        vibrateDevice([100, 50, 100]); 
        const timer = setTimeout(() => { setThirdSetWarning(prev => ({ ...prev, show: false })); }, 6000);
        prevSetRef.current = selectedSet;
        return () => clearTimeout(timer);
      }
    }
    
    prevSetRef.current = selectedSet;
  }, [selectedSet, format, isFinished]);


  // --------------------------------------------------------------------------------
  // KUSURSUZ TENİS MATEMATİĞİ - KURULUMLA BİRLİKTE YENİ SETE GEÇİŞ
  // --------------------------------------------------------------------------------
  useEffect(() => {
    if (selectedSet > 1 && !setupsBySet[selectedSet] && setupsBySet[selectedSet - 1]) {
      const prevSet = selectedSet - 1;
      const prevSetup = setupsBySet[prevSet];
      
      const prevS1 = prevSet === 1 ? s1_p1 : prevSet === 2 ? s2_p1 : s3_p1;
      const prevS2 = prevSet === 1 ? s1_p2 : prevSet === 2 ? s2_p2 : s3_p2;
      const totalGamesPrevSet = prevS1 + prevS2;
      
      if (totalGamesPrevSet > 0) {
        const nextServerTeam = totalGamesPrevSet % 2 === 0 ? prevSetup.firstServingTeam : (prevSetup.firstServingTeam === 1 ? 2 : 1);
        let nextLeftTeam = prevSetup.leftTeam;
        
        const isTBSet = (prevS1 === 7 && prevS2 === 6) || (prevS1 === 6 && prevS2 === 7) || 
                        (prevS1 === 5 && prevS2 === 4 && format.includes('Kısa')) || 
                        (prevS1 === 4 && prevS2 === 5 && format.includes('Kısa'));
        
        if (isTBSet) {
          let tbPointsPlayed = 0; 
          
          if (match.pointHistory && match.pointHistory.length > 0) {
            let maxTbSum = 0;
            for (let i = match.pointHistory.length - 1; i >= 0; i--) {
               const snap = match.pointHistory[i].snapshot;
               if (snap.currentSet === prevSet && snap.isTiebreak) {
                  const sum = snap.tiebreak_p1 + snap.tiebreak_p2;
                  if (sum > maxTbSum) maxTbSum = sum;
               }
            }
            if (maxTbSum > 0) tbPointsPlayed = maxTbSum + 1; 
          }

          if (tbPointsPlayed === 0) {
             if (prevS1 === 5 || prevS2 === 5) tbPointsPlayed = 9; 
             else tbPointsPlayed = 12; 
          }
          
          const pointsBeforeLastPoint = tbPointsPlayed - 1; 
          const gamesBeforeTB = totalGamesPrevSet - 1; 
          
          const tbStartSide = (gamesBeforeTB % 4 === 1 || gamesBeforeTB % 4 === 2) ? (prevSetup.leftTeam === 1 ? 2 : 1) : prevSetup.leftTeam;
          
          let sideDuringLastPoint = tbStartSide;
          let tbSwaps = 0;
          
          if (prevSetup.tbType === 'coman') {
             tbSwaps = Math.floor((pointsBeforeLastPoint + 3) / 4);
          } else {
             tbSwaps = Math.floor(pointsBeforeLastPoint / 6);
          }
          sideDuringLastPoint = tbSwaps % 2 === 1 ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;

          nextLeftTeam = sideDuringLastPoint === 1 ? 2 : 1;

        } else {
          const sideDuringLastGame = ((totalGamesPrevSet - 1) % 4 === 1 || (totalGamesPrevSet - 1) % 4 === 2) ? (prevSetup.leftTeam === 1 ? 2 : 1) : prevSetup.leftTeam;
          const changeEnds = totalGamesPrevSet % 2 !== 0; 
          nextLeftTeam = changeEnds ? (sideDuringLastGame === 1 ? 2 : 1) : sideDuringLastGame;
        }

        let nextT1ServerIdx = prevSetup.t1ServerIdx;
        let nextT2ServerIdx = prevSetup.t2ServerIdx;

        if (isDoubles) {
          const teamServicesT1 = Math.floor(totalGamesPrevSet / 2) + (prevSetup.firstServingTeam === 1 && totalGamesPrevSet % 2 !== 0 ? 1 : 0);
          const teamServicesT2 = Math.floor(totalGamesPrevSet / 2) + (prevSetup.firstServingTeam === 2 && totalGamesPrevSet % 2 !== 0 ? 1 : 0);
          nextT1ServerIdx = (prevSetup.t1ServerIdx + teamServicesT1) % 2 as 0 | 1;
          nextT2ServerIdx = (prevSetup.t2ServerIdx + teamServicesT2) % 2 as 0 | 1;
        }

        setSetupsBySet(prev => ({
          ...prev,
          [selectedSet]: {
            ...prevSetup,
            setupSetNum: selectedSet,
            firstServingTeam: nextServerTeam,
            leftTeam: nextLeftTeam,
            t1ServerIdx: nextT1ServerIdx,
            t2ServerIdx: nextT2ServerIdx
          }
        }));
      }
    }
  }, [selectedSet, isDoubles, setupsBySet, s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2, match.pointHistory, format]);

  const currentSetGames = selectedSet === 1 ? s1_p1 + s1_p2 : selectedSet === 2 ? s2_p1 + s2_p2 : s3_p1 + s3_p2;
  const isTB = state?.isTiebreak || false;
  const tbPoints = isTB ? Number(state?.tiebreak_p1 || 0) + Number(state?.tiebreak_p2 || 0) : 0;
  
  let computedServerTeam: 1 | 2 = 1;
  let computedLeftTeam: 1 | 2 = 1;
  let activeServerName = '';
  let activeReceiverName = '';
  let currentT1ServerIdx: 0 | 1 = 0;
  let currentT2ServerIdx: 0 | 1 = 0;

  // MOTOR SAHA DEĞİŞİMİ TESPİTİ (Puan Girilince Otomatik Kapanır)
  let isSideChangePoint = !!state?.needsChangeover;
  const isGameStart = state?.gamePoint_p1 === '0' && state?.gamePoint_p2 === '0';

  if (isTB) {
    const expectedChange = (isSetupValid && chairSetup.tbType === 'coman') 
      ? (tbPoints > 0 && (tbPoints - 1) % 4 === 0) 
      : (tbPoints > 0 && (tbPoints % 6 === 0));

    if (isSideChangePoint && !expectedChange) {
      isSideChangePoint = false;
    } else if (!isSideChangePoint && expectedChange) {
      isSideChangePoint = true;
    }
  } else {
    if (!isGameStart) {
      isSideChangePoint = false;
    } else {
      if (!isSideChangePoint) {
        if (currentSetGames > 0 && currentSetGames % 2 === 1) {
          isSideChangePoint = true;
        } else if (currentSetGames === 0 && selectedSet > 1) {
          const prevSetGames = selectedSet === 2 ? (s1_p1 + s1_p2) : (s2_p1 + s2_p2);
          if (prevSetGames % 2 === 1) isSideChangePoint = true;
        }
      }
    }
  }

  // --- KUSURSUZ OTOMATİK PİLOT ---
  if (isSetupValid) {
    const isComan = chairSetup.tbType === 'coman';
    const otherTeam = chairSetup.firstServingTeam === 1 ? 2 : 1;

    const parsePoint = (str: string) => {
      if (str === '15') return 1; if (str === '30') return 2; if (str === '40') return 3; if (str === 'A') return 4; return 0;
    };
    const p1Pts = parsePoint(String(state?.gamePoint_p1 || '0'));
    const p2Pts = parsePoint(String(state?.gamePoint_p2 || '0'));
    
    let isDeuceCourt = true;
    if (isTB) isDeuceCourt = tbPoints % 2 === 0;
    else isDeuceCourt = (p1Pts + p2Pts) % 2 === 0;

    if (!isTB) {
      computedServerTeam = currentSetGames % 2 === 0 ? chairSetup.firstServingTeam : otherTeam;
      computedLeftTeam = (currentSetGames % 4 === 1 || currentSetGames % 4 === 2) ? (chairSetup.leftTeam === 1 ? 2 : 1) : chairSetup.leftTeam;
      
      if (isDoubles) {
        const teamServiceRounds = Math.floor(currentSetGames / 2);
        currentT1ServerIdx = (chairSetup.t1ServerIdx + teamServiceRounds) % 2 as 0 | 1;
        currentT2ServerIdx = (chairSetup.t2ServerIdx + teamServiceRounds) % 2 as 0 | 1;
        if (computedServerTeam === 1) activeServerName = t1Players[currentT1ServerIdx] || t1Players[0];
        else activeServerName = t2Players[currentT2ServerIdx] || t2Players[0];
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
        const block = Math.floor((tbPoints - 1 + 3) / 4); 
        computedLeftTeam = block % 2 === 1 ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
      } else {
        const block = Math.floor((tbPoints - 1) / 6); 
        computedLeftTeam = block % 2 === 1 ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
      }

      if (isDoubles) {
        const teamServicesBeforeTB = Math.floor(currentSetGames / 2);
        const tbTeamBlocksT1 = Math.floor((tbPoints + (tbGameServerTeam === 1 ? 3 : 1)) / 4);
        const tbTeamBlocksT2 = Math.floor((tbPoints + (tbGameServerTeam === 2 ? 3 : 1)) / 4);
        
        currentT1ServerIdx = (chairSetup.t1ServerIdx + teamServicesBeforeTB + tbTeamBlocksT1) % 2 as 0 | 1;
        currentT2ServerIdx = (chairSetup.t2ServerIdx + teamServicesBeforeTB + tbTeamBlocksT2) % 2 as 0 | 1;
        
        if (computedServerTeam === 1) activeServerName = t1Players[currentT1ServerIdx] || t1Players[0];
        else activeServerName = t2Players[currentT2ServerIdx] || t2Players[0];
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
  } else {
    // --- DIŞ EKRAN İÇİN MÜTHİŞ OTOMATİK PİLOT (KURULUM OLMADIĞINDA) ---
    let autoServer = 1;
    let autoLeft = 1;
    
    for (let s = 1; s <= selectedSet; s++) {
        if (s === selectedSet) {
            if (!isTB) {
                if (currentSetGames % 2 === 1) autoServer = autoServer === 1 ? 2 : 1;
                const changeInCurrentSet = (currentSetGames % 4 === 1 || currentSetGames % 4 === 2);
                if (changeInCurrentSet) autoLeft = autoLeft === 1 ? 2 : 1;
            } else {
                const tbStartServer = currentSetGames % 2 === 0 ? autoServer : (autoServer === 1 ? 2 : 1);
                if (tbPoints === 0) autoServer = tbStartServer;
                else {
                    const block = Math.floor((tbPoints - 1) / 2);
                    autoServer = block % 2 === 0 ? (tbStartServer === 1 ? 2 : 1) : tbStartServer;
                }
                
                const tbStartSide = (currentSetGames % 4 === 1 || currentSetGames % 4 === 2) ? (autoLeft === 1 ? 2 : 1) : autoLeft;
                if (tbPoints === 0) autoLeft = tbStartSide;
                else {
                    const block = globalTbType === 'coman' ? Math.floor((tbPoints + 3) / 4) : Math.floor(tbPoints / 6);
                    autoLeft = block % 2 === 1 ? (tbStartSide === 1 ? 2 : 1) : tbStartSide;
                }
            }
        } else {
            const ps1 = s === 1 ? s1_p1 : s === 2 ? s2_p1 : s3_p1;
            const ps2 = s === 1 ? s1_p2 : s === 2 ? s2_p2 : s3_p2;
            const N = ps1 + ps2;
            
            if (N === 0) continue;
            
            if (N % 2 === 1) autoServer = autoServer === 1 ? 2 : 1;
            
            const isTBSet = (ps1 === 7 && ps2 === 6) || (ps1 === 6 && ps2 === 7) || (ps1 === 5 && ps2 === 4 && format.includes('Kısa')) || (ps1 === 4 && ps2 === 5 && format.includes('Kısa'));
            
            if (isTBSet) {
                let tbPointsPlayed = 0; 
                if (match.pointHistory) {
                    let maxTbSum = 0;
                    for (let i = match.pointHistory.length - 1; i >= 0; i--) {
                       const snap = match.pointHistory[i].snapshot;
                       if (snap.currentSet === s && snap.isTiebreak) {
                          const sum = snap.tiebreak_p1 + snap.tiebreak_p2;
                          if (sum > maxTbSum) maxTbSum = sum;
                       }
                    }
                    if (maxTbSum > 0) tbPointsPlayed = maxTbSum + 1; 
                }
                
                if (tbPointsPlayed === 0) {
                    if (ps1 === 5 || ps2 === 5) tbPointsPlayed = 9;  
                    else tbPointsPlayed = 12;
                }

                let tbSwaps = 0;
                if (tbPointsPlayed > 0) {
                    tbSwaps = globalTbType === 'coman' ? Math.floor((tbPointsPlayed - 1 + 3) / 4) : Math.floor((tbPointsPlayed - 1) / 6);
                }

                const normalSwapsBeforeTB = Math.floor((N - 1) / 2); 
                const endOfSetSwap = N % 2 === 1 ? 1 : 0;
                
                const totalSwaps = normalSwapsBeforeTB + tbSwaps + endOfSetSwap;
                if (totalSwaps % 2 === 1) autoLeft = autoLeft === 1 ? 2 : 1;
            } else {
                const totalSwaps = Math.floor(N / 2) + (N % 2 === 1 ? 1 : 0);
                if (totalSwaps % 2 === 1) autoLeft = autoLeft === 1 ? 2 : 1;
            }
        }
    }
    
    computedServerTeam = autoServer;
    computedLeftTeam = autoLeft;
  }

  const leftTeamId = computedLeftTeam;
  const rightTeamId = computedLeftTeam === 1 ? 2 : 1;

  useEffect(() => {
    if (showSetupOverlay && setupForm.firstServingTeam === null) {
      setSetupForm({
        firstServingTeam: computedServerTeam,
        leftTeam: computedLeftTeam,
        tbType: chairSetup?.tbType || globalTbType,
        t1ServerIdx: currentT1ServerIdx as 0 | 1,
        t2ServerIdx: currentT2ServerIdx as 0 | 1,
        t1RecIdx: chairSetup?.t1DeuceReceiverIdx || 0,
        t2RecIdx: chairSetup?.t2DeuceReceiverIdx || 0
      });
    }
  }, [showSetupOverlay, setupForm.firstServingTeam, computedServerTeam, computedLeftTeam, chairSetup, globalTbType, currentT1ServerIdx, currentT2ServerIdx]);

  // AKILLI MOLA UYARI MOTORU
  const isSetBreak = isGameStart && currentSetGames === 0 && selectedSet > 1 && !isFinished;
  const isFirstGameChange = !isTB && currentSetGames === 1 && isGameStart;
  
  const shouldBlink120s = isSetBreak && !isPaused && !activeTimer;
  const shouldBlink90s = isSideChangePoint && !isFirstGameChange && !isSetBreak && !isTB && !isFinished && !isPaused && !activeTimer;

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
    setSetupForm(prev => ({ ...prev, firstServingTeam: null, leftTeam: null }));
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
          const block = Math.floor((tbPoints - 1 + 3) / 4); 
          tbStartSide = block % 2 === 1 ? (setupForm.leftTeam === 1 ? 2 : 1) : setupForm.leftTeam;
        } else {
          const block = Math.floor((tbPoints - 1) / 6); 
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
    setSetupForm(prev => ({ ...prev, firstServingTeam: null, leftTeam: null }));
  };

  useEffect(() => {
    let interval: any;
    let timeout: any;
    if (activeTimer) {
      if (activeTimer.seconds > 0) {
        interval = setInterval(() => {
          setActiveTimer((prev) => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
        }, 1000);
      } else {
        timeout = setTimeout(() => setActiveTimer(null), 2000);
      }
    }
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [activeTimer]);

  const handleQuickScore = (e: React.MouseEvent, player: 1 | 2, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    vibrateDevice(40); 
    updateGameScore(match.id, selectedSet, player, delta);
  };

  const handlePointScore = (e: React.MouseEvent, teamId: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    vibrateDevice(50); 
    setFirstFault(false); 
    awardPointToMatch(match.id, teamId, 'NORMAL'); 
  };

  const handleFault = (e: React.MouseEvent, serverTeamId: 1 | 2) => {
    e.preventDefault();
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

  const baseCardClass = `rounded-3xl transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-md relative ${
    isLive || isPaused ? (isLightMode ? 'bg-white border-[3px] border-emerald-500' : 'bg-slate-900/95 border border-emerald-500/30')
    : isUpcoming ? (isLightMode ? 'bg-slate-50 border-2 border-slate-300 cursor-pointer hover:border-slate-400' : 'bg-slate-900 border border-slate-700 cursor-pointer')
    : (isLightMode ? 'bg-slate-100 border border-slate-300' : 'bg-slate-900/50 border border-slate-800')
  }`;

  return (
    <>
      {thirdSetWarning.show && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/95 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300" style={{ touchAction: 'none' }}>
          <div className={`border-4 rounded-3xl p-6 sm:p-8 w-full max-w-lg text-center shadow-xl ${isLightMode ? 'bg-white border-amber-500' : 'bg-slate-900 border-amber-500'}`}>
            <span className="text-6xl sm:text-7xl mb-3 sm:mb-4 block">⚠️</span>
            <div className="text-amber-500 font-extrabold text-sm sm:text-base tracking-widest mb-1">{match.Kort}</div>
            <h2 className={`text-2xl sm:text-4xl font-black uppercase tracking-widest mb-4 ${isLightMode ? 'text-slate-900' : 'text-amber-500'}`}>3. SETE GEÇİLİYOR</h2>
            <p className={`text-base sm:text-xl font-bold mb-2 ${isLightMode ? 'text-slate-800' : 'text-white'}`}>Lütfen planlanan maça formatına dikkat ediniz:</p>
            <div className={`rounded-2xl p-4 sm:p-5 my-4 sm:my-6 ${isLightMode ? 'bg-amber-100 border border-amber-400' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              <span className={`text-lg sm:text-2xl font-black ${isLightMode ? 'text-amber-800' : 'text-amber-400'}`}>{thirdSetWarning.text}</span>
            </div>
            <p className={`text-xs sm:text-sm mb-6 sm:mb-8 font-medium px-2 sm:px-4 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>Yanlışlık olduğunu düşünüyorsanız, Ayarlar (⚙️) menüsünden formatı düzeltebilirsiniz.</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setThirdSetWarning({show: false, text: ''}); }}
              className={`w-full py-4 sm:py-5 font-black text-base sm:text-xl rounded-2xl shadow-md transition active:scale-95 ${isLightMode ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}`}
            >
              Anladım, Maça Dön
            </button>
          </div>
        </div>
      )}

      {/* 1. DIŞ EKRAN / HIZLI KART GÖRÜNÜMÜ */}
      <div onClick={handleCardClick} className={baseCardClass}>
        <div className={`h-1.5 w-full ${isLive ? 'bg-emerald-500' : isPaused ? 'bg-amber-500' : isUpcoming ? 'bg-slate-400' : 'bg-slate-300'}`} />

        <div className={`px-4 sm:px-5 pt-4 pb-2 flex items-center justify-between border-b ${isLightMode ? 'border-slate-300' : 'border-slate-800/80'}`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border ${isLive || isPaused ? (isLightMode ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30') : isUpcoming ? (isLightMode ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700') : (isLightMode ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-slate-800/50 text-slate-500 border-slate-700')}`}>
              {match.Kort.replace('KORT', 'K').trim()}
            </span>
            <div className="min-w-0">
              <h3 className={`font-extrabold text-base sm:text-lg flex items-center gap-1.5 truncate ${isLightMode ? 'text-black' : 'text-white'}`}>
                <span>{match.Kort}</span>
                {isLive && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 border ${isLightMode ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>CANLI</span>}
              </h3>
              <p className={`text-xs font-bold truncate max-w-[180px] ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{match.Kategori}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black tracking-wide uppercase shrink-0 border ${isLive ? (isLightMode ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30') : isPaused ? (isLightMode ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30') : isUpcoming ? (isLightMode ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700') : (isLightMode ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-slate-800 text-slate-500 border-slate-700')}`}>
            {match.Durum === 'Retired' ? '✕ RET' : match.Durum === 'Walkover' ? '✕ W/O' : match.Durum === 'Bitti' ? '✕ BİTTİ' : match.Durum === 'Duraklatildi' ? 'ASKIYA' : match.Durum}
          </span>
        </div>

        <div className={`px-4 sm:px-5 py-2.5 sm:py-3 border-b flex items-center justify-between font-mono ${isLightMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-950/50 border-slate-800/80'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${isLightMode ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-800/50 border-slate-700/50 text-slate-400'}`}>
              <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`} />
              {match.Saat && (
                <span className={`font-black text-sm sm:text-lg tracking-widest ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>
                  {match.Saat}
                </span>
              )}
            </div>
            
            {(isLive || isPaused || isFinished) && (
               <div className={`flex flex-col justify-center border-l pl-2 sm:pl-3 ${isLightMode ? 'border-slate-300' : 'border-slate-700/80'}`}>
                 <span className={`text-[9px] sm:text-[10px] font-bold uppercase leading-none mb-0.5 ${isLightMode ? 'text-slate-600' : 'text-slate-500'}`}>Fiili Başlama</span>
                 <strong className={`text-xs sm:text-sm leading-none font-black ${isLightMode ? 'text-slate-900' : 'text-slate-300'}`}>{match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi' ? match.Baslangic_Saati : '--:--'}</strong>
               </div>
            )}
          </div>
          <div className={`font-sans text-[11px] sm:text-xs font-black truncate pl-2 max-w-[120px] sm:max-w-[150px] text-right leading-tight ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>
            {match.Skor_Formati}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div className={`rounded-2xl border overflow-hidden ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-800/90'}`}>
            <div className={`grid grid-cols-12 text-[10px] font-black uppercase py-1.5 px-3 border-b ${isLightMode ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-900/80 text-slate-400 border-slate-800'}`}>
              <div className="col-span-6">Oyuncu / Takım</div><div className="col-span-2 text-center">1. Set</div><div className="col-span-2 text-center">2. Set</div><div className="col-span-2 text-center">3. Set</div>
            </div>
            
            <div className={`grid grid-cols-12 items-center py-2 px-3 border-b ${isLightMode ? 'border-slate-200' : 'border-slate-800/50'} ${match.Kazanan === match['Oyuncu 1'] && isFinished ? (isLightMode ? 'bg-green-100' : 'bg-emerald-500/10') : ''}`}>
              <div className="col-span-6 flex items-center gap-2 pr-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLightMode ? 'bg-green-600' : 'bg-emerald-400'}`}></span>
                <span className={`text-xs sm:text-sm font-black leading-tight flex items-center gap-1.5 min-w-0 flex-1 ${isLightMode ? 'text-green-800' : 'text-white'}`}>
                    {computedServerTeam === 1 && computedLeftTeam === 1 && (isLive || isPaused) && (
                        <span className="animate-bounce text-[10px] sm:text-xs shrink-0" title="Servis Atan (Sol Saha)">🎾</span>
                    )}
                    <span className="truncate">{match['Oyuncu 1']}</span>
                    {computedServerTeam === 1 && computedLeftTeam !== 1 && (isLive || isPaused) && (
                        <span className="animate-bounce text-[10px] sm:text-xs shrink-0" title="Servis Atan (Sağ Saha)">🎾</span>
                    )}
                </span>
              </div>
              <div className={`col-span-2 text-center font-mono font-black ${isLightMode ? 'text-green-800' : 'text-emerald-400'}`}>{isUpcoming ? '-' : s1_p1}</div><div className={`col-span-2 text-center font-mono font-black ${isLightMode ? 'text-green-800' : 'text-emerald-400'}`}>{isUpcoming ? '-' : s2_p1}</div><div className={`col-span-2 text-center font-mono font-black ${isLightMode ? 'text-green-800' : 'text-emerald-400'}`}>{isUpcoming ? '-' : s3_p1}</div>
            </div>
            
            <div className={`grid grid-cols-12 items-center py-2 px-3 ${match.Kazanan === match['Oyuncu 2'] && isFinished ? (isLightMode ? 'bg-blue-100' : 'bg-blue-500/10') : ''}`}>
              <div className="col-span-6 flex items-center gap-2 pr-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLightMode ? 'bg-blue-600' : 'bg-blue-400'}`}></span>
                <span className={`text-xs sm:text-sm font-black leading-tight flex items-center gap-1.5 min-w-0 flex-1 ${isLightMode ? 'text-blue-800' : 'text-white'}`}>
                    {computedServerTeam === 2 && computedLeftTeam === 2 && (isLive || isPaused) && (
                        <span className="animate-bounce text-[10px] sm:text-xs shrink-0" title="Servis Atan (Sol Saha)">🎾</span>
                    )}
                    <span className="truncate">{match['Oyuncu 2']}</span>
                    {computedServerTeam === 2 && computedLeftTeam !== 2 && (isLive || isPaused) && (
                        <span className="animate-bounce text-[10px] sm:text-xs shrink-0" title="Servis Atan (Sağ Saha)">🎾</span>
                    )}
                </span>
              </div>
              <div className={`col-span-2 text-center font-mono font-black ${isLightMode ? 'text-blue-800' : 'text-blue-400'}`}>{isUpcoming ? '-' : s1_p2}</div><div className={`col-span-2 text-center font-mono font-black ${isLightMode ? 'text-blue-800' : 'text-blue-400'}`}>{isUpcoming ? '-' : s2_p2}</div><div className={`col-span-2 text-center font-mono font-black ${isLightMode ? 'text-blue-800' : 'text-blue-400'}`}>{isUpcoming ? '-' : s3_p2}</div>
            </div>
          </div>

          {(isLive || isPaused) && (
            <div className={`border rounded-2xl p-3 mt-2 ${isLightMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700/80'}`}>
              <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsChairMode(true); 
                  if (!isSetupValid) {
                     setSetupForm({
                        firstServingTeam: computedServerTeam,
                        leftTeam: computedLeftTeam,
                        tbType: globalTbType,
                        t1ServerIdx: currentT1ServerIdx as 0|1,
                        t2ServerIdx: currentT2ServerIdx as 0|1,
                        t1RecIdx: 0,
                        t2RecIdx: 0
                     });
                  }
                }} 
                className={`w-full py-3 mb-3 font-black rounded-xl transition active:scale-95 flex items-center justify-center gap-2 shadow-sm ${isLightMode ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                <Swords className="w-4 h-4" /> Kule Hakemi Moduna Geç
              </button>

              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className={`flex p-1 rounded-xl mb-3 border ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-800'}`}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedSet(1); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedSet === 1 ? (isLightMode ? 'bg-slate-800 text-white shadow' : 'bg-slate-800 text-white shadow') : (isLightMode ? 'text-slate-600 hover:text-slate-800' : 'text-slate-400 hover:text-slate-300')}`}>1. SET</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedSet(2); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedSet === 2 ? (isLightMode ? 'bg-slate-800 text-white shadow' : 'bg-slate-800 text-white shadow') : (isLightMode ? 'text-slate-600 hover:text-slate-800' : 'text-slate-400 hover:text-slate-300')}`}>2. SET</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedSet(3); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedSet === 3 ? (isLightMode ? 'bg-slate-800 text-white shadow' : 'bg-slate-800 text-white shadow') : (isLightMode ? 'text-slate-600 hover:text-slate-800' : 'text-slate-400 hover:text-slate-300')}`}>3. SET</button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* DIŞ EKRAN - OYUNCU 1 BUTONLARI */}
                  <div className={`flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-xl border ${isLightMode ? 'bg-green-50 border-green-300' : 'bg-emerald-950/20 border-emerald-500/20'}`}>
                    <div className={`text-center font-black text-[11px] sm:text-xs truncate ${isLightMode ? 'text-green-800' : 'text-emerald-400'}`}>
                      {match['Oyuncu 1']}
                    </div>
                    <button type="button" disabled={isP1PlusDisabled} onClick={(e) => handleQuickScore(e, 1, 1)} className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${isLightMode ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'}`}>
                      <Plus className="w-5 h-5" />+1 OYUN
                    </button>
                    <button type="button" disabled={isPaused} onClick={(e) => handleQuickScore(e, 1, -1)} className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition disabled:opacity-50 border ${isLightMode ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}>
                      <RotateCcw className="w-3.5 h-3.5" /> Geri Al
                    </button>
                  </div>
                  
                  {/* DIŞ EKRAN - OYUNCU 2 BUTONLARI */}
                  <div className={`flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-xl border ${isLightMode ? 'bg-blue-50 border-blue-300' : 'bg-blue-950/20 border-blue-500/20'}`}>
                    <div className={`text-center font-black text-[11px] sm:text-xs truncate ${isLightMode ? 'text-blue-800' : 'text-blue-400'}`}>
                      {match['Oyuncu 2']}
                    </div>
                    <button type="button" disabled={isP2PlusDisabled} onClick={(e) => handleQuickScore(e, 2, 1)} className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${isLightMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' : 'bg-blue-600/90 hover:bg-blue-500 text-white'}`}>
                      <Plus className="w-5 h-5" />+1 OYUN
                    </button>
                    <button type="button" disabled={isPaused} onClick={(e) => handleQuickScore(e, 2, -1)} className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition disabled:opacity-50 border ${isLightMode ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}>
                      <RotateCcw className="w-3.5 h-3.5" /> Geri Al
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`p-3 sm:p-4 border-t flex items-center gap-2 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
          {isUpcoming ? (
            <div className="flex items-center gap-2 w-full">
              {onOpenSetup && <button type="button" onClick={(e) => { e.stopPropagation(); onOpenSetup(match); }} className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition shadow-sm ${isLightMode ? 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`} title="Kura Çek">🪙 Kura</button>}
              
              {onEditScore && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onEditScore(match); }} className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 shadow-sm ${isLightMode ? 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`} title="Hızlı Skor Gir">
                  <PenLine className="w-3.5 h-3.5" /> Skor
                </button>
              )}

              <button type="button" onClick={handleStartMatchDirect} className={`flex-1 py-2.5 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md ${isLightMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}><PlayCircle className="w-4 h-4" /> Maçı Başlat</button>
            </div>
          ) : isLive || isPaused ? (
            <div className="flex items-center gap-2 w-full">
              {onOpenSetup && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onOpenSetup(match); }} className={`h-12 w-12 flex items-center justify-center shrink-0 border rounded-xl transition active:scale-95 shadow-sm ${isLightMode ? 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`} title="Maç Formatı ve Kura Ayarları">
                  <Settings className="w-5 h-5" />
                </button>
              )}
              
              {onEditScore && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onEditScore(match); }} className={`h-12 w-12 flex items-center justify-center shrink-0 border rounded-xl transition active:scale-95 shadow-sm ${isLightMode ? 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`} title="Doğrudan Skor Düzenle">
                  <PenLine className="w-5 h-5" />
                </button>
              )}

              <button type="button" onClick={(e) => { e.stopPropagation(); onFinishMatch(match); }} className={`flex-1 h-12 font-black text-sm rounded-xl flex justify-center items-center gap-2 transition active:scale-95 shadow-md ${isLightMode ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}><Trophy className={`w-4 h-4 ${isLightMode ? 'text-amber-400' : 'text-slate-400'}`} /> Maçı Sonlandır</button>
            </div>
          ) : null}
        </div>
      </div>

      {/* 2. KULE HAKEMİ MODU (TAM EKRANLI İÇ DETAY) */}
      {isChairMode && (
        <div className={`fixed inset-0 z-[50000] flex flex-col animate-in fade-in zoom-in-95 duration-200 select-none ${isLightMode ? 'bg-white' : 'bg-slate-950'}`}>
          
          {toastMessage && (
            <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-[50000] px-5 py-3 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-3 ${isLightMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-800 text-white border-slate-700'}`}>
              <Info className="w-5 h-5 shrink-0 text-amber-400" />
              <span className="font-bold text-[11px] sm:text-sm">{toastMessage}</span>
            </div>
          )}

          <div className={`border-b px-3 sm:px-4 py-3 flex items-center justify-between shrink-0 ${isLightMode ? 'bg-slate-100 border-slate-300 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 border ${isLightMode ? 'bg-slate-900 text-white border-slate-700 shadow-md' : 'bg-slate-800 text-white border-slate-700'}`}>
                {match.Kort.replace('KORT', 'K').trim()}
              </span>
              <div className="flex flex-col">
                <span className={`font-black text-sm sm:text-base leading-none mb-1 ${isLightMode ? 'text-black' : 'text-white'}`}>Kule Hakemi</span>
                <span className={`text-[9px] sm:text-[10px] font-black tracking-widest uppercase flex items-center gap-1 ${isLightMode ? 'text-green-700' : 'text-emerald-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${isLightMode ? 'bg-green-600' : 'bg-emerald-400'}`}></span>Canlı</span>
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
                  }} className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition flex items-center gap-1.5 font-bold shadow-sm ${isLightMode ? 'bg-white text-slate-800 hover:bg-slate-200 border-slate-400' : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'}`} title="Saha ve Servis Rotasyonunu Düzenle">
                    <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline text-xs font-bold">Rotasyon</span>
                  </button>
                )}
                {onOpenSetup && (
                  <button type="button" onClick={(e) => { 
                    e.stopPropagation(); 
                    onOpenSetup(match); 
                    showToast('Ayarlara geçmek için lütfen Kule Hakemi modundan çıkış yapınız.');
                  }} className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition flex items-center gap-1.5 font-bold shadow-sm ${isLightMode ? 'bg-white text-slate-800 hover:bg-slate-200 border-slate-400' : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'}`} title="Maç Formatı ve Kura Ayarları">
                    <Settings className="w-4 h-4" /> <span className="hidden sm:inline text-xs font-bold">Kurulum</span>
                  </button>
                )}

                <button onClick={toggleTheme} className={`p-2 rounded-xl border transition flex items-center justify-center shadow-sm ${isLightMode ? 'bg-white hover:bg-slate-200 border-slate-400 text-amber-600' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'}`} title="Temayı Değiştir">
                  {isLightMode ? <Sun className="w-5 h-5 font-black" /> : <Moon className="w-5 h-5" />}
                </button>

                <button type="button" onClick={handleExitChairMode} className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 border shadow-md ${isLightMode ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-800' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'}`}>
                  <LogOut className="w-4 h-4" /> Çıkış Yap
                </button>
            </div>
          </div>

          <div className="flex-1 p-2 sm:p-6 w-full max-w-5xl mx-auto flex flex-col justify-center gap-3 overflow-y-auto">
              
              {showSetupOverlay ? (
                <div className={`p-4 sm:p-6 rounded-3xl border text-center space-y-4 sm:space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 ${isLightMode ? 'bg-white border-slate-400' : 'bg-slate-900 border-slate-800'}`}>
                  
                  <button 
                    type="button" 
                    onClick={handleCancelSetup} 
                    className={`absolute top-4 right-4 p-2.5 rounded-xl border transition active:scale-95 flex items-center justify-center ${isLightMode ? 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'}`}
                    title="İptal Et / Kapat"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div>
                    <h4 className={`font-black text-base sm:text-xl mb-1 sm:mb-2 flex items-center justify-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}>⚙️ {selectedSet}. Set Anlık Kurulumu</h4>
                    <p className={`text-[11px] sm:text-sm font-bold ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>Lütfen sahadaki <strong>ŞU ANKİ</strong> durumu seçin. Sistem geri kalanını hesaplar.</p>
                  </div>
                  
                  {isDoubles ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border flex flex-col gap-3 shadow-sm ${isLightMode ? 'bg-green-50 border-green-400' : 'bg-slate-950 border-slate-800'}`}>
                         <h5 className={`font-black text-sm uppercase mb-1 ${isLightMode ? 'text-green-800' : 'text-emerald-400'}`}>1. Takım</h5>
                         <div className="text-left">
                           <label className={`text-[10px] font-black uppercase block mb-1.5 ${isLightMode ? 'text-green-700' : 'text-slate-500'}`}>Şu Anki (Sıradaki) Servisçi:</label>
                           <div className="flex gap-2">
                             {t1Players.map((player, idx) => (
                                <button key={`s1-${idx}`} type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, t1ServerIdx: idx as 0|1}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition border shadow-sm ${setupForm.t1ServerIdx === idx ? 'bg-green-600 border-green-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-300')}`}>{player.split(' ')[0]}</button>
                             ))}
                           </div>
                         </div>
                         <div className="text-left">
                           <label className={`text-[10px] font-black uppercase block mb-1.5 ${isLightMode ? 'text-green-700' : 'text-slate-500'}`}>Sağda (Berabere) Karşılayan Kişi:</label>
                           <div className="flex gap-2">
                             {t1Players.map((player, idx) => (
                                <button key={`r1-${idx}`} type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, t1RecIdx: idx as 0|1}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition border shadow-sm ${setupForm.t1RecIdx === idx ? 'bg-green-600 border-green-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-300')}`}>{player.split(' ')[0]}</button>
                             ))}
                           </div>
                         </div>
                      </div>

                      <div className={`p-4 rounded-2xl border flex flex-col gap-3 shadow-sm ${isLightMode ? 'bg-blue-50 border-blue-400' : 'bg-slate-950 border-slate-800'}`}>
                         <h5 className={`font-black text-sm uppercase mb-1 ${isLightMode ? 'text-blue-800' : 'text-blue-400'}`}>2. Takım</h5>
                         <div className="text-left">
                           <label className={`text-[10px] font-black uppercase block mb-1.5 ${isLightMode ? 'text-blue-700' : 'text-slate-500'}`}>Şu Anki (Sıradaki) Servisçi:</label>
                           <div className="flex gap-2">
                             {t2Players.map((player, idx) => (
                                <button key={`s2-${idx}`} type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, t2ServerIdx: idx as 0|1}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition border shadow-sm ${setupForm.t2ServerIdx === idx ? 'bg-blue-600 border-blue-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-300')}`}>{player.split(' ')[0]}</button>
                             ))}
                           </div>
                         </div>
                         <div className="text-left">
                           <label className={`text-[10px] font-black uppercase block mb-1.5 ${isLightMode ? 'text-blue-700' : 'text-slate-500'}`}>Sağda (Berabere) Karşılayan Kişi:</label>
                           <div className="flex gap-2">
                             {t2Players.map((player, idx) => (
                                <button key={`r2-${idx}`} type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, t2RecIdx: idx as 0|1}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition border shadow-sm ${setupForm.t2RecIdx === idx ? 'bg-blue-600 border-blue-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-300')}`}>{player.split(' ')[0]}</button>
                             ))}
                           </div>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-slate-500'}`}>Şu An Servisi Kim Atıyor?</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, firstServingTeam: 1}); }} className={`flex-1 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 border-2 shadow-md ${setupForm.firstServingTeam === 1 ? 'bg-green-600 border-green-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100' : 'bg-slate-950 border-slate-800 text-slate-300')}`}>
                          {setupForm.firstServingTeam === 1 && <span className="animate-bounce mr-2">🎾</span>}{match['Oyuncu 1']}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, firstServingTeam: 2}); }} className={`flex-1 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 border-2 shadow-md ${setupForm.firstServingTeam === 2 ? 'bg-blue-600 border-blue-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100' : 'bg-slate-950 border-slate-800 text-slate-300')}`}>
                          {setupForm.firstServingTeam === 2 && <span className="animate-bounce mr-2">🎾</span>}{match['Oyuncu 2']}
                        </button>
                      </div>
                    </div>
                  )}

                  {isDoubles && (
                    <div className={`space-y-2 pt-3 border-t ${isLightMode ? 'border-slate-300' : 'border-slate-800/80'}`}>
                      <div className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-slate-500'}`}>Genel: Şu An Hangi Takım Servis Atıyor?</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, firstServingTeam: 1}); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition border-2 shadow-sm ${setupForm.firstServingTeam === 1 ? 'bg-green-600 border-green-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300')}`}>1. Takım</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, firstServingTeam: 2}); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition border-2 shadow-sm ${setupForm.firstServingTeam === 2 ? 'bg-blue-600 border-blue-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300')}`}>2. Takım</button>
                      </div>
                    </div>
                  )}

                  <div className={`space-y-2 pt-3 border-t ${isLightMode ? 'border-slate-300' : 'border-slate-800/80'}`}>
                    <div className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-slate-500'}`}>Şu An Sandalyenin Solunda Kim (Hangi Takım) Var?</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, leftTeam: 1}); }} className={`flex-1 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 border-2 shadow-md ${setupForm.leftTeam === 1 ? 'bg-green-600 border-green-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300')}`}>{isDoubles ? '1. Takım' : match['Oyuncu 1']}</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, leftTeam: 2}); }} className={`flex-1 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 border-2 shadow-md ${setupForm.leftTeam === 2 ? 'bg-blue-600 border-blue-800 text-white' : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300')}`}>{isDoubles ? '2. Takım' : match['Oyuncu 2']}</button>
                    </div>
                  </div>

                  <div className={`space-y-2 pt-3 border-t ${isLightMode ? 'border-slate-300' : 'border-slate-800/80'}`}>
                    <div className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-slate-500'}`}>Tie-Break Kuralı</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, tbType: 'standard'}); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition active:scale-95 border-2 shadow-md ${setupForm.tbType === 'standard' ? (isLightMode ? 'bg-slate-900 border-black text-white' : 'bg-slate-700 border-slate-600 text-white') : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-400')}`}>Standart (6'da Bir)</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSetupForm({...setupForm, tbType: 'coman'}); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition active:scale-95 border-2 shadow-md ${setupForm.tbType === 'coman' ? (isLightMode ? 'bg-slate-900 border-black text-white' : 'bg-slate-700 border-slate-600 text-white') : (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-400')}`}>Coman (1-5-9)</button>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={handleCancelSetup} className={`px-5 py-4 sm:py-5 font-black text-sm sm:text-lg rounded-xl transition active:scale-95 border shadow-md ${isLightMode ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'}`}>İptal</button>
                    <button type="button" disabled={!setupForm.firstServingTeam || !setupForm.leftTeam || (isDoubles && (setupForm.t1ServerIdx === undefined || setupForm.t2ServerIdx === undefined))} onClick={handleSaveSetup} className={`flex-1 py-4 sm:py-5 font-black text-sm sm:text-lg rounded-xl disabled:opacity-50 transition active:scale-95 shadow-xl ${isLightMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-800' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>Kaydet ve Devam Et</button>
                  </div>
                </div>
              ) : (
                
                <div className="flex flex-col h-full gap-2 sm:gap-4">
                  <div className={`flex flex-col sm:flex-row justify-between items-center rounded-2xl px-3 sm:px-4 py-2 sm:py-3 border gap-2 shrink-0 shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex flex-col items-center sm:flex-row gap-2 sm:gap-3 text-[10px] sm:text-sm font-bold w-full sm:w-auto">
                      
                      <div className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl border shadow-inner ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-800'}`}>
                        <span className={`font-black text-xs sm:text-sm tracking-wider uppercase ${isLightMode ? 'text-black' : 'text-slate-300'}`}>{selectedSet}. SET</span>
                        {selectedSet > 1 && (
                          <div className="flex items-center gap-2.5 mt-1 text-xs sm:text-sm font-mono">
                            {selectedSet >= 2 && <span className={`font-bold ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`}>S1: <strong className={isLightMode ? 'text-slate-900' : 'text-slate-300'}>{s1_p1}-{s1_p2}</strong></span>}
                            {selectedSet >= 3 && <span className={`font-bold ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`}>S2: <strong className={isLightMode ? 'text-slate-900' : 'text-slate-300'}>{s2_p1}-{s2_p2}</strong></span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full justify-center">
                        <span className={`font-black truncate max-w-[90px] sm:max-w-[150px] ${isLightMode ? 'text-green-700' : 'text-emerald-400'}`}>{String(match['Oyuncu 1'] || '')}</span>
                        <span className={`font-mono text-lg sm:text-3xl font-black px-3 py-1 rounded-xl border shadow-inner ${isLightMode ? 'bg-white border-slate-400 text-black' : 'bg-slate-950 border-slate-800 text-white'}`}>
                          {currentSetP1Games} - {currentSetP2Games}
                        </span>
                        <span className={`font-black truncate max-w-[90px] sm:max-w-[150px] ${isLightMode ? 'text-blue-700' : 'text-blue-400'}`}>{String(match['Oyuncu 2'] || '')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                       {isTB && <div className={`px-2 sm:px-3 py-1 text-[9px] sm:text-xs font-black uppercase rounded-lg border ${isLightMode ? 'bg-slate-200 text-slate-800 border-slate-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{chairSetup.tbType === 'coman' ? 'Coman Tie-Break' : 'Standart Tie-Break'}</div>}
                       {isSideChangePoint && <div className={`flex items-center gap-1.5 font-black text-[9px] sm:text-sm uppercase px-2 sm:px-3 py-1 rounded-lg border shadow-sm text-white bg-rose-500 border-rose-600 ${!activeTimer ? 'animate-pulse' : ''}`}><ArrowRightLeft className="w-3 h-3 sm:w-4 sm:h-4"/> Saha Değişimi</div>}
                    </div>
                  </div>

                  {activeTimer && (
                    <div className={`border p-2 sm:p-4 rounded-2xl flex items-center justify-between shrink-0 shadow-md ${isLightMode ? 'bg-white border-slate-400' : 'bg-slate-800 border-slate-700'}`}>
                      <span className={`font-black text-sm sm:text-base flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-slate-300'}`}><Timer className="w-4 h-4 sm:w-5 sm:h-5" />{activeTimer.label}</span>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className={`font-mono font-black text-2xl sm:text-4xl ${activeTimer.seconds <= 15 ? 'text-rose-600 animate-pulse' : (isLightMode ? 'text-slate-900' : 'text-slate-200')}`}>
                          {Math.floor(activeTimer.seconds / 60)}:{(activeTimer.seconds % 60).toString().padStart(2, '0')}
                        </span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setActiveTimer(null); }} className={`p-2 rounded-xl transition ${isLightMode ? 'bg-slate-100 text-slate-600 hover:text-black hover:bg-slate-200 border border-slate-300' : 'text-slate-400 hover:text-slate-200 bg-slate-900'}`}><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 sm:gap-6 flex-1 min-h-0">
                    <div className={`rounded-3xl p-2 sm:p-5 flex flex-col justify-between overflow-hidden transition-all duration-300 ${computedServerTeam === leftTeamId ? (isLightMode ? 'bg-white border-[5px] border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]' : 'bg-slate-800/40 border-[4px] border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.15)]') : (isLightMode ? 'bg-slate-50 border-2 border-slate-300' : 'bg-slate-900 border-2 border-slate-800')}`}>
                      <div className={`flex flex-col items-center justify-center min-h-[4rem] sm:min-h-[5.5rem] border-b pb-2 mb-2 ${isLightMode ? 'border-slate-300' : 'border-slate-800/80'}`}>
                        <div className={`flex items-start justify-center gap-1 w-full ${leftTeamId === 1 ? (isLightMode ? 'text-green-700' : 'text-emerald-400') : (isLightMode ? 'text-blue-700' : 'text-blue-400')}`}>
                           {computedServerTeam === leftTeamId && (
                             <div className="flex flex-col items-center justify-center shrink-0 mr-1 sm:mr-2">
                               <span className="text-xs sm:text-xl animate-bounce drop-shadow-sm">🎾</span>
                               <span className={`text-[8px] sm:text-[10px] font-black uppercase mt-1 ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`}>Servis</span>
                             </div>
                           )}
                           <div className="flex flex-col items-center">
                             <span className="font-black text-xs sm:text-2xl text-center leading-tight line-clamp-3 break-words whitespace-normal px-1">
                               {isDoubles ? String(match[`Oyuncu ${leftTeamId}` as keyof MatchItem] || '') : (leftTeamId === computedServerTeam ? activeServerName : String(match[`Oyuncu ${leftTeamId}` as keyof MatchItem] || ''))}
                             </span>
                             <div className="flex flex-wrap justify-center gap-1 mt-1">
                               {isDoubles && computedServerTeam === leftTeamId && (
                                 <span className={`text-[9px] sm:text-xs px-2 py-0.5 rounded font-black uppercase border shadow-sm ${isLightMode ? 'bg-white text-black border-slate-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>Servis: {activeServerName.split(' ')[0]}</span>
                               )}
                               {isDoubles && computedServerTeam !== leftTeamId && (
                                 <span className={`text-[9px] sm:text-xs px-2 py-0.5 rounded font-black uppercase border shadow-sm ${isLightMode ? 'bg-white text-black border-slate-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>Karşılama: {activeReceiverName.split(' ')[0]}</span>
                               )}
                             </div>
                           </div>
                        </div>
                        <div className={`text-[9px] sm:text-xs uppercase font-black mt-1 ${isLightMode ? 'text-slate-600' : 'text-slate-500'}`}>Sol Saha</div>
                      </div>
                      
                      <div className="flex-1 flex justify-center items-center py-2 sm:py-4 min-h-0">
                         <span className={`text-[4.5rem] sm:text-[9rem] font-mono font-black tracking-tighter leading-none ${isLightMode ? 'text-black' : 'text-white'}`}>
                           {isTB ? (leftTeamId === 1 ? state?.tiebreak_p1 : state?.tiebreak_p2) || '0' : (leftTeamId === 1 ? state?.gamePoint_p1 : state?.gamePoint_p2) || '0'}
                         </span>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
                        <button type="button" disabled={isPaused || isFinished || isCurrentSetComplete} onClick={(e) => handlePointScore(e, leftTeamId)} className={`w-full py-8 sm:py-12 font-black text-xl sm:text-3xl rounded-2xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed ${leftTeamId === 1 ? (isLightMode ? 'bg-green-600 hover:bg-green-700 text-white shadow-xl border-b-4 border-green-800' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg') : (isLightMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl border-b-4 border-blue-800' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg')}`}>
                          +1 PUAN
                        </button>
                        <div className="h-10 sm:h-14 w-full">
                           {computedServerTeam === leftTeamId ? (
                             <button type="button" disabled={isPaused || isFinished || isCurrentSetComplete} onClick={(e) => handleFault(e, leftTeamId)} className={`w-full h-full rounded-xl text-[10px] sm:text-base font-black transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${firstFault ? (isLightMode ? 'bg-rose-600 text-white animate-pulse shadow-inner' : 'bg-rose-500 text-white animate-pulse border-2 border-rose-400') : (isLightMode ? 'bg-slate-200 text-slate-800 hover:bg-slate-300 border border-slate-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}`}>
                               {firstFault ? '2. Hata (Rakibe Puan)' : '1. Servis Hatası'}
                             </button>
                           ) : (
                             <div className="w-full h-full invisible"></div>
                           )}
                        </div>
                      </div>
                    </div>

                    <div className={`rounded-3xl p-2 sm:p-5 border flex flex-col justify-between overflow-hidden transition-all duration-300 ${computedServerTeam === rightTeamId ? (isLightMode ? 'bg-white border-[5px] border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]' : 'bg-slate-800/40 border-[4px] border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.15)]') : (isLightMode ? 'bg-white border-2 border-slate-200' : 'bg-slate-900 border-2 border-slate-800')}`}>
                      <div className={`flex flex-col items-center justify-center min-h-[4rem] sm:min-h-[5.5rem] border-b pb-2 mb-2 ${isLightMode ? 'border-slate-300' : 'border-slate-800/80'}`}>
                        <div className={`flex items-start justify-center gap-1 w-full ${rightTeamId === 1 ? (isLightMode ? 'text-green-700' : 'text-emerald-400') : (isLightMode ? 'text-blue-700' : 'text-blue-400')}`}>
                           {computedServerTeam === rightTeamId && (
                             <div className="flex flex-col items-center justify-center shrink-0 mr-1 sm:mr-2">
                               <span className="text-xs sm:text-xl animate-bounce drop-shadow-sm">🎾</span>
                               <span className={`text-[8px] sm:text-[10px] font-black uppercase mt-1 ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`}>Servis</span>
                             </div>
                           )}
                           <div className="flex flex-col items-center">
                             <span className="font-black text-xs sm:text-2xl text-center leading-tight line-clamp-3 break-words whitespace-normal px-1">
                               {isDoubles ? String(match[`Oyuncu ${rightTeamId}` as keyof MatchItem] || '') : (rightTeamId === computedServerTeam ? activeServerName : String(match[`Oyuncu ${rightTeamId}` as keyof MatchItem] || ''))}
                             </span>
                             <div className="flex flex-wrap justify-center gap-1 mt-1">
                               {isDoubles && computedServerTeam === rightTeamId && (
                                 <span className={`text-[9px] sm:text-xs px-2 py-0.5 rounded font-black uppercase border shadow-sm ${isLightMode ? 'bg-white text-black border-slate-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>Servis: {activeServerName.split(' ')[0]}</span>
                               )}
                               {isDoubles && computedServerTeam !== rightTeamId && (
                                 <span className={`text-[9px] sm:text-xs px-2 py-0.5 rounded font-black uppercase border shadow-sm ${isLightMode ? 'bg-white text-black border-slate-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>Karşılama: {activeReceiverName.split(' ')[0]}</span>
                               )}
                             </div>
                           </div>
                        </div>
                        <div className={`text-[9px] sm:text-xs uppercase font-black mt-1 ${isLightMode ? 'text-slate-600' : 'text-slate-500'}`}>Sağ Saha</div>
                      </div>
                      
                      <div className="flex-1 flex justify-center items-center py-2 sm:py-4 min-h-0">
                         <span className={`text-[4.5rem] sm:text-[9rem] font-mono font-black tracking-tighter leading-none ${isLightMode ? 'text-black' : 'text-white'}`}>
                           {isTB ? (rightTeamId === 1 ? state?.tiebreak_p1 : state?.tiebreak_p2) || '0' : (rightTeamId === 1 ? state?.gamePoint_p1 : state?.gamePoint_p2) || '0'}
                         </span>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
                        <button type="button" disabled={isPaused || isFinished || isCurrentSetComplete} onClick={(e) => handlePointScore(e, rightTeamId)} className={`w-full py-8 sm:py-12 font-black text-xl sm:text-3xl rounded-2xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed ${rightTeamId === 1 ? (isLightMode ? 'bg-green-600 hover:bg-green-700 text-white shadow-xl border-b-4 border-green-800' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg') : (isLightMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl border-b-4 border-blue-800' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg')}`}>
                          +1 PUAN
                        </button>
                        <div className="h-10 sm:h-14 w-full">
                           {computedServerTeam === rightTeamId ? (
                             <button type="button" disabled={isPaused || isFinished || isCurrentSetComplete} onClick={(e) => handleFault(e, rightTeamId)} className={`w-full h-full rounded-xl text-[10px] sm:text-base font-black transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${firstFault ? (isLightMode ? 'bg-rose-600 text-white animate-pulse shadow-inner' : 'bg-rose-500 text-white animate-pulse border-2 border-rose-400') : (isLightMode ? 'bg-slate-200 text-slate-800 hover:bg-slate-300 border border-slate-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}`}>
                               {firstFault ? '2. Hata (Rakibe Puan)' : '1. Servis Hatası'}
                             </button>
                           ) : (
                             <div className="w-full h-full invisible"></div>
                           )}
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className={`pt-2 border-t flex flex-col gap-2 sm:gap-3 shrink-0 pb-4 ${isLightMode ? 'border-slate-300' : 'border-slate-800'}`}>
                    <div className="flex gap-2 sm:gap-3">
                      <button type="button" onClick={(e) => startTimer(e, 'Saha Değişimi', 90)} className={`flex-1 py-3 sm:py-4 border text-[10px] sm:text-sm font-black rounded-xl transition ${shouldBlink90s ? 'animate-pulse bg-rose-500 text-white border-rose-600 shadow-md' : (isLightMode ? 'bg-white border-slate-400 text-slate-800 shadow-sm hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white')}`}>90s Değişim</button>
                      <button type="button" onClick={(e) => startTimer(e, 'Set Arası', 120)} className={`flex-1 py-3 sm:py-4 border text-[10px] sm:text-sm font-black rounded-xl transition ${shouldBlink120s ? 'animate-pulse bg-rose-500 text-white border-rose-600 shadow-md' : (isLightMode ? 'bg-white border-slate-400 text-slate-800 shadow-sm hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white')}`}>120s Set</button>
                      <button type="button" onClick={(e) => startTimer(e, 'Sağlık Molası', 180)} className={`flex-1 py-3 sm:py-4 border text-[10px] sm:text-sm font-black rounded-xl transition ${isLightMode ? 'bg-white border-slate-400 text-slate-800 shadow-sm hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'}`}>3dk MTO</button>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                      <button type="button" onClick={handleUndo} disabled={isPaused} className={`flex-1 flex items-center justify-center gap-1.5 py-3 sm:py-4 border text-[11px] sm:text-base font-black rounded-xl transition active:scale-95 disabled:opacity-50 ${isLightMode ? 'bg-white border-slate-400 text-slate-800 shadow-sm hover:bg-slate-100' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}>
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" /> Geri Al
                      </button>
                      <button type="button" onClick={toggleSuspend} className={`flex-1 flex items-center justify-center gap-1.5 py-3 sm:py-4 text-[11px] sm:text-base font-black rounded-xl transition active:scale-95 border shadow-sm ${isPaused ? (isLightMode ? 'bg-emerald-600 text-white border-emerald-800' : 'bg-emerald-600 text-white border-emerald-700') : (isLightMode ? 'bg-white border-slate-400 text-slate-800 hover:bg-slate-100' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700')}`}>
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
