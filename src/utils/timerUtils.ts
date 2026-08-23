import { MatchItem } from '../types/tennis';

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

export function calculateMatchDurationSeconds(match: MatchItem, nowMs: number = Date.now()): number {
  const durum = match.Durum || '';
  const isFinished = durum === 'Bitti' || durum === 'Retired' || durum === 'Walkover';
  const isPaused = durum === 'Duraklatildi';
  const isLive = durum === 'Oynaniyor';

  // totalDurationSeconds sadece BİTMİŞ maçlarda kullan.
  // Oynaniyor / Duraklatildi durumlarında bu alan stale olabilir — yok say.
  if (
    isFinished &&
    typeof match.totalDurationSeconds === 'number' &&
    match.totalDurationSeconds > 0
  ) {
    return match.totalDurationSeconds;
  }

  if (durum === 'Baslamadi') return 0;
  if (!isLive && !isPaused && !isFinished) return 0;

  let startMs = match.startTimeTimestamp;

  if (!startMs && match.Baslangic_Saati) {
    const parsed = parseTimeStringToTimestamp(match.Baslangic_Saati);
    if (parsed) {
      startMs = parsed > nowMs ? nowMs - 60000 : parsed;
    }
  }

  if (!startMs) return 0;

  const pausedAcc = match.pausedAccumulatedMs || 0;

  if (isFinished) {
    let endMs = match.lastPausedTimestamp;
    if (!endMs && match.Bitis_Saati) {
      endMs = parseTimeStringToTimestamp(match.Bitis_Saati) || nowMs;
    }
    if (!endMs) endMs = nowMs;
    return Math.floor(Math.max(0, endMs - startMs - pausedAcc) / 1000);
  }

  if (isPaused) {
    const pauseTime = match.lastPausedTimestamp || nowMs;
    return Math.floor(Math.max(0, pauseTime - startMs - pausedAcc) / 1000);
  }

  // Oynaniyor — her zaman anlık hesap
  return Math.floor(Math.max(0, nowMs - startMs - pausedAcc) / 1000);
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationText(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return '0 dk';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} sa ${minutes} dk`;
  return `${minutes} dk`;
}
