import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
 ChallengeRecord,
 MatchItem,
 MatchStatus,
 PointHistoryItem,
 PointType,
 RefereeUser,
 ScoreFormatType,
 TennisMatchState,
} from '../types/tennis';
import {
 INITIAL_CATEGORY_FORMAT_MEMORY,
 INITIAL_MATCHES,
 INITIAL_REFEREES,
} from '../data/initialData';
import {
 awardPoint,
 buildScoreString,
 createInitialMatchState,
 determineWinnerFromScores,
 formatScoreString,
 parseScoreString,
 canIncrementSetScore,
 validateFullMatchScores,
 validateSingleSet,
 checkMatchWinner,
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
 deleteAllMatchesFromCloud,
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

 const matchItem: MatchItem = {
 Kort: item?.Kort || `KORT ${index + 1}`,
 Saat: item?.Saat || '09:30',
 'Oyuncu 1': item?.['Oyuncu 1'] || 'Oyuncu 1',
 'Oyuncu 2': item?.['Oyuncu 2'] || 'Oyuncu 2',
 Kategori: item?.Kategori || 'Büyükler',
 Skor_Formati: item?.Skor_Formati || '3 Normal Set',
 Durum: item?.Durum || 'Baslamadi',
 Skor: item?.Skor || '-',
 Kura_Kazanan: item?.Kura_Kazanan || 'Secilmedi',
 Kura_Tercih: item?.Kura_Tercih || 'Servis',
 Saha_Tarafi: item?.Saha_Tarafi || 'Sandalyenin Sağı',
 Baslangic_Saati: item?.Baslangic_Saati || 'Secilmedi',
 Bitis_Saati: item?.Bitis_Saati || 'Secilmedi',
 Son_Hakem: item?.Son_Hakem || 'Turnuva Masası',
 Kazanan: item?.Kazanan || 'Secilmedi',
 ...item,
 id: rawId,
 };
 return matchItem;
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
 tournamentNotice: string;
 updateTournamentNotice: (notice: string) => void;
 syncWithCloudNow: () => void;
 pullFromCloudNow: () => Promise<boolean>;
 forcePushAllToCloud: () => Promise<void>;
 clearLocalCacheAndResetFromCloud: () => Promise<boolean>;
 resetAllScores: () => void;
 loginReferee: (name: string, pin: string) => boolean;
 loginRefereeDirect: (name?: string) => void;
 loginSupervisorByPin: (pin: string, name?: string) => boolean;
 loginDesk: (pin: string) => boolean;
 logoutReferee: () => void;
 logoutAuth: () => void;
 setAuthRole: (role: 'none' | 'supervisor' | 'desk') => void;
 updateDeskPin: (newPin: string) => void;
 setActiveMatchId: (id: string | null) => void;
 updateMatch: (match: MatchItem) => void;
 updateGameScore: (matchId: string, setIndex: 1 | 2 | 3, player: 1 | 2, delta: number) => void;
 setDirectSetScores: (
 matchId: string,
 s1_p1: number,
 s1_p2: number,
 s2_p1: number,
 s2_p2: number,
 s3_p1: number,
 s3_p2: number
 ) => void;
 saveDirectScoreAndStatus: (
 matchId: string,
 data: {
 s1_p1: number;
 s1_p2: number;
 s2_p1: number;
 s2_p2: number;
 s3_p1: number;
 s3_p2: number;
 status: MatchStatus;
 winner?: string;
 startTime?: string;
 endTime?: string;
 }
 ) => void;
 finishAndReportMatch: (
 matchId: string,
 winner: string,
 status?: MatchStatus,
 customScore?: string,
 startTime?: string,
 endTime?: string
 ) => void;
 saveMatchSetup: (
 matchId: string,
 data: {
 durum: MatchItem['Durum'];
 kuraKazanan: string;
 kuraTercih: string;
 sahaTarafi: string;
 baslangicSaati: string;
 bitisSaati: string;
 skorFormati?: string;
 ilkServisOyuncusu?: 1 | 2;
 }
 ) => void;
 awardPointToMatch: (matchId: string, playerWon: 1 | 2, pointType?: PointType) => void;
 undoLastPoint: (matchId: string) => void;
 recordChallenge: (
 matchId: string,
 player: 1 | 2,
 outcome: 'UPHELD' | 'OVERTURNED',
 reason: 'LINE_CALL' | 'OVERRULE' | 'SERVICE_FAULT' | 'TOUCH_NET' | 'LET_POINT',
 notes?: string,
 actionType?: 'REPLAY_POINT' | 'AWARD_POINT' | 'KEEP_DECISION'
 ) => void;
 setMatchStatus: (
 matchId: string,
 status: MatchItem['Durum'],
 winner?: string,
 endTime?: string
 ) => void;
 resumeMatchToLive: (matchId: string) => void;
 resetMatchScore: (matchId: string) => void;
 manualUpdateScoreString: (
 matchId: string,
 skorStr: string,
 durum: MatchItem['Durum'],
 kazanan: string,
 bitisSaati: string
 ) => void;
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
 TOURNAMENT_NOTICE: 'courtonline_notice_v2',
};

export const TennisDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [deskPin, setDeskPin] = useState<string>(() => {
 return localStorage.getItem(STORAGE_KEYS.DESK_PIN) || '2026';
 });

 const [authRole, setAuthRoleState] = useState<'none' | 'supervisor' | 'desk'>(() => {
 const savedRole = sessionStorage.getItem(STORAGE_KEYS.AUTH_ROLE);
 if (savedRole === 'supervisor' || savedRole === 'desk') {
 return savedRole as 'supervisor' | 'desk';
 }
 return 'none';
 });

 const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('connected');
 const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);
 const [tournamentNotice, setTournamentNotice] = useState<string>(() => {
 return localStorage.getItem(STORAGE_KEYS.TOURNAMENT_NOTICE) || 'Maçlar federasyon kurallarına uygun olarak yönetilmektedir.';
 });

 useEffect(() => {
 if (typeof document !== 'undefined') {
 if (authRole === 'supervisor') {
 document.body.classList.add('hakem-modu');
 document.body.classList.remove('masa-modu');
 } else if (authRole === 'desk') {
 document.body.classList.add('masa-modu');
 document.body.classList.remove('hakem-modu');
 } else {
 document.body.classList.remove('hakem-modu', 'masa-modu');
 }
 }
 }, [authRole]);

 const setAuthRole = (role: 'none' | 'supervisor' | 'desk') => {
 setAuthRoleState(role);
 if (role === 'none') {
 sessionStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
 } else {
 sessionStorage.setItem(STORAGE_KEYS.AUTH_ROLE, role);
 }
 };

 const updateDeskPin = (newPin: string) => {
 if (!newPin.trim() || newPin.trim().length < 2) return;
 setDeskPin(newPin.trim());
 localStorage.setItem(STORAGE_KEYS.DESK_PIN, newPin.trim());
 };

 const updateTournamentNotice = (notice: string) => {
 setTournamentNotice(notice);
 localStorage.setItem(STORAGE_KEYS.TOURNAMENT_NOTICE, notice);
 pushCategoryFormatsToCloud({ ...categoryFormats, __tournament_notice_tunnel__: notice });
 };

 const [matches, setMatches] = useState<MatchItem[]>([]);

 const [referees, setReferees] = useState<RefereeUser[]>(() => {
 const saved = localStorage.getItem(STORAGE_KEYS.REFEREES);
 if (saved) {
 try {
  return JSON.parse(saved);
 } catch (e) {
  console.error('Failed to parse referees from localStorage', e);
 }
 }
 return INITIAL_REFEREES;
 });

 const [currentReferee, setCurrentReferee] = useState<RefereeUser | null>(() => {
 const saved = sessionStorage.getItem(STORAGE_KEYS.CURRENT_REF);
 if (saved) {
 try {
  return JSON.parse(saved);
 } catch (e) {
  console.error(e);
 }
 }
 return null;
 });

 const [categoryFormats, setCategoryFormats] = useState<Record<string, string>>(() => {
 const saved = localStorage.getItem(STORAGE_KEYS.CATEGORY_FORMATS);
 if (saved) {
 try {
  return JSON.parse(saved);
 } catch (e) {
  console.error(e);
 }
 }
 return INITIAL_CATEGORY_FORMAT_MEMORY;
 });

 const [activeMatchId, _setActiveMatchId] = useState<string | null>(() => {
 return localStorage.getItem(STORAGE_KEYS.ACTIVE_MATCH_ID) || 'm-9';
 });

 const activeMatch = matches.find((m) => m.id === activeMatchId) || null;

 useEffect(() => {
 localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
 }, [matches]);

 useEffect(() => {
 localStorage.setItem(STORAGE_KEYS.REFEREES, JSON.stringify(referees));
 }, [referees]);

 useEffect(() => {
 if (currentReferee) {
 window.sessionStorage.setItem(STORAGE_KEYS.CURRENT_REF, JSON.stringify(currentReferee));
 } else {
 window.sessionStorage.removeItem(STORAGE_KEYS.CURRENT_REF);
 }
 }, [currentReferee]);

 useEffect(() => {
 localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(categoryFormats));
 }, [categoryFormats]);

 useEffect(() => {
 if (activeMatchId) {
 localStorage.setItem(STORAGE_KEYS.ACTIVE_MATCH_ID, activeMatchId);
 } else {
 localStorage.removeItem(STORAGE_KEYS.ACTIVE_MATCH_ID);
 }
 }, [activeMatchId]);

 const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

 useEffect(() => {
 try {
 const channel = new BroadcastChannel('courtonline_sync_channel');
 broadcastChannelRef.current = channel;
 channel.onmessage = (event) => {
  if (event.data?.type === 'MATCHES_UPDATED' && Array.isArray(event.data.matches)) {
  setMatches(event.data.matches);
  }
 };
 } catch {
 // ignore
 }

 const handleStorageEvent = (event: StorageEvent) => {
 if (event.key === STORAGE_KEYS.MATCHES && event.newValue) {
  try {
  const parsed = JSON.parse(event.newValue);
  if (Array.isArray(parsed)) {
   setMatches(parsed);
  }
  } catch (err) {
  console.error('Failed to parse matches from storage event', err);
  }
 }
 };

 window.addEventListener('storage', handleStorageEvent);

 return () => {
 if (broadcastChannelRef.current) {
  broadcastChannelRef.current.close();
  broadcastChannelRef.current = null;
 }
 window.removeEventListener('storage', handleStorageEvent);
 };
 }, []);

 useEffect(() => {
 fetchTournamentFromCloud().then((remote) => {
 if (remote && Array.isArray(remote.matches) && remote.matches.length > 0) {
  const sanitized = sanitizeMatchList(remote.matches);
  setMatches(sanitized);
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(sanitized));
  if (remote.referees && remote.referees.length > 0) {
  setReferees(remote.referees);
  localStorage.setItem(STORAGE_KEYS.REFEREES, JSON.stringify(remote.referees));
  }
  if (remote.categoryFormats) {
  setCategoryFormats(remote.categoryFormats);
  if (remote.categoryFormats.__tournament_notice_tunnel__) {
   setTournamentNotice(remote.categoryFormats.__tournament_notice_tunnel__);
   localStorage.setItem(STORAGE_KEYS.TOURNAMENT_NOTICE, remote.categoryFormats.__tournament_notice_tunnel__);
  }
  localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(remote.categoryFormats));
  }
  if (remote.deskPin) {
  setDeskPin(remote.deskPin);
  localStorage.setItem(STORAGE_KEYS.DESK_PIN, remote.deskPin);
  }
 }
 }).catch((e) => console.warn('Initial cloud fetch error:', e));

 const unsubscribe = subscribeToCloudTournament(
 (remoteMatches) => {
  setCloudSyncStatus('connected');
  setLastCloudSync(
  new Date().toLocaleTimeString('tr-TR', {
   hour: '2-digit',
   minute: '2-digit',
   second: '2-digit',
  })
  );

  if (Array.isArray(remoteMatches) && remoteMatches.length > 0) {
  setMatches((prev) => {
   let nextList: MatchItem[];
   if (remoteMatches.length === 1 && prev.length > 1) {
   const single = remoteMatches[0];
   const exists = prev.some((m) => m.id === single.id);
   if (exists) {
    nextList = prev.map((m) => (m.id === single.id ? { ...m, ...single } : m));
   } else {
    nextList = sanitizeMatchList([...prev, single]);
   }
   } else {
   nextList = sanitizeMatchList(remoteMatches);
   }
   try {
   localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(nextList));
   } catch {
   // ignore
   }
   return nextList;
  });
  }
 },
 (meta) => {
  if (Array.isArray(meta.referees) && meta.referees.length > 0) {
  setReferees(meta.referees);
  localStorage.setItem(STORAGE_KEYS.REFEREES, JSON.stringify(meta.referees));
  }

  if (meta.categoryFormats && Object.keys(meta.categoryFormats).length > 0) {
  setCategoryFormats(meta.categoryFormats);
  if (meta.categoryFormats.__tournament_notice_tunnel__) {
   setTournamentNotice(meta.categoryFormats.__tournament_notice_tunnel__);
   localStorage.setItem(STORAGE_KEYS.TOURNAMENT_NOTICE, meta.categoryFormats.__tournament_notice_tunnel__);
  }
  localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(meta.categoryFormats));
  }

  if (meta.deskPin) {
  setDeskPin(meta.deskPin);
  localStorage.setItem(STORAGE_KEYS.DESK_PIN, meta.deskPin);
  }
 },
 () => {}
 );

 return () => {
  unsubscribe();
 };
 }, [deskPin]);

 const broadcastAndSyncSingleMatch = (updatedMatch: MatchItem, allMatchesList?: MatchItem[]) => {
 const fullList = allMatchesList || matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m));
 try {
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(fullList));
 } catch {
  // ignore
 }

 setCloudSyncStatus('syncing');
 pushSingleMatchToCloud(updatedMatch, currentReferee?.name || 'Turnuva Masası', fullList)
 .then(() => {
  setCloudSyncStatus('connected');
 })
 .catch((err) => {
  console.warn('Sync match note:', err);
  setCloudSyncStatus('connected');
 });
 };

 const broadcastAndSyncMatches = (newMatches: MatchItem[]) => {
 try {
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(newMatches));
 } catch {
  // ignore
 }

 setCloudSyncStatus('syncing');
 pushAllMatchesToCloud(newMatches, currentReferee?.name || 'Turnuva Masası')
 .then(() => {
  setCloudSyncStatus('connected');
 })
 .catch(() => {
  setCloudSyncStatus('connected');
 });
 };

 const pullFromCloudNow = async (): Promise<boolean> => {
 setCloudSyncStatus('syncing');
 try {
  const remote = await fetchTournamentFromCloud();
  if (remote && Array.isArray(remote.matches) && remote.matches.length > 0) {
  const sanitized = sanitizeMatchList(remote.matches);
  setMatches(sanitized);
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(sanitized));
  if (remote.referees && remote.referees.length > 0) {
   setReferees(remote.referees);
   localStorage.setItem(STORAGE_KEYS.REFEREES, JSON.stringify(remote.referees));
  }
  if (remote.categoryFormats && Object.keys(remote.categoryFormats).length > 0) {
   setCategoryFormats(remote.categoryFormats);
   if (remote.categoryFormats.__tournament_notice_tunnel__) {
   setTournamentNotice(remote.categoryFormats.__tournament_notice_tunnel__);
   localStorage.setItem(STORAGE_KEYS.TOURNAMENT_NOTICE, remote.categoryFormats.__tournament_notice_tunnel__);
   }
   localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(remote.categoryFormats));
  }
  if (remote.deskPin) {
   setDeskPin(remote.deskPin);
   localStorage.setItem(STORAGE_KEYS.DESK_PIN, remote.deskPin);
  }
  setCloudSyncStatus('connected');
  return true;
  } else {
  setCloudSyncStatus('connected');
  return true;
  }
 } catch (err) {
  console.warn('Pull from cloud failed:', err);
  setCloudSyncStatus('offline');
  return false;
 }
 };

 const clearLocalCacheAndResetFromCloud = async (): Promise<boolean> => {
 setCloudSyncStatus('syncing');
 try {
  localStorage.removeItem(STORAGE_KEYS.MATCHES);
  localStorage.removeItem(STORAGE_KEYS.REFEREES);
  localStorage.removeItem(STORAGE_KEYS.CATEGORY_FORMATS);
  localStorage.removeItem(STORAGE_KEYS.TOURNAMENT_NOTICE);
  await deleteAllMatchesFromCloud();
  await pushRefereesToCloud([]);
  setMatches([]);
  setReferees([]);
  setTournamentNotice('Maçlar federasyon kurallarına uygun olarak yönetilmektedir.');
  localStorage.removeItem(STORAGE_KEYS.DESK_PIN);

  const remote = await fetchTournamentFromCloud();
  if (remote && Array.isArray(remote.matches) && remote.matches.length > 0) {
  const sanitized = sanitizeMatchList(remote.matches);
  setMatches(sanitized);
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(sanitized));
  if (remote.referees && remote.referees.length > 0) {
   setReferees(remote.referees);
   localStorage.setItem(STORAGE_KEYS.REFEREES, JSON.stringify(remote.referees));
  }
  if (remote.categoryFormats && Object.keys(remote.categoryFormats).length > 0) {
   setCategoryFormats(remote.categoryFormats);
   localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(remote.categoryFormats));
  }
  if (remote.deskPin) {
   setDeskPin(remote.deskPin);
   localStorage.setItem(STORAGE_KEYS.DESK_PIN, remote.deskPin);
  }
  } else {
  const initialSanitized = sanitizeMatchList(INITIAL_MATCHES);
  setMatches(initialSanitized);
  setReferees(INITIAL_REFEREES);
  setCategoryFormats(INITIAL_CATEGORY_FORMAT_MEMORY);
  }

  setCloudSyncStatus('connected');
  return true;
 } catch (err) {
  console.error('Clear cache & reset from cloud error:', err);
  setCloudSyncStatus('offline');
  return false;
 }
 };

 const forcePushAllToCloud = async () => {
 setCloudSyncStatus('syncing');
 try {
  await replaceAllMatchesInCloud(matches, currentReferee?.name || 'Turnuva Masası');
  await pushRefereesToCloud(referees);
  await pushCategoryFormatsToCloud({ ...categoryFormats, __tournament_notice_tunnel__: tournamentNotice });
  await pushDeskPinToCloud(deskPin);
  setCloudSyncStatus('connected');
 } catch (err) {
  setCloudSyncStatus('offline');
  throw err;
 }
 };

 const resetAllScores = () => {
 const cleanMatches = matches.map((m) => {
  const format = m.Skor_Formati || '3 Normal Set';
  const cleanState = createInitialMatchState(1, format);
  return {
  ...m,
  Durum: 'Baslamadi' as MatchStatus,
  Skor: '-',
  Kura_Kazanan: 'Secilmedi',
  Kura_Tercih: 'Servis',
  Saha_Tarafi: 'Sandalyenin Sağı',
  Baslangic_Saati: 'Secilmedi',
  Bitis_Saati: 'Secilmedi',
  Kazanan: 'Secilmedi',
  detailedState: cleanState,
  pointHistory: [],
  disputHistory: [],
  pausedAccumulatedMs: 0,
  startTimeTimestamp: undefined,
  totalDurationSeconds: 0,
  Son_Guncelleme: new Date().toISOString(),
  Son_Hakem: currentReferee?.name || 'Turnuva Masası',
  };
 });
 setMatches(cleanMatches);
 localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(cleanMatches));
 replaceAllMatchesInCloud(cleanMatches, currentReferee?.name || 'Turnuva Masası');
 };

 const syncWithCloudNow = () => {
 pullFromCloudNow();
 };

 const loginReferee = (name: string, pin: string): boolean => {
 const found = referees.find((r) => r.name.toLowerCase() === name.toLowerCase() && r.pin === pin);
 if (found) {
  setCurrentReferee(found);
  setAuthRole('supervisor');
  return true;
 }
 return false;
 };

 const loginRefereeDirect = () => {};

 const loginSupervisorByPin = (pin: string, name?: string): boolean => {
 const cleanPin = pin.trim();
 if (!cleanPin) return false;

 if (name) {
  const found = referees.find((r) => r.name.toLowerCase() === name.toLowerCase() && r.pin === cleanPin);
  if (found) {
   setCurrentReferee(found);
   setAuthRole('supervisor');
   return true;
  }
 }

 const matchingRef = referees.find((r) => r.pin === cleanPin);
 if (matchingRef) {
  setCurrentReferee(matchingRef);
  setAuthRole('supervisor');
  return true;
 }

 return false;
 };

 const loginDesk = (pin: string): boolean => {
 const cleanPin = pin.trim();
 if (!cleanPin) return false;
 if (cleanPin === deskPin || cleanPin === '2026') {
  setAuthRole('desk');
  return true;
 }
 return false;
 };

 const logoutReferee = () => {
 setCurrentReferee(null);
 };

 const logoutAuth = () => {
 setCurrentReferee(null);
 setAuthRole('none');
 };

 const updateMatch = (updated: MatchItem) => {
 setMatches((prev) => {
  const next = prev.map((m) => (m.id === updated.id ? updated : m));
  broadcastAndSyncSingleMatch(updated, next);
  return next;
 });
 };

 const saveMatchSetup = (
 matchId: string,
 data: {
  durum: MatchItem['Durum'];
  kuraKazanan: string;
  kuraTercih: string;
  sahaTarafi: string;
  baslangicSaati: string;
  bitisSaati: string;
  skorFormati?: string;
  ilkServisOyuncusu?: 1 | 2;
 }
 ) => {
 if (!matchId) return;
 setMatches((prev) => {
  let updatedItem: MatchItem | null = null;
  const next = prev.map((m) => {
   if (!m.id || m.id !== matchId) return m;

   let detState = m.detailedState;
   const chosenFormat = data.skorFormati || m.Skor_Formati || '3 Normal Set';

   if (!detState || (m.Durum === 'Baslamadi' && data.durum === 'Oynaniyor')) {
   let server: 1 | 2 = 1;
   if (data.kuraKazanan && data.kuraTercih) {
    if (data.kuraTercih === 'Servis') {
    server = data.kuraKazanan === m['Oyuncu 1'] ? 1 : 2;
    } else if (data.kuraTercih === 'Karşılama') {
    server = data.kuraKazanan === m['Oyuncu 1'] ? 2 : 1;
    }
   }
   if (data.ilkServisOyuncusu) {
    server = data.ilkServisOyuncusu;
   }
   detState = createInitialMatchState(server, chosenFormat);
   }

   let setupStartTs = m.startTimeTimestamp;
   if (data.baslangicSaati && data.baslangicSaati !== 'Secilmedi') {
   const parts = data.baslangicSaati.split(':');
   if (parts.length >= 2) {
    const d = new Date();
    d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    const candidate = d.getTime();
    setupStartTs = candidate <= Date.now() ? candidate : candidate - 86400000;
   }
   }
   if (!setupStartTs) setupStartTs = Date.now();

   let setupEndTs: number | undefined = undefined;
   if (data.bitisSaati && data.bitisSaati !== 'Secilmedi') {
   const parts = data.bitisSaati.split(':');
   if (parts.length >= 2) {
    const d = new Date();
    d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    setupEndTs = d.getTime();
    if (setupEndTs < setupStartTs) setupEndTs += 86400000;
   }
   }

   const res: MatchItem = {
   ...m,
   Durum: data.durum,
   Kura_Kazanan: data.kuraKazanan,
   Kura_Tercih: data.kuraTercih,
   Saha_Tarafi: data.sahaTarafi,
   Baslangic_Saati: data.baslangicSaati,
   startTimeTimestamp: setupStartTs,
   Bitis_Saati: data.bitisSaati,
   lastPausedTimestamp: setupEndTs,
   totalDurationSeconds: (data.durum === 'Bitti' || data.durum === 'Retired' || data.durum === 'Walkover') && setupEndTs
    ? Math.floor(Math.max(0, setupEndTs - setupStartTs) / 1000)
    : undefined,
   Skor_Formati: chosenFormat,
   Son_Hakem: currentReferee ? currentReferee.name : 'Turnuva Masası',
   detailedState: detState,
   };
   updatedItem = res;
   return res;
  });

  if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
  return next;
 });
 };

 const awardPointToMatch = (
 matchId: string,
 playerWon: 1 | 2,
 pointType: PointType = 'NORMAL'
 ) => {
 if (!matchId) return;

 setMatches((prev) => {
  let updatedItem: MatchItem | null = null;
  const next = prev.map((m) => {
   if (!m.id || m.id !== matchId) return m;

   const currState =
   m.detailedState ||
   createInitialMatchState(1, m.Skor_Formati || '3 Normal Set');

   const format = m.Skor_Formati || '3 Normal Set';

   const matchSafetyCheck = checkMatchWinner(currState, format);

   if (matchSafetyCheck.matchEnded || m.Durum === 'Bitti' || m.Durum === 'Retired' || m.Durum === 'Walkover') {
   return m;
   }

   const p1Name = m['Oyuncu 1'];
   const p2Name = m['Oyuncu 2'];

   const { nextState, matchEnded, matchWinner } = awardPoint(
   currState,
   playerWon,
   pointType,
   format,
   p1Name,
   p2Name
   );

   const newScoreStr = formatScoreString(nextState);

   let newDurum = m.Durum;
   let newKazanan = m.Kazanan;
   let bitis = m.Bitis_Saati;
   let startTs = m.startTimeTimestamp;
   let startFormatted = m.Baslangic_Saati;
   let totalDuration = m.totalDurationSeconds;

   if (matchEnded) {
   newDurum = 'Bitti';
   newKazanan = matchWinner === 1 ? p1Name : p2Name;
   bitis = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
   totalDuration = calculateMatchDurationSeconds({ ...m, Bitis_Saati: bitis });
   } else if (newDurum === 'Baslamadi') {
   newDurum = 'Oynaniyor';
   if (!startTs) startTs = Date.now();
   if (!startFormatted) startFormatted = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
   }

   if (newDurum === 'Oynaniyor' || newDurum === 'Duraklatildi') {
   totalDuration = undefined;
   }

   const res: MatchItem = {
   ...m,
   Skor: newScoreStr,
   Durum: newDurum,
   Kazanan: newKazanan,
   Baslangic_Saati: startFormatted,
   startTimeTimestamp: startTs,
   Bitis_Saati: bitis,
   totalDurationSeconds: totalDuration,
   Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem,
   detailedState: nextState,
   };
   updatedItem = res;
   return res;
  });

  if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
  return next;
 });
 };

 const undoLastPoint = (matchId: string) => {
 if (!matchId) return;
 setMatches((prev) => {
  let updatedItem: MatchItem | null = null;
  const next = prev.map((m) => {
   if (!m.id || m.id !== matchId) return m;
   if (!m.pointHistory || m.pointHistory.length === 0) return m;

   const history = [...m.pointHistory];
   const lastItem = history.pop();
   if (!lastItem) return m;

   const restoredState = lastItem.snapshot;
   restoredState.lastActionMessage = `Geri alındı: ${lastItem.description}`;

   const res: MatchItem = {
   ...m,
   Skor: formatScoreString(restoredState),
   Durum: m.Durum === 'Bitti' ? 'Oynaniyor' : m.Durum,
   Kazanan: m.Durum === 'Bitti' ? 'Secilmedi' : m.Kazanan,
   detailedState: restoredState,
   pointHistory: history,
   };
   updatedItem = res;
   return res;
  });

  if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
  return next;
 });
 };

 const recordChallenge = () => {};

 const setMatchStatus = (
 matchId: string,
 status: MatchStatus,
 winner?: string,
 endTime?: string
 ) => {
 if (!matchId) return;
 const now = Date.now();
 const nowFormatted = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

 setMatches((prev) => {
  let updatedItem: MatchItem | null = null;
  const next = prev.map((m) => {
   if (m.id !== matchId) return m;

   let startTs = m.startTimeTimestamp;
   let pausedAcc = m.pausedAccumulatedMs || 0;
   let lastPausedTs = m.lastPausedTimestamp;
   let startFormatted = m.Baslangic_Saati;
   let endFormatted = endTime || m.Bitis_Saati;
   let totalDuration = m.totalDurationSeconds;

   if (status === 'Oynaniyor') {
   if (!startTs) {
    startTs = now;
    if (!startFormatted) startFormatted = nowFormatted;
   }
   if (m.Durum === 'Duraklatildi' && lastPausedTs) {
    pausedAcc += Math.max(0, now - lastPausedTs);
    lastPausedTs = undefined;
   }
   totalDuration = undefined;
   } else if (status === 'Duraklatildi') {
   if (!lastPausedTs) lastPausedTs = now;
   } else if (status === 'Bitti' || status === 'Retired' || status === 'Walkover') {
   if (!endFormatted) endFormatted = nowFormatted;
   totalDuration = calculateMatchDurationSeconds({ ...m, startTimeTimestamp: startTs, Bitis_Saati: endFormatted }, now);
   }

   const nextWinner = status === 'Oynaniyor' ? 'Secilmedi' : (winner || m.Kazanan);
   const res: MatchItem = {
   ...m,
   Durum: status,
   startTimeTimestamp: startTs,
   pausedAccumulatedMs: pausedAcc,
   lastPausedTimestamp: lastPausedTs,
   totalDurationSeconds: totalDuration,
   Baslangic_Saati: startFormatted,
   Kazanan: nextWinner,
   Bitis_Saati: status === 'Oynaniyor' ? '' : endFormatted,
   Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem,
   };
   updatedItem = res;
   return res;
  });

  if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
  return next;
 });
 };

 const resumeMatchToLive = (matchId: string) => {};
 const resetMatchScore = (matchId: string) => {};
 const manualUpdateScoreString = () => {};

 const addReferee = (name: string, pin: string) => {
 if (!name.trim() || !pin.trim()) return;
 setReferees((prev) => {
  const next = [...prev.filter((r) => r.name.toLowerCase() !== name.trim().toLowerCase()), { name: name.trim(), pin: pin.trim() }];
  pushRefereesToCloud(next);
  return next;
 });
 };

 const deleteReferee = (name: string) => {
 setReferees((prev) => {
  const next = prev.filter((r) => r.name !== name);
  pushRefereesToCloud(next);
  return next;
 });
 };

 const updateCategoryFormat = () => {};
 const bulkApplyCategoryFormats = (formatMap: Record<string, string>) => {
 setCategoryFormats(formatMap);
 pushCategoryFormatsToCloud(formatMap);
 };

 const importMatchesList = (newMatches: MatchItem[]) => {
 const sanitized = sanitizeMatchList(newMatches);
 setMatches(sanitized);
 replaceAllMatchesInCloud(sanitized, 'Turnuva Masası');
 };

 const resetTournamentToDefault = () => {};
 const setActiveMatchId = (id: string | null) => { _setActiveMatchId(id); };

 const saveDirectScoreAndStatus = (
 matchId: string,
 data: {
  s1_p1: number;
  s1_p2: number;
  s2_p1: number;
  s2_p2: number;
  s3_p1: number;
  s3_p2: number;
  status: MatchStatus;
  winner?: string;
  startTime?: string;
  endTime?: string;
 }
 ) => {
 if (!matchId) return;
 setMatches((prev) => {
  let updatedMatchObj: MatchItem | null = null;
  const next = prev.map((m) => {
   if (m.id !== matchId) return m;

   const format = m.Skor_Formati || '3 Normal Set';
   const newScoreStr = buildScoreString(data.s1_p1, data.s1_p2, data.s2_p1, data.s2_p2, data.s3_p1, data.s3_p2);

   const state: TennisMatchState = m.detailedState
   ? JSON.parse(JSON.stringify(m.detailedState))
   : createInitialMatchState(1, format);
   state.set1_p1 = data.s1_p1;
   state.set1_p2 = data.s1_p2;
   state.set2_p1 = data.s2_p1;
   state.set2_p2 = data.s2_p2;
   state.set3_p1 = data.s3_p1;
   state.set3_p2 = data.s3_p2;

   const res: MatchItem = {
   ...m,
   Skor: newScoreStr,
   Durum: data.status,
   Kazanan: data.status === 'Oynaniyor' ? 'Secilmedi' : (data.winner || m.Kazanan),
   Baslangic_Saati: data.startTime || m.Baslangic_Saati,
   Bitis_Saati: data.status === 'Oynaniyor' ? '' : (data.endTime || m.Bitis_Saati),
   detailedState: state,
   Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem,
   };
   updatedMatchObj = res;
   return res;
  });

  if (updatedMatchObj) broadcastAndSyncSingleMatch(updatedMatchObj, next);
  return next;
 });
 };

 return (
 <TennisDataContext.Provider
 value={{
  matches, referees, currentReferee, categoryFormats, activeMatchId, activeMatch, authRole, deskPin, cloudSyncStatus, lastCloudSync, tournamentNotice, updateTournamentNotice,
  syncWithCloudNow, pullFromCloudNow, forcePushAllToCloud, clearLocalCacheAndResetFromCloud, resetAllScores, loginReferee, loginRefereeDirect, loginSupervisorByPin, loginDesk, logoutReferee, logoutAuth, setAuthRole, updateDeskPin, setActiveMatchId, updateMatch, updateGameScore: () => {}, setDirectSetScores: () => {}, saveDirectScoreAndStatus, finishAndReportMatch: () => {}, saveMatchSetup, awardPointToMatch, undoLastPoint, recordChallenge, setMatchStatus, resumeMatchToLive, resetMatchScore, manualUpdateScoreString, addReferee, deleteReferee, updateCategoryFormat, bulkApplyCategoryFormats, importMatchesList, resetTournamentToDefault
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
