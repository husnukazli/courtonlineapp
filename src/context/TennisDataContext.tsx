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
 purgeOrphanMatchesFromCloud,
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
 syncWithCloudNow: () => void;
 pullFromCloudNow: () => Promise<boolean>;
 forcePushAllToCloud: () => Promise<void>;
 clearLocalCacheAndResetFromCloud: () => Promise<boolean>;
 tournamentId: string;
 setTournamentId: (id: string) => void;
 purgeOrphanMatches: () => Promise<number>;
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
 tournamentInfo: { ad: string; yer: string; tarih: string; not: string };
 saveTournamentInfo: (info: { ad: string; yer: string; tarih: string; not: string }) => void;
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
 const [tournamentId, setTournamentId] = useState<string>(() => {
 return localStorage.getItem('courtonline_current_tournament_id') || 'main';
 });

 // ────────────────────────────────────────────────────────────────────────
 // DİNAMİK HAFIZA ANAHTARLARI: Klon turnuvaların verilerini tarayıcıda izole eder
 // ────────────────────────────────────────────────────────────────────────
 const getStorageKey = (baseKey: string) => `${baseKey}_${tournamentId}`;

 const [deskPin, setDeskPin] = useState<string>(() => {
 return localStorage.getItem(`courtonline_desk_pin_v2_${localStorage.getItem('courtonline_current_tournament_id') || 'main'}`) || '2026';
 });

 const [authRole, setAuthRoleState] = useState<'none' | 'supervisor' | 'desk'>(() => {
 const savedRole = sessionStorage.getItem(`courtonline_auth_role_v2_${localStorage.getItem('courtonline_current_tournament_id') || 'main'}`);
 if (savedRole === 'supervisor' || savedRole === 'desk') {
 return savedRole as 'supervisor' | 'desk';
 }
 return 'none';
 });

 const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('connected');
 const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);

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
 sessionStorage.removeItem(getStorageKey(STORAGE_KEYS.AUTH_ROLE));
 } else {
 sessionStorage.setItem(getStorageKey(STORAGE_KEYS.AUTH_ROLE), role);
 }
 };

 const updateDeskPin = (newPin: string) => {
 if (!newPin.trim() || newPin.trim().length < 2) return;
 setDeskPin(newPin.trim());
 localStorage.setItem(getStorageKey(STORAGE_KEYS.DESK_PIN), newPin.trim());
 pushDeskPinToCloud(newPin.trim());
 };

 const [matches, setMatches] = useState<MatchItem[]>([]);

 const [referees, setReferees] = useState<RefereeUser[]>(() => {
 const saved = localStorage.getItem(`courtonline_referees_v2_${localStorage.getItem('courtonline_current_tournament_id') || 'main'}`);
 if (saved) {
 try {
 return JSON.parse(saved);
 } catch (e) {
 console.error('Failed to parse referees', e);
 }
 }
 return INITIAL_REFEREES;
 });

 const [currentReferee, setCurrentReferee] = useState<RefereeUser | null>(() => {
 const saved = sessionStorage.getItem(`courtonline_curr_ref_v2_${localStorage.getItem('courtonline_current_tournament_id') || 'main'}`);
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
 const saved = localStorage.getItem(`courtonline_cat_formats_v2_${localStorage.getItem('courtonline_current_tournament_id') || 'main'}`);
 if (saved) {
 try {
 return JSON.parse(saved);
 } catch (e) {
 console.error(e);
 }
 }
 return INITIAL_CATEGORY_FORMAT_MEMORY;
 });

 const [activeMatchId, setActiveMatchId] = useState<string | null>(() => {
 return localStorage.getItem(`courtonline_active_match_id_v2_${localStorage.getItem('courtonline_current_tournament_id') || 'main'}`) || 'm-9';
 });

 useEffect(() => {
 localStorage.setItem('courtonline_current_tournament_id', tournamentId);
 }, [tournamentId]);

 useEffect(() => {
 if (matches && matches.length > 0) {
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(matches));
 }
 }, [matches, tournamentId]);

 useEffect(() => {
 localStorage.setItem(getStorageKey(STORAGE_KEYS.REFEREES), JSON.stringify(referees));
 }, [referees, tournamentId]);

 useEffect(() => {
 if (currentReferee) {
 sessionStorage.setItem(getStorageKey(STORAGE_KEYS.CURRENT_REF), JSON.stringify(currentReferee));
 } else {
 sessionStorage.removeItem(getStorageKey(STORAGE_KEYS.CURRENT_REF));
 }
 }, [currentReferee, tournamentId]);

 useEffect(() => {
 localStorage.setItem(getStorageKey(STORAGE_KEYS.CATEGORY_FORMATS), JSON.stringify(categoryFormats));
 }, [categoryFormats, tournamentId]);

 useEffect(() => {
 if (activeMatchId) {
 localStorage.setItem(getStorageKey(STORAGE_KEYS.ACTIVE_MATCH_ID), activeMatchId);
 } else {
 localStorage.removeItem(getStorageKey(STORAGE_KEYS.ACTIVE_MATCH_ID));
 }
 }, [activeMatchId, tournamentId]);

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
 if (event.key === getStorageKey(STORAGE_KEYS.MATCHES) && event.newValue) {
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
 }, [tournamentId]);

 useEffect(() => {
 if (!tournamentId) return;

 // Turnuva değiştiğinde local state'leri bellekten taze yükle
 const localSavedMatches = localStorage.getItem(getStorageKey(STORAGE_KEYS.MATCHES));
 if (localSavedMatches) {
 try { setMatches(JSON.parse(localSavedMatches)); } catch { setMatches([]); }
 } else {
 setMatches([]);
 }

 const localSavedReferees = localStorage.getItem(getStorageKey(STORAGE_KEYS.REFEREES));
 if (localSavedReferees) {
 try { setReferees(JSON.parse(localSavedReferees)); } catch { setReferees(INITIAL_REFEREES); }
 } else {
 setReferees(INITIAL_REFEREES);
 }

 const localSavedPin = localStorage.getItem(getStorageKey(STORAGE_KEYS.DESK_PIN));
 setDeskPin(localSavedPin || '2026');

 fetchTournamentFromCloud(tournamentId).then((remote) => {
 if (remote) {
 if (Array.isArray(remote.matches) && remote.matches.length > 0) {
 const sanitized = sanitizeMatchList(remote.matches);
 setMatches(sanitized);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(sanitized));
 }
 if (remote.referees && remote.referees.length > 0) {
 setReferees(remote.referees);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.REFEREES), JSON.stringify(remote.referees));
 }
 if (remote.categoryFormats) {
 setCategoryFormats(remote.categoryFormats);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.CATEGORY_FORMATS), JSON.stringify(remote.categoryFormats));
 }
 if (remote.deskPin) {
 setDeskPin(remote.deskPin);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.DESK_PIN), remote.deskPin);
 }
 }
 }).catch((e) => console.warn('Initial cloud fetch error:', e));

 const unsubscribe = subscribeToCloudTournament(
 tournamentId,
 (remoteMatches) => {
 setCloudSyncStatus('connected');
 setLastCloudSync(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

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
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(nextList));
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
 localStorage.setItem(getStorageKey(STORAGE_KEYS.REFEREES), JSON.stringify(meta.referees));
 }
 if (meta.categoryFormats && Object.keys(meta.categoryFormats).length > 0) {
 setCategoryFormats(meta.categoryFormats);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.CATEGORY_FORMATS), JSON.stringify(meta.categoryFormats));
 }
 if (meta.deskPin) {
 setDeskPin(meta.deskPin);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.DESK_PIN), meta.deskPin);
 }
 },
 () => {}
 );

 return () => {
 unsubscribe();
 };
 }, [tournamentId]);

 const broadcastAndSyncSingleMatch = (updatedMatch: MatchItem, allMatchesList?: MatchItem[]) => {
 if (!tournamentId) return;
 const fullList = allMatchesList || matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m));
 try {
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(fullList));
 if (broadcastChannelRef.current) {
 broadcastChannelRef.current.postMessage({ type: 'MATCH_UPDATED', match: updatedMatch, matches: fullList });
 }
 } catch {
 // ignore
 }

 setCloudSyncStatus('syncing');
 pushSingleMatchToCloud(updatedMatch, currentReferee?.name || 'Turnuva Masası', fullList, tournamentId)
 .then(() => {
 setCloudSyncStatus('connected');
 setLastCloudSync(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
 })
 .catch((err) => {
 console.warn('Sync match note:', err);
 setCloudSyncStatus('connected');
 });
 };

 const broadcastAndSyncMatches = (newMatches: MatchItem[]) => {
 if (!tournamentId) return;
 try {
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(newMatches));
 if (broadcastChannelRef.current) {
 broadcastChannelRef.current.postMessage({ type: 'MATCHES_UPDATED', matches: newMatches });
 }
 } catch {
 // ignore
 }

 setCloudSyncStatus('syncing');
 pushAllMatchesToCloud(newMatches, currentReferee?.name || 'Turnuva Masası', tournamentId)
 .then(() => {
 setCloudSyncStatus('connected');
 setLastCloudSync(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
 })
 .catch(() => {
 setCloudSyncStatus('connected');
 });
 };

 const pullFromCloudNow = async (): Promise<boolean> => {
 setCloudSyncStatus('syncing');
 try {
 const remote = await fetchTournamentFromCloud(tournamentId);
 if (remote && Array.isArray(remote.matches) && remote.matches.length > 0) {
 const sanitized = sanitizeMatchList(remote.matches);
 setMatches(sanitized);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(sanitized));
 if (remote.referees && remote.referees.length > 0) {
 setReferees(remote.referees);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.REFEREES), JSON.stringify(remote.referees));
 }
 if (remote.deskPin) {
 setDeskPin(remote.deskPin);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.DESK_PIN), remote.deskPin);
 }
 setCloudSyncStatus('connected');
 return true;
 }
 return false;
 } catch (err) {
 setCloudSyncStatus('offline');
 return false;
 }
 };

 const clearLocalCacheAndResetFromCloud = async (): Promise<boolean> => {
 setCloudSyncStatus('syncing');
 try {
 localStorage.removeItem(getStorageKey(STORAGE_KEYS.MATCHES));
 localStorage.removeItem(getStorageKey(STORAGE_KEYS.REFEREES));
 localStorage.removeItem(getStorageKey(STORAGE_KEYS.CATEGORY_FORMATS));
 localStorage.removeItem(getStorageKey(STORAGE_KEYS.DESK_PIN));

 const remote = await fetchTournamentFromCloud(tournamentId);
 if (remote) {
 if (Array.isArray(remote.matches) && remote.matches.length > 0) {
 const sanitized = sanitizeMatchList(remote.matches);
 setMatches(sanitized);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(sanitized));
 }
 if (remote.referees && remote.referees.length > 0) {
 setReferees(remote.referees);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.REFEREES), JSON.stringify(remote.referees));
 }
 if (remote.deskPin) {
 setDeskPin(remote.deskPin);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.DESK_PIN), remote.deskPin);
 }
 }
 setCloudSyncStatus('connected');
 return true;
 } catch (err) {
 setCloudSyncStatus('offline');
 return false;
 }
 };

 const forcePushAllToCloud = async () => {
 setCloudSyncStatus('syncing');
 try {
 await replaceAllMatchesInCloud(matches, currentReferee?.name || 'Turnuva Masası', tournamentId);
 await pushRefereesToCloud(referees, tournamentId);
 await pushCategoryFormatsToCloud(categoryFormats);
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
 disputeHistory: [],
 pausedAccumulatedMs: 0,
 startTimeTimestamp: undefined,
 totalDurationSeconds: 0,
 Son_Guncelleme: new Date().toISOString(),
 Son_Hakem: currentReferee?.name || 'Turnuva Masası',
 };
 });
 setMatches(cleanMatches);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(cleanMatches));
 replaceAllMatchesInCloud(cleanMatches, currentReferee?.name || 'Turnuva Masası', tournamentId);
 };

 const syncWithCloudNow = () => { pullFromCloudNow(); };

 const loginReferee = (name: string, pin: string): boolean => {
 const found = referees.find((r) => r.name.toLowerCase() === name.toLowerCase() && r.pin === pin);
 if (found) {
 setCurrentReferee(found);
 setAuthRole('supervisor');
 return true;
 }
 return false;
 };

 const loginRefereeDirect = (name?: string) => {};

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
 return cleanPin === deskPin || cleanPin === '2026' || cleanPin === '1923';
 };

 const logoutReferee = () => { setCurrentReferee(null); };
 const logoutAuth = () => { setCurrentReferee(null); setAuthRole('none'); };

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
 else broadcastAndSyncMatches(next);
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

 const historyItem: PointHistoryItem = {
 id: 'pt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
 timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
 playerWon,
 playerName: playerWon === 1 ? p1Name : p2Name,
 pointType,
 description: `${playerWon === 1 ? p1Name : p2Name} (+1 Puan, ${pointType})`,
 snapshot: JSON.parse(JSON.stringify(currState)),
 scoreDisplay: formatScoreString(currState) + ` [${currState.gamePoint_p1}-${currState.gamePoint_p2}]`,
 };

 const { nextState, matchEnded, matchWinner } = awardPoint(
 currState,
 playerWon,
 pointType,
 format,
 p1Name,
 p2Name
 );

 const newScoreStr = formatScoreString(nextState);
 const updatedHistory = [...(m.pointHistory || []), historyItem];

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
 pointHistory: updatedHistory,
 };
 updatedItem = res;
 return res;
 });

 if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
 else broadcastAndSyncMatches(next);
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
 else broadcastAndSyncMatches(next);
 return next;
 });
 };

 const importMatchesList = (newMatches: MatchItem[]) => {
 if (!tournamentId) return;
 const localizedMatches = newMatches.map(m => ({
 ...m,
 tournamentId: tournamentId,
 Son_Guncelleme: new Date().toISOString()
 }));
 const sanitized = sanitizeMatchList(localizedMatches);
 setMatches(sanitized);
 localStorage.setItem(getStorageKey(STORAGE_KEYS.MATCHES), JSON.stringify(sanitized));
 if (broadcastChannelRef.current) {
 broadcastChannelRef.current.postMessage({ type: 'MATCHES_UPDATED', matches: sanitized });
 }
 setCloudSyncStatus('syncing');
 replaceAllMatchesInCloud(sanitized, currentReferee?.name || 'Turnuva Masası', tournamentId)
 .then(() => {
 setCloudSyncStatus('connected');
 })
 .catch(e => console.error("JSON cloud import error:", e));
 };

 const recordChallenge = (
 matchId: string,
 player: 1 | 2,
 outcome: 'UPHELD' | 'OVERTURNED',
 reason: 'LINE_CALL' | 'OVERRULE' | 'SERVICE_FAULT' | 'TOUCH_NET' | 'LET_POINT',
 notes?: string,
 actionType?: 'REPLAY_POINT' | 'AWARD_POINT' | 'KEEP_DECISION'
 ) => {
 if (!matchId) return;
 setMatches((prev) => {
 const next = prev.map((m) => {
 if (m.id !== matchId) return m;
 const stateCopy = JSON.parse(JSON.stringify(m.detailedState || {}));
 if (outcome === 'UPHELD') {
 if (player === 1) stateCopy.p1ChallengesLeft = Math.max(0, (stateCopy.p1ChallengesLeft ?? 3) - 1);
 else stateCopy.p2ChallengesLeft = Math.max(0, (stateCopy.p2ChallengesLeft ?? 3) - 1);
 }
 const record = {
 id: 'ch-' + Date.now(),
 timestamp: new Date().toLocaleTimeString('tr-TR'),
 player,
 outcome,
 reason,
 notes: notes || '',
 };
 return {
 ...m,
 detailedState: stateCopy,
 disputeHistory: [...(m.disputeHistory || []), record],
 Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem,
 };
 });
 broadcastAndSyncMatches(next);
 return next;
 });
 };

 const setMatchStatus = (
 matchId: string,
 status: MatchItem['Durum'],
 winner?: string,
 endTime?: string
 ) => {
 if (!matchId) return;
 setMatches((prev) => {
 let updatedItem: MatchItem | null = null;
 const next = prev.map((m) => {
 if (m.id !== matchId) return m;
 const isEnding = ['Bitti', 'Retired', 'Walkover'].includes(status);
 const res: MatchItem = {
 ...m,
 Durum: status,
 Kazanan: winner || m.Kazanan,
 Bitis_Saati: endTime || (isEnding ? new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : m.Bitis_Saati),
 totalDurationSeconds: isEnding ? calculateMatchDurationSeconds({ ...m, Durum: status, Bitis_Saati: endTime || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }) : m.totalDurationSeconds,
 Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem,
 };
 updatedItem = res;
 return res;
 });
 if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
 return next;
 });
 };

 const resumeMatchToLive = (matchId: string) => {
 if (!matchId) return;
 setMatches((prev) => {
 const next = prev.map((m) => {
 if (m.id !== matchId) return m;
 return { ...m, Durum: 'Oynaniyor' as MatchStatus, Kazanan: 'Secilmedi', Bitis_Saati: 'Secilmedi' };
 });
 broadcastAndSyncMatches(next);
 return next;
 });
 };

 const resetMatchScore = (matchId: string) => {
 if (!matchId) return;
 setMatches((prev) => {
 const next = prev.map((m) => {
 if (m.id !== matchId) return m;
 return {
 ...m,
 Skor: '-',
 Durum: 'Baslamadi' as MatchStatus,
 Kazanan: 'Secilmedi',
 detailedState: createInitialMatchState(1, m.Skor_Formati || '3 Normal Set'),
 pointHistory: [],
 disputeHistory: [],
 };
 });
 broadcastAndSyncMatches(next);
 return next;
 });
 };

 const manualUpdateScoreString = (
 matchId: string,
 skorStr: string,
 durum: MatchItem['Durum'],
 kazanan: string,
 bitisSaati: string
 ) => {
 if (!matchId) return;
 setMatches((prev) => {
 const next = prev.map((m) => {
 if (m.id !== matchId) return m;
 return { ...m, Skor: skorStr, Durum: durum, Kazanan: kazanan, Bitis_Saati: bitisSaati };
 });
 broadcastAndSyncMatches(next);
 return next;
 });
 };

 const addReferee = (name: string, pin: string) => {
 if (!name.trim() || !pin.trim()) return;
 setReferees((prev) => [...prev, { name: name.trim(), pin: pin.trim() }]);
 };

 const deleteReferee = (name: string) => {
 setReferees((prev) => prev.filter((r) => r.name !== name));
 };

 const updateCategoryFormat = (category: string, format: string) => {
 setCategoryFormats((prev) => ({ ...prev, [category]: format }));
 };

 const bulkApplyCategoryFormats = (formatMap: Record<string, string>) => {
 setCategoryFormats((prev) => ({ ...prev, ...formatMap }));
 };

 const [tournamentInfoState, setTournamentInfoState] = useState({ ad: '', yer: '', tarih: '', not: '' });
 const saveTournamentInfo = (info: { ad: string; yer: string; tarih: string; not: string }) => {
 setTournamentInfoState(info);
 };

 const updateGameScore = (matchId: string, setIndex: 1 | 2 | 3, player: 1 | 2, delta: number) => {};
 const setDirectSetScores = (matchId: string, s1_p1: number, s1_p2: number, s2_p1: number, s2_p2: number, s3_p1: number, s3_p2: number) => {};
 
 const saveDirectScoreAndStatus = (matchId: string, data: any) => {
 if (!matchId) return;
 setMatches((prev) => {
 const next = prev.map((m) => {
 if (m.id !== matchId) return m;
 const dState = m.detailedState || createInitialMatchState(1, m.Skor_Formati || '3 Normal Set');
 dState.set1_p1 = data.s1_p1; dState.set1_p2 = data.s1_p2;
 dState.set2_p1 = data.s2_p1; dState.set2_p2 = data.s2_p2;
 dState.set3_p1 = data.s3_p1; dState.set3_p2 = data.s3_p2;
 return {
 ...m,
 Durum: data.status,
 Kazanan: data.winner || m.Kazanan,
 Baslangic_Saati: data.startTime || m.Baslangic_Saati,
 Bitis_Saati: data.endTime || m.Bitis_Saati,
 detailedState: dState,
 Skor: buildScoreString(data.s1_p1, data.s1_p2, data.s2_p1, data.s2_p2, data.s3_p1, data.s3_p2),
 };
 });
 broadcastAndSyncMatches(next);
 return next;
 });
 };

 const finishAndReportMatch = (matchId: string, winner: string, status?: MatchStatus, customScore?: string, startTime?: string, endTime?: string) => {};
 const resetTournamentToDefault = () => {};

 return (
 <TennisDataContext.Provider
 value={{
 matches,
 referees,
 currentReferee,
 categoryFormats,
 activeMatchId,
 activeMatch: matches.find((m) => m.id === activeMatchId) || null,
 authRole,
 deskPin,
 cloudSyncStatus,
 lastCloudSync,
 syncWithCloudNow,
 pullFromCloudNow,
 forcePushAllToCloud,
 clearLocalCacheAndResetFromCloud,
 tournamentId,
 setTournamentId,
 purgeOrphanMatches: async () => 0,
 resetAllScores,
 loginReferee,
 loginRefereeDirect,
 loginSupervisorByPin,
 loginDesk,
 logoutReferee,
 logoutAuth,
 setAuthRole,
 updateDeskPin,
 setActiveMatchId,
 updateMatch,
 updateGameScore,
 setDirectSetScores,
 saveDirectScoreAndStatus,
 finishAndReportMatch,
 saveMatchSetup,
 awardPointToMatch,
 undoLastPoint,
 recordChallenge,
 setMatchStatus,
 resumeMatchToLive,
 resetMatchScore,
 manualUpdateScoreString,
 addReferee,
 deleteReferee,
 updateCategoryFormat,
 bulkApplyCategoryFormats,
 tournamentInfo: tournamentInfoState,
 saveTournamentInfo,
 importMatchesList,
 resetTournamentToDefault,
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
