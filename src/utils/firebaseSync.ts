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
) => {
  let isClosed = false;
  // Firebase yerine doğrudan Render üzerindeki SSE (/api/events) canlı yayınına bağlanıyoruz
  const eventSource = new EventSource('/api/events');

  eventSource.onmessage = (event) => {
    if (isClosed) return;
    try {
      // Bağlantıyı açık tutmak için gelen boş sinyalleri atla
      if (event.data.includes('keepalive')) return;

      const data = JSON.parse(event.data);
      
      if (data.type === 'CONNECTED' || data.type === 'TOURNAMENT_UPDATED') {
        if (data.tournament) {
          onMetaUpdate({
            referees: data.tournament.referees,
            categoryFormats: data.tournament.categoryFormats,
            deskPin: data.tournament.deskPin,
            lastUpdated: data.tournament.lastUpdated,
            updatedBy: data.tournament.updatedBy,
            tournamentVersion: data.tournament.version,
          });
          if (data.tournament.matches) {
            isApplyingRemoteChange = true;
            onMatchesUpdate(data.tournament.matches);
            setTimeout(() => { isApplyingRemoteChange = false; }, 100);
          }
        }
      } else if (data.type === 'MATCH_UPDATED') {
        if (data.match) {
          isApplyingRemoteChange = true;
          onMatchesUpdate([data.match]);
          setTimeout(() => { isApplyingRemoteChange = false; }, 100);
        }
      } else if (data.type === 'MATCHES_UPDATED') {
        if (data.matches) {
          isApplyingRemoteChange = true;
          onMatchesUpdate(data.matches);
          setTimeout(() => { isApplyingRemoteChange = false; }, 100);
        }
      }
    } catch (e: any) {
      if (onError) onError(e);
    }
  };

  eventSource.onerror = (err: any) => {
    if (onError) onError(err);
  };

  return () => {
    isClosed = true;
    eventSource.close();
  };
};

export const pushSingleMatchToCloud = async (
  match: MatchItem,
  author = 'Saha Gözlemcisi',
  allMatchesList?: MatchItem[]
): Promise<boolean> => {
  if (!match || !match.id) return false;
  try {
    const res = await fetch('/api/sync-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match, author }),
    });
    return res.ok;
  } catch (e) {
    console.error('Push single match error:', e);
    return false;
  }
};

export const pushAllMatchesToCloud = async (matches: MatchItem[], author = 'Saha Gözlemcisi'): Promise<boolean> => {
  try {
    const res = await fetch('/api/batch-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches, author }),
    });
    return res.ok;
  } catch (e) {
    console.error('Push all matches error:', e);
    return false;
  }
};

export const replaceAllMatchesInCloud = pushAllMatchesToCloud;

export const pushRefereesToCloud = async (referees: RefereeUser[]): Promise<boolean> => {
  try {
    const res = await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referees }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

export const pushCategoryFormatsToCloud = async (categoryFormats: Record<string, string>): Promise<boolean> => {
  try {
    const res = await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryFormats }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

export const pushDeskPinToCloud = async (deskPin: string): Promise<boolean> => {
  try {
    const res = await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deskPin }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

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
      body: JSON.stringify({ matches, referees, categoryFormats, deskPin, author: 'Sistem Senkronizasyonu' }),
    });
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
    const res = await fetch('/api/tournament');
    if (!res.ok) return null;
    const data = await res.json();
    return {
      matches: data.matches || [],
      referees: data.referees,
      categoryFormats: data.categoryFormats,
      deskPin: data.deskPin,
      tournamentVersion: data.version || 1,
    };
  } catch (err) {
    console.error('Fetch tournament from cloud error:', err);
    return null;
  }
};
