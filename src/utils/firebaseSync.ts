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

/**
 * Deeply removes all `undefined` values from an object or array to ensure
 * Firestore never rejects writes with "Unsupported field value: undefined".
 */
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

/**
 * Subscribes to real-time changes in Firestore.
 * Subscribes to both metadata (referees, formats, version) and individual court matches.
 */
export const subscribeToCloudTournament = (
  onMatchesUpdate: (matches: MatchItem[]) => void,
  onMetaUpdate: (meta: CloudTournamentMetadata) => void,
  onError?: (err: Error) => void
) => {
  try {
    const metaDocRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    const matchesColRef = collection(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC, MATCHES_SUBCOLLECTION);

    let masterDocMatches: MatchItem[] = [];

    // 1. Subscribe to Meta Document (Referees, Formats, Desk PIN, Master matches array)
    const unsubMeta = onSnapshot(
      metaDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CloudTournamentMetadata;
          if (Array.isArray(data.matches) && data.matches.length > 0) {
            masterDocMatches = data.matches;
          }
          onMetaUpdate(data);
        }
      },
      (error) => {
        console.warn('Firebase meta sync error:', error);
        if (onError) onError(error);
      }
    );

    // 2. Subscribe to Individual Matches Collection (Per-Court Concurrency)
    const unsubMatches = onSnapshot(
      matchesColRef,
      (snapshot) => {
        const remoteMatches: MatchItem[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((d) => {
            remoteMatches.push(d.data() as MatchItem);
          });
        } else if (masterDocMatches.length > 0) {
          remoteMatches.push(...masterDocMatches);
        }

        if (remoteMatches.length > 0) {
          // Sort matches according to natural court & time order
          remoteMatches.sort((a, b) => {
            const courtComp = (a.Kort || '').localeCompare(b.Kort || '', undefined, { numeric: true });
            if (courtComp !== 0) return courtComp;
            return (a.Saat || '').localeCompare(b.Saat || '');
          });

          isApplyingRemoteChange = true;
          try {
            onMatchesUpdate(remoteMatches);
          } finally {
            setTimeout(() => {
              isApplyingRemoteChange = false;
            }, 150);
          }
        } else {
          onMatchesUpdate([]);
        }
      },
      (error) => {
        console.warn('Firebase matches collection sync error:', error);
        if (onError) onError(error);
      }
    );

    return () => {
      unsubMeta();
      unsubMatches();
    };
  } catch (err) {
    console.error('Failed to initialize Firebase subscription', err);
    return () => {};
  }
};

/**
 * Pushes a single match update to its dedicated document in Firestore.
 * This guarantees that when Court 1, Court 2, Court 3, and Court 4 judges
 * enter scores simultaneously, NO CONFLICTS occur.
 */
export const pushSingleMatchToCloud = async (
  match: MatchItem,
  author = 'Saha Gözlemcisi',
  allMatchesList?: MatchItem[]
): Promise<boolean> => {
  try {
    if (!match || !match.id) return false;

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

    // 1. Write single match subcollection doc
    await setDoc(matchDocRef, sanitizedMatch, { merge: true });

    // 2. Also update master tournament doc meta timestamp & optionally full list
    const metaDocRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    const metaUpdatePayload: Record<string, any> = {
      lastUpdated: new Date().toISOString(),
      updatedBy: author || match.Son_Hakem || 'Saha Gözlemcisi',
    };

    if (allMatchesList && allMatchesList.length > 0) {
      metaUpdatePayload.matches = sanitizeForFirestore(allMatchesList);
    }

    await setDoc(metaDocRef, sanitizeForFirestore(metaUpdatePayload), { merge: true });

    return true;
  } catch (err) {
    console.error(`Failed to push match ${match.id} to Firestore:`, err);
    throw err;
  }
};

/**
 * Batched full push for all matches (used during initial setup, file import, or reset).
 */
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

    // Update master doc
    const metaDocRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    batch.set(
      metaDocRef,
      {
        matches: cleanMatches,
        lastUpdated: new Date().toISOString(),
        updatedBy: author,
      },
      { merge: true }
    );

    await batch.commit();
    return true;
  } catch (err) {
    console.error('Failed to batch push matches to Firestore:', err);
    throw err;
  }
};

/**
 * Writes updated referees to Firestore.
 */
export const pushRefereesToCloud = async (referees: RefereeUser[]): Promise<boolean> => {
  try {
    const docRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        referees,
        lastUpdated: new Date().toISOString(),
      }),
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to push referees to cloud:', err);
    return false;
  }
};

/**
 * Writes category formats memory to Firestore.
 */
export const pushCategoryFormatsToCloud = async (categoryFormats: Record<string, string>): Promise<boolean> => {
  try {
    const docRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        categoryFormats,
        lastUpdated: new Date().toISOString(),
      }),
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to push category formats to cloud:', err);
    return false;
  }
};

/**
 * Writes desk master PIN to Firestore.
 */
export const pushDeskPinToCloud = async (deskPin: string): Promise<boolean> => {
  try {
    const docRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        deskPin,
        lastUpdated: new Date().toISOString(),
      }),
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to push desk pin to cloud:', err);
    return false;
  }
};

/**
 * Replaces all matches in Firestore with new batch (deleting stale documents).
 * Also writes matches array directly to the master doc so all devices get immediate atomic updates.
 */
export const replaceAllMatchesInCloud = async (newMatches: MatchItem[], author = 'Saha Gözlemcisi') => {
  try {
    const newVersion = Date.now();
    const cleanMatches = sanitizeForFirestore(newMatches);
    const metaDocRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);

    // 1. Update Master Meta doc first with full matches array and new tournamentVersion
    await setDoc(
      metaDocRef,
      {
        tournamentVersion: newVersion,
        lastUpdated: new Date().toISOString(),
        updatedBy: author,
        matches: cleanMatches,
      },
      { merge: true }
    );

    // 2. Fetch and delete existing subcollection documents
    const matchesColRef = collection(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC, MATCHES_SUBCOLLECTION);
    const existingSnap = await getDocs(matchesColRef);

    if (!existingSnap.empty) {
      const deleteBatch = writeBatch(db);
      existingSnap.forEach((docSnap) => {
        deleteBatch.delete(docSnap.ref);
      });
      await deleteBatch.commit();
    }

    // 3. Write new matches to subcollection
    const writeBatchGroup = writeBatch(db);
    for (const match of cleanMatches) {
      if (!match.id) continue;
      const matchDocRef = doc(matchesColRef, match.id);
      writeBatchGroup.set(matchDocRef, {
        ...match,
        Son_Guncelleme: new Date().toISOString(),
        Son_Hakem: author || match.Son_Hakem || 'Saha Gözlemcisi',
      });
    }

    await writeBatchGroup.commit();
    return newVersion;
  } catch (err) {
    console.error('Failed to replace matches in Firestore:', err);
    throw err;
  }
};

/**
 * Pushes entire initial or restored tournament state to Firestore.
 */
export const pushFullTournamentToCloud = async (
  matches: MatchItem[],
  referees: RefereeUser[],
  categoryFormats: Record<string, string>,
  deskPin = '2026'
) => {
  try {
    const newVersion = Date.now();
    const cleanMatches = sanitizeForFirestore(matches);
    const docRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        referees,
        categoryFormats,
        deskPin,
        tournamentVersion: newVersion,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Turnuva Başlangıcı',
        matches: cleanMatches,
      }),
      { merge: true }
    );

    await replaceAllMatchesInCloud(cleanMatches, 'Sistem Başlangıcı');
  } catch (err) {
    console.error('Failed to push full tournament to cloud:', err);
  }
};

/**
 * Directly fetches the latest tournament data from Firestore on demand.
 */
export const fetchTournamentFromCloud = async (): Promise<{
  matches: MatchItem[];
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  tournamentVersion?: number;
} | null> => {
  try {
    const metaDocRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    const metaSnap = await getDoc(metaDocRef);

    const matchesColRef = collection(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC, MATCHES_SUBCOLLECTION);
    const matchesSnap = await getDocs(matchesColRef);

    const matches: MatchItem[] = [];
    if (!matchesSnap.empty) {
      matchesSnap.forEach((d) => {
        matches.push(d.data() as MatchItem);
      });
    }

    if (metaSnap.exists()) {
      const metaData = metaSnap.data() as CloudTournamentMetadata;
      const finalMatches = matches.length > 0 ? matches : (metaData.matches || []);

      finalMatches.sort((a, b) => {
        const courtComp = (a.Kort || '').localeCompare(b.Kort || '', undefined, { numeric: true });
        if (courtComp !== 0) return courtComp;
        return (a.Saat || '').localeCompare(b.Saat || '');
      });

      return {
        matches: finalMatches,
        referees: metaData.referees,
        categoryFormats: metaData.categoryFormats,
        deskPin: metaData.deskPin,
        tournamentVersion: metaData.tournamentVersion,
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch latest from cloud:', err);
    return null;
  }
};


