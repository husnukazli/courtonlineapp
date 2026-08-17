import React, { useState } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { RefereeLogin } from './RefereeLogin';
import { MatchSetupTab } from './MatchSetupTab';
import { LiveScoringTab } from './LiveScoringTab';
import { UserCheck, LogOut, Sparkles, SlidersHorizontal, Activity } from 'lucide-react';

export const CourtRefereeView: React.FC = () => {
  const { currentReferee, logoutReferee, activeMatch } = useTennisData();
  const [subMode, setSubMode] = useState<'kurulum' | 'skor'>('skor');

  if (!currentReferee) {
    return <RefereeLogin />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Referee Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shadow-lime-400/10">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Görevli Hakem</div>
            <div className="font-extrabold text-sm sm:text-base text-white">{currentReferee.name}</div>
          </div>
        </div>

        {/* Sub Mode Toggle Buttons */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setSubMode('kurulum')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                subMode === 'kurulum'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Kurulum / Kura</span>
            </button>

            <button
              onClick={() => setSubMode('skor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                subMode === 'skor'
                  ? 'bg-lime-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Canlı Skor</span>
            </button>
          </div>

          <button
            onClick={logoutReferee}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 transition"
            title="Hakem Çıkışı"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {subMode === 'kurulum' ? (
        <MatchSetupTab onStartScoring={() => setSubMode('skor')} />
      ) : (
        <LiveScoringTab onBackToSetup={() => setSubMode('kurulum')} />
      )}
    </div>
  );
};
