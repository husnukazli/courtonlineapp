import React, { useState } from 'react';
import { UserCheck, KeyRound, Shield, AlertCircle, Sparkles } from 'lucide-react';
import { useTennisData } from '../../context/TennisDataContext';

export const RefereeLogin: React.FC = () => {
  const { referees, loginReferee } = useTennisData();
  const [selectedName, setSelectedName] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedName) {
      setError('Lütfen hakem isminizi seçin.');
      return;
    }
    const ok = loginReferee(selectedName, pin);
    if (!ok) {
      setError('Hatalı PIN veya şifre! Lütfen kontrol edin.');
    } else {
      setError('');
    }
  };

  const handleQuickLogin = (refName: string, refPin: string) => {
    setSelectedName(refName);
    setPin(refPin);
    loginReferee(refName, refPin);
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-400 text-slate-950 flex items-center justify-center font-bold text-3xl mx-auto shadow-lg shadow-lime-400/20">
            🎾
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Kort Hakemi Girişi</h2>
          <p className="text-xs text-slate-400">
            Kulede kura atışı ve anlık skor girişi için lütfen oturum açın.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Hakem İsmi
            </label>
            <select
              value={selectedName}
              onChange={(e) => {
                setSelectedName(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
            >
              <option value="">-- Hakem Seçiniz --</option>
              {referees.map((ref) => (
                <option key={ref.name} value={ref.name}>
                  {ref.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Hakem PIN / Şifre
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="Örn: 1212"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
              />
              <KeyRound className="w-5 h-5 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-lime-400/20 text-sm transition active:scale-98"
          >
            Hakem Paneline Giriş Yap
          </button>
        </form>

        {/* Quick Access Referees for fast switching */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Hızlı Hakem Seçimi:</span>
            <span className="text-[10px] text-slate-500">Tek tıkla giriş</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {referees.slice(0, 3).map((ref) => (
              <button
                key={ref.name}
                type="button"
                onClick={() => handleQuickLogin(ref.name, ref.pin)}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-lime-400/50 rounded-xl text-left transition text-xs group"
              >
                <div className="font-bold text-slate-200 group-hover:text-lime-300 truncate">
                  {ref.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-500">PIN: {ref.pin}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
