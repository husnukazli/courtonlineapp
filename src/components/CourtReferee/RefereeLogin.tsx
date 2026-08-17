import React, { useState } from 'react';
import { UserCheck, KeyRound, Shield, AlertCircle, Sparkles, Zap, Smartphone } from 'lucide-react';
import { useTennisData } from '../../context/TennisDataContext';

export const RefereeLogin: React.FC = () => {
  const { referees, loginReferee, loginRefereeDirect } = useTennisData();
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
      setError('Hatalı PIN veya şifre! Lütfen kontrol edin. (Veya aşağıdaki Şifresiz Başla butonunu kullanın)');
    } else {
      setError('');
    }
  };

  const handleDirectLogin = (refName?: string) => {
    loginRefereeDirect(refName || selectedName || 'Saha Gözlemcisi');
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
          <p className="text-xs text-lime-400 font-semibold">
            ✨ Hesap açma veya Google girişi gerekmez (Doğrudan Skor Girişi)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Direct Login Button */}
        <button
          type="button"
          onClick={() => handleDirectLogin()}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:from-lime-300 hover:to-teal-300 text-slate-950 font-black rounded-2xl shadow-xl shadow-lime-400/25 text-sm flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <Zap className="w-4 h-4" />
          <span>Şifresiz Doğrudan Skor Girişine Başla</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider absolute">
            veya isminizi seçin
          </span>
        </div>

        {/* Quick Select Buttons */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Hızlı Hakem Seçimi (Tek Tıkla Giriş)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {referees.map((ref) => (
              <button
                key={ref.name}
                type="button"
                onClick={() => handleDirectLogin(ref.name)}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-lime-400/50 rounded-xl text-left transition text-xs flex items-center justify-between group active:scale-98"
              >
                <span className="font-bold text-slate-200 group-hover:text-lime-300 truncate">
                  👤 {ref.name}
                </span>
                <span className="text-[10px] text-lime-400 font-bold opacity-0 group-hover:opacity-100 transition">
                  Giriş →
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Hakem İsmi (Özel)
            </label>
            <select
              value={selectedName}
              onChange={(e) => {
                setSelectedName(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-xs sm:text-sm focus:outline-none focus:border-lime-400"
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
              Hakem PIN (İsteğe Bağlı)
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
                placeholder="Varsayılan: 1234"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono tracking-widest text-center text-base focus:outline-none focus:border-lime-400"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
          >
            PIN ile Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
};
