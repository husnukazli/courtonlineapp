import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Award, Timer, RotateCcw, ArrowRightLeft, Check, CheckCircle2 } from 'lucide-react';
import { MatchItem } from '../../types/tennis';
import { MatchLiveTimer } from './MatchLiveTimer';
import { useTennisData } from '../../context/TennisDataContext';

interface MatchDetailModalProps {
  match: MatchItem | null;
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, onClose }) => {
  const { resetMatchScore, updateMatch, matches, customCourts } = useTennisData();

  const activeMatch = useMemo(() => {
    if (!match) return null;
    return matches.find((m) => m.id === match.id) || match;
  }, [matches, match]);

  const [isChangingCourt, setIsChangingCourt] = useState(false);
  const [selectedNewCourt, setSelectedNewCourt] = useState(activeMatch?.Kort || '');
  const [courtChangeSuccess, setCourtChangeSuccess] = useState('');

  useEffect(() => {
    if (activeMatch?.Kort) {
      setSelectedNewCourt(activeMatch.Kort);
    }
  }, [activeMatch?.Kort]);

  const distinctCourts = useMemo(() => {
    const list = new Set<string>();
    (customCourts || []).forEach((c) => { if (c && c.trim()) list.add(c.trim()); });
    matches.forEach((m: any) => { if (m.Kort && m.Kort.trim()) list.add(m.Kort.trim()); });
    return Array.from(list).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [customCourts, matches]);

  if (!match || !activeMatch) return null;

  const state = activeMatch.detailedState;
  const p1Name = activeMatch['Oyuncu 1'];
  const p2Name = activeMatch['Oyuncu 2'];

  const handleResetMatch = () => {
    if (window.confirm('DİKKAT: Bu maçın tüm skorunu ve kurulum ayarlarını sıfırlamak istediğinize emin misiniz?\n\nMaç "Başlamadı" (0-0) konumuna geri dönecektir.')) {
      resetMatchScore(activeMatch.id);
      onClose();
    }
  };

  const handleConfirmCourtChange = () => {
    if (!selectedNewCourt || selectedNewCourt === activeMatch.Kort) return;

    const prevCourt = activeMatch.Kort;
    updateMatch({
      ...activeMatch,
      Kort: selectedNewCourt
    });

    setCourtChangeSuccess(`Maç "${prevCourt}" kortundan "${selectedNewCourt}" kortuna başarıyla taşındı.`);
    setTimeout(() => {
      setCourtChangeSuccess('');
      setIsChangingCourt(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎾</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-base">{activeMatch.Kort}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {activeMatch.Saat}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                    activeMatch.Durum === 'Oynaniyor'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                      : activeMatch.Durum === 'Duraklatildi'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : activeMatch.Durum === 'Bitti' || activeMatch.Durum === 'Retired' || activeMatch.Durum === 'Walkover'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {activeMatch.Durum === 'Duraklatildi' ? 'Mola' : activeMatch.Durum}
                </span>
                <MatchLiveTimer match={activeMatch} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{activeMatch.Kategori} • {activeMatch.Skor_Formati}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Main Score Board */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-inner">
            <div className="grid grid-cols-12 gap-2 items-center text-center font-mono">
              <div className="col-span-6 text-left font-sans">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Oyuncular</span>
              </div>
              <div className="col-span-2 text-xs text-slate-500 font-bold">SET 1</div>
              <div className="col-span-2 text-xs text-slate-500 font-bold">SET 2</div>
              <div className="col-span-2 text-xs text-slate-500 font-bold">SET 3</div>

              {/* Player 1 Row */}
              <div className="col-span-6 text-left flex items-center gap-2 py-2 border-b border-slate-800/80">
                {state?.currentServer === 1 && activeMatch.Durum === 'Oynaniyor' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shadow-sm shadow-lime-400"></span>
                )}
                <span
                  className={`text-sm font-bold truncate ${
                    activeMatch.Kazanan === p1Name ? 'text-lime-400 font-black' : 'text-slate-200'
                  }`}
                >
                  {activeMatch.Kazanan === p1Name ? '✓ ' : ''}
                  {p1Name}
                </span>
              </div>
              <div className="col-span-2 text-base font-bold py-2 border-b border-slate-800/80 text-white">
                {state ? state.set1_p1 : (activeMatch.Skor || '').split(' ')[0]?.split('/')[0] ?? '-'}
              </div>
              <div className="col-span-2 text-base font-bold py-2 border-b border-slate-800/80 text-white">
                {state ? state.set2_p1 : (activeMatch.Skor || '').split(' ')[1]?.split('/')[0] ?? '-'}
              </div>
              <div className="col-span-2 text-base font-bold py-2 border-b border-slate-800/80 text-white">
                {state ? state.set3_p1 : (activeMatch.Skor || '').split(' ')[2]?.split('/')[0] ?? '-'}
              </div>

              {/* Player 2 Row */}
              <div className="col-span-6 text-left flex items-center gap-2 py-2">
                {state?.currentServer === 2 && activeMatch.Durum === 'Oynaniyor' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shadow-sm shadow-lime-400"></span>
                )}
                <span
                  className={`text-sm font-bold truncate ${
                    activeMatch.Kazanan === p2Name ? 'text-lime-400 font-black' : 'text-slate-200'
                  }`}
                >
                  {activeMatch.Kazanan === p2Name ? '✓ ' : ''}
                  {p2Name}
                </span>
              </div>
              <div className="col-span-2 text-base font-bold py-2 text-white">
                {state ? state.set1_p2 : (activeMatch.Skor || '').split(' ')[0]?.split('/')[1] ?? '-'}
              </div>
              <div className="col-span-2 text-base font-bold py-2 text-white">
                {state ? state.set2_p2 : (activeMatch.Skor || '').split(' ')[1]?.split('/')[1] ?? '-'}
              </div>
              <div className="col-span-2 text-base font-bold py-2 text-white">
                {state ? state.set3_p2 : (activeMatch.Skor || '').split(' ')[2]?.split('/')[1] ?? '-'}
              </div>
            </div>

            {/* Current Game Point (if live) */}
            {activeMatch.Durum === 'Oynaniyor' && state && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Canlı Oyun Puanı:</span>
                  <span className="font-mono font-bold text-lime-400 text-sm">
                    {state.isTiebreak
                      ? `Tie-Break: ${state.tiebreak_p1} - ${state.tiebreak_p2}`
                      : `${state.gamePoint_p1} - ${state.gamePoint_p2}`}
                  </span>
                </div>
                <div className="text-slate-400">
                  Servis: <span className="font-semibold text-white">{state.currentServer === 1 ? p1Name : p2Name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Toss & Setup Information */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Kura Kazananı</div>
              <div className="text-xs font-bold text-slate-200 mt-1 truncate">
                {activeMatch.Kura_Kazanan || 'Seçilmedi'}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Kura Tercihi</div>
              <div className="text-xs font-bold text-slate-200 mt-1">
                {activeMatch.Kura_Tercih || 'Seçilmedi'}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Saha Tarafı</div>
              <div className="text-xs font-bold text-slate-200 mt-1">
                {activeMatch.Saha_Tarafi || 'Seçilmedi'}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Görevli Hakem</div>
              <div className="text-xs font-bold text-amber-400 mt-1 truncate">
                {activeMatch.Gorevli_Hakem || activeMatch.Son_Hakem || 'Atanmadı'}
              </div>
            </div>
          </div>

          {/* Referee & Last Action Audit Bar */}
          {activeMatch.Durum !== 'Baslamadi' && (activeMatch.Son_Islem_Hakem || (activeMatch.Son_Hakem && activeMatch.Son_Hakem !== '-' && activeMatch.Son_Hakem !== 'Atanmadı')) && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">🏛️ Görevli Hakem:</span>
                <span className="font-semibold text-slate-200">{activeMatch.Gorevli_Hakem || activeMatch.Son_Hakem || 'Atanmadı'}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-400">👤 Son İşlem:</span>
                <span className="font-medium text-slate-300">
                  {activeMatch.Son_Islem_Hakem || activeMatch.Son_Hakem || 'Turnuva Masası'}
                </span>
                {activeMatch.Son_Islem_Zamani && (
                  <span className="text-slate-500">({activeMatch.Son_Islem_Zamani})</span>
                )}
              </div>
            </div>
          )}

          {/* Match Times & Duration */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">Başlangıç:</span>
              <span className="font-bold text-white">{activeMatch.Baslangic_Saati || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Bitiş:</span>
              <span className="font-bold text-white">{activeMatch.Bitis_Saati || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-lime-400" />
              <span className="text-slate-400">Canlı Süre:</span>
              <MatchLiveTimer match={activeMatch} size="sm" />
            </div>
            {activeMatch.Kazanan && activeMatch.Kazanan !== 'Secilmedi' && (
              <div className="flex items-center gap-2 text-lime-400 font-bold">
                <Award className="w-4 h-4" />
                <span>Kazanan: {activeMatch.Kazanan}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Reset & Change Court Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3 flex-shrink-0">
          {/* Kort Değiştirme Paneli (Açıldığında) */}
          {isChangingCourt && (
            <div className="p-3.5 bg-slate-900 border border-amber-500/40 rounded-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  🏟️ Maçın Kortunu Değiştir (Mevcut: <strong className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{activeMatch.Kort}</strong>)
                </span>
                <button
                  onClick={() => setIsChangingCourt(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Vazgeç"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 relative">
                  <select
                    value={selectedNewCourt}
                    onChange={(e) => setSelectedNewCourt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                  >
                    {distinctCourts.map((court) => (
                      <option key={court} value={court}>
                        {court} {court === activeMatch.Kort ? '✓ (Mevcut Kort)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmCourtChange}
                  disabled={!selectedNewCourt || selectedNewCourt === activeMatch.Kort}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> Taşı & Kaydet
                </button>
              </div>

              {courtChangeSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{courtChangeSuccess}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleResetMatch}
                className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition flex items-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" /> Maçı Sıfırla
              </button>

              <button
                onClick={() => {
                  setIsChangingCourt(prev => !prev);
                  setCourtChangeSuccess('');
                }}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 border active:scale-95 shadow-sm ${
                  isChangingCourt
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" /> Maçın Kortunu Değiştir
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
