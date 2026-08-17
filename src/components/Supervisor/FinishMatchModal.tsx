import React, { useState, useEffect, useMemo } from 'react';
import { MatchItem, MatchStatus } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import {
  parseScoreString,
  determineWinnerFromScores,
  buildScoreString,
  validateFullMatchScores,
} from '../../utils/tennisScoringEngine';
import {
  Trophy,
  CheckCircle2,
  X,
  AlertTriangle,
  Clock,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Lock,
} from 'lucide-react';

interface FinishMatchModalProps {
  match: MatchItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FinishMatchModal: React.FC<FinishMatchModalProps> = ({ match, isOpen, onClose }) => {
  const { finishAndReportMatch } = useTennisData();

  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('Bitti');
  const [endTime, setEndTime] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [s1_p1, setS1_p1] = useState(0);
  const [s1_p2, setS1_p2] = useState(0);
  const [s2_p1, setS2_p1] = useState(0);
  const [s2_p2, setS2_p2] = useState(0);
  const [s3_p1, setS3_p1] = useState(0);
  const [s3_p2, setS3_p2] = useState(0);

  useEffect(() => {
    if (match) {
      const parsed = parseScoreString(match.Skor);
      const s11 = match.detailedState?.set1_p1 ?? parsed.s1_p1;
      const s12 = match.detailedState?.set1_p2 ?? parsed.s1_p2;
      const s21 = match.detailedState?.set2_p1 ?? parsed.s2_p1;
      const s22 = match.detailedState?.set2_p2 ?? parsed.s2_p2;
      const s31 = match.detailedState?.set3_p1 ?? parsed.s3_p1;
      const s32 = match.detailedState?.set3_p2 ?? parsed.s3_p2;

      setS1_p1(s11);
      setS1_p2(s12);
      setS2_p1(s21);
      setS2_p2(s22);
      setS3_p1(s31);
      setS3_p2(s32);

      const nowFormatted = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      setEndTime(match.Bitis_Saati && match.Bitis_Saati !== 'Secilmedi' ? match.Bitis_Saati : nowFormatted);
      setStartTime(match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi' ? match.Baslangic_Saati : nowFormatted);

      const { winner } = determineWinnerFromScores(
        match['Oyuncu 1'],
        match['Oyuncu 2'],
        s11,
        s12,
        s21,
        s22,
        s31,
        s32,
        match.Skor_Formati
      );

      if (winner && winner !== 'Secilmedi') {
        setSelectedWinner(winner);
      } else if (match.Kazanan && match.Kazanan !== 'Secilmedi') {
        setSelectedWinner(match.Kazanan);
      } else {
        setSelectedWinner(match['Oyuncu 1']);
      }

      setMatchStatus(match.Durum === 'Retired' || match.Durum === 'Walkover' ? match.Durum : 'Bitti');
      setErrorMessage('');
    }
  }, [match, isOpen]);

  const matchFormat = match?.Skor_Formati || '3 Normal Set';

  // Real-time validation check
  const scoreValidation = useMemo(() => {
    if (!match) return { valid: false, error: '', isMatchFinished: false, winner: null };
    return validateFullMatchScores(
      s1_p1,
      s1_p2,
      s2_p1,
      s2_p2,
      s3_p1,
      s3_p2,
      matchFormat,
      true
    );
  }, [match, matchFormat, s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2]);

  const p1Name = match?.['Oyuncu 1'] || 'Oyuncu 1';
  const p2Name = match?.['Oyuncu 2'] || 'Oyuncu 2';
  const scoreWinnerName = scoreValidation.winner === 1 ? p1Name : scoreValidation.winner === 2 ? p2Name : null;

  // Auto-sync winner when status is "Bitti" and a winner is determined by tennis score
  useEffect(() => {
    if (matchStatus === 'Bitti' && scoreWinnerName) {
      setSelectedWinner(scoreWinnerName);
    }
  }, [matchStatus, scoreWinnerName]);

  // Adjust time by minutes
  const adjustEndTimeMinutes = (deltaMinutes: number) => {
    let current = endTime;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(current)) {
      current = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    const [h, m] = current.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + deltaMinutes, 0, 0);
    setEndTime(date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  };

  const handleSetTimeNow = () => {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setEndTime(now);
  };

  if (!isOpen || !match) return null;

  const currentScoreStr = buildScoreString(s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2);
  const isBitti = matchStatus === 'Bitti';
  const isScoreFinished = scoreValidation.valid && scoreValidation.isMatchFinished;
  const isInvalidNormalFinish = isBitti && !isScoreFinished;

  const handleWinnerClick = (candidateName: string) => {
    setErrorMessage('');
    if (isBitti && scoreWinnerName && candidateName !== scoreWinnerName) {
      setErrorMessage(
        `Skora Göre Uyuşmazlık: Skor (${currentScoreStr}) ${scoreWinnerName} lehinedir. Maçı 'Normal Bitti' olarak ${candidateName} kazandı şeklinde kaydedemezsiniz. Eğer maç sakatlık veya hükmen bittiyse lütfen 'Çekildi (RET)' veya 'Hükmen (WO)' seçiniz.`
      );
      return;
    }
    setSelectedWinner(candidateName);
  };

  const handleSave = () => {
    setErrorMessage('');

    // STRICT VALIDATION: If the referee is marking match as "Bitti" (Normal Bitti)
    if (isBitti) {
      if (!scoreValidation.valid) {
        setErrorMessage(
          scoreValidation.error ||
            'Girilen skor tenis kurallarına uygun değildir. Lütfen skoru kontrol ediniz.'
        );
        return;
      }
      if (!scoreValidation.isMatchFinished) {
        setErrorMessage(
          `Maç henüz tamamlanmamıştır! (Mevcut Skor: ${currentScoreStr || '0/0'}). Bir oyuncunun maçı normal kazanması için 2 seti kurallara uygun tamamlaması gerekir. Eğer maç sakatlık veya hükmen bittiyse 'Çekildi (RET)' veya 'Hükmen (WO)' seçiniz.`
        );
        return;
      }
      // Winner must strictly match the score winner
      if (scoreWinnerName && selectedWinner !== scoreWinnerName) {
        setErrorMessage(
          `Skor uyumsuzluğu! Girilen skora göre (${currentScoreStr}) maçı ${scoreWinnerName} kazanmıştır. ${selectedWinner} kazanan olarak seçilemez. (Maç çekilme ile bittiyse 'Çekildi (RET)' seçiniz.)`
        );
        return;
      }
    }

    const finalWinner = isBitti && scoreWinnerName ? scoreWinnerName : selectedWinner;

    if (!finalWinner || finalWinner === 'Secilmedi') {
      setErrorMessage('Lütfen kazanan oyuncuyu seçiniz.');
      return;
    }

    // Process finished match
    finishAndReportMatch(
      match.id,
      finalWinner,
      matchStatus,
      currentScoreStr,
      startTime || match.Baslangic_Saati,
      endTime || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center font-black text-sm">
              {match.Kort.replace('KORT', 'K').trim()}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">Maçı Bitir & Sonucu Bildir</h3>
              <p className="text-xs text-slate-400">
                {match.Kort} • {match.Kategori} • <span className="text-lime-400 font-bold">{matchFormat}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Final Score Banner */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-1.5 shadow-inner">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Bildirilecek Maç Skoru
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-widest">
            {currentScoreStr || '0/0 0/0'}
          </div>

          {/* Validation Feedback Strip */}
          {isBitti && (
            <div className="pt-2">
              {isScoreFinished ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Skor Tamamlandı & Tenis Kurallarına Uygun ({scoreWinnerName} Kazandı)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Dikkat: Skor henüz 2 sete ulaşmamış veya set tamamlanmamış!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Message Box if blocked */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <strong className="block font-bold text-rose-300">İşlem Engellendi:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Status Mode (Bitti / Çekildi / Walkover) */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-300">
            Bitiş Türü:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Bitti' as MatchStatus, label: 'Normal Bitti', desc: 'Tam Maç' },
              { id: 'Retired' as MatchStatus, label: 'Çekildi (RET)', desc: 'Sakatlık' },
              { id: 'Walkover' as MatchStatus, label: 'Hükmen (WO)', desc: 'Katılmadı' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setMatchStatus(st.id);
                  setErrorMessage('');
                  if (st.id === 'Bitti' && scoreWinnerName) {
                    setSelectedWinner(scoreWinnerName);
                  }
                }}
                className={`py-2 px-2 rounded-2xl text-xs border text-center transition ${
                  matchStatus === st.id
                    ? 'bg-slate-800 border-lime-400 text-white font-black shadow-md'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 font-semibold'
                }`}
              >
                <div>{st.label}</div>
                <div className="text-[10px] text-slate-400 font-normal">{st.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Winner Selector with Score-Locked Protection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-lime-400" />
              <span>Kazanan Oyuncu:</span>
            </label>
            {isBitti && scoreWinnerName && (
              <span className="text-[11px] text-lime-400 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Skora Göre Kilitli</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Player 1 */}
            <button
              type="button"
              onClick={() => handleWinnerClick(p1Name)}
              className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                selectedWinner === p1Name
                  ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-md shadow-lime-400/20 font-black'
                  : isBitti && scoreWinnerName === p2Name
                  ? 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-950/80 border-slate-800 text-lime-400 hover:bg-slate-800/80 font-bold'
              }`}
            >
              <div className="truncate pr-2">
                <div className={`text-[10px] uppercase font-bold ${selectedWinner === p1Name ? 'text-slate-900' : 'text-slate-400'}`}>
                  1. Oyuncu {isBitti && scoreWinnerName === p1Name && '(Kazanan)'}
                </div>
                <div className="text-xs sm:text-sm truncate">{p1Name}</div>
              </div>
              {selectedWinner === p1Name && <Check className="w-5 h-5 stroke-[3] shrink-0" />}
            </button>

            {/* Player 2 */}
            <button
              type="button"
              onClick={() => handleWinnerClick(p2Name)}
              className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                selectedWinner === p2Name
                  ? 'bg-cyan-400 text-slate-950 border-cyan-400 shadow-md shadow-cyan-400/20 font-black'
                  : isBitti && scoreWinnerName === p1Name
                  ? 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-950/80 border-slate-800 text-cyan-400 hover:bg-slate-800/80 font-bold'
              }`}
            >
              <div className="truncate pr-2">
                <div className={`text-[10px] uppercase font-bold ${selectedWinner === p2Name ? 'text-slate-900' : 'text-slate-400'}`}>
                  2. Oyuncu {isBitti && scoreWinnerName === p2Name && '(Kazanan)'}
                </div>
                <div className="text-xs sm:text-sm truncate">{p2Name}</div>
              </div>
              {selectedWinner === p2Name && <Check className="w-5 h-5 stroke-[3] shrink-0" />}
            </button>
          </div>
        </div>

        {/* End Time Settings with +5 dk / -5 dk / Şimdi Buttons */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Maç Bitiş Saati:</span>
            </span>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="15:30"
              className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-xl text-center font-mono font-black text-white text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => adjustEndTimeMinutes(-5)}
              className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
            >
              <Minus className="w-3 h-3" />
              <span>-5 dk</span>
            </button>

            <button
              type="button"
              onClick={() => adjustEndTimeMinutes(5)}
              className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>+5 dk</span>
            </button>

            <button
              type="button"
              onClick={handleSetTimeNow}
              className="py-1.5 px-3 rounded-xl bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 border border-cyan-400/30 text-xs font-bold transition active:scale-95"
            >
              Şimdi
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition"
          >
            İptal
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 active:scale-95 ${
              isInvalidNormalFinish
                ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                : 'bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 shadow-lime-400/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sonucu Bildir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
