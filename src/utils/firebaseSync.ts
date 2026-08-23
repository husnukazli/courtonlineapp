/**
 * firebaseSync.ts
 *
 * Tüm veri senkronizasyonu Firebase Firestore üzerinden yapılır.
 * - Google hesabı / Auth YOKTUR — Firestore güvenlik kuralları herkese açık
 * - Render restart/deploy'dan etkilenmez, veriler Firestore'da kalıcıdır
 * - Gerçek zamanlı sync: onSnapshot ile tüm bağlı cihazlar anında güncellenir
 *
 * Firestore yapısı:
 *   tournaments/main              → { referees, categoryFormats, deskPin, version, ... }
 *   tournaments/main/matches/{id} → her maç ayrı document
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,/**
 * firebaseSync.ts
 *
 * Tüm veri senkronizasyonu Firebase Firestore üzerinden yapılır.
 * - Google hesabı / Auth YOKTUR — Firestore güvenlik kuralları herkese açık
 * - Render restart/deploy'dan etkilenmez, veriler Firestore'da kalıcıdır
 * - Gerçek zamanlı sync: onSnapshot ile tüm bağlı cihazlar anında güncellenir
 *
 * Firestore yapısı:
 *   tournaments/main              → { referees, categoryFormats, deskPin, version, ... }
 *   tournaments/main/matches/{id} → her maç ayrı document
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  writeBatch,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentData,
  DocumentChange,
  FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchItem, RefereeUser } from '../types/tennis';

// ─── Firestore referansları ──────────────────────────────────────────────────
const TOURNAMENT_DOC = doc(db, 'tournaments', 'main');
const MATCHES_COL    = collection(db, 'tournaments', 'main', 'matches');
const matchDoc = (id: string) => doc(db, 'tournaments', 'main', 'matches', id);

// ─── Context'in import ettiği tip (değişmedi) ────────────────────────────────
export interface CloudTournamentMetadata {
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  lastUpdated?: string;
  updatedBy?: string;
  tournamentVersion?: number;
  matches?: MatchItem[];
}

// Tekil maç güncellemelerinde prev listesinin bozulmaması için bayrak
let isApplyingRemoteChange = false;
export const getIsApplyingRemoteChange = () => isApplyingRemoteChange;

// ─── Gerçek Zamanlı Dinleyici ────────────────────────────────────────────────
export const subscribeToCloudTournament = (
  onMatchesUpdate: (matches: MatchItem[]) => void,
  onMetaUpdate:    (meta: CloudTournamentMetadata) => void,
  onError?:        (err: Error) => void
): (() => void) => {

  // 1) Meta dinleyicisi (referees, formats, pin)
  const unsubMeta = onSnapshot(
    TOURNAMENT_DOC,
    (snap: DocumentSnapshot<DocumentData>) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onMetaUpdate({
        referees:          d.referees,
        categoryFormats:   d.categoryFormats,
        deskPin:           d.deskPin,
        lastUpdated:       d.lastUpdated,
        updatedBy:         d.updatedBy,
        tournamentVersion: d.version,
      });
    },
    (err: FirestoreError) => { if (onError) onError(err); }
  );

  // 2) Maçlar koleksiyonu dinleyicisi — her maç ayrı document
  const unsubMatches = onSnapshot(
    MATCHES_COL,
    (snap: QuerySnapshot<DocumentData>) => {
      isApplyingRemoteChange = true;
      const changed: MatchItem[] = [];
      snap.docChanges().forEach((change: DocumentChange<DocumentData>) => {
        if (change.type === 'added' || change.type === 'modified') {
          changed.push({ id: change.doc.id, ...change.doc.data() } as MatchItem);
        }
      });
      if (changed.length > 0) {
        onMatchesUpdate(changed);
      }
      setTimeout(() => { isApplyingRemoteChange = false; }, 150);
    },
    (err: FirestoreError) => { if (onError) onError(err); }
  );

  return () => {
    unsubMeta();
    unsubMatches();
  };
};

// ─── Tek Maç Güncelleme ──────────────────────────────────────────────────────
export const pushSingleMatchToCloud = async (
  match: MatchItem,
  author = 'Saha Gözlemcisi',
  _allMatchesList?: MatchItem[]   // context imzasını korumak için
): Promise<boolean> => {
  if (!match || !match.id) return false;
  try {
    await setDoc(
      matchDoc(match.id),
      { ...match, Son_Guncelleme: new Date().toISOString() },
      { merge: true }
    );
    updateDoc(TOURNAMENT_DOC, {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }).catch(() => {/* meta henüz yoksa geç */});
    return true;
  } catch (e) {
    console.error('pushSingleMatchToCloud hata:', e);
    return false;
  }
};

// ─── Toplu Maç Güncelleme ────────────────────────────────────────────────────
export const pushAllMatchesToCloud = async (
  matches: MatchItem[],
  author = 'Saha Gözlemcisi'
): Promise<boolean> => {
  if (!Array.isArray(matches)) return false;
  try {
    const CHUNK = 400; // Firestore batch limiti 500, güvenli sınır
    for (let i = 0; i < matches.length; i += CHUNK) {
      const batch = writeBatch(db);
      matches.slice(i, i + CHUNK).forEach((m) => {
        if (!m.id) return;
        batch.set(
          matchDoc(m.id),
          { ...m, Son_Guncelleme: new Date().toISOString() },
          { merge: true }
        );
      });
      await batch.commit();
    }
    updateDoc(TOURNAMENT_DOC, {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }).catch(() => {});
    return true;
  } catch (e) {
    console.error('pushAllMatchesToCloud hata:', e);
    return false;
  }
};

// Context replaceAllMatchesInCloud'u da import ediyor — aynı fonksiyon
export const replaceAllMatchesInCloud = pushAllMatchesToCloud;

// ─── Meta Güncellemeleri ─────────────────────────────────────────────────────
export const pushRefereesToCloud = async (referees: RefereeUser[]): Promise<boolean> => {
  try {
    await setDoc(TOURNAMENT_DOC, { referees }, { merge: true });
    return true;
  } catch (e) { console.error('pushRefereesToCloud:', e); return false; }
};

export const pushCategoryFormatsToCloud = async (
  categoryFormats: Record<string, string>
): Promise<boolean> => {
  try {
    await setDoc(TOURNAMENT_DOC, { categoryFormats }, { merge: true });
    return true;
  } catch (e) { console.error('pushCategoryFormatsToCloud:', e); return false; }
};

export const pushDeskPinToCloud = async (deskPin: string): Promise<boolean> => {
  try {
    await setDoc(TOURNAMENT_DOC, { deskPin }, { merge: true });
    return true;
  } catch (e) { console.error('pushDeskPinToCloud:', e); return false; }
};

export const pushFullTournamentToCloud = async (
  matches: MatchItem[],
  referees: RefereeUser[],
  categoryFormats: Record<string, string>,
  deskPin = '9999'
): Promise<void> => {
  try {
    await setDoc(
      TOURNAMENT_DOC,
      {
        referees,
        categoryFormats,
        deskPin,
        version: 1,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Sistem Senkronizasyonu',
      },
      { merge: true }
    );
    await pushAllMatchesToCloud(matches, 'Sistem Senkronizasyonu');
  } catch (e) { console.error('pushFullTournamentToCloud:', e); }
};

// ─── İlk Yükleme (sayfa açılışında tek seferlik) ─────────────────────────────
export const fetchTournamentFromCloud = async (): Promise<{
  matches: MatchItem[];
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  tournamentVersion?: number;
} | null> => {
  try {
    const [metaSnap, matchSnap] = await Promise.all([
      getDoc(TOURNAMENT_DOC),
      getDocs(MATCHES_COL),
    ]);
    const meta = metaSnap.exists() ? metaSnap.data() : {};
    const matches: MatchItem[] = matchSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as MatchItem)
    );
    return {
      matches,
      referees:          meta.referees,
      categoryFormats:   meta.categoryFormats,
      deskPin:           meta.deskPin,
      tournamentVersion: meta.version,
    };
  } catch (e) {
    console.error('fetchTournamentFromCloud hata:', e);
    return null;
  }
};

  collection,
  getDocs,
  writeBatch,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentData,
  DocumentChange,
  FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchItem, RefereeUser } from '../types/tennis';

// ─── Firestore referansları ──────────────────────────────────────────────────
const TOURNAMENT_DOC = doc(db, 'tournaments', 'main');
const MATCHES_COL    = collection(db, 'tournaments', 'main', 'matches');
const matchDoc = (id: string) => doc(db, 'tournaments', 'main', 'matches', id);

// ─── Context'in import ettiği tip (değişmedi) ────────────────────────────────
export interface CloudTournamentMetadata {
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  lastUpdated?: string;
  updatedBy?: string;
  tournamentVersion?: number;
  matches?: MatchItem[];
}

// Tekil maç güncellemelerinde prev listesinin bozulmaması için bayrak
let isApplyingRemoteChange = false;
export const getIsApplyingRemoteChange = () => isApplyingRemoteChange;

// ─── Gerçek Zamanlı Dinleyici ────────────────────────────────────────────────
export const subscribeToCloudTournament = (
  onMatchesUpdate: (matches: MatchItem[]) => void,
  onMetaUpdate:    (meta: CloudTournamentMetadata) => void,
  onError?:        (err: Error) => void
): (() => void) => {

  // 1) Meta dinleyicisi (referees, formats, pin)
  const unsubMeta = onSnapshot(
    TOURNAMENT_DOC,
    (snap: DocumentSnapshot<DocumentData>) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onMetaUpdate({
        referees:          d.referees,
        categoryFormats:   d.categoryFormats,
        deskPin:           d.deskPin,
        lastUpdated:       d.lastUpdated,
        updatedBy:         d.updatedBy,
        tournamentVersion: d.version,
      });
    },
    (err: FirestoreError) => { if (onError) onError(err); }
  );

  // 2) Maçlar koleksiyonu dinleyicisi — her maç ayrı document
  const unsubMatches = onSnapshot(
    MATCHES_COL,
    (snap: QuerySnapshot<DocumentData>) => {
      isApplyingRemoteChange = true;
      const changed: MatchItem[] = [];
      snap.docChanges().forEach((change: DocumentChange<DocumentData>) => {
        if (change.type === 'added' || change.type === 'modified') {
          changed.push({ id: change.doc.id, ...change.doc.data() } as MatchItem);
        }
      });
      if (changed.length > 0) {
        onMatchesUpdate(changed);
      }
      setTimeout(() => { isApplyingRemoteChange = false; }, 150);
    },
    (err: FirestoreError) => { if (onError) onError(err); }
  );

  return () => {
    unsubMeta();
    unsubMatches();
  };
};

// ─── Tek Maç Güncelleme ──────────────────────────────────────────────────────
export const pushSingleMatchToCloud = async (
  match: MatchItem,
  author = 'Saha Gözlemcisi',
  _allMatchesList?: MatchItem[]   // context imzasını korumak için
): Promise<boolean> => {
  if (!match || !match.id) return false;
  try {
    await setDoc(
      matchDoc(match.id),
      { ...match, Son_Guncelleme: new Date().toISOString() },
      { merge: true }
    );
    updateDoc(TOURNAMENT_DOC, {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }).catch(() => {/* meta henüz yoksa geç */});
    return true;
  } catch (e) {
    console.error('pushSingleMatchToCloud hata:', e);
    return false;
  }
};

// ─── Toplu Maç Güncelleme ────────────────────────────────────────────────────
export const pushAllMatchesToCloud = async (
  matches: MatchItem[],
  author = 'Saha Gözlemcisi'
): Promise<boolean> => {
  if (!Array.isArray(matches)) return false;
  try {
    const CHUNK = 400; // Firestore batch limiti 500, güvenli sınır
    for (let i = 0; i < matches.length; i += CHUNK) {
      const batch = writeBatch(db);
      matches.slice(i, i + CHUNK).forEach((m) => {
        if (!m.id) return;
        batch.set(
          matchDoc(m.id),
          { ...m, Son_Guncelleme: new Date().toISOString() },
          { merge: true }
        );
      });
      await batch.commit();
    }
    updateDoc(TOURNAMENT_DOC, {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }).catch(() => {});
    return true;
  } catch (e) {
    console.error('pushAllMatchesToCloud hata:', e);
    return false;
  }
};

// Context replaceAllMatchesInCloud'u da import ediyor — aynı fonksiyon
export const replaceAllMatchesInCloud = pushAllMatchesToCloud;

// ─── Meta Güncellemeleri ─────────────────────────────────────────────────────
export const pushRefereesToCloud = async (referees: RefereeUser[]): Promise<boolean> => {
  try {
    await setDoc(TOURNAMENT_DOC, { referees }, { merge: true });
    return true;
  } catch (e) { console.error('pushRefereesToCloud:', e); return false; }
};

export const pushCategoryFormatsToCloud = async (
  categoryFormats: Record<string, string>
): Promise<boolean> => {
  try {
    await setDoc(TOURNAMENT_DOC, { categoryFormats }, { merge: true });
    return true;
  } catch (e) { console.error('pushCategoryFormatsToCloud:', e); return false; }
};

export const pushDeskPinToCloud = async (deskPin: string): Promise<boolean> => {
  try {
    await setDoc(TOURNAMENT_DOC, { deskPin }, { merge: true });
    return true;
  } catch (e) { console.error('pushDeskPinToCloud:', e); return false; }
};

export const pushFullTournamentToCloud = async (
  matches: MatchItem[],
  referees: RefereeUser[],
  categoryFormats: Record<string, string>,
  deskPin = '9999'
): Promise<void> => {
  try {
    await setDoc(
      TOURNAMENT_DOC,
      {
        referees,
        categoryFormats,
        deskPin,
        version: 1,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Sistem Senkronizasyonu',
      },
      { merge: true }
    );
    await pushAllMatchesToCloud(matches, 'Sistem Senkronizasyonu');
  } catch (e) { console.error('pushFullTournamentToCloud:', e); }
};

// ─── İlk Yükleme (sayfa açılışında tek seferlik) ─────────────────────────────
export const fetchTournamentFromCloud = async (): Promise<{
  matches: MatchItem[];
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  tournamentVersion?: number;
} | null> => {
  try {
    const [metaSnap, matchSnap] = await Promise.all([
      getDoc(TOURNAMENT_DOC),
      getDocs(MATCHES_COL),
    ]);
    const meta = metaSnap.exists() ? metaSnap.data() : {};
    const matches: MatchItem[] = matchSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as MatchItem)
    );
    return {
      matches,
      referees:          meta.referees,
      categoryFormats:   meta.categoryFormats,
      deskPin:           meta.deskPin,
      tournamentVersion: meta.version,
    };
  } catch (e) {
    console.error('fetchTournamentFromCloud hata:', e);
    return null;
  }
};
