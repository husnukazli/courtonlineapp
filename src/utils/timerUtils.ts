import { MatchItem } from '../types/tennis';

/**
 * Parses time string like "14:30" or "09:15" into today's epoch milliseconds
 */
export function parseTimeStringToTimestamp(timeStr: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/**
 * Calculates active match duration in seconds considering pauses and statuses
 */
export function calculateMatchDurationSeconds(match: MatchItem, nowMs: number = Date.now()): number {
  if (typeof match.totalDurationSeconds === 'number' && match.totalDurationSeconds > 0) {
    return match.totalDurationSeconds;
  }

  // If match has not started yet
  if (match.Durum === 'Baslamadi') {
    return 0;
  }

  let startMs = match.startTimeTimestamp;

  // Fallback: parse Baslangic_Saati if timestamp is missing
  if (!startMs && match.Baslangic_Saati) {
    const parsedStart = parseTimeStringToTimestamp(match.Baslangic_Saati);
    if (parsedStart) {
      startMs = parsedStart;
      // If parsedStart is in the future compared to now, treat as just started
      if (startMs > nowMs) {
        startMs = nowMs - 60000; // 1 min ago
      }
    }
  }

  if (!startMs) {
    return 0;
  }

  const pausedAcc = match.pausedAccumulatedMs || 0;

  // If finished
  if (match.Durum === 'Bitti' || match.Durum === 'Retired' || match.Durum === 'Walkover') {
    let endMs = match.lastPausedTimestamp;
    if (!endMs && match.Bitis_Saati) {
      endMs = parseTimeStringToTimestamp(match.Bitis_Saati) || nowMs;
    }
    if (!endMs) endMs = nowMs;

    const diff = Math.max(0, endMs - startMs - pausedAcc);
    return Math.floor(diff / 1000);
  }

  // If currently paused
  if (match.Durum === 'Duraklatildi') {
    const pauseTime = match.lastPausedTimestamp || nowMs;
    const diff = Math.max(0, pauseTime - startMs - pausedAcc);
    return Math.floor(diff / 1000);
  }

  // If currently live/active (Oynaniyor)
  const diff = Math.max(0, nowMs - startMs - pausedAcc);
  return Math.floor(diff / 1000);
}

/**
 * Formats total seconds into MM:SS or HH:MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) {
    return '00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats duration into a readable Turkish text e.g. "45 dk" or "1 sa 15 dk"
 */
export function formatDurationText(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) {
    return '0 dk';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} sa ${minutes} dk`;
  }
  return `${minutes} dk`;
}
