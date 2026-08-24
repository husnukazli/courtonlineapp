import { MatchItem } from '../types/tennis';

export function calculateMatchDurationSeconds(match: MatchItem, nowMs: number = Date.now()): number {
  const durum = match.Durum || '';
  const isFinished = durum === 'Bitti' || durum === 'Retired' || durum === 'Walkover';
  const isPaused = durum === 'Duraklatildi';
  const isLive = durum === 'Oynaniyor';

  if (durum === 'Baslamadi') return 0;
  if (!isLive && !isPaused && !isFinished) return 0;

  // Bitmiş maçlarda kaydedilmiş süreyi kullan
  if (isFinished && typeof match.totalDurationSeconds === 'number' && match.totalDurationSeconds > 0) {
    return match.totalDurationSeconds;
  }

  // startTimeTimestamp YOKSA timer gösterme — saat string'inden tahmin hatalı sonuç verir
  const startMs = match.startTimeTimestamp;
  if (!startMs || startMs <= 0) return 0;

  const pausedAcc = match.pausedAccumulatedMs || 0;

  if (isPaused) {
    const pauseTime = match.lastPausedTimestamp || nowMs;
    return Math.floor(Math.max(0, pauseTime - startMs - pausedAcc) / 1000);
  }

  if (isFinished) {
    const endMs = match.lastPausedTimestamp || nowMs;
    return Math.floor(Math.max(0, endMs - startMs - pausedAcc) / 1000);
  }

  // Oynaniyor — anlık hesap
  return Math.floor(Math.max(0, nowMs - startMs - pausedAcc) / 1000);
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return '--:--';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationText(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return '--';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} sa ${minutes} dk`;
  return `${minutes} dk`;
}
