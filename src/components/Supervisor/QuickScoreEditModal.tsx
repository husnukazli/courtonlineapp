import React, { useState, useEffect } from 'react';
import { MatchItem, MatchStatus } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import { X, Save, Trophy, AlertCircle } from 'lucide-react';
import { parseScoreString, validateFullMatchScores } from '../../utils/tennisScoringEngine';

interface QuickScoreEditModalProps {
  match: MatchItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickScoreEditModal: React.FC<QuickScoreEditModalProps> = ({
  match,
  isOpen,
  onClose,
}) => {
  const { saveDirectScoreAndStatus } = useTennisData();

  const [scores, setScores] = useState({
    s1_p1: 0, s1_p2: 0,
    s2_p1: 0, s2_p2: 0,
    s3_p1: 0, s3_p2: 0,
  });
  
  const [status, setStatus] = useState<MatchStatus>('Oynaniyor');
  const [winner, setWinner] = useState<string>('Secilmedi');
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (match && isOpen) {
      let initScores = { s1_p1: 0, s1_p2: 0, s2_p1: 0, s2_p2: 0, s3_p1: 0, s3_p2: 0 };
      
      if (match.detailedState) {
        initScores = {
          s1_p1: match.detailedState.set1_p1 || 0,
          s1_p2: match.detailedState.set1_p2 || 0,
          s2_p1: match.detailedState.set2_p1 || 0,
          s2_p2: match.detailedState.set2_p2 || 0,
          s3_p1: match.detailedState.set3_p1 || 0,
          s3_p2: match.detailedState.set3_p2 || 0,
        };
      } else {
        const parsed = parseScoreString(match.Skor);
        initScores = {
          s1_p1: parsed.s1_p1, s1_p2: parsed.s1_p2,
          s2_p1: parsed.s2_p1, s2_p2: parsed.s2_p2,
          s3_p1: parsed.s3_p1, s3_p2: parsed.s3_p2,
        };
      }

      setScores(initScores);
      setStatus(match.Durum || 'Oynaniyor');
      setWinner(match.Kazanan || 'Secilmedi');
      setValidationError('');
    }
  }, [match, isOpen]);

  if (!isOpen || !match) return null;

  const handleScoreChange = (field: keyof typeof scores, value: string) => {
    const num = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= 99) {
      setScores(prev => ({ ...prev, [field]: num }));
      setValidationError(''); // Yeni bir şey yazıldığında eski hatayı sil
    }
  };

  const handleSave = () => {
    const format = match.Skor_Formati || '3 Normal Set';
    const isEndingNormally = status === 'Bitti';
    let finalWinner = winner;
    let endTime = undefined;

    // KURAL MOTORU DEVREYE GİRİYOR
    const validation = validateFullMatchScores(
      scores.s1_p1, scores.s1_p2,
      scores.s2_p1, scores.s2_p2,
      scores.s3_p1, scores.s3_p2,
      format,
      isEndingNormally
    );

    // Formata uygun değilse blokla
    if (!validation.valid) {
      setValidationError(validation.error || 'Girdiğiniz skorlar turnuva formatına uygun değil.');
      return;
    }

    if (isEndingNormally) {
      // Bitti dediyse motorun bulduğu kazananı otomatik ata
      if (validation.winner === 1) finalWinner = match['Oyuncu 1'];
      else if (validation.winner === 2) finalWinner = match['Oyuncu 2'];
      else {
        setValidationError('Skorlar maçı bitirmek için yeterli değil (Bir oyuncu 2 set kazanmalı).');
        return;
      }
    } else if (['Retired', 'Walkover'].includes(status)) {
      // Çekilme durumunda hakem manuel kazanan seçmek zorundadır
      if (winner === 'Secilmedi') {
        setValidationError('Lütfen Retired/Walkover için kazananı seçin.');
        return;
      }
    } else if (status === 'Baslamadi') {
      finalWinner = 'Secilmedi';
    } else {
      // Oynanıyor veya Askıya alındı
      finalWinner = 'Secilmedi';
    }

    // Maç sona erdiyse bitiş saati ataması
    if (['Bitti', 'Retired', 'Walkover'].includes(status)) {
       endTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    saveDirectScoreAndStatus(match.id, {
      ...scores,
      status: status,
      winner: finalWinner,
      endTime: endTime,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-5 relative">
        
        {/* Başlık */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span className="text-cyan-400">✏️</span> Skor Girişi
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 font-bold">Format: <span className="text-amber-400">{match.Skor_Formati}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Oyuncu İsimleri Başlıkları */}
        <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">
          <div className="col-span-4 text-left">Oyuncu</div>
          <div className="col-span-2">1. Set</div>
          <div className="col-span-2">2. Set</div>
          <div className="col-span-2">3. Set</div>
        </div>

        {/* Skor Giriş Alanları */}
        <div className="space-y-3">
          {/* Oyuncu 1 */}
          <div className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-2xl border border-slate-800">
            <div className="col-span-4 text-xs font-bold text-lime-400 truncate pr-2" title={match['Oyuncu 1']}>
              {match['Oyuncu 1']}
            </div>
            <div className="col-span-2">
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={scores.s1_p1 === 0 && scores.s1_p2 === 0 && !scores.s1_p1 ? '' : scores.s1_p1} onChange={(e) => handleScoreChange('s1_p1', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-center text-white font-mono font-bold focus:border-lime-400 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={scores.s2_p1 === 0 && scores.s2_p2 === 0 && !scores.s2_p1 ? '' : scores.s2_p1} onChange={(e) => handleScoreChange('s2_p1', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-center text-white font-mono font-bold focus:border-lime-400 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={scores.s3_p1 === 0 && scores.s3_p2 === 0 && !scores.s3_p1 ? '' : scores.s3_p1} onChange={(e) => handleScoreChange('s3_p1', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-center text-white font-mono font-bold focus:border-lime-400 focus:outline-none" />
            </div>
          </div>

          {/* Oyuncu 2 */}
          <div className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-2xl border border-slate-800">
            <div className="col-span-4 text-xs font-bold text-cyan-400 truncate pr-2" title={match['Oyuncu 2']}>
              {match['Oyuncu 2']}
            </div>
            <div className="col-span-2">
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={scores.s1_p2 === 0 && scores.s1_p1 === 0 && !scores.s1_p2 ? '' : scores.s1_p2} onChange={(e) => handleScoreChange('s1_p2', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-center text-white font-mono font-bold focus:border-cyan-400 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={scores.s2_p2 === 0 && scores.s2_p1 === 0 && !scores.s2_p2 ? '' : scores.s2_p2} onChange={(e) => handleScoreChange('s2_p2', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-center text-white font-mono font-bold focus:border-cyan-400 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={scores.s3_p2 === 0 && scores.s3_p1 === 0 && !scores.s3_p2 ? '' : scores.s3_p2} onChange={(e) => handleScoreChange('s3_p2', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-center text-white font-mono font-bold focus:border-cyan-400 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Hata Mesajı */}
        {validationError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-bold">{validationError}</span>
          </div>
        )}

        {/* Maç Durumu ve Kazanan Seçimi */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Maç Durumu</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as MatchStatus); setValidationError(''); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-cyan-400 focus:outline-none appearance-none"
            >
              <option value="Oynaniyor">🟢 Canlı / Devam Ediyor</option>
              <option value="Bitti">✅ Bitti (Normal)</option>
              <option value="Retired">⚠️ Retired (Çekildi)</option>
              <option value="Walkover">❌ Walkover (Hükmen)</option>
              <option value="Baslamadi">⏳ Başlamadı (Sıfırla)</option>
            </select>
          </div>

          {status === 'Bitti' && (
             <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center justify-center gap-2 animate-in fade-in">
               <Trophy className="w-3.5 h-3.5" />
               <span className="font-bold">Kazanan girdiğiniz skordan otomatik belirlenecektir.</span>
             </div>
          )}

          {['Retired', 'Walkover'].includes(status) && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-black uppercase text-amber-500 mb-1.5 flex items-center gap-1"><Trophy className="w-3 h-3" /> Kazanan Kim?</label>
              <select
                value={winner}
                onChange={(e) => { setWinner(e.target.value); setValidationError(''); }}
                className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-amber-400 focus:outline-none appearance-none"
              >
                <option value="Secilmedi">-- Kazananı Seçiniz --</option>
                <option value={match['Oyuncu 1']}>{match['Oyuncu 1']}</option>
                <option value={match['Oyuncu 2']}>{match['Oyuncu 2']}</option>
              </select>
            </div>
          )}
        </div>

        {/* Butonlar */}
        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={onClose} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition">
            İptal
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg shadow-cyan-500/20"
          >
            <Save className="w-4 h-4" />
            Kurallı Kaydet
          </button>
        </div>

      </div>
    </div>
  );
};
