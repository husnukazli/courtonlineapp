import { MatchItem } from '../types/tennis';

function normalizeDurum(durum?: string): string {
  if (!durum) return '';
  return durum.trim().replace(/ı/g, 'i').replace(/İ/g, 'i').toLowerCase();
}

/**
 * Maçın net aktif oynanma süresini hesaplar (saniye cinsinden).
 * Askıya alınma (duraklatıldı) süreleri maç süresinden düşülür.
 * Maç duraklatıldığında veya bittiğinde sayaç kesin olarak donar.
 */
export function calculateMatchDurationSeconds(match: MatchItem, nowMs: number = Date.now()): number {
  const lowerDurum = normalizeDurum(match.Durum);
  const isFinished = ['bitti', 'retired', 'walkover'].includes(lowerDurum);
  const isPaused = lowerDurum === 'duraklatildi';
  const isLive = lowerDurum === 'oynaniyor';

  if (lowerDurum === 'baslamadi') return 0;
  if (!isLive && !isPaused && !isFinished) return 0;

  // 1. KORUMA: Bitmiş maçlarda daha önceden dondurulup kaydedilmiş kesin süre varsa onu döndür
  if (isFinished && typeof match.totalDurationSeconds === 'number' && match.totalDurationSeconds > 0) {
    return match.totalDurationSeconds;
  }

  // Başlangıç zamanını tespit et (timestamp veya saat string'inden)
  let startMs = match.startTimeTimestamp;
  if (!startMs || startMs <= 0) {
    if (match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi' && match.Baslangic_Saati.includes(':')) {
      const parts = match.Baslangic_Saati.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const d = new Date(nowMs);
        d.setHours(h, m, 0, 0);
        let candidate = d.getTime();
        if (candidate > nowMs) candidate -= 86400000;
        startMs = candidate;
      }
    }
  }

  if (!startMs || startMs <= 0) return 0;

  const pausedAcc = match.pausedAccumulatedMs || 0;

  // 2. ASKIYA ALINMIŞ MAÇ: Sayaç son askıya alınma anında dondurulur, akmaz!
  if (isPaused) {
    const pauseTime = match.lastPausedTimestamp || nowMs;
    return Math.floor(Math.max(0, pauseTime - startMs - pausedAcc) / 1000);
  }

  // 3. BİTMİŞ MAÇ: Sayacı bitiş saatine veya son ana göre dondur, asla nowMs ile akıtma!
  if (isFinished) {
    if (match.Bitis_Saati && match.Bitis_Saati !== 'Secilmedi' && match.Bitis_Saati.includes(':')) {
      const parts = match.Bitis_Saati.split(':');
      if (parts.length >= 2) {
        const endH = parseInt(parts[0], 10);
        const endM = parseInt(parts[1], 10);
        if (!isNaN(endH) && !isNaN(endM)) {
          const endD = new Date(startMs);
          endD.setHours(endH, endM, 0, 0);
          let calculatedEndMs = endD.getTime();
          if (calculatedEndMs < startMs) calculatedEndMs += 86400000;
          return Math.floor(Math.max(0, calculatedEndMs - startMs - pausedAcc) / 1000);
        }
      }
    }
    
    // Bitiş saati stringi yoksa son duraklatma veya o anki dondurma anını kullan
    const freezeMs = match.lastPausedTimestamp || nowMs;
    return Math.floor(Math.max(0, freezeMs - startMs - pausedAcc) / 1000);
  }

  // 4. CANLI OYNANIYOR: Net maç süresi
  return Math.floor(Math.max(0, nowMs - startMs - pausedAcc) / 1000);
}

/**
 * Maça verilen toplam askı/mola süresini (saniye cinsinden) hesaplar.
 * Eğer maç şu anda askıdaysa, şu anki askı süresi de canlı olarak eklenir.
 */
export function calculatePauseDurationSeconds(match: MatchItem, nowMs: number = Date.now()): number {
  const lowerDurum = normalizeDurum(match.Durum);
  const isPaused = lowerDurum === 'duraklatildi';
  const accumulatedMs = match.pausedAccumulatedMs || 0;

  if (isPaused) {
    const currentPauseStart = match.lastPausedTimestamp || nowMs;
    const currentSegmentMs = Math.max(0, nowMs - currentPauseStart);
    return Math.floor((accumulatedMs + currentSegmentMs) / 1000);
  }

  return Math.floor(accumulatedMs / 1000);
}

/**
 * Şu an devam eden aktif askı segmentinin süresini (saniye) hesaplar.
 */
export function calculateCurrentPauseSegmentSeconds(match: MatchItem, nowMs: number = Date.now()): number {
  const lowerDurum = normalizeDurum(match.Durum);
  if (lowerDurum !== 'duraklatildi') return 0;
  const currentPauseStart = match.lastPausedTimestamp || nowMs;
  return Math.floor(Math.max(0, nowMs - currentPauseStart) / 1000);
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0 || isNaN(totalSeconds)) return '--:--';
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

export function formatPauseDurationText(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return '';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} sa ${minutes} dk`;
  if (minutes > 0) return `${minutes} dk ${seconds > 0 ? `${seconds} sn` : ''}`.trim();
  return `${seconds} sn`;
}

/**
 * Saat string'ini (örn: "09:30", "9:30", "14:00", "NB 11:00") gün içi dakika değerine çevirir.
 * Eğer saat bulunamazsa (örn: "TAKİBEN", "SONRA") -1 döner.
 */
export function parseMatchTime(saatStr?: string): number {
  if (!saatStr || !saatStr.trim()) return -1;
  const trimmed = saatStr.trim().toUpperCase();
  const match = trimmed.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }
  const single = trimmed.match(/^(\d{1,2})$/);
  if (single) {
    const h = parseInt(single[1], 10);
    if (h >= 7 && h <= 23) return h * 60;
  }
  return -1;
}

/**
 * Maçları tenis turnuva akışına göre kronolojik olarak sıralar:
 * 1. Geçerli saatleri olan maçlar saat sırasına (dakika cinsinden) göre dizilir ("9:00" < "10:00").
 * 2. Saatleri aynı olan veya metinsel ("TAKİBEN" vb.) olan maçlar orijinal fikstür dizisindeki indeks sırasını korur.
 */
export function compareMatchesChronologically(a: any, b: any, allMatches?: any[]): number {
  const timeA = parseMatchTime(a.Saat);
  const timeB = parseMatchTime(b.Saat);

  if (timeA !== -1 && timeB !== -1 && timeA !== timeB) {
    return timeA - timeB;
  }

  if (allMatches && Array.isArray(allMatches)) {
    const idxA = allMatches.indexOf(a);
    const idxB = allMatches.indexOf(b);
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
      return idxA - idxB;
    }
  }

  return (a.Saat || '').localeCompare(b.Saat || '', undefined, { numeric: true });
}

/**
 * Çiftler maçlarında partner isimlerini tespit edip ayrıştırır.
 * "Ahmet Yılmaz / Mehmet Demir", "Ali Can & Veli Han" gibi formatları destekler.
 */
export function parsePlayerDoublesNames(name?: string): { isDoubles: boolean; partners: string[] } {
  if (!name || !name.trim()) return { isDoubles: false, partners: [] };
  const trimmed = name.trim();
  if (trimmed.includes('/') || trimmed.includes('&') || trimmed.includes('+')) {
    const parts = trimmed.split(/\s*[/&+]\s*/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return { isDoubles: true, partners: parts };
    }
  }
  return { isDoubles: false, partners: [trimmed] };
}


