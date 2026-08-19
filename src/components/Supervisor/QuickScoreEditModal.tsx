import React, { useState, useEffect, useMemo } from 'react';
import { MatchItem, MatchStatus } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import {
  parseScoreString,
  buildScoreString,
  determineWinnerFromScores,
  validateFullMatchScores,
  canIncrementSetScore, 
} from '../../utils/tennisScoringEngine';
import {
  Trophy,
  Plus,
  Minus,
  Check,
  X,
  Clock,
  AlertCircle,
  Lock,
  Play,
  Settings, // Ayarlar ikonu eklendi
} from 'lucide-react';

interface QuickScoreEditModalProps {
  match: MatchItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSetup?: () => void; // YENİ: Kura ekranına geçiş tetikleyicisi
}

export const QuickScoreEditModal: React.FC<QuickScoreEditModalProps> = ({
  match,
  isOpen,
  onClose,
  onOpenSetup,
}) => {
  const { saveDirectScoreAndStatus } = useTennisData();

  const [s1_p1, setS1_p1] = useState(0);
  const [s1_p2, setS1_p2] = useState(0);
  const [s2_p1, setS2_p1] = useState(0);
  const [s2_p2, setS2_p2] = useState(0);
  const [s3_p1, setS3_p1] = useState(0);
  const [s3_p2, setS3_p2] = useState(0);

  const [status, setStatus] = useState<MatchStatus>('Oynaniyor');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [selectedWinner, setSelectedWinner] = useState<string>('Secilmedi');
  const [errorMessage, setErrorMessage] = useState<string>('');

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

      setStatus(match.Durum === 'Baslamadi' ? 'Oynaniyor' : match.Durum);

      const nowFormatted = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      setStartTime(match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi' ? match.Baslangic_Saati : nowFormatted);
      setEndTime(match.Bitis_Saati && match.Bitis_Saati !== 'Secilmedi' ? match.Bitis_Saati : '');

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
      setErrorMessage('');
    }
  }, [match, isOpen]);

  const matchFormat = match?.Skor_Formati || '3 Normal Set';
  const isOriginallyFinished = match ? ['Bitti', 'Retired', 'Walkover'].includes(match.Durum) : false;

  const validationResult = useMemo(() => {
    if (!match) return { valid: true, error: '', isMatchFinished: false, winner: null };
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
  const scoreWinnerName = validationResult.winner === 1 ? p1Name : validationResult.winner === 2 ? p2Name : null;

  useEffect(() => {
    if (status === 'Bitti' && scoreWinnerName) {
      setSelectedWinner(scoreWinnerName);
    }
  }, [status, scoreWinnerName]);

  const adjustTimeMinutes = (type: 'start' | 'end', deltaMinutes: number) => {
    let current = type === 'start' ? startTime : endTime;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(current)) {
      current = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    const [h, m] = current.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + deltaMinutes, 0, 0);
    const formatted = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (type === 'start') setStartTime(formatted);
    else setEndTime(formatted);
  };

  const handleSetTimeNow = (type: 'start' | 'end') => {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (type === 'start') setStartTime(now);
    else setEndTime(now);
  };

  if (!isOpen || !match) return null;

  const currentScorePreview = buildScoreString(s1_p1, s1_p2, s2_p1, s2_p2, s3_p1, s3_p2);

  const handleResumeLiveMode = () => {
    setStatus('Oynaniyor');
    setSelectedWinner('Secilmedi');
    setEndTime('');
    setErrorMessage('');
  };

  const handleSelectWinner = (winnerCandidate: string) => {
    setErrorMessage('');
    if (status === 'Bitti' && scoreWinnerName && winnerCandidate !== scoreWinnerName) {
      setErrorMessage(
        `Skora Göre Uyuşmazlık: Skor (${currentScorePreview}) ${scoreWinnerName} lehinedir. Maçı 'Normal Bitti' olarak ${winnerCandidate} kazandı şeklinde kaydedemezsiniz. Eğer maç sakatlık veya hükmen bittiyse lütfen 'Çekildi' veya 'Hükmen' seçiniz.`
      );
      return;
    }
    setSelectedWinner(winnerCandidate);
    if (!endTime) {
      handleSetTimeNow('end');
    }
  };

  const handleSave = () => {
    setErrorMessage('');
    const isFinishing = status === 'Bitti';
    const isSpecialFinish = status === 'Retired' || status === 'Walkover';
    const isResumingToLive = status === 'Oynaniyor';

    if (isFinishing && !isSpecialFinish) {
      if (!validationResult.valid) {
        setErrorMessage(
          validationResult.error ||
            'Girilen skor tenis kurallarına uygun değildir. Lütfen skoru kontrol ediniz.'
        );
        return;
      }
      if (!validationResult.isMatchFinished) {
        setErrorMessage(
          `Maç henüz tamamlanmamıştır! (Mevcut Skor: ${currentScorePreview || '0/0'}). Bir oyuncunun maçı normal kazanabilmesi için 2 seti kurallara uygun tamamlamış olması gerekir (örn: 6-4 6-2 veya 5-4 5-4). Eğer maçı canlıya döndürmek istiyorsanız 'Oynanıyor' seçiniz.`
        );
        return;
      }
      if (scoreWinnerName && selectedWinner !== scoreWinnerName) {
        setErrorMessage(
          `Skor uyumsuzluğu! Girilen skora göre (${currentScorePreview}) maçı ${scoreWinnerName} kazanmıştır. ${selectedWinner} kazanan olarak kaydedilemez. (Maç çekilme ile bittiyse 'Çekildi' seçiniz.)`
        );
        return;
      }
    }

    const finalWinner = isFinishing && !isSpecialFinish && scoreWinnerName
      ? scoreWinnerName
      : selectedWinner !== 'Secilmedi'
      ? selectedWinner
      : match.Kazanan;

    const finalEndTime =
      status === 'Bitti' || status === 'Retired' || status === 'Walkover'
        ? endTime || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        : status === 'Oynaniyor'
        ? ''
        : match.Bitis_Saati;

    saveDirectScoreAndStatus(match.id, {
      s1_p1,
      s1_p2,
      s2_p1,
      s2_p2,
      s3_p1,
      s3_p2,
      status: isResumingToLive ? 'Oynaniyor' : status,
      winner: isResumingToLive ? 'Secilmedi' : (finalWinner !== 'Secilmedi' ? finalWinner : undefined),
      startTime: startTime || match.Baslangic_Saati,
      endTime: finalEndTime,
    });

    onClose();
  };

  const handleScoreIncrease = (setNum: 1 | 2 | 3, player: 1 | 2) => {
    let cp1 = setNum === 1 ? s1_p1 : setNum === 2 ? s2_p1 : s3_p1;
    let cp2 = setNum === 1 ? s1_p2 : setNum === 2 ? s2_p2 : s3_p2;

    if (!canIncrementSetScore(cp1, cp2, player, setNum, matchFormat)) {
      setErrorMessage(`${setNum}. Set format sınırına ulaştı. Daha fazla skor girilemez.`);
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (setNum === 1) {
      if (player === 1) setS1_p1(s1_p1 + 1); else setS1_p2(s1_p2 + 1);
    } else if (setNum === 2) {
      if (player === 1) setS2_p1(s2_p1 + 1); else setS2_p2(s2_p2 + 1);
    } else {
      if (player === 1) setS3_p1(s3_p1 + 1); else setS3_p2(s3_p2 + 1);
    }
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-4 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 my-auto">
        
        {/* YENİ: KURA VE AYARLARA GİT BUTONU BURADA! */}
        {onOpenSetup && (
          <button
            type="button"
            onClick={onOpenSetup}
            className="w-full py-3 mb-2 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-200 font-black shadow-lg transition active:scale-95"
          >
            <Settings className="w-5 h-5 text-cyan-400" />
            <span>⚙️ KURA VE MAÇ AYARLARINA GİT</span>
          </button>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md shadow-lime-400/20">
              {match.Kort.replace('KORT', 'K').trim()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg">{match.Kort} Skor Düzenleme</h3>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                    status === 'Oynaniyor'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : status === 'Bitti'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {status === 'Oynaniyor' ? 'CANLI / OYNANIYOR' : status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {match.Kategori} • <span className="text-lime-400 font-bold">{match.Skor_Formati}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Re-open Banner if previously finished */}
        {isOriginallyFinished && status !== 'Oynaniyor' && (
          <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="text-xs text-emerald-200 text-center sm:text-left">
              <span className="font-extrabold block text-emerald-300">Maçı Devam Ettirmek İster misiniz?</span>
              <span>Skoru düzeltip maçı tekrar canlı maçlar arasına alabilirsiniz.</span>
            </div>
            <button
              type="button"
              onClick={handleResumeLiveMode}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Maçı Canlıya Al</span>
            </button>
          </div>
        )}

        {/* Players & Big Current Score Summary */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
          <div className="space-y-1.5 flex-1 pr-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-lime-400 shrink-0"></span>
              <span className="font-black text-sm sm:text-base text-lime-300 truncate">{p1Name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0"></span>
              <span className="font-black text-sm sm:text-base text-cyan-300 truncate">{p2Name}</span>
            </div>
          </div>

          <div className="text-right shrink-0 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Güncel Skor</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-wider">
              {currentScorePreview || '0/0'}
            </span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <strong className="block font-bold text-rose-300">Skor Uyarısı:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Big, Clean Set Scoring Rows (Set 1, Set 2, Set 3) */}
        <div className="space-y-3">
          {/* SET 1 */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                1. Set Oyunları
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                Skor: <strong className="text-white">{s1_p1} - {s1_p2}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-xs text-lime-400 font-bold truncate mr-2">{p1Name.split(' ')[0]}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setS1_p1(Math.max(0, s1_p1 - 1)); setErrorMessage(''); }} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"><Minus className="w-4 h-4" /></button>
                  <span className="font-mono text-xl font-black w-7 text-center text-white">{s1_p1}</span>
                  <button type="button" onClick={() => handleScoreIncrease(1, 1)} className="w-9 h-9 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 flex items-center justify-center font-black active:scale-95 transition shadow-sm shadow-lime-400/20"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-xs text-cyan-400 font-bold truncate mr-2">{p2Name.split(' ')[0]}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setS1_p2(Math.max(0, s1_p2 - 1)); setErrorMessage(''); }} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"><Minus className="w-4 h-4" /></button>
                  <span className="font-mono text-xl font-black w-7 text-center text-white">{s1_p2}</span>
                  <button type="button" onClick={() => handleScoreIncrease(1, 2)} className="w-9 h-9 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center font-black active:scale-95 transition shadow-sm shadow-cyan-400/20"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>

          {/* SET 2 */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">2. Set Oyunları</span>
              <span className="text-xs font-mono font-bold text-slate-400">Skor: <strong className="text-white">{s2_p1} - {s2_p2}</strong></span>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-xs text-lime-400 font-bold truncate mr-2">{p1Name.split(' ')[0]}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setS2_p1(Math.max(0, s2_p1 - 1)); setErrorMessage(''); }} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"><Minus className="w-4 h-4" /></button>
                  <span className="font-mono text-xl font-black w-7 text-center text-white">{s2_p1}</span>
                  <button type="button" onClick={() => handleScoreIncrease(2, 1)} className="w-9 h-9 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 flex items-center justify-center font-black active:scale-95 transition shadow-sm shadow-lime-400/20"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-xs text-cyan-400 font-bold truncate mr-2">{p2Name.split(' ')[0]}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setS2_p2(Math.max(0, s2_p2 - 1)); setErrorMessage(''); }} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"><Minus className="w-4 h-4" /></button>
                  <span className="font-mono text-xl font-black w-7 text-center text-white">{s2_p2}</span>
                  <button type="button" onClick={() => handleScoreIncrease(2, 2)} className="w-9 h-9 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center font-black active:scale-95 transition shadow-sm shadow-cyan-400/20"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>

          {/* SET 3 */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">3. Set / Karar Seti</span>
              <span className="text-xs font-mono font-bold text-slate-400">Skor: <strong className="text-white">{s3_p1} - {s3_p2}</strong></span>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-xs text-lime-400 font-bold truncate mr-2">{p1Name.split(' ')[0]}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setS3_p1(Math.max(0, s3_p1 - 1)); setErrorMessage(''); }} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"><Minus className="w-4 h-4" /></button>
                  <span className="font-mono text-xl font-black w-7 text-center text-white">{s3_p1}</span>
                  <button type="button" onClick={() => handleScoreIncrease(3, 1)} className="w-9 h-9 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 flex items-center justify-center font-black active:scale-95 transition shadow-sm shadow-lime-400/20"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-xs text-cyan-400 font-bold truncate mr-2">{p2Name.split(' ')[0]}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setS3_p2(Math.max(0, s3_p2 - 1)); setErrorMessage(''); }} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"><Minus className="w-4 h-4" /></button>
                  <span className="font-mono text-xl font-black w-7 text-center text-white">{s3_p2}</span>
                  <button type="button" onClick={() => handleScoreIncrease(3, 2)} className="w-9 h-9 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center font-black active:scale-95 transition shadow-sm shadow-cyan-400/20"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match State & Winner / Finish Actions */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-lime-400" />
              <span>Maç Durumu:</span>
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'Oynaniyor' as MatchStatus, label: '▶️ Oynanıyor (Canlı)' },
                { id: 'Bitti' as MatchStatus, label: 'Bitti' },
                { id: 'Retired' as MatchStatus, label: 'Çekildi' },
                { id: 'Walkover' as MatchStatus, label: 'Hükmen' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setStatus(st.id);
                    setErrorMessage('');
                    if (st.id === 'Oynaniyor') {
                      setSelectedWinner('Secilmedi');
                      setEndTime('');
                    } else if (st.id === 'Bitti') {
                      if (!endTime) handleSetTimeNow('end');
                      if (scoreWinnerName) setSelectedWinner(scoreWinnerName);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                    status === st.id
                      ? st.id === 'Oynaniyor'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                        : 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Winner Selection (Only relevant when finishing) */}
          {status !== 'Oynaniyor' ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kazanan Oyuncu:</label>
                {status === 'Bitti' && scoreWinnerName && (
                  <span className="text-[11px] text-lime-400 font-bold flex items-center gap-1"><Lock className="w-3 h-3" /><span>Skorla Uyumlu</span></span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => handleSelectWinner(p1Name)} className={`p-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition border ${selectedWinner === p1Name ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-md shadow-lime-400/20' : status === 'Bitti' && scoreWinnerName === p2Name ? 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-850 text-lime-300 border-slate-800'}`}>
                  <Trophy className="w-4 h-4" /><span className="truncate">{p1Name.split(' ')[0]} Kazandı</span>
                </button>
                <button type="button" onClick={() => handleSelectWinner(p2Name)} className={`p-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition border ${selectedWinner === p2Name ? 'bg-cyan-400 text-slate-950 border-cyan-400 shadow-md shadow-cyan-400/20' : status === 'Bitti' && scoreWinnerName === p1Name ? 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-850 text-cyan-300 border-slate-800'}`}>
                  <Trophy className="w-4 h-4" /><span className="truncate">{p2Name.split(' ')[0]} Kazandı</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Bu maç <strong>Canlı / Oynanıyor</strong> olarak kaydedilecek.</span></span>
            </div>
          )}

          {/* End Time Settings */}
          {(status === 'Bitti' || status === 'Retired' || status === 'Walkover') && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-cyan-400" /><span>Bitiş Saati:</span></span>
                <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="15:30" className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-bold text-white text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => adjustTimeMinutes('end', -5)} className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center justify-center gap-1"><Minus className="w-3 h-3" /><span>-5 dk</span></button>
                <button type="button" onClick={() => adjustTimeMinutes('end', 5)} className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center justify-center gap-1"><Plus className="w-3 h-3" /><span>+5 dk</span></button>
                <button type="button" onClick={() => handleSetTimeNow('end')} className="py-1.5 px-3 rounded-xl bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 border border-cyan-400/30 text-xs font-bold transition">Şimdi</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition">İptal</button>
          <button type="button" onClick={handleSave} className="flex-2 py-3.5 px-5 rounded-2xl font-black text-sm shadow-xl transition flex items-center justify-center gap-2 bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 text-slate-950">
            <Check className="w-5 h-5 stroke-[3]" /><span>Kaydet & Gönder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
