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

export const subscribeToCloudTournament = (
  onMatchesUpdate: (matches: MatchItem[]) => void,
  onMetaUpdate: (meta: CloudTournamentMetadata) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const unsubMeta = onSnapshot(
    doc(db, 'tournaments', 'main'),
    (snap: DocumentSnapshot<DocumentData>) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onMetaUpdate({
        referees: d.referees,
        categoryFormats: d.categoryFormats,
        deskPin: d.deskPin,
        lastUpdated: d.lastUpdated,
        updatedBy: d.updatedBy,
        tournamentVersion: d.version,
      });
    },
    (err: FirestoreError) => { if (onError) onError(err); }
  );

  const unsubMatches = onSnapshot(
    collection(db, 'tournaments', 'main', 'matches'),
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

const matchDoc = (id: string) => doc(db, 'tournaments', 'main', 'matches', id);

export const pushSingleMatchToCloud = async (
  match: MatchItem,
  author = 'Saha Gözlemcisi',
  _allMatchesList?: MatchItem[]
): Promise<boolean> => {
  if (!match || !match.id) return false;
  try {
    await setDoc(
      matchDoc(match.id),
      { ...match, Son_Guncelleme: new Date().toISOString() },
      { merge: true }
    );
    updateDoc(doc(db, 'tournaments', 'main'), {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }).catch(() => {});
    return true;
  } catch (e) {
    console.error('pushSingleMatchToCloud hata:', e);
    return false;
  }
};

export const pushAllMatchesToCloud = async (
  matches: MatchItem[],
  author = 'Saha Gözlemcisi'
): Promise<boolean> => {
  if (!Array.isArray(matches)) return false;
  try {
    const CHUNK = 400;
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
    updateDoc(doc(db, 'tournaments', 'main'), {
      lastUpdated: new Date().toISOString(),
      updatedBy: author,
    }).catch(() => {});
    return true;
  } catch (e) {
    console.error('pushAllMatchesToCloud hata:', e);
    return false;
  }
};

export const replaceAllMatchesInCloud = pushAllMatchesToCloud;

export const pushRefereesToCloud = async (referees: RefereeUser[]): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'tournaments', 'main'), { referees }, { merge: true });
    return true;
  } catch (e) { console.error('pushRefereesToCloud:', e); return false; }
};

export const pushCategoryFormatsToCloud = async (
  categoryFormats: Record<string, string>
): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'tournaments', 'main'), { categoryFormats }, { merge: true });
    return true;
  } catch (e) { console.error('pushCategoryFormatsToCloud:', e); return false; }
};

export const pushDeskPinToCloud = async (deskPin: string): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'tournaments', 'main'), { deskPin }, { merge: true });
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
      doc(db, 'tournaments', 'main'),
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

export const fetchTournamentFromCloud = async (): Promise<{
  matches: MatchItem[];
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  tournamentVersion?: number;
} | null> => {
  try {
    const [metaSnap, matchSnap] = await Promise.all([
      getDoc(doc(db, 'tournaments', 'main')),
      getDocs(collection(db, 'tournaments', 'main', 'matches')),
    ]);
    const meta = metaSnap.exists() ? metaSnap.data() : {};
    const matches: MatchItem[] = matchSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as MatchItem)
    );
    return {
      matches,
      referees: meta.referees,
      categoryFormats: meta.categoryFormats,
      deskPin: meta.deskPin,
      tournamentVersion: meta.version,
    };
  } catch (e) {
    console.error('fetchTournamentFromCloud hata:', e);
    return null;
  }
};

export const deleteAllMatchesFromCloud = async (): Promise<boolean> => {
  try {
    const snap = await getDocs(collection(db, 'tournaments', 'main', 'matches'));
    const CHUNK = 400;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    return true;
  } catch (e) {
    console.error('deleteAllMatchesFromCloud hata:', e);
    return false;
  }
};
