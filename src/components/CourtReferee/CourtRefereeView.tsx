import React, { useState } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { RefereeLogin } from './RefereeLogin';
import { MatchSetupTab } from './MatchSetupTab';
import { LiveScoringTab } from './LiveScoringTab';
import { UserCheck, LogOut, SlidersHorizontal, Activity } from 'lucide-react';

interface CourtRefereeViewProps {
  onBackToList?: () => void;
}

export const CourtRefereeView: React.FC<CourtRefereeViewProps> = ({ onBackToList }) => {
  const { currentReferee, logoutReferee, setAuthRole } = useTennisData();

  const handleLogout = () => {
    logoutReferee();
    setAuthRole('none');
    if (onBackToList) onBackToList();
  };
  const [subMode, setSubMode] = useState<'kurulum' | 'skor'>('kurulum');

  if (!currentReferee) {
    return <RefereeLogin />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* ── Hakem Header ── amber temalı, başhakem masasından net ayrışıyor */}
      <div className="bg-amber-950/60 border border-amber-700/50 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-xl shadow-amber-900/20">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shadow-amber-400/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-amber-400/70 font-semibold uppercase tracking-wider">Kort Hakemi</div>
            <div className="font-extrabold text-sm sm:text-base text-amber-100">{currentReferee.name}</div>
          </div>
        </div>

        {/* Sekme seçici + çıkış */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-950/80 p-1 rounded-xl border border-amber-800/50 flex items-center">
            <button
              onClick={() => setSubMode('kurulum')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                subMode === 'kurulum'
                  ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/30'
                  : 'text-amber-400/60 hover:text-amber-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Kurulum / Kura</span>
            </button>

            <button
              onClick={() => setSubMode('skor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                subMode === 'skor'
                  ? 'bg-lime-400 text-slate-950 shadow shadow-lime-400/30'
                  : 'text-amber-400/60 hover:text-amber-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Canlı Skor</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-amber-400/60 hover:text-rose-400 hover:bg-rose-950/30 border border-amber-800/40 transition"
            title="Hakem Çıkışı"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Renkli ayırıcı şerit — görsel ipucu */}
      <div className="h-0.5 w-full rounded-full bg-gradient-to-r from-amber-600/0 via-amber-500/40 to-amber-600/0" />

      {/* ── İçerik ── */}
      {subMode === 'kurulum' ? (
        <MatchSetupTab onStartScoring={() => setSubMode('skor')} />
      ) : (
        <LiveScoringTab onBackToSetup={() => setSubMode('kurulum')} />
      )}
    </div>
  );
};
