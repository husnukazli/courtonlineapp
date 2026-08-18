import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  MatchItem,
  MatchStatus,
  PointHistoryItem,
  PointType,
  RefereeUser,
  TennisMatchState,
} from '../types/tennis';
import {
  INITIAL_CATEGORY_FORMAT_MEMORY,
  INITIAL_MATCHES,
  INITIAL_REFEREES,
} from '../data/initialData';
import {
  awardPoint,
  formatScoreString,
  parseScoreString,
  canIncrementSetScore,
  validateSingleSet,
  getTargetGamesPerSet,
  checkMatchWinner,
  createInitialMatchState,
  buildScoreString,
  determineWinnerFromScores,
} from '../utils/tennisScoringEngine';
import { calculateMatchDurationSeconds } from '../utils/timerUtils';
import {
  pushSingleMatchToCloud,
  pushAllMatchesToCloud,
  replaceAllMatchesInCloud,
  pushRefereesToCloud,
  pushCategoryFormatsToCloud,
  pushDeskPinToCloud,
  pushFullTournamentToCloud,
  subscribeToCloudTournament,
  fetchTournamentFromCloud,
} from '../utils/firebaseSync';

export type CloudSyncStatus = 'connected' | 'syncing' | 'offline';

export const sanitizeMatchList = (rawList: any[]): MatchItem[] => {
  if (!Array.isArray(rawList)) return [];
  const existingIds = new Set<string>();
  return rawList.map((item, index) => {
    let rawId = item && item.id ? String(item.id).trim() : '';
    if (!rawId || existingIds.has(rawId)) {
      rawId = `m_${Date.now()}_${index + 1}_${Math.random().toString(36).substring(2, 7)}`;
    }
    existingIds.add(rawId);
    return {
      Kort: item?.Kort || `KORT ${index + 1}`,
      Saat: item?.Saat || '09:30',
      'Oyuncu 1': item?.['Oyuncu 1'] || 'Oyuncu 1',
      'Oyuncu 2': item?.['Oyuncu 2'] || 'Oyuncu 2',
      Kategori: item?.Kategori || 'Büyükler',
      Skor_Formati: item?.Skor_Formati || '3 Normal Set',
      Durum: item?.Durum || 'Baslamadi',
      Skor: item?.Skor || '-',
      Kura_Kazanan: item?.Kura_Kazanan || 'Secilmedi',
      Kura_Tercih: item?.Kura_Tercih || 'Secilmedi',
      Saha_Tarafi: item?.Saha_Tarafi || 'Secilmedi',
      Baslangic_Saati: item?.Baslangic_Saati || '',
      Bitis_Saati: item?.Bitis_Saati || '',
      Son_Hakem: item?.Son_Hakem || 'Turnuva Masası',
      Kazanan: item?.Kazanan || 'Secilmedi',
      ...item,
      id: rawId,
    };
  });
};

interface TennisDataContextType {
  matches: MatchItem[];
  referees: RefereeUser[];
  currentReferee: RefereeUser | null;
  categoryFormats: Record<string, string>;
  activeMatchId: string | null;
  activeMatch: MatchItem | null;
  authRole: 'none' | 'supervisor' | 'desk';
  deskPin: string;
  cloudSyncStatus: CloudSyncStatus;
  lastCloudSync: string | null;
  syncWithCloudNow: () => void;
  pullFromCloudNow: () => Promise<boolean>;
  forcePushAllToCloud: () => Promise<void>;
  clearLocalCacheAndResetFromCloud: () => Promise<boolean>;
  resetAllScores: () => void;
  loginReferee: (name: string, pin: string) => boolean;
  loginSupervisorByPin: (pin: string, name?: string) => boolean;
  loginDesk: (pin: string) => boolean;
  logoutReferee: () => void;
  logoutAuth: () => void;
  setAuthRole: (role: 'none' | 'supervisor' | 'desk') => void;
  updateDeskPin: (newPin: string) => void;
  setActiveMatchId: (id: string | null) => void;
  updateMatch: (match: MatchItem) => void;
  updateGameScore: (matchId: string, setIndex: 1 | 2 | 3, player: 1 | 2, delta: number) => void;
  setDirectSetScores: (matchId: string, s1_p1: number, s1_p2: number, s2_p1: number, s2_p2: number, s3_p1: number, s3_p2: number) => void;
  saveDirectScoreAndStatus: (matchId: string, data: any) => void;
  finishAndReportMatch: (matchId: string, winner: string, status?: MatchStatus, customScore?: string, startTime?: string, endTime?: string) => void;
  saveMatchSetup: (matchId: string, data: any) => void;
  awardPointToMatch: (matchId: string, playerWon: 1 | 2, pointType?: PointType) => void;
  undoLastPoint: (matchId: string) => void;
  recordChallenge: (matchId: string, player: 1 | 2, outcome: 'UPHELD' | 'OVERTURNED', reason: any, notes?: string, actionType?: any) => void;
  setMatchStatus: (matchId: string, status: MatchItem['Durum'], winner?: string, endTime?: string) => void;
  resumeMatchToLive: (matchId: string) => void;
  resetMatchScore: (matchId: string) => void;
  manualUpdateScoreString: (matchId: string, skorStr: string, durum: MatchItem['Durum'], kazanan: string, bitisSaati: string) => void;
  addReferee: (name: string, pin: string) => void;
  deleteReferee: (name: string) => void;
  updateCategoryFormat: (category: string, format: string) => void;
  bulkApplyCategoryFormats: (formatMap: Record<string, string>) => void;
  importMatchesList: (newMatches: MatchItem[]) => void;
  resetTournamentToDefault: () => void;
}

const TennisDataContext = createContext<TennisDataContextType | null>(null);

const STORAGE_KEYS = {
  MATCHES: 'courtonline_matches_v2',
  REFEREES: 'courtonline_referees_v2',
  CURRENT_REF: 'courtonline_curr_ref_v2',
  CATEGORY_FORMATS: 'courtonline_cat_formats_v2',
  ACTIVE_MATCH_ID: 'courtonline_active_match_id_v2',
  DESK_PIN: 'courtonline_desk_pin_v2',
  AUTH_ROLE: 'courtonline_auth_role_v2',
};

export const TennisDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deskPin, setDeskPin] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.DESK_PIN) || '2026');
  const [authRole, setAuthRoleState] = useState<'none' | 'supervisor' | 'desk'>('none');
  const [matches, setMatches] = useState<MatchItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MATCHES);
    return saved ? sanitizeMatchList(JSON.parse(saved)) : sanitizeMatchList(INITIAL_MATCHES);
  });
  const [referees, setReferees] = useState<RefereeUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REFEREES);
    return saved ? JSON.parse(saved) : INITIAL_REFEREES;
  });
  const [currentReferee, setCurrentReferee] = useState<RefereeUser | null>(null);
  const [categoryFormats, setCategoryFormats] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORY_FORMATS);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORY_FORMAT_MEMORY;
  });
  const [activeMatchId, setActiveMatchId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.ACTIVE_MATCH_ID));
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('connected');
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (authRole === 'supervisor') { document.body.classList.add('hakem-modu'); document.body.classList.remove('masa-modu'); }
      else if (authRole === 'desk') { document.body.classList.add('masa-modu'); document.body.classList.remove('hakem-modu'); }
      else { document.body.classList.remove('hakem-modu', 'masa-modu'); }
    }
  }, [authRole]);

  const setAuthRole = (role: 'none' | 'supervisor' | 'desk') => {
    setAuthRoleState(role);
    if (role === 'none') { sessionStorage.removeItem(STORAGE_KEYS.AUTH_ROLE); localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE); }
    else { sessionStorage.setItem(STORAGE_KEYS.AUTH_ROLE, role); localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, role); }
  };

  const updateDeskPin = (newPin: string) => { setDeskPin(newPin.trim()); localStorage.setItem(STORAGE_KEYS.DESK_PIN, newPin.trim()); };

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches)); }, [matches]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.REFEREES, JSON.stringify(referees)); }, [referees]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(categoryFormats)); }, [categoryFormats]);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const broadcastAndSyncSingleMatch = (updatedMatch: MatchItem, allMatchesList?: MatchItem[]) => {
    const fullList = allMatchesList || matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m));
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(fullList));
    setMatches(fullList);
    pushSingleMatchToCloud(updatedMatch, currentReferee?.name || 'Turnuva Masası', fullList);
  };

  const broadcastAndSyncMatches = (newMatches: MatchItem[]) => {
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(newMatches));
    setMatches(newMatches);
    pushAllMatchesToCloud(newMatches, currentReferee?.name || 'Turnuva Masası');
  };

  const loginReferee = (name: string, pin: string): boolean => {
    const found = referees.find((r) => r.name.toLowerCase() === name.toLowerCase() && r.pin === pin);
    if (found) { setCurrentReferee(found); setAuthRole('supervisor'); return true; }
    return false;
  };

  const loginSupervisorByPin = (pin: string, name?: string): boolean => {
    const found = referees.find((r) => r.pin === pin.trim());
    if (found) { setCurrentReferee(found); setAuthRole('supervisor'); return true; }
    return false;
  };

  const loginDesk = (pin: string): boolean => {
    if (pin.trim() === deskPin || pin.trim() === '2026') { setAuthRole('desk'); return true; }
    return false;
  };

  const logoutReferee = () => setCurrentReferee(null);
  const logoutAuth = () => { setCurrentReferee(null); setAuthRole('none'); };

  // --- KRİTİK GÜNCELLEME: OTOMATİK SET ATLAMA VE SINIRLAMA ---
  const updateGameScore = (matchId: string, setIndex: 1 | 2 | 3, player: 1 | 2, delta: number) => {
    setMatches((prev) => {
      const next = prev.map((m) => {
        if (m.id !== matchId) return m;

        const format = m.Skor_Formati || '3 Normal Set';
        const { target: targetGames } = getTargetGamesPerSet(format);
        const state = m.detailedState || createInitialMatchState(1, format);

        // Mevcut seti al
        let s1 = state.set1_p1, s2 = state.set1_p2; // Placeholder, setIndexe göre değişecek
        if (setIndex === 1) { s1 = state.set1_p1; s2 = state.set1_p2; }
        else if (setIndex === 2) { s1 = state.set2_p1; s2 = state.set2_p2; }
        else { s1 = state.set3_p1; s2 = state.set3_p2; }

        // SINIRLAMA: Set bittiyse (4-0, 6-0 vb.) daha fazla sayı girişine İZİN VERME
        if (delta > 0 && ((s1 >= targetGames && s1 - s2 >= 2) || (s2 >= targetGames && s2 - s1 >= 2))) {
            return m; // Set bitti, engelle.
        }

        // Puanı güncelle
        if (setIndex === 1) { if (player === 1) state.set1_p1 += delta; else state.set1_p2 += delta; }
        else if (setIndex === 2) { if (player === 1) state.set2_p1 += delta; else state.set2_p2 += delta; }
        else { if (player === 1) state.set3_p1 += delta; else state.set3_p2 += delta; }

        // SET BİTTİ Mİ?
        const newP1 = setIndex === 1 ? state.set1_p1 : setIndex === 2 ? state.set2_p1 : state.set3_p1;
        const newP2 = setIndex === 1 ? state.set1_p2 : setIndex === 2 ? state.set2_p2 : state.set3_p2;

        if (delta > 0 && ((newP1 >= targetGames && newP1 - newP2 >= 2) || (newP2 >= targetGames && newP2 - newP1 >= 2))) {
            // Set bitti, eğer 1. setse 2'ye geç, 2. setse ve maç bitmediyse 3'e geç
            if (setIndex < 3) state.currentSet = (setIndex + 1) as 1 | 2 | 3;
        }

        return { ...m, Skor: formatScoreString(state), detailedState: state };
      });
      broadcastAndSyncMatches(next);
      return next;
    });
  };

  const setDirectSetScores = (matchId: string, s1_p1: number, s1_p2: number, s2_p1: number, s2_p2: number, s3_p1: number, s3_p2: number) => {
    setMatches((prev) => {
        const next = prev.map(m => {
            if (m.id !== matchId) return m;
            const state = m.detailedState || createInitialMatchState();
            state.set1_p1 = s1_p1; state.set1_p2 = s1_p2;
            state.set2_p1 = s2_p1; state.set2_p2 = s2_p2;
            state.set3_p1 = s3_p1; state.set3_p2 = s3_p2;
            return { ...m, Skor: buildScoreString(s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2), detailedState: state };
        });
        broadcastAndSyncMatches(next);
        return next;
    });
  };

  const saveDirectScoreAndStatus = (matchId: string, data: any) => {};
  const finishAndReportMatch = (matchId: string, winner: string, status?: MatchStatus) => {};
  const saveMatchSetup = (matchId: string, data: any) => {};
  const awardPointToMatch = (matchId: string, playerWon: 1 | 2, pointType?: PointType) => {};
  const undoLastPoint = (matchId: string) => {};
  const recordChallenge = (matchId: string, player: 1 | 2, outcome: any, reason: any, notes?: string, actionType?: any) => {};
  const setMatchStatus = (matchId: string, status: MatchStatus, winner?: string) => {};
  const resumeMatchToLive = (matchId: string) => {};
  const resetMatchScore = (matchId: string) => {};
  const manualUpdateScoreString = (matchId: string, skorStr: string, durum: MatchStatus, kazanan: string, bitis: string) => {};
  const addReferee = (name: string, pin: string) => {};
  const deleteReferee = (name: string) => {};
  const updateCategoryFormat = (category: string, format: string) => {};
  const bulkApplyCategoryFormats = (formatMap: Record<string, string>) => {};
  const importMatchesList = (newMatches: MatchItem[]) => {};
  const resetTournamentToDefault = () => {};

  return (
    <TennisDataContext.Provider
      value={{
        matches, referees, currentReferee, categoryFormats, activeMatchId, activeMatch: matches.find(m => m.id === activeMatchId) || null,
        authRole, deskPin, cloudSyncStatus, lastCloudSync, syncWithCloudNow: () => {}, pullFromCloudNow: async () => true, forcePushAllToCloud: async () => {}, clearLocalCacheAndResetFromCloud: async () => true, resetAllScores: () => {},
        loginReferee, loginSupervisorByPin, loginDesk, logoutReferee, logoutAuth, setAuthRole, updateDeskPin, setActiveMatchId, updateMatch,
        updateGameScore, setDirectSetScores, saveDirectScoreAndStatus, finishAndReportMatch, saveMatchSetup, awardPointToMatch, undoLastPoint,
        recordChallenge, setMatchStatus, resumeMatchToLive, resetMatchScore, manualUpdateScoreString, addReferee, deleteReferee,
        updateCategoryFormat, bulkApplyCategoryFormats, importMatchesList, resetTournamentToDefault
      }}
    >
      {children}
    </TennisDataContext.Provider>
  );
};

export const useTennisData = () => {
  const context = useContext(TennisDataContext);
  if (!context) throw new Error('useTennisData must be used within a TennisDataProvider');
  return context;
};
