import { MatchItem } from '../types/tennis';

export function calculateMatchDurationSeconds(match: MatchItem, nowMs: number = Date.now()): number {
  const durum = match.Durum || '';
  const isFinished = durum === 'Bitti' || durum === 'Retired' || durum === 'Walkover';
  const isPaused = durum === 'Duraklatildi';
  const isLive = durum === 'Oynaniyor';

  if (durum === 'Baslamadi') return 0;
  if (!isLive && !isPaused && !isFinished) return 0;

  // 1. KORUMA: Bitmiş maçlarda daha önceden kaydedilmiş net bir süre varsa doğrudan onu kullan
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

  // 2. KESİN KİLİT (DÜZELTME): Maç 'Bitti', 'Retired' veya 'Walkover' olmuşsa ASLA 'nowMs' kullanıp sayacı akıtma!
  if (isFinished) {
    // Eğer Bitiş Saati (örn: "15:30") varsa, o saate göre süreyi hesaplayıp dondur
    if (match.Bitis_Saati && match.Bitis_Saati !== 'Secilmedi' && match.Bitis_Saati.includes(':')) {
      const parts = match.Bitis_Saati.split(':');
      if (parts.length >= 2) {
        const endH = parseInt(parts[0], 10);
        const endM = parseInt(parts[1], 10);
        if (!isNaN(endH) && !isNaN(endM)) {
          const endD = new Date(startMs);
          endD.setHours(endH, endM, 0, 0);
          let calculatedEndMs = endD.getTime();
          
          // Eğer maç gece yarısını geçmişse (Başlangıç 23:00, Bitiş 01:00 gibi) bir gün ekle
          if (calculatedEndMs < startMs) calculatedEndMs += 86400000;
          
          return Math.floor(Math.max(0, calculatedEndMs - startMs - pausedAcc) / 1000);
        }
      }
    }
    
    // Eğer bitiş saatine dair hiçbir veri yoksa sayacı olduğu yerde dondur
    const freezeMs = match.lastPausedTimestamp || startMs;
    return Math.floor(Math.max(0, freezeMs - startMs - pausedAcc) / 1000);
  }

  // Oynaniyor — canlı akış
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
