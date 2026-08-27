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
};

export const TennisDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deskPin, setDeskPin] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.DESK_PIN) || '2026';
  });

  const [authRole, setAuthRoleState] = useState<'none' | 'supervisor' | 'desk'>(() => {
    // Oturum bilgisi sadece sessionStorage'da tutulur.
    // Sekme/pencere kapanınca sıfırlanır; URL paylaşılınca yeni oturumda giriş ekranı gelir.
    const savedRole = sessionStorage.getItem(STORAGE_KEYS.AUTH_ROLE);
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

  // Maçlar SADECE Firestore'dan yüklenir — localStorage'dan okumak üst üste binmeye yol açıyor
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
    // Hakem oturumu da sadece sessionStorage — sekme kapanınca sıfırlanır
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

  const [activeMatchId, setActiveMatchId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_MATCH_ID) || 'm-9';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REFEREES, JSON.stringify(referees));
  }, [referees]);

  useEffect(() => {
    if (currentReferee) {
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_REF, JSON.stringify(currentReferee));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_REF);
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
      // BroadcastChannel might not be supported in older webviews
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
          localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(meta.categoryFormats));
        }

        if (meta.deskPin) {
          setDeskPin(meta.deskPin);
          localStorage.setItem(STORAGE_KEYS.DESK_PIN, meta.deskPin);
        }
      },
      () => {
        // Soft fallback
      }
    );

    return () => {
      unsubscribe();
    };
  }, [deskPin]);

  const broadcastAndSyncSingleMatch = (updatedMatch: MatchItem, allMatchesList?: MatchItem[]) => {
    const fullList = allMatchesList || matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m));
    try {
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(fullList));
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'MATCH_UPDATED', match: updatedMatch, matches: fullList });
      }
    } catch {
      // ignore
    }

    setCloudSyncStatus('syncing');
    pushSingleMatchToCloud(updatedMatch, currentReferee?.name || 'Turnuva Masası', fullList)
      .then(() => {
        setCloudSyncStatus('connected');
        setLastCloudSync(
          new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      })
      .catch((err) => {
        console.warn('Sync match note:', err);
        setCloudSyncStatus('connected');
        setLastCloudSync(
          new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      });
  };

  const broadcastAndSyncMatches = (newMatches: MatchItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(newMatches));
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'MATCHES_UPDATED', matches: newMatches });
      }
    } catch {
      // ignore
    }

    setCloudSyncStatus('syncing');
    pushAllMatchesToCloud(newMatches, currentReferee?.name || 'Turnuva Masası')
      .then(() => {
        setCloudSyncStatus('connected');
        setLastCloudSync(
          new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      })
      .catch(() => {
        setCloudSyncStatus('connected');
        setLastCloudSync(
          new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
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
          localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(remote.categoryFormats));
        }
        if (remote.deskPin) {
          setDeskPin(remote.deskPin);
          localStorage.setItem(STORAGE_KEYS.DESK_PIN, remote.deskPin);
        }
        setCloudSyncStatus('connected');
        setLastCloudSync(
          new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        return true;
      } else {
        console.warn('Bulut verisi okunamadı veya boş. Verilerin ezilmemesi için hiçbir işlem yapılmadı.');
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
      // localStorage temizle
      localStorage.removeItem(STORAGE_KEYS.MATCHES);
      localStorage.removeItem(STORAGE_KEYS.REFEREES);
      localStorage.removeItem(STORAGE_KEYS.CATEGORY_FORMATS);
      // Firestore'daki maçları da sil — yoksa sayfa yenilenince geri gelir
      await deleteAllMatchesFromCloud();
      setMatches([]);

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
      setLastCloudSync(
        new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
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
      await pushCategoryFormatsToCloud(categoryFormats);
      await pushDeskPinToCloud(deskPin);
      setCloudSyncStatus('connected');
      setLastCloudSync(
        new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
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
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(cleanMatches));
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'MATCHES_UPDATED', matches: cleanMatches });
    }
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

  const loginRefereeDirect = (name?: string) => {
    console.warn('Şifresiz giriş güvenlik nedeniyle tamamen kapatılmıştır.');
  };

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
    if (cleanPin === deskPin || cleanPin === '2026' || cleanPin === '1923') {
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

        // Başlangıç saati string'ini ("19:30") unix ms'e çevir.
        // Bu olmazsa timerUtils saat string'inden yanlış süre hesaplar.
        let setupStartTs = m.startTimeTimestamp;
        if (data.baslangicSaati && data.baslangicSaati !== 'Secilmedi') {
          const parts = data.baslangicSaati.split(':');
          if (parts.length >= 2) {
            const d = new Date();
            d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
            const candidate = d.getTime();
            // Eğer hesaplanan saat şu andan büyükse (23:00'da 19:30 girilmişse doğru),
            // küçükse gece yarısı geçmiş demektir — bir gün geri al
            setupStartTs = candidate <= Date.now() ? candidate : candidate - 86400000;
          }
        }
        if (!setupStartTs) setupStartTs = Date.now();

        // Bitiş saati string'ini de timestamp'a çevir
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

  // KRİTİK GÜVENLİK DÜZELTMESİ: Puan eklemeden önce maçın bitip bitmediğini kontrol et
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

        // 1. ZIRHLI KONTROL: Eğer maç kural gereği bitmişse, ASLA yeni puan işleme!
        const matchSafetyCheck = checkMatchWinner(currState, format);
        if (matchSafetyCheck.matchEnded || m.Durum === 'Bitti' || m.Durum === 'Retired' || m.Durum === 'Walkover') {
          return m; // Durumu değiştirmeden aynen iade et. Puan verilemez.
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

        // Maç devam ediyorsa totalDurationSeconds undefined olmalı — timerUtils
        // bu alan set edilmişse timer'ı o değere kilitliyor.
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

  const recordChallenge = (
    matchId: string,
    player: 1 | 2,
    outcome: 'UPHELD' | 'OVERTURNED',
    reason: 'LINE_CALL' | 'OVERRULE' | 'SERVICE_FAULT' | 'TOUCH_NET' | 'LET_POINT',
    notes?: string,
    actionType: 'REPLAY_POINT' | 'AWARD_POINT' | 'KEEP_DECISION' = 'AWARD_POINT'
  ) => {
    if (!matchId) return;
    setMatches((prev) => {
      let updatedItem: MatchItem | null = null;
      const next = prev.map((m) => {
        if (!m.id || m.id !== matchId) return m;

        const p1Name = m['Oyuncu 1'];
        const p2Name = m['Oyuncu 2'];
        const playerName = player === 1 ? p1Name : p2Name;

        const challengeRecord: ChallengeRecord = {
          id: 'chal-' + Date.now(),
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          player,
          playerName,
          reason,
          outcome,
          notes: notes || `${playerName} Challenge/İtiraz: ${outcome === 'UPHELD' ? 'Haklı Bulundu (Karar Değişti)' : 'Haksız Bulundu (Karar Korundu)'}`,
        };

        const currChallenges = [...(m.challenges || []), challengeRecord];
        let currState = m.detailedState ? JSON.parse(JSON.stringify(m.detailedState)) : createInitialMatchState(1);

        if (outcome === 'OVERTURNED') {
          if (player === 1 && currState.p1ChallengesLeft > 0) {
            currState.p1ChallengesLeft--;
          } else if (player === 2 && currState.p2ChallengesLeft > 0) {
            currState.p2ChallengesLeft--;
          }
        }

        currState.lastActionMessage = `Challenge Sonucu: ${challengeRecord.notes}`;

        const res: MatchItem = {
          ...m,
          challenges: currChallenges,
          detailedState: currState,
        };
        updatedItem = res;
        return res;
      });

      if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
      else broadcastAndSyncMatches(next);
      return next;
    });

    if (actionType === 'REPLAY_POINT') {
      undoLastPoint(matchId);
    } else if (actionType === 'AWARD_POINT' && outcome === 'UPHELD') {
      undoLastPoint(matchId);
      awardPointToMatch(matchId, player, 'CHALLENGE_OVERTURN');
    }
  };

  const setMatchStatus = (
    matchId: string,
    status: MatchItem['Durum'],
    winner?: string,
    endTime?: string
  ) => {
    if (!matchId) return;
    const now = Date.now();
    const nowFormatted = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    setMatches((prev) => {
      let updatedItem: MatchItem | null = null;
      const next = prev.map((m) => {
        if (!m.id || m.id !== matchId) return m;

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
          // Canlı maçta totalDurationSeconds OLMAMALI — timerUtils bunu görünce
          // timer'ı o sabit değere kilitliyor. Hesap her zaman startTimeTimestamp'tan yapılsın.
          totalDuration = undefined;
          if (m.Durum === 'Bitti' || m.Durum === 'Retired' || m.Durum === 'Walkover') {
            endFormatted = '';
          }
        } else if (status === 'Duraklatildi') {
          if (!lastPausedTs) {
            lastPausedTs = now;
          }
        } else if (status === 'Bitti' || status === 'Retired' || status === 'Walkover') {
          if (!endFormatted) endFormatted = nowFormatted;
          const matchWithUpdatedTimes = {
            ...m,
            startTimeTimestamp: startTs,
            pausedAccumulatedMs: pausedAcc,
            lastPausedTimestamp: lastPausedTs,
            Bitis_Saati: endFormatted,
          };
          totalDuration = calculateMatchDurationSeconds(matchWithUpdatedTimes, now);
        }

        const nextWinner = status === 'Oynaniyor' ? 'Secilmedi' : (winner || m.Kazanan);
        const nextEndTime = status === 'Oynaniyor' ? '' : endFormatted;

        const res: MatchItem = {
          ...m,
          Durum: status,
          startTimeTimestamp: startTs,
          pausedAccumulatedMs: pausedAcc,
          lastPausedTimestamp: lastPausedTs,
          totalDurationSeconds: totalDuration,
          Baslangic_Saati: startFormatted,
          Kazanan: nextWinner,
          Bitis_Saati: nextEndTime,
          Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem,
        };
        updatedItem = res;
        return res;
      });

      if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
      else broadcastAndSyncMatches(next);
      return next;
    });
  };

  const resumeMatchToLive = (matchId: string) => {
    if (!matchId) return;
    setMatches((prev) => {
      let updatedItem: MatchItem | null = null;
      const next = prev.map((m) => {
        if (!m.id || m.id !== matchId) return m;
        const res: MatchItem = {
          ...m,
          Durum: 'Oynaniyor' as MatchStatus,
          Kazanan: 'Secilmedi',
          Bitis_Saati: '',
          totalDurationSeconds: undefined,
          Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem,
        };
        updatedItem = res;
        return res;
      });

      if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
      else broadcastAndSyncMatches(next);
      return next;
    });
  };

  const resetMatchScore = (matchId: string) => {
    if (!matchId) return;
    setMatches((prev) => {
      let updatedItem: MatchItem | null = null;
      const next = prev.map((m) => {
        if (!m.id || m.id !== matchId) return m;
        const freshState = createInitialMatchState(1, m.Skor_Formati || '3 Normal Set');
        const res: MatchItem = {
          ...m,
          Durum: 'Baslamadi' as MatchStatus,
          Skor: '-',
          Kazanan: 'Secilmedi',
          Baslangic_Saati: '',
          Bitis_Saati: '',
          startTimeTimestamp: undefined,
          pausedAccumulatedMs: 0,
          lastPausedTimestamp: undefined,
          totalDurationSeconds: undefined,
          detailedState: freshState,
          pointHistory: [],
          challenges: [],
        };
        updatedItem = res;
        return res;
      });

      if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
      else broadcastAndSyncMatches(next);
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
      let updatedItem: MatchItem | null = null;
      const next = prev.map((m) => {
        if (!m.id || m.id !== matchId) return m;
        const parsed = parseScoreString(skorStr);
        const state = m.detailedState || createInitialMatchState(1, m.Skor_Formati || '3 Normal Set');
        state.set1_p1 = parsed.s1_p1;
        state.set1_p2 = parsed.s1_p2;
        state.set2_p1 = parsed.s2_p1;
        state.set2_p2 = parsed.s2_p2;
        state.set3_p1 = parsed.s3_p1;
        state.set3_p2 = parsed.s3_p2;

        const res: MatchItem = {
          ...m,
          Skor: skorStr,
          Durum: durum,
          Kazanan: kazanan,
          Bitis_Saati: bitisSaati,
          Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem,
          detailedState: state,
        };
        updatedItem = res;
        return res;
      });

      if (updatedItem) broadcastAndSyncSingleMatch(updatedItem, next);
      else broadcastAndSyncMatches(next);
      return next;
    });
  };

  const addReferee = (name: string, pin: string) => {
    if (!name.trim() || !pin.trim()) return;
    setReferees((prev) => {
      const filtered = prev.filter((r) => r.name.toLowerCase() !== name.trim().toLowerCase());
      const next = [...filtered, { name: name.trim(), pin: pin.trim() }];
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
    if (currentReferee && currentReferee.name === name) {
      setCurrentReferee(null);
    }
  };

  const updateCategoryFormat = (category: string, format: string) => {
    setCategoryFormats((prev) => {
      const next = {
        ...prev,
        [category]: format,
      };
      pushCategoryFormatsToCloud(next);
      return next;
    });
  };

  const bulkApplyCategoryFormats = (formatMap: Record<string, string>) => {
    setCategoryFormats(formatMap);
    pushCategoryFormatsToCloud(formatMap);
    setMatches((prev) => {
      const next = prev.map((m) => {
        if (m.Kategori && formatMap[m.Kategori]) {
          return {
            ...m,
            Skor_Formati: formatMap[m.Kategori],
          };
        }
        return m;
      });
      broadcastAndSyncMatches(next);
      return next;
    });
  };

  const updateGameScore = (
    matchId: string,
    setIndex: 1 | 2 | 3,
    player: 1 | 2,
    delta: number
  ) => {
    if (!matchId) return;
    setMatches((prev) => {
      const next = prev.map((m) => {
        if (!m.id || m.id !== matchId) return m;

        const format = m.Skor_Formati || '3 Normal Set';
        const parsed = parseScoreString(m.Skor);
        let s1_p1 = m.detailedState?.set1_p1 ?? parsed.s1_p1;
        let s1_p2 = m.detailedState?.set1_p2 ?? parsed.s1_p2;
        let s2_p1 = m.detailedState?.set2_p1 ?? parsed.s2_p1;
        let s2_p2 = m.detailedState?.set2_p2 ?? parsed.s2_p2;
        let s3_p1 = m.detailedState?.set3_p1 ?? parsed.s3_p1;
        let s3_p2 = m.detailedState?.set3_p2 ?? parsed.s3_p2;

        if (delta > 0) {
          const currentP1 = setIndex === 1 ? s1_p1 : setIndex === 2 ? s2_p1 : s3_p1;
          const currentP2 = setIndex === 1 ? s1_p2 : setIndex === 2 ? s2_p2 : s3_p2;

          if (setIndex === 3) {
            const val1 = validateSingleSet(s1_p1, s1_p2, 1, format);
            const val2 = validateSingleSet(s2_p1, s2_p2, 2, format);
            if (!val1.isComplete || !val2.isComplete || val1.winner === val2.winner) {
              return m; 
            }
          }

          if (!canIncrementSetScore(currentP1, currentP2, player, setIndex, format)) {
            return m; 
          }
        }

        if (setIndex === 1) {
          if (player === 1) s1_p1 = Math.max(0, s1_p1 + delta);
          else s1_p2 = Math.max(0, s1_p2 + delta);
        } else if (setIndex === 2) {
          if (player === 1) s2_p1 = Math.max(0, s2_p1 + delta);
          else s2_p2 = Math.max(0, s2_p2 + delta);
        } else if (setIndex === 3) {
          if (player === 1) s3_p1 = Math.max(0, s3_p1 + delta);
          else s3_p2 = Math.max(0, s3_p2 + delta);
        }

        const newScoreStr = buildScoreString(s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2);
        const { winner } = determineWinnerFromScores(
          m['Oyuncu 1'],
          m['Oyuncu 2'],
          s1_p1,
          s1_p2,
          s2_p1,
          s2_p2,
          s3_p1,
          s3_p2,
          format
        );

        let newStatus: MatchStatus = m.Durum;
        let startTime = m.Baslangic_Saati;
        let startTs = m.startTimeTimestamp;

        if (m.Durum === 'Baslamadi' && (s1_p1 > 0 || s1_p2 > 0 || s2_p1 > 0 || s2_p2 > 0 || s3_p1 > 0 || s3_p2 > 0)) {
          newStatus = 'Oynaniyor';
          if (!startTime) {
            startTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          }
          if (!startTs) {
            startTs = Date.now();
          }
        }

        const state: TennisMatchState = m.detailedState
          ? JSON.parse(JSON.stringify(m.detailedState))
          : createInitialMatchState(1, format);
        state.set1_p1 = s1_p1;
        state.set1_p2 = s1_p2;
        state.set2_p1 = s2_p1;
        state.set2_p2 = s2_p2;
        state.set3_p1 = s3_p1;
        state.set3_p2 = s3_p2;
        state.currentSet = setIndex;

        const res: MatchItem = {
          ...m,
          Skor: newScoreStr,
          Durum: newStatus,
          Baslangic_Saati: startTime,
          startTimeTimestamp: startTs,
          Kazanan: winner !== 'Secilmedi' ? winner : m.Kazanan,
          Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem || 'Turnuva Masası',
          detailedState: state,
        };
        return res;
      });
      const updated = next.find((m) => m.id === matchId);
      if (updated) broadcastAndSyncSingleMatch(updated, next);
      else broadcastAndSyncMatches(next);
      return next;
    });
  };

  const setDirectSetScores = (
    matchId: string,
    s1_p1: number,
    s1_p2: number,
    s2_p1: number,
    s2_p2: number,
    s3_p1: number,
    s3_p2: number
  ) => {
    if (!matchId) return;
    setMatches((prev) => {
      const next = prev.map((m) => {
        if (!m.id || m.id !== matchId) return m;

        const format = m.Skor_Formati || '3 Normal Set';

        const val1 = validateSingleSet(s1_p1, s1_p2, 1, format);
        const val2 = validateSingleSet(s2_p1, s2_p2, 2, format);
        const is20 = val1.isComplete && val2.isComplete && val1.winner === val2.winner && val1.winner !== null;

        const cleanS3_p1 = is20 ? 0 : s3_p1;
        const cleanS3_p2 = is20 ? 0 : s3_p2;

        const newScoreStr = buildScoreString(s1_p1, s1_p2, s2_p1, s2_p2, cleanS3_p1, cleanS3_p2);
        const { winner } = determineWinnerFromScores(
          m['Oyuncu 1'],
          m['Oyuncu 2'],
          s1_p1,
          s1_p2,
          s2_p1,
          s2_p2,
          cleanS3_p1,
          cleanS3_p2,
          format
        );

        let newStatus: MatchStatus = m.Durum;
        let startTime = m.Baslangic_Saati;
        let startTs = m.startTimeTimestamp;

        if (m.Durum === 'Baslamadi' && (s1_p1 > 0 || s1_p2 > 0 || s2_p1 > 0 || s2_p2 > 0)) {
          newStatus = 'Oynaniyor';
          if (!startTime) {
            startTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          }
          if (!startTs) {
            startTs = Date.now();
          }
        }

        const state: TennisMatchState = m.detailedState
          ? JSON.parse(JSON.stringify(m.detailedState))
          : createInitialMatchState(1, format);
        state.set1_p1 = s1_p1;
        state.set1_p2 = s1_p2;
        state.set2_p1 = s2_p1;
        state.set2_p2 = s2_p2;
        state.set3_p1 = cleanS3_p1;
        state.set3_p2 = cleanS3_p2;

        return {
          ...m,
          Skor: newScoreStr,
          Durum: newStatus,
          Baslangic_Saati: startTime,
          startTimeTimestamp: startTs,
          Kazanan: winner !== 'Secilmedi' ? winner : m.Kazanan,
          Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem || 'Turnuva Masası',
          detailedState: state,
        };
      });
      const updated = next.find((m) => m.id === matchId);
      if (updated) broadcastAndSyncSingleMatch(updated, next);
      else broadcastAndSyncMatches(next);
      return next;
    });
  };

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
    const now = Date.now();
    const nowTime = data.endTime || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    setMatches((prev) => {
      let updatedMatchObj: MatchItem | null = null;
      const next = prev.map((m) => {
        if (m.id !== matchId) return m;

        const format = m.Skor_Formati || '3 Normal Set';
        const cleanS3_p1 = (data.s3_p1 === 0 && data.s3_p2 === 0) ? 0 : data.s3_p1;
        const cleanS3_p2 = (data.s3_p1 === 0 && data.s3_p2 === 0) ? 0 : data.s3_p2;

        const newScoreStr = buildScoreString(
          data.s1_p1,
          data.s1_p2,
          data.s2_p1,
          data.s2_p2,
          cleanS3_p1,
          cleanS3_p2
        );

        let finalWinner = data.winner && data.winner !== 'Secilmedi' ? data.winner : m.Kazanan;
        if (data.status === 'Oynaniyor') {
          finalWinner = 'Secilmedi';
        } else if (data.status === 'Bitti' && (!finalWinner || finalWinner === 'Secilmedi')) {
          const { winner: derivedWinner } = determineWinnerFromScores(
            m['Oyuncu 1'],
            m['Oyuncu 2'],
            data.s1_p1,
            data.s1_p2,
            data.s2_p1,
            data.s2_p2,
            cleanS3_p1,
            cleanS3_p2,
            format
          );
          if (derivedWinner && derivedWinner !== 'Secilmedi') {
            finalWinner = derivedWinner;
          }
        }

        const state: TennisMatchState = m.detailedState
          ? JSON.parse(JSON.stringify(m.detailedState))
          : createInitialMatchState(1, format);
        state.set1_p1 = data.s1_p1;
        state.set1_p2 = data.s1_p2;
        state.set2_p1 = data.s2_p1;
        state.set2_p2 = data.s2_p2;
        state.set3_p1 = cleanS3_p1;
        state.set3_p2 = cleanS3_p2;

        let startFormatted = data.startTime || m.Baslangic_Saati;
        let startTs = m.startTimeTimestamp;

        if (data.status === 'Oynaniyor' || data.status === 'Bitti') {
          if (!startFormatted || startFormatted === 'Secilmedi') {
            startFormatted = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          }
          if (!startTs) {
            startTs = now;
          }
        }

        const tempMatch = {
          ...m,
          Baslangic_Saati: startFormatted,
          Bitis_Saati: data.status === 'Bitti' || data.status === 'Retired' || data.status === 'Walkover' ? nowTime : m.Bitis_Saati,
        };
        const totalDuration = calculateMatchDurationSeconds(tempMatch, now);

        updatedMatchObj = {
          ...m,
          Skor: newScoreStr,
          Durum: data.status,
          Kazanan: finalWinner,
          Baslangic_Saati: startFormatted,
          Bitis_Saati: data.status === 'Bitti' || data.status === 'Retired' || data.status === 'Walkover' ? nowTime : (data.status === 'Oynaniyor' ? '' : m.Bitis_Saati),
          startTimeTimestamp: startTs,
          totalDurationSeconds: totalDuration,
          Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem || 'Turnuva Masası',
          detailedState: state,
        };
        return updatedMatchObj;
      });

      if (updatedMatchObj) {
        broadcastAndSyncSingleMatch(updatedMatchObj, next);
      } else {
        broadcastAndSyncMatches(next);
      }
      return next;
    });
  };

  const finishAndReportMatch = (
    matchId: string,
    winner: string,
    status: MatchStatus = 'Bitti',
    customScore?: string,
    startTime?: string,
    endTime?: string
  ) => {
    if (!matchId) return;
    const now = Date.now();
    const nowTime = endTime || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setMatches((prev) => {
      const next = prev.map((m) => {
        if (!m.id || m.id !== matchId) return m;

        const finalScore = customScore || m.Skor;
        let finalWinner = winner || m.Kazanan;

        if (status === 'Bitti') {
          const parsed = parseScoreString(finalScore);
          const { winner: scoreDerivedWinner, isMatchFinished } = determineWinnerFromScores(
            m['Oyuncu 1'],
            m['Oyuncu 2'],
            parsed.s1_p1,
            parsed.s1_p2,
            parsed.s2_p1,
            parsed.s2_p2,
            parsed.s3_p1,
            parsed.s3_p2,
            m.Skor_Formati
          );
          if (isMatchFinished && scoreDerivedWinner && scoreDerivedWinner !== 'Secilmedi') {
            finalWinner = scoreDerivedWinner;
          }
        }

        const startFormatted = startTime || m.Baslangic_Saati;
        const tempMatch = {
          ...m,
          Baslangic_Saati: startFormatted,
          Bitis_Saati: nowTime,
        };
        const totalDuration = calculateMatchDurationSeconds(tempMatch, now);

        return {
          ...m,
          Durum: status,
          Kazanan: finalWinner,
          Skor: finalScore,
          Baslangic_Saati: startFormatted,
          Bitis_Saati: nowTime,
          totalDurationSeconds: totalDuration,
          Son_Hakem: currentReferee ? currentReferee.name : m.Son_Hakem || 'Turnuva Masası',
        };
      });
      const updated = next.find((m) => m.id === matchId);
      if (updated) broadcastAndSyncSingleMatch(updated, next);
      else broadcastAndSyncMatches(next);
      return next;
    });
  };

  const importMatchesList = (newMatches: MatchItem[]) => {
    const sanitized = sanitizeMatchList(newMatches);
    setMatches(sanitized);
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(sanitized));
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'MATCHES_UPDATED', matches: sanitized });
    }
    replaceAllMatchesInCloud(sanitized, currentReferee?.name || 'Turnuva Masası');
  };

  const resetTournamentToDefault = () => {
    const sanitized = sanitizeMatchList(INITIAL_MATCHES);
    setMatches(sanitized);
    setReferees(INITIAL_REFEREES);
    setCategoryFormats(INITIAL_CATEGORY_FORMAT_MEMORY);
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(sanitized));
    localStorage.setItem(STORAGE_KEYS.REFEREES, JSON.stringify(INITIAL_REFEREES));
    localStorage.setItem(STORAGE_KEYS.CATEGORY_FORMATS, JSON.stringify(INITIAL_CATEGORY_FORMAT_MEMORY));
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'MATCHES_UPDATED', matches: sanitized });
    }
    pushFullTournamentToCloud(sanitized, INITIAL_REFEREES, INITIAL_CATEGORY_FORMAT_MEMORY, deskPin);
  };

  const activeMatch = matches.find((m) => m.id === activeMatchId) || matches[0] || null;

  return (
    <TennisDataContext.Provider
      value={{
        matches,
        referees,
        currentReferee,
        categoryFormats,
        activeMatchId,
        activeMatch,
        authRole,
        deskPin,
        cloudSyncStatus,
        lastCloudSync,
        syncWithCloudNow,
        pullFromCloudNow,
        forcePushAllToCloud,
        clearLocalCacheAndResetFromCloud,
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
  if (!context) {
    throw new Error('useTennisData must be used within a TennisDataProvider');
  }
  return context;
};

