import React, { useState } from 'react';
import { UserCheck, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useTennisData } from '../../context/TennisDataContext';

export const RefereeLogin: React.FC = () => {
  const { referees, loginReferee } = useTennisData();
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin]                   = useState('');
  const [showPin, setShowPin]           = useState(false);
  const [error, setError]               = useState('');

  const handleKeypad = (d: string) => { if (pin.length < 8) { setPin(p => p + d); setError(''); } };
  const handleBackspace = () => setPin(p => p.slice(0, -1));

  const handleLogin = () => {
    if (!selectedName) { setError('Lütfen adınızı seçin.'); return; }
    if (!pin)          { setError('PIN boş olamaz.'); return; }
    const ok = loginReferee(selectedName, pin);
    if (!ok) setError('❌ Hatalı PIN. Lütfen tekrar deneyin.');
    else setError('');
  };

  return (
    <div className="max-w-sm mx-auto py-8 px-4">
      <div className="bg-amber-950/40 border border-amber-700/40 rounded-3xl p-6 shadow-2xl space-y-5">

        {/* Başlık */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center text-2xl mx-auto shadow-lg">
            🎾
          </div>
          <h2 className="text-lg font-black text-amber-100 tracking-tight">Kort Hakemi Girişi</h2>
          <p className="text-xs text-amber-400/60">Adınızı seçin ve PIN'inizi girin.</p>
        </div>

        {/* Hata */}
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Hakem seçimi */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Hakem Adı
          </label>
          <select value={selectedName} onChange={e => { setSelectedName(e.target.value); setError(''); }}
            className="w-full px-3 py-2.5 bg-slate-950 border border-amber-800/50 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-400">
            <option value="">-- Hakem Seçiniz --</option>
            {referees.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </div>

        {/* PIN */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> PIN</span>
            <button type="button" onClick={() => setShowPin(!showPin)} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
              {showPin ? <><EyeOff className="w-3 h-3" /> Gizle</> : <><Eye className="w-3 h-3" /> Göster</>}
            </button>
          </label>
          <input type={showPin ? 'text' : 'password'} value={pin} readOnly
            placeholder="••••"
            className="w-full px-4 py-3 bg-slate-950 border border-amber-800/50 rounded-2xl text-center text-2xl tracking-widest text-white font-mono font-black focus:outline-none focus:border-amber-400" />
        </div>

        {/* Tuş Takımı */}
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} type="button" onClick={() => handleKeypad(d)}
              className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-mono font-black text-lg active:scale-95 transition">
              {d}
            </button>
          ))}
          <button type="button" onClick={() => setPin('')}
            className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-bold active:scale-95 transition">
            Temizle
          </button>
          <button type="button" onClick={() => handleKeypad('0')}
            className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-mono font-black text-lg active:scale-95 transition">
            0
          </button>
          <button type="button" onClick={handleBackspace}
            className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-bold active:scale-95 transition">
            ⌫
          </button>
        </div>

        {/* Giriş Butonu */}
        <button type="button" onClick={handleLogin}
          className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 text-slate-950 font-black rounded-2xl shadow-xl active:scale-95 transition flex items-center justify-center gap-2">
          <KeyRound className="w-4 h-4" /> Giriş Yap
        </button>
      </div>
    </div>
  );
};
