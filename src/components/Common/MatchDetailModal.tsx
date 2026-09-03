import React from 'react';
import { X, Clock, Award, Timer, RotateCcw } from 'lucide-react';
import { MatchItem } from '../../types/tennis';
import { MatchLiveTimer } from './MatchLiveTimer';
import { useTennisData } from '../../context/TennisDataContext';

interface MatchDetailModalProps {
  match: MatchItem | null;
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, onClose }) => {
  const { resetMatchScore } = useTennisData();

  if (!match) return null;

  const state = match.detailedState;
  const p1Name = match['Oyuncu 1'];
  const p2Name = match['Oyuncu 2'];

  const handleResetMatch = () => {
    if (window.confirm('DİKKAT: Bu maçın tüm skorunu ve kurulum ayarlarını sıfırlamak istediğinize emin misiniz?\n\nMaç "Başlamadı" (0-0) konumuna geri dönecektir.')) {
      resetMatchScore(match.id);
      onClose();
    }
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
                <span className="font-bold text-white text-base">{match.Kort}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {match.Saat}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                    match.Durum === 'Oynaniyor'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                      : match.Durum === 'Duraklatildi'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : match.Durum === 'Bitti' || match.Durum === 'Retired' || match.Durum === 'Walkover'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {match.Durum === 'Duraklatildi' ? 'Mola' : match.Durum}
                </span>
                <MatchLiveTimer match={match} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{match.Kategori} • {match.Skor_Formati}</p>
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
                {state?.currentServer === 1 && match.Durum === 'Oynaniyor' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shadow-sm shadow-lime-400"></span>
                )}
                <span
                  className={`text-sm font-bold truncate ${
                    match.Kazanan === p1Name ? 'text-lime-400 font-black' : 'text-slate-200'
                  }`}
                >
                  {match.Kazanan === p1Name ? '✓ ' : ''}
                  {p1Name}
                </span>
              </div>
              <div className="col-span-2 text-base font-bold py-2 border-b border-slate-800/80 text-white">
                {state ? state.set1_p1 : (match.Skor || '').split(' ')[0]?.split('/')[0] ?? '-'}
              </div>
              <div className="col-span-2 text-base font-bold py-2 border-b border-slate-800/80 text-white">
                {state ? state.set2_p1 : (match.Skor || '').split(' ')[1]?.split('/')[0] ?? '-'}
              </div>
              <div className="col-span-2 text-base font-bold py-2 border-b border-slate-800/80 text-white">
                {state ? state.set3_p1 : (match.Skor || '').split(' ')[2]?.split('/')[0] ?? '-'}
              </div>

              {/* Player 2 Row */}
              <div className="col-span-6 text-left flex items-center gap-2 py-2">
                {state?.currentServer === 2 && match.Durum === 'Oynaniyor' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shadow-sm shadow-lime-400"></span>
                )}
                <span
                  className={`text-sm font-bold truncate ${
                    match.Kazanan === p2Name ? 'text-lime-400 font-black' : 'text-slate-200'
                  }`}
                >
                  {match.Kazanan === p2Name ? '✓ ' : ''}
                  {p2Name}
                </span>
              </div>
              <div className="col-span-2 text-base font-bold py-2 text-white">
                {state ? state.set1_p2 : (match.Skor || '').split(' ')[0]?.split('/')[1] ?? '-'}
              </div>
              <div className="col-span-2 text-base font-bold py-2 text-white">
                {state ? state.set2_p2 : (match.Skor || '').split(' ')[1]?.split('/')[1] ?? '-'}
              </div>
              <div className="col-span-2 text-base font-bold py-2 text-white">
                {state ? state.set3_p2 : (match.Skor || '').split(' ')[2]?.split('/')[1] ?? '-'}
              </div>
            </div>

            {/* Current Game Point (if live) */}
            {match.Durum === 'Oynaniyor' && state && (
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
                {match.Kura_Kazanan || 'Seçilmedi'}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Kura Tercihi</div>
              <div className="text-xs font-bold text-slate-200 mt-1">
                {match.Kura_Tercih || 'Seçilmedi'}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Saha Tarafı</div>
              <div className="text-xs font-bold text-slate-200 mt-1">
                {match.Saha_Tarafi || 'Seçilmedi'}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Görevli Hakem</div>
              <div className="text-xs font-bold text-amber-400 mt-1 truncate">
                {match.Son_Hakem || 'Atanmadı'}
              </div>
            </div>
          </div>

          {/* Match Times & Duration */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">Başlangıç:</span>
              <span className="font-bold text-white">{match.Baslangic_Saati || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Bitiş:</span>
              <span className="font-bold text-white">{match.Bitis_Saati || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-lime-400" />
              <span className="text-slate-400">Canlı Süre:</span>
              <MatchLiveTimer match={match} size="sm" />
            </div>
            {match.Kazanan && match.Kazanan !== 'Secilmedi' && (
              <div className="flex items-center gap-2 text-lime-400 font-bold">
                <Award className="w-4 h-4" />
                <span>Kazanan: {match.Kazanan}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Reset Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleResetMatch}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Maçı Sıfırla
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
