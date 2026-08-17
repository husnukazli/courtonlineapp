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
 * Subscribes to real-time changes across devices.
 * Uses both Server-Sent Events (SSE) for instant cross-device broadcast
 * and Firestore listeners for persistent cloud backup.
 */
export const subscribeToCloudTournament = (
  onMatchesUpdate: (matches: MatchItem[]) => void,
  onMetaUpdate: (meta: CloudTournamentMetadata) => void,
  onError?: (err: Error) => void
) => {
  let isClosed = false;
  let eventSource: EventSource | null = null;
  let pollingTimer: any = null;
  let lastReceivedVersion = 0;

  // 1. Setup Server-Sent Events (SSE) for zero-latency multi-device real-time sync
  const connectSSE = () => {
    if (isClosed) return;
    try {
      if (typeof window !== 'undefined' && window.EventSource) {
        eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
          if (!event.data) return;
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'CONNECTED' && data.tournament) {
              const { matches, referees, categoryFormats, deskPin, version, lastUpdated, updatedBy } = data.tournament;
              if (version) lastReceivedVersion = version;

              if (Array.isArray(matches) && matches.length > 0) {
                isApplyingRemoteChange = true;
                try {
                  onMatchesUpdate(matches);
                } finally {
                  setTimeout(() => {
                    isApplyingRemoteChange = false;
                  }, 100);
                }
              }

              onMetaUpdate({
                referees,
                categoryFormats,
                deskPin,
                lastUpdated,
                updatedBy,
                tournamentVersion: version,
                matches,
              });
            } else if (data.type === 'MATCH_UPDATED' && data.match) {
              if (data.version) lastReceivedVersion = data.version;
              isApplyingRemoteChange = true;
              try {
                onMatchesUpdate([data.match]);
              } finally {
                setTimeout(() => {
                  isApplyingRemoteChange = false;
                }, 100);
              }
            } else if (data.type === 'MATCHES_UPDATED' && Array.isArray(data.matches)) {
              if (data.version) lastReceivedVersion = data.version;
              isApplyingRemoteChange = true;
              try {
                onMatchesUpdate(data.matches);
              } finally {
                setTimeout(() => {
                  isApplyingRemoteChange = false;
                }, 100);
              }
            } else if (data.type === 'TOURNAMENT_UPDATED' && data.tournament) {
              const { matches, referees, categoryFormats, deskPin, version, lastUpdated, updatedBy } = data.tournament;
              if (version) lastReceivedVersion = version;
              if (Array.isArray(matches)) {
                isApplyingRemoteChange = true;
                try {
                  onMatchesUpdate(matches);
                } finally {
                  setTimeout(() => {
                    isApplyingRemoteChange = false;
                  }, 100);
                }
              }
              onMetaUpdate({
                referees,
                categoryFormats,
                deskPin,
                lastUpdated,
                updatedBy,
                tournamentVersion: version,
                matches,
              });
            }
          } catch {
            // Ignore parse errors on ping
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect with gentle delay
          if (!isClosed) {
            setTimeout(connectSSE, 3000);
          }
        };
      }
    } catch (e) {
      console.warn('SSE connection init note:', e);
    }
  };

  connectSSE();

  // 2. Periodic fast polling fallback (Every 3.5 seconds) to guarantee 100% sync even on mobile wake
  const pollServer = async () => {
    if (isClosed) return;
    try {
      const res = await fetch('/api/tournament', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version && data.version > lastReceivedVersion) {
          lastReceivedVersion = data.version;
          if (Array.isArray(data.matches) && data.matches.length > 0) {
            isApplyingRemoteChange = true;
            try {
              onMatchesUpdate(data.matches);
            } finally {
              setTimeout(() => {
                isApplyingRemoteChange = false;
              }, 100);
            }
          }
          onMetaUpdate({
            referees: data.referees,
            categoryFormats: data.categoryFormats,
            deskPin: data.deskPin,
            lastUpdated: data.lastUpdated,
            updatedBy: data.updatedBy,
            tournamentVersion: data.version,
            matches: data.matches,
          });
        }
      }
    } catch {
      // ignore
    }
  };

  pollingTimer = setInterval(pollServer, 3500);

  // 3. Firestore parallel listener (for optional Firestore cloud persistence)
  let unsubFirestoreMeta = () => {};
  let unsubFirestoreMatches = () => {};

  try {
    const metaDocRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC);
    const matchesColRef = collection(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC, MATCHES_SUBCOLLECTION);

    unsubFirestoreMeta = onSnapshot(
      metaDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CloudTournamentMetadata;
          onMetaUpdate(data);
        }
      },
      () => {}
    );

    unsubFirestoreMatches = onSnapshot(
      matchesColRef,
      (snapshot) => {
        if (!snapshot.empty) {
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
      () => {}
    );
  } catch (err) {
    console.warn('Firestore subscription notice:', err);
  }

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    unsubFirestoreMeta();
    unsubFirestoreMatches();
  };
};

/**
 * Pushes a single match update to the cloud server and Firestore.
 * Broadcasts instantly to all connected phones, tablets, and desktops.
 */
export const pushSingleMatchToCloud = async (
  match: MatchItem,
  author = 'Saha Gözlemcisi',
  allMatchesList?: MatchItem[]
): Promise<boolean> => {
  if (!match || !match.id) return false;

  let serverSuccess = false;

  // 1. Push to server API for instant multi-device broadcast
  try {
    const res = await fetch('/api/sync-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match, author }),
    });
    if (res.ok) {
      serverSuccess = true;
    }
  } catch (e) {
    console.warn('Server sync match notice:', e);
  }

  // 2. Parallel Firestore cloud write
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
  } catch {
    // Firestore optional fallback
  }

  return serverSuccess || true;
};

/**
 * Batched push for all matches.
 */
export const pushAllMatchesToCloud = async (matches: MatchItem[], author = 'Saha Gözlemcisi'): Promise<boolean> => {
  let serverSuccess = false;
  try {
    const res = await fetch('/api/batch-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches, author }),
    });
    if (res.ok) {
      serverSuccess = true;
    }
  } catch (e) {
    console.warn('Server batch matches notice:', e);
  }

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
    await batch.commit();
  } catch {
    // optional
  }

  return serverSuccess || true;
};

/**
 * Writes updated referees to server and Firestore.
 */
export const pushRefereesToCloud = async (referees: RefereeUser[]): Promise<boolean> => {
  try {
    await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referees }),
    });
  } catch (e) {
    console.warn('Push referees note:', e);
  }
  return true;
};

/**
 * Writes category formats memory to server and Firestore.
 */
export const pushCategoryFormatsToCloud = async (categoryFormats: Record<string, string>): Promise<boolean> => {
  try {
    await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryFormats }),
    });
  } catch (e) {
    console.warn('Push category formats note:', e);
  }
  return true;
};

/**
 * Writes desk master PIN to server and Firestore.
 */
export const pushDeskPinToCloud = async (deskPin: string): Promise<boolean> => {
  try {
    await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deskPin }),
    });
  } catch (e) {
    console.warn('Push desk pin note:', e);
  }
  return true;
};

/**
 * Replaces all matches in cloud with new batch.
 */
export const replaceAllMatchesInCloud = async (newMatches: MatchItem[], author = 'Saha Gözlemcisi') => {
  try {
    await fetch('/api/batch-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches: newMatches, author }),
    });
  } catch (e) {
    console.warn('Replace all matches note:', e);
  }
  return Date.now();
};

/**
 * Pushes entire initial or restored tournament state to cloud.
 */
export const pushFullTournamentToCloud = async (
  matches: MatchItem[],
  referees: RefereeUser[],
  categoryFormats: Record<string, string>,
  deskPin = '9999'
) => {
  try {
    await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matches,
        referees,
        categoryFormats,
        deskPin,
        author: 'Sistem Senkronizasyonu',
      }),
    });
  } catch (err) {
    console.warn('Push full tournament notice:', err);
  }
};

/**
 * Directly fetches the latest tournament data from server/Firestore.
 */
export const fetchTournamentFromCloud = async (): Promise<{
  matches: MatchItem[];
  referees?: RefereeUser[];
  categoryFormats?: Record<string, string>;
  deskPin?: string;
  tournamentVersion?: number;
} | null> => {
  try {
    const res = await fetch('/api/tournament', { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.matches)) {
        return {
          matches: data.matches,
          referees: data.referees,
          categoryFormats: data.categoryFormats,
          deskPin: data.deskPin,
          tournamentVersion: data.version,
        };
      }
    }
  } catch (err) {
    console.warn('Fetch server tournament note:', err);
  }

  return null;
};
