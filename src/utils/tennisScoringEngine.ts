import {
  MatchItem,
  PointHistoryItem,
  PointType,
  ScoreFormatType,
  TennisMatchState,
} from '../types/tennis';

export function createInitialMatchState(
  server: 1 | 2 = 1,
  format: ScoreFormatType | string = '3 Normal Set'
): TennisMatchState {
  return {
    currentSet: 1,
    set1_p1: 0,
    set1_p2: 0,
    set2_p1: 0,
    set2_p2: 0,
    set3_p1: 0,
    set3_p2: 0,
    gamePoint_p1: '0',
    gamePoint_p2: '0',
    currentServer: server,
    firstServerOfMatch: server,
    isTiebreak: false,
    isMatchTiebreak: false,
    tiebreak_p1: 0,
    tiebreak_p2: 0,
    tiebreakTarget: 7,
    totalPointsInTiebreak: 0,
    p1ChallengesLeft: 3,
    p2ChallengesLeft: 3,
    p1Aces: 0,
    p2Aces: 0,
    p1DoubleFaults: 0,
    p2DoubleFaults: 0,
    p1Winners: 0,
    p2Winners: 0,
    p1UnforcedErrors: 0,
    p2UnforcedErrors: 0,
    totalPoints_p1: 0,
    totalPoints_p2: 0,
    lastActionMessage: 'Maç başladı. Servis: Oyuncu ' + server,
    needsChangeover: false,
  };
}

export function parseScoreString(skorStr: string): {
  s1_p1: number;
  s1_p2: number;
  s2_p1: number;
  s2_p2: number;
  s3_p1: number;
  s3_p2: number;
} {
  const res = { s1_p1: 0, s1_p2: 0, s2_p1: 0, s2_p2: 0, s3_p1: 0, s3_p2: 0 };
  if (!skorStr || skorStr === '-') return res;
  try {
    const parts = skorStr.trim().split(/\s+/);
    if (parts[0]) {
      const [p1, p2] = parts[0].split('/').map(Number);
      if (!isNaN(p1)) res.s1_p1 = p1;
      if (!isNaN(p2)) res.s1_p2 = p2;
    }
    if (parts[1]) {
      const [p1, p2] = parts[1].split('/').map(Number);
      if (!isNaN(p1)) res.s2_p1 = p1;
      if (!isNaN(p2)) res.s2_p2 = p2;
    }
    if (parts[2]) {
      const [p1, p2] = parts[2].split('/').map(Number);
      if (!isNaN(p1)) res.s3_p1 = p1;
      if (!isNaN(p2)) res.s3_p2 = p2;
    }
  } catch {
    // ignore
  }
  return res;
}

export function formatScoreString(state: TennisMatchState): string {
  return `${state.set1_p1}/${state.set1_p2} ${state.set2_p1}/${state.set2_p2} ${state.set3_p1}/${state.set3_p2}`;
}

export function getTargetGamesPerSet(format: string): { target: number; tiebreakAt: number } {
  if (format.includes('Kısa') || format.includes('Kisa')) {
    return { target: 4, tiebreakAt: 4 };
  }
  return { target: 6, tiebreakAt: 6 };
}

export function isMatchTiebreakThirdSet(format: string): { isMT: boolean; target: number } {
  if (format.includes('10 Puanlık') || format.includes('10 Puanlik') || format.includes('10 Puan')) {
    return { isMT: true, target: 10 };
  }
  if (format.includes('7 Puanlık') || format.includes('7 Puanlik') || format.includes('7 Puan')) {
    return { isMT: true, target: 7 };
  }
  return { isMT: false, target: 7 };
}

export function awardPoint(
  currentState: TennisMatchState,
  playerWon: 1 | 2,
  pointType: PointType = 'NORMAL',
  format: string = '3 Normal Set',
  p1Name: string = 'Oyuncu 1',
  p2Name: string = 'Oyuncu 2'
): { nextState: TennisMatchState; matchEnded: boolean; matchWinner?: 1 | 2; summary: string } {
  // Deep copy state
  const state: TennisMatchState = JSON.parse(JSON.stringify(currentState));
  const winnerName = playerWon === 1 ? p1Name : p2Name;
  let matchEnded = false;
  let matchWinner: 1 | 2 | undefined;
  let summary = `${winnerName} sayı kazandı (${pointType})`;

  // Stats updating
  if (playerWon === 1) {
    state.totalPoints_p1++;
    if (pointType === 'ACE') state.p1Aces++;
    if (pointType === 'WINNER') state.p1Winners++;
    if (pointType === 'DOUBLE_FAULT') state.p2DoubleFaults++;
    if (pointType === 'UNFORCED_ERROR') state.p2UnforcedErrors++;
  } else {
    state.totalPoints_p2++;
    if (pointType === 'ACE') state.p2Aces++;
    if (pointType === 'WINNER') state.p2Winners++;
    if (pointType === 'DOUBLE_FAULT') state.p1DoubleFaults++;
    if (pointType === 'UNFORCED_ERROR') state.p1UnforcedErrors++;
  }

  const { target: targetGames, tiebreakAt } = getTargetGamesPerSet(format);
  const thirdSetMT = isMatchTiebreakThirdSet(format);

  // CASE 1: In Tie-Break or Match Tie-Break
  if (state.isTiebreak) {
    if (playerWon === 1) {
      state.tiebreak_p1++;
    } else {
      state.tiebreak_p2++;
    }
    state.totalPointsInTiebreak++;

    // Rotation in tiebreak: 1st point server A, then every 2 points alternates
    const totalPts = state.tiebreak_p1 + state.tiebreak_p2;
    const initialTbServer = state.tiebreakFirstServer || state.currentServer;
    const otherServer: 1 | 2 = initialTbServer === 1 ? 2 : 1;

    // Server cycle: 1 pt -> other, 2 pts -> initial, 2 pts -> other...
    // Pattern: point 1 (0 pts before): initialServer
    // point 2, 3 (1, 2 pts before): otherServer
    // point 4, 5 (3, 4 pts before): initialServer
    const cycle = Math.floor((totalPts - 1) / 2);
    state.currentServer = cycle % 2 === 0 ? otherServer : initialTbServer;

    // Saha değişimi check: sum of points is a multiple of 6
    state.needsChangeover = totalPts % 6 === 0;

    const p1Score = state.tiebreak_p1;
    const p2Score = state.tiebreak_p2;
    const target = state.tiebreakTarget;

    // Check if Tie-break won (>= target and >= 2 point lead)
    const p1WonTb = p1Score >= target && p1Score - p2Score >= 2;
    const p2WonTb = p2Score >= target && p2Score - p1Score >= 2;

    if (p1WonTb || p2WonTb) {
      const setWinner: 1 | 2 = p1WonTb ? 1 : 2;
      summary = `${setWinner === 1 ? p1Name : p2Name} Tie-Break'i kazandı! (${p1Score}-${p2Score})`;

      if (state.isMatchTiebreak) {
        // Set 3 match tiebreak completed
        state.set3_p1 = p1Score;
        state.set3_p2 = p2Score;
        matchEnded = true;
        matchWinner = setWinner;
        state.isTiebreak = false;
        state.isMatchTiebreak = false;
        state.lastActionMessage = `Maç Bitti! Kazanan: ${setWinner === 1 ? p1Name : p2Name}`;
        return { nextState: state, matchEnded, matchWinner, summary };
      } else {
        // Regular set tiebreak completed
        if (state.currentSet === 1) {
          if (setWinner === 1) state.set1_p1++;
          else state.set1_p2++;
        } else if (state.currentSet === 2) {
          if (setWinner === 1) state.set2_p1++;
          else state.set2_p2++;
        } else if (state.currentSet === 3) {
          if (setWinner === 1) state.set3_p1++;
          else state.set3_p2++;
        }

        // Check overall match outcome after set
        const matchResult = checkMatchWinner(state, format);
        if (matchResult.matchEnded) {
          matchEnded = true;
          matchWinner = matchResult.winner;
          state.isTiebreak = false;
          state.lastActionMessage = `Maç Bitti! Kazanan: ${matchWinner === 1 ? p1Name : p2Name}`;
          return { nextState: state, matchEnded, matchWinner, summary };
        }

        // Advance to next set
        advanceToNextSet(state, format, setWinner);
      }
    } else {
      state.lastActionMessage = `Tie-Break: ${p1Name} ${p1Score} - ${p2Score} ${p2Name}`;
    }

    return { nextState: state, matchEnded, matchWinner, summary };
  }

  // CASE 2: Regular Game Scoring (0, 15, 30, 40, AD)
  const p1Pt = state.gamePoint_p1;
  const p2Pt = state.gamePoint_p2;
  let gameWon: 1 | 2 | null = null;

  if (playerWon === 1) {
    if (p1Pt === '0') state.gamePoint_p1 = '15';
    else if (p1Pt === '15') state.gamePoint_p1 = '30';
    else if (p1Pt === '30') {
      state.gamePoint_p1 = '40';
    } else if (p1Pt === '40') {
      if (p2Pt === '40') {
        state.gamePoint_p1 = 'AD';
      } else if (p2Pt === 'AD') {
        state.gamePoint_p2 = '40'; // Deuce again
      } else {
        gameWon = 1;
      }
    } else if (p1Pt === 'AD') {
      gameWon = 1;
    }
  } else {
    if (p2Pt === '0') state.gamePoint_p2 = '15';
    else if (p2Pt === '15') state.gamePoint_p2 = '30';
    else if (p2Pt === '30') {
      state.gamePoint_p2 = '40';
    } else if (p2Pt === '40') {
      if (p1Pt === '40') {
        state.gamePoint_p2 = 'AD';
      } else if (p1Pt === 'AD') {
        state.gamePoint_p1 = '40'; // Deuce again
      } else {
        gameWon = 2;
      }
    } else if (p2Pt === 'AD') {
      gameWon = 2;
    }
  }

  // If game won
  if (gameWon !== null) {
    state.gamePoint_p1 = '0';
    state.gamePoint_p2 = '0';
    const winningPlayerName = gameWon === 1 ? p1Name : p2Name;
    summary = `Oyun ${winningPlayerName}!`;

    // Increment current set games
    let p1Games = 0;
    let p2Games = 0;

    if (state.currentSet === 1) {
      if (gameWon === 1) state.set1_p1++;
      else state.set1_p2++;
      p1Games = state.set1_p1;
      p2Games = state.set1_p2;
    } else if (state.currentSet === 2) {
      if (gameWon === 1) state.set2_p1++;
      else state.set2_p2++;
      p1Games = state.set2_p1;
      p2Games = state.set2_p2;
    } else if (state.currentSet === 3) {
      if (gameWon === 1) state.set3_p1++;
      else state.set3_p2++;
      p1Games = state.set3_p1;
      p2Games = state.set3_p2;
    }

    // Switch server for next game
    state.currentServer = state.currentServer === 1 ? 2 : 1;

    // Check Saha Değişimi (Odd game sum in current set)
    const totalGamesInSet = p1Games + p2Games;
    state.needsChangeover = totalGamesInSet % 2 !== 0;

    // Check Set Win condition
    // For normal set (target 6): 6-0, 6-1, 6-2, 6-3, 6-4, 7-5. At 6-6 -> Tiebreak.
    // For short set (target 4): 4-0, 4-1, 4-2, 5-3. At 4-4 -> Tiebreak.
    let setWinner: 1 | 2 | null = null;

    if (p1Games >= targetGames && p1Games - p2Games >= 2) {
      setWinner = 1;
    } else if (p2Games >= targetGames && p2Games - p1Games >= 2) {
      setWinner = 2;
    } else if (p1Games === targetGames + 1 && p2Games === targetGames - 1) {
      // e.g. 7-5 (in 6-game set) or 5-3 (in 4-game set)
      setWinner = 1;
    } else if (p2Games === targetGames + 1 && p1Games === targetGames - 1) {
      setWinner = 2;
    } else if (p1Games === tiebreakAt && p2Games === tiebreakAt) {
      // Start Tiebreak!
      state.isTiebreak = true;
      state.tiebreak_p1 = 0;
      state.tiebreak_p2 = 0;
      state.tiebreakTarget = 7;
      state.tiebreakFirstServer = state.currentServer;
      state.totalPointsInTiebreak = 0;
      summary = `Set ${state.currentSet} Tie-Break Başladı! (${p1Games}-${p2Games})`;
      state.lastActionMessage = summary;
      return { nextState: state, matchEnded: false, summary };
    }

    if (setWinner !== null) {
      summary = `${setWinner === 1 ? p1Name : p2Name} Set ${state.currentSet}'i kazandı! (${p1Games}-${p2Games})`;

      const matchRes = checkMatchWinner(state, format);
      if (matchRes.matchEnded) {
        matchEnded = true;
        matchWinner = matchRes.winner;
        state.lastActionMessage = `Maç Bitti! Kazanan: ${matchWinner === 1 ? p1Name : p2Name}`;
        return { nextState: state, matchEnded, matchWinner, summary };
      }

      advanceToNextSet(state, format, setWinner);
    } else {
      state.lastActionMessage = `Oyun: ${p1Name} ${p1Games} - ${p2Games} ${p2Name}`;
    }
  } else {
    state.lastActionMessage = `${winnerName} puan kazandı (${state.gamePoint_p1} - ${state.gamePoint_p2})`;
  }

  return { nextState: state, matchEnded, matchWinner, summary };
}

function advanceToNextSet(state: TennisMatchState, format: string, previousSetWinner: 1 | 2) {
  state.currentSet = (state.currentSet + 1) as 1 | 2 | 3;
  state.isTiebreak = false;
  state.gamePoint_p1 = '0';
  state.gamePoint_p2 = '0';
  state.tiebreak_p1 = 0;
  state.tiebreak_p2 = 0;

  // Check if 3rd set is a Match Tiebreak (Super Tiebreak)
  const thirdSetMT = isMatchTiebreakThirdSet(format);
  if (state.currentSet === 3 && thirdSetMT.isMT) {
    state.isTiebreak = true;
    state.isMatchTiebreak = true;
    state.tiebreakTarget = thirdSetMT.target;
    state.tiebreakFirstServer = state.currentServer;
    state.totalPointsInTiebreak = 0;
  }
}

export function checkMatchWinner(
  state: TennisMatchState,
  format: string
): { matchEnded: boolean; winner?: 1 | 2 } {
  let p1Sets = 0;
  let p2Sets = 0;

  const { target, tiebreakAt } = getTargetGamesPerSet(format);
  const thirdSetMT = isMatchTiebreakThirdSet(format);

  // Set 1
  if (
    (state.set1_p1 >= target && state.set1_p1 - state.set1_p2 >= 2) ||
    (state.set1_p1 === target + 1 && state.set1_p2 === target - 1) ||
    (state.set1_p1 > state.set1_p2 && state.set1_p1 > tiebreakAt)
  ) {
    p1Sets++;
  } else if (
    (state.set1_p2 >= target && state.set1_p2 - state.set1_p1 >= 2) ||
    (state.set1_p2 === target + 1 && state.set1_p1 === target - 1) ||
    (state.set1_p2 > state.set1_p1 && state.set1_p2 > tiebreakAt)
  ) {
    p2Sets++;
  }

  // Set 2
  if (
    (state.set2_p1 >= target && state.set2_p1 - state.set2_p2 >= 2) ||
    (state.set2_p1 === target + 1 && state.set2_p2 === target - 1) ||
    (state.set2_p1 > state.set2_p2 && state.set2_p1 > tiebreakAt)
  ) {
    p1Sets++;
  } else if (
    (state.set2_p2 >= target && state.set2_p2 - state.set2_p1 >= 2) ||
    (state.set2_p2 === target + 1 && state.set2_p1 === target - 1) ||
    (state.set2_p2 > state.set2_p1 && state.set2_p2 > tiebreakAt)
  ) {
    p2Sets++;
  }

  // Set 3 (if played)
  if (thirdSetMT.isMT) {
    if (state.set3_p1 >= thirdSetMT.target && state.set3_p1 - state.set3_p2 >= 2) {
      p1Sets++;
    } else if (state.set3_p2 >= thirdSetMT.target && state.set3_p2 - state.set3_p1 >= 2) {
      p2Sets++;
    }
  } else {
    if (
      (state.set3_p1 >= target && state.set3_p1 - state.set3_p2 >= 2) ||
      (state.set3_p1 === target + 1 && state.set3_p2 === target - 1) ||
      (state.set3_p1 > state.set3_p2 && state.set3_p1 > tiebreakAt)
    ) {
      p1Sets++;
    } else if (
      (state.set3_p2 >= target && state.set3_p2 - state.set3_p1 >= 2) ||
      (state.set3_p2 === target + 1 && state.set3_p1 === target - 1) ||
      (state.set3_p2 > state.set3_p1 && state.set3_p2 > tiebreakAt)
    ) {
      p2Sets++;
    }
  }

  if (p1Sets >= 2) return { matchEnded: true, winner: 1 };
  if (p2Sets >= 2) return { matchEnded: true, winner: 2 };

  return { matchEnded: false };
}

export function buildScoreString(
  s1_p1: number,
  s1_p2: number,
  s2_p1: number,
  s2_p2: number,
  s3_p1: number,
  s3_p2: number
): string {
  const parts: string[] = [];
  if (s1_p1 > 0 || s1_p2 > 0 || s2_p1 > 0 || s2_p2 > 0 || s3_p1 > 0 || s3_p2 > 0) {
    parts.push(`${s1_p1}/${s1_p2}`);
  }
  if (s2_p1 > 0 || s2_p2 > 0 || s3_p1 > 0 || s3_p2 > 0) {
    parts.push(`${s2_p1}/${s2_p2}`);
  }
  if (s3_p1 > 0 || s3_p2 > 0) {
    parts.push(`${s3_p1}/${s3_p2}`);
  }
  if (parts.length === 0) return '-';
  // Standard 3-set score format padding
  while (parts.length < 3) {
    parts.push('0/0');
  }
  return parts.join(' ');
}

// ----------------------------------------------------
// TENNIS SCORE VALIDATION ENGINE
// ----------------------------------------------------

export interface SetValidationResult {
  valid: boolean;
  isComplete: boolean;
  winner: 1 | 2 | null;
  error?: string;
}

/**
 * Validates a standard 6-game tennis set (Normal Set).
 * Completed set valid scores: 6-0..6-4, 7-5, 7-6 (and reverse).
 * In-progress valid scores: 0-0..5-5, 6-5, 5-6, 6-6.
 */
export function validateNormalSet(p1: number, p2: number): SetValidationResult {
  if (p1 < 0 || p2 < 0) {
    return { valid: false, isComplete: false, winner: null, error: 'Oyun sayıları negatif olamaz.' };
  }
  if (p1 > 7 || p2 > 7) {
    return { valid: false, isComplete: false, winner: null, error: 'Normal sette bir oyuncu en fazla 7 oyun alabilir (7-5 veya 7-6).' };
  }

  // Check complete wins for P1
  if ((p1 === 6 && p2 <= 4) || (p1 === 7 && (p2 === 5 || p2 === 6))) {
    return { valid: true, isComplete: true, winner: 1 };
  }
  // Check complete wins for P2
  if ((p2 === 6 && p1 <= 4) || (p2 === 7 && (p1 === 5 || p1 === 6))) {
    return { valid: true, isComplete: true, winner: 2 };
  }

  // Invalid finished states like 7-0..7-4, 6-6, etc.
  if (p1 === 7 && p2 < 5) {
    return { valid: false, isComplete: false, winner: null, error: `Geçersiz skor: ${p1}-${p2}. Normal set 6 oyunda biter (fark >= 2). 7 oyuna ancak 5-5 veya 6-6 durumunda çıkılabilir.` };
  }
  if (p2 === 7 && p1 < 5) {
    return { valid: false, isComplete: false, winner: null, error: `Geçersiz skor: ${p1}-${p2}. Normal set 6 oyunda biter (fark >= 2). 7 oyuna ancak 5-5 veya 6-6 durumunda çıkılabilir.` };
  }

  // In-progress valid states
  if ((p1 <= 5 && p2 <= 5) || (p1 === 6 && p2 === 5) || (p1 === 5 && p2 === 6) || (p1 === 6 && p2 === 6)) {
    return { valid: true, isComplete: false, winner: null };
  }

  return { valid: false, isComplete: false, winner: null, error: `Geçersiz set skoru: ${p1}-${p2}.` };
}

/**
 * Validates a 4-game short tennis set (Kısa Set).
 * Completed set valid scores: 4-0..4-2, 5-3, 5-4 (and reverse).
 * In-progress valid scores: 0-0..3-3, 4-3, 3-4, 4-4.
 */
export function validateShortSet(p1: number, p2: number): SetValidationResult {
  if (p1 < 0 || p2 < 0) {
    return { valid: false, isComplete: false, winner: null, error: 'Oyun sayıları negatif olamaz.' };
  }
  if (p1 > 5 || p2 > 5) {
    return { valid: false, isComplete: false, winner: null, error: 'Kısa sette bir oyuncu en fazla 5 oyun alabilir (5-3 veya 5-4).' };
  }

  // Check complete wins for P1
  if ((p1 === 4 && p2 <= 2) || (p1 === 5 && (p2 === 3 || p2 === 4))) {
    return { valid: true, isComplete: true, winner: 1 };
  }
  // Check complete wins for P2
  if ((p2 === 4 && p1 <= 2) || (p2 === 5 && (p1 === 3 || p1 === 4))) {
    return { valid: true, isComplete: true, winner: 2 };
  }

  // Invalid finished states like 5-0..5-2
  if (p1 === 5 && p2 < 3) {
    return { valid: false, isComplete: false, winner: null, error: `Geçersiz skor: ${p1}-${p2}. Kısa set 4 oyunda biter (fark >= 2). 5 oyuna ancak 3-3 veya 4-4 durumunda çıkılabilir.` };
  }
  if (p2 === 5 && p1 < 3) {
    return { valid: false, isComplete: false, winner: null, error: `Geçersiz skor: ${p1}-${p2}. Kısa set 4 oyunda biter (fark >= 2). 5 oyuna ancak 3-3 veya 4-4 durumunda çıkılabilir.` };
  }

  // In-progress valid states
  if ((p1 <= 3 && p2 <= 3) || (p1 === 4 && p2 === 3) || (p1 === 3 && p2 === 4) || (p1 === 4 && p2 === 4)) {
    return { valid: true, isComplete: false, winner: null };
  }

  return { valid: false, isComplete: false, winner: null, error: `Geçersiz kısa set skoru: ${p1}-${p2}.` };
}

/**
 * Validates a Match Tie-Break set (e.g. 10 points or 7 points).
 * Target: 10 or 7 points with at least 2 points lead.
 */
export function validateMatchTiebreak(p1: number, p2: number, target: number = 10): SetValidationResult {
  if (p1 < 0 || p2 < 0) {
    return { valid: false, isComplete: false, winner: null, error: 'Puan sayıları negatif olamaz.' };
  }

  // Winner condition: >= target points and difference >= 2
  if (p1 >= target && p1 - p2 >= 2) {
    // If p1 > target, difference must be exactly 2 (e.g. 11-9, 12-10). A score like 16-5 is invalid because it ended at 10-5!
    if (p1 > target && p1 - p2 > 2 && p2 < target - 1) {
      return {
        valid: false,
        isComplete: false,
        winner: null,
        error: `Geçersiz Tie-Break skoru: ${p1}-${p2}. Maç ${target}-${p2} durumunda (en az ${target} puan ve 2 fark) tamamlanmış olmalıydı. ${target} puandan sonraya ancak uzatmalarda (örn. 11-9, 12-10) geçilebilir.`,
      };
    }
    return { valid: true, isComplete: true, winner: 1 };
  }

  if (p2 >= target && p2 - p1 >= 2) {
    if (p2 > target && p2 - p1 > 2 && p1 < target - 1) {
      return {
        valid: false,
        isComplete: false,
        winner: null,
        error: `Geçersiz Tie-Break skoru: ${p1}-${p2}. Maç ${p1}-${target} durumunda tamamlanmış olmalıydı.`,
      };
    }
    return { valid: true, isComplete: true, winner: 2 };
  }

  // In-progress tiebreak states:
  // Both below target, or deuce territory (e.g. 9-9, 10-9, 10-10, 11-10)
  if (p1 < target && p2 < target) {
    return { valid: true, isComplete: false, winner: null };
  }
  if (Math.abs(p1 - p2) <= 1) {
    return { valid: true, isComplete: false, winner: null };
  }

  return { valid: false, isComplete: false, winner: null, error: `Geçersiz Tie-Break skoru: ${p1}-${p2}.` };
}

/**
 * Validates any single set (1, 2, or 3) for a given format.
 */
export function validateSingleSet(
  p1: number,
  p2: number,
  setNumber: 1 | 2 | 3,
  format: string = '3 Normal Set'
): SetValidationResult {
  const isShort = format.includes('Kısa') || format.includes('Kisa');
  const thirdSetMT = isMatchTiebreakThirdSet(format);

  if (setNumber === 3 && thirdSetMT.isMT) {
    return validateMatchTiebreak(p1, p2, thirdSetMT.target);
  }

  if (isShort) {
    return validateShortSet(p1, p2);
  }

  return validateNormalSet(p1, p2);
}

export interface MatchValidationResult {
  valid: boolean;
  error?: string;
  p1SetsWon: number;
  p2SetsWon: number;
  isMatchFinished: boolean;
  winner: 1 | 2 | null;
  canPlaySet3: boolean;
  set1Result: SetValidationResult;
  set2Result: SetValidationResult;
  set3Result: SetValidationResult;
}

/**
 * Full match validation enforcing tennis rules, format consistency, and best-of-3 constraints.
 */
export function validateFullMatchScores(
  s1_p1: number,
  s1_p2: number,
  s2_p1: number,
  s2_p2: number,
  s3_p1: number,
  s3_p2: number,
  format: string = '3 Normal Set',
  isFinishing: boolean = false
): MatchValidationResult {
  const set1 = validateSingleSet(s1_p1, s1_p2, 1, format);
  const set2 = validateSingleSet(s2_p1, s2_p2, 2, format);
  const set3 = validateSingleSet(s3_p1, s3_p2, 3, format);

  let p1SetsWon = 0;
  let p2SetsWon = 0;

  // Validate Set 1
  if (!set1.valid) {
    return {
      valid: false,
      error: `1. Set Hatası: ${set1.error}`,
      p1SetsWon: 0,
      p2SetsWon: 0,
      isMatchFinished: false,
      winner: null,
      canPlaySet3: false,
      set1Result: set1,
      set2Result: set2,
      set3Result: set3,
    };
  }

  if (set1.isComplete) {
    if (set1.winner === 1) p1SetsWon++;
    if (set1.winner === 2) p2SetsWon++;
  }

  // Set 2 played only if set 1 has started or completed
  const hasSet2 = s2_p1 > 0 || s2_p2 > 0;
  if (hasSet2 && !set1.isComplete) {
    return {
      valid: false,
      error: '1. Set henüz tamamlanmadan 2. sete skor girilemez.',
      p1SetsWon,
      p2SetsWon,
      isMatchFinished: false,
      winner: null,
      canPlaySet3: false,
      set1Result: set1,
      set2Result: set2,
      set3Result: set3,
    };
  }

  if (hasSet2) {
    if (!set2.valid) {
      return {
        valid: false,
        error: `2. Set Hatası: ${set2.error}`,
        p1SetsWon,
        p2SetsWon,
        isMatchFinished: false,
        winner: null,
        canPlaySet3: false,
        set1Result: set1,
        set2Result: set2,
        set3Result: set3,
      };
    }
    if (set2.isComplete) {
      if (set2.winner === 1) p1SetsWon++;
      if (set2.winner === 2) p2SetsWon++;
    }
  }

  // Best-of-3 Rule: Can Set 3 be played?
  const canPlaySet3 = p1SetsWon === 1 && p2SetsWon === 1;
  const hasSet3 = s3_p1 > 0 || s3_p2 > 0;

  if (hasSet3) {
    if (p1SetsWon === 2) {
      return {
        valid: false,
        error: '1. Oyuncu ilk iki seti kazanarak (2-0) maçı bitirmiştir. 3. set oynanamaz.',
        p1SetsWon,
        p2SetsWon,
        isMatchFinished: true,
        winner: 1,
        canPlaySet3: false,
        set1Result: set1,
        set2Result: set2,
        set3Result: set3,
      };
    }
    if (p2SetsWon === 2) {
      return {
        valid: false,
        error: '2. Oyuncu ilk iki seti kazanarak (0-2) maçı bitirmiştir. 3. set oynanamaz.',
        p1SetsWon,
        p2SetsWon,
        isMatchFinished: true,
        winner: 2,
        canPlaySet3: false,
        set1Result: set1,
        set2Result: set2,
        set3Result: set3,
      };
    }
    if (!set2.isComplete) {
      return {
        valid: false,
        error: '2. Set henüz tamamlanmadan 3. sete skor girilemez.',
        p1SetsWon,
        p2SetsWon,
        isMatchFinished: false,
        winner: null,
        canPlaySet3: false,
        set1Result: set1,
        set2Result: set2,
        set3Result: set3,
      };
    }
    if (!set3.valid) {
      return {
        valid: false,
        error: `3. Set Hatası: ${set3.error}`,
        p1SetsWon,
        p2SetsWon,
        isMatchFinished: false,
        winner: null,
        canPlaySet3,
        set1Result: set1,
        set2Result: set2,
        set3Result: set3,
      };
    }
    if (set3.isComplete) {
      if (set3.winner === 1) p1SetsWon++;
      if (set3.winner === 2) p2SetsWon++;
    }
  }

  let isMatchFinished = p1SetsWon >= 2 || p2SetsWon >= 2;
  let matchWinner: 1 | 2 | null = null;
  if (p1SetsWon >= 2) matchWinner = 1;
  else if (p2SetsWon >= 2) matchWinner = 2;

  if (isFinishing && !isMatchFinished) {
    return {
      valid: false,
      error: 'Maçı tamamlamak için bir oyuncunun 2 set kazanmış olması gerekir (veya maç durumunu Walkover/Retired seçiniz).',
      p1SetsWon,
      p2SetsWon,
      isMatchFinished,
      winner: matchWinner,
      canPlaySet3,
      set1Result: set1,
      set2Result: set2,
      set3Result: set3,
    };
  }

  return {
    valid: true,
    p1SetsWon,
    p2SetsWon,
    isMatchFinished,
    winner: matchWinner,
    canPlaySet3,
    set1Result: set1,
    set2Result: set2,
    set3Result: set3,
  };
}

/**
 * Returns allowed set presets matching the specific tennis format and set number.
 */
export function getValidPresetsForSet(
  setNumber: 1 | 2 | 3,
  format: string = '3 Normal Set'
): Array<{ p1: number; p2: number; label: string }> {
  const isShort = format.includes('Kısa') || format.includes('Kisa');
  const thirdSetMT = isMatchTiebreakThirdSet(format);

  if (setNumber === 3 && thirdSetMT.isMT) {
    if (thirdSetMT.target === 10) {
      return [
        { p1: 10, p2: 4, label: '10-4' },
        { p1: 10, p2: 6, label: '10-6' },
        { p1: 10, p2: 7, label: '10-7' },
        { p1: 10, p2: 8, label: '10-8' },
        { p1: 11, p2: 9, label: '11-9' },
        { p1: 12, p2: 10, label: '12-10' },
        { p1: 4, p2: 10, label: '4-10' },
        { p1: 6, p2: 10, label: '6-10' },
        { p1: 7, p2: 10, label: '7-10' },
        { p1: 8, p2: 10, label: '8-10' },
        { p1: 9, p2: 11, label: '9-11' },
      ];
    } else {
      return [
        { p1: 7, p2: 3, label: '7-3' },
        { p1: 7, p2: 4, label: '7-4' },
        { p1: 7, p2: 5, label: '7-5' },
        { p1: 8, p2: 6, label: '8-6' },
        { p1: 9, p2: 7, label: '9-7' },
        { p1: 3, p2: 7, label: '3-7' },
        { p1: 4, p2: 7, label: '4-7' },
        { p1: 5, p2: 7, label: '5-7' },
        { p1: 6, p2: 8, label: '6-8' },
      ];
    }
  }

  if (isShort) {
    return [
      { p1: 4, p2: 0, label: '4-0' },
      { p1: 4, p2: 1, label: '4-1' },
      { p1: 4, p2: 2, label: '4-2' },
      { p1: 5, p2: 3, label: '5-3' },
      { p1: 5, p2: 4, label: '5-4' },
      { p1: 0, p2: 4, label: '0-4' },
      { p1: 1, p2: 4, label: '1-4' },
      { p1: 2, p2: 4, label: '2-4' },
      { p1: 3, p2: 5, label: '3-5' },
      { p1: 4, p2: 5, label: '4-5' },
    ];
  }

  return [
    { p1: 6, p2: 0, label: '6-0' },
    { p1: 6, p2: 1, label: '6-1' },
    { p1: 6, p2: 2, label: '6-2' },
    { p1: 6, p2: 3, label: '6-3' },
    { p1: 6, p2: 4, label: '6-4' },
    { p1: 7, p2: 5, label: '7-5' },
    { p1: 7, p2: 6, label: '7-6' },
    { p1: 0, p2: 6, label: '0-6' },
    { p1: 1, p2: 6, label: '1-6' },
    { p1: 2, p2: 6, label: '2-6' },
    { p1: 3, p2: 6, label: '3-6' },
    { p1: 4, p2: 6, label: '4-6' },
    { p1: 5, p2: 7, label: '5-7' },
    { p1: 6, p2: 7, label: '6-7' },
  ];
}

/**
 * Checks if a player's game count can be safely incremented without creating an illegal tennis score.
 */
export function canIncrementSetScore(
  currentP1: number,
  currentP2: number,
  targetPlayer: 1 | 2,
  setNumber: 1 | 2 | 3,
  format: string = '3 Normal Set'
): boolean {
  const nextP1 = targetPlayer === 1 ? currentP1 + 1 : currentP1;
  const nextP2 = targetPlayer === 2 ? currentP2 + 1 : currentP2;

  const result = validateSingleSet(nextP1, nextP2, setNumber, format);
  return result.valid;
}

export function determineWinnerFromScores(
  p1Name: string,
  p2Name: string,
  s1_p1: number,
  s1_p2: number,
  s2_p1: number,
  s2_p2: number,
  s3_p1: number,
  s3_p2: number,
  format: string = '3 Normal Set'
): { winner: string; p1Sets: number; p2Sets: number; isMatchFinished: boolean; winnerIndex: 1 | 2 | null } {
  const matchVal = validateFullMatchScores(s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2, format, false);

  let winner = 'Secilmedi';
  if (matchVal.winner === 1) {
    winner = p1Name;
  } else if (matchVal.winner === 2) {
    winner = p2Name;
  } else if (matchVal.p1SetsWon > matchVal.p2SetsWon) {
    winner = p1Name;
  } else if (matchVal.p2SetsWon > matchVal.p1SetsWon) {
    winner = p2Name;
  }

  return {
    winner,
    p1Sets: matchVal.p1SetsWon,
    p2Sets: matchVal.p2SetsWon,
    isMatchFinished: matchVal.isMatchFinished,
    winnerIndex: matchVal.winner,
  };
}
