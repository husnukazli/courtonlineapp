import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  writeBatch,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchItem, RefereeUser } from '../types/tennis';

const TOURNAMENT_COLLECTION = 'tournaments';
const TOURNAMENT_DOC = 'main_tournament';
const MATCHES_SUBCOLLECTION = 'matches';

export interface CloudTournamentMetadata {
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  lastUpdated?: string;
  updatedBy?: string;
  tournamentVersion?: number;
  matches?: MatchItem[];
}

let isApplyingRemoteChange = false;
export const getIsApplyingRemoteChange = () => isApplyingRemoteChange;

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean as unknown as T;
  }
  return data;
}

export const subscribeToCloudTournament = (
  onMatchesUpdate: (matches: MatchItem[]) => void,
  onMetaUpdate: (meta: CloudTournamentMetadata) => void,
  onError?: (err: Error) => void
) => {
  let isClosed = false;
  let unsubFirestoreMeta = () => {};
  let unsubFirestoreMatches = () => {};

  try {
    const metaDocRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    const matchesColRef = collection(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC, MATCHES_SUBCOLLECTION);

    unsubFirestoreMeta = onSnapshot(
      metaDocRef,
      (snapshot) => {
        if (snapshot.exists() && !isClosed) {
          const data = snapshot.data() as CloudTournamentMetadata;
          onMetaUpdate(data);
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );

    unsubFirestoreMatches = onSnapshot(
      matchesColRef,
      (snapshot) => {
        if (!snapshot.empty && !isClosed) {
          const remoteMatches: MatchItem[] = [];
          snapshot.forEach((d) => {
            remoteMatches.push(d.data() as MatchItem);
          });
          if (remoteMatches.length > 0) {
            isApplyingRemoteChange = true;
            try {
              onMatchesUpdate(remoteMatches);
            } finally {
              setTimeout(() => {
                isApplyingRemoteChange = false;
              }, 100);
            }
          }
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    if (onError) onError(err);
  }

  return () => {
    isClosed = true;
    unsubFirestoreMeta();
    unsubFirestoreMatches();
  };
};

export const pushSingleMatchToCloud = async (
  match: MatchItem,
  author = 'Saha Gözlemcisi',
  allMatchesList?: MatchItem[]
): Promise<boolean> => {
  if (!match || !match.id) return false;
  try {
    const sanitizedMatch = sanitizeForFirestore({
      ...match,
      Son_Guncelleme: new Date().toISOString(),
      Son_Hakem: author || match.Son_Hakem || 'Saha Gözlemcisi',
    });

    const matchDocRef = doc(
      db,
      TOURNAMENT_COLLECTION,
      TOURNAMENT_DOC,
      MATCHES_SUBCOLLECTION,
      match.id
    );
    await setDoc(matchDocRef, sanitizedMatch, { merge: true });

    const metaRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(metaRef, {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }, { merge: true });

    return true;
  } catch (e) {
    console.error('Push single match error:', e);
    return false;
  }
};

export const pushAllMatchesToCloud = async (matches: MatchItem[], author = 'Saha Gözlemcisi'): Promise<boolean> => {
  try {
    const cleanMatches = sanitizeForFirestore(matches);
    const batch = writeBatch(db);
    for (const match of cleanMatches) {
      if (!match.id) continue;
      const matchDocRef = doc(
        db,
        TOURNAMENT_COLLECTION,
        TOURNAMENT_DOC,
        MATCHES_SUBCOLLECTION,
        match.id
      );
      batch.set(
        matchDocRef,
        {
          ...match,
          Son_Guncelleme: new Date().toISOString(),
          Son_Hakem: author || match.Son_Hakem || 'Saha Gözlemcisi',
        },
        { merge: true }
      );
    }
    const metaRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    batch.set(metaRef, {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }, { merge: true });

    await batch.commit();
    return true;
  } catch (e) {
    console.error('Push all matches error:', e);
    return false;
  }
};

export const pushRefereesToCloud = async (referees: RefereeUser[]): Promise<boolean> => {
  try {
    const metaRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(metaRef, { referees: sanitizeForFirestore(referees) }, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
};

export const pushCategoryFormatsToCloud = async (categoryFormats: Record<string, string>): Promise<boolean> => {
  try {
    const metaRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(metaRef, { categoryFormats: sanitizeForFirestore(categoryFormats) }, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
};

export const pushDeskPinToCloud = async (deskPin: string): Promise<boolean> => {
  try {
    const metaRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(metaRef, { deskPin }, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
};

export const replaceAllMatchesInCloud = async (newMatches: MatchItem[], author = 'Saha Gözlemcisi') => {
  try {
    const matchesColRef = collection(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC, MATCHES_SUBCOLLECTION);
    const snapshot = await getDocs(matchesColRef);
    const newIds = new Set(newMatches.map(m => m.id));

    const batch = writeBatch(db);

    for (const docSnap of snapshot.docs) {
      if (!newIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    }

    const cleanMatches = sanitizeForFirestore(newMatches);
    for (const match of cleanMatches) {
      if (!match.id) continue;
      const matchDocRef = doc(matchesColRef, match.id);
      batch.set(matchDocRef, {
        ...match,
        Son_Guncelleme: new Date().toISOString(),
        Son_Hakem: author,
      });
    }

    const metaRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    batch.set(metaRef, {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }, { merge: true });

    await batch.commit();
    return Date.now();
  } catch (e) {
    console.error('Replace all matches error:', e);
    return Date.now();
  }
};

export const pushFullTournamentToCloud = async (
  matches: MatchItem[],
  referees: RefereeUser[],
  categoryFormats: Record<string, string>,
  deskPin = '9999'
) => {
  try {
    await pushAllMatchesToCloud(matches, 'Sistem Senkronizasyonu');
    const metaRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(metaRef, {
      referees: sanitizeForFirestore(referees),
      categoryFormats: sanitizeForFirestore(categoryFormats),
      deskPin,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Sistem Senkronizasyonu',
    }, { merge: true });
  } catch (err) {
    console.error('Push full tournament error:', err);
  }
};

export const fetchTournamentFromCloud = async (): Promise<{
  matches: MatchItem[];
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  tournamentVersion?: number;
} | null> => {
  try {
    const metaRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    const metaSnap = await getDoc(metaRef);
    
    const matchesColRef = collection(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC, MATCHES_SUBCOLLECTION);
    const matchesSnap = await getDocs(matchesColRef);
    
    const matches: MatchItem[] = [];
    matchesSnap.forEach((d) => {
      matches.push(d.data() as MatchItem);
    });

    const metaData = metaSnap.exists() ? metaSnap.data() : {};

    return {
      matches,
      referees: metaData.referees,
      categoryFormats: metaData.categoryFormats,
      deskPin: metaData.deskPin,
      tournamentVersion: metaData.tournamentVersion || 1,
    };
  } catch (err) {
    console.error('Fetch tournament from cloud error:', err);
    return null;
  }
};
