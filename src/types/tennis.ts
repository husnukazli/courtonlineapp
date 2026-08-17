export type MatchStatus = 'Baslamadi' | 'Oynaniyor' | 'Duraklatildi' | 'Bitti' | 'Retired' | 'Walkover';

export type TossChoice = 'Servis' | 'Karşılama' | 'Kort Seçimi' | 'Secilmedi';
export type CourtSide = 'Sandalyenin Sağı' | 'Sandalyenin Solu' | 'Secilmedi';

export type ScoreFormatType =
  | '3 Normal Set'
  | '3 Kısa Set'
  | '2 Normal Set, 3. Set 10 Puanlık Maç Tie-Break'
  | '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break'
  | '2 Kısa Set, 3. Set 7 Puanlık Maç Tie-Break';

export type PointType =
  | 'NORMAL'
  | 'ACE'
  | 'WINNER'
  | 'UNFORCED_ERROR'
  | 'DOUBLE_FAULT'
  | 'PENALTY'
  | 'CHALLENGE_OVERTURN';

export interface ChallengeRecord {
  id: string;
  timestamp: string;
  player: 1 | 2;
  playerName: string;
  reason: 'LINE_CALL' | 'OVERRULE' | 'SERVICE_FAULT' | 'TOUCH_NET' | 'LET_POINT';
  outcome: 'UPHELD' | 'OVERTURNED'; // UPHELD = İtiraz kabul edildi / Hakem kararını değiştirdi, OVERTURNED = Karar korundu
  notes?: string;
}

export interface TennisMatchState {
  currentSet: 1 | 2 | 3;
  set1_p1: number;
  set1_p2: number;
  set2_p1: number;
  set2_p2: number;
  set3_p1: number;
  set3_p2: number;
  // Game points: "0", "15", "30", "40", "AD"
  gamePoint_p1: string;
  gamePoint_p2: string;
  currentServer: 1 | 2;
  firstServerOfMatch: 1 | 2;
  isTiebreak: boolean;
  isMatchTiebreak: boolean;
  tiebreak_p1: number;
  tiebreak_p2: number;
  tiebreakTarget: number; // 7 or 10
  tiebreakFirstServer?: 1 | 2;
  totalPointsInTiebreak: number;
  p1ChallengesLeft: number;
  p2ChallengesLeft: number;
  // Stats
  p1Aces: number;
  p2Aces: number;
  p1DoubleFaults: number;
  p2DoubleFaults: number;
  p1Winners: number;
  p2Winners: number;
  p1UnforcedErrors: number;
  p2UnforcedErrors: number;
  totalPoints_p1: number;
  totalPoints_p2: number;
  lastActionMessage?: string;
  needsChangeover?: boolean; // Saha değişimi uyarısı
}

export interface PointHistoryItem {
  id: string;
  timestamp: string;
  playerWon: 1 | 2;
  playerName: string;
  pointType: PointType;
  description: string;
  snapshot: TennisMatchState;
  scoreDisplay: string;
}

export interface MatchItem {
  id: string;
  Kort: string;
  Saat: string;
  'Oyuncu 1': string;
  'Oyuncu 2': string;
  Kategori: string;
  Skor_Formati: ScoreFormatType | string;
  Durum: MatchStatus;
  Skor: string; // "4/1 4/2 0/0"
  Kura_Kazanan: string;
  Kura_Tercih: TossChoice | string;
  Saha_Tarafi: CourtSide | string;
  Baslangic_Saati: string;
  Bitis_Saati: string;
  startTimeTimestamp?: number; // Milliseconds timestamp when match started
  pausedAccumulatedMs?: number; // Total milliseconds spent in paused state
  lastPausedTimestamp?: number; // Timestamp when match was last paused
  totalDurationSeconds?: number; // Final frozen match duration in seconds
  Son_Hakem: string;
  Kazanan: string;
  detailedState?: TennisMatchState;
  pointHistory?: PointHistoryItem[];
  challenges?: ChallengeRecord[];
}

export interface RefereeUser {
  name: string;
  pin: string;
}
