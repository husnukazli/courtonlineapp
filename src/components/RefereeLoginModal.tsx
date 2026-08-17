import React, { useState } from 'react';
import { useTennisData } from '../context/TennisDataContext';
import {
  UserCheck,
  Lock,
  LogOut,
  KeyRound,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertCircle,
  User,
  Plus
} from 'lucide-react';

interface RefereeLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RefereeLoginModal: React.FC<RefereeLoginModalProps> = ({ isOpen, onClose }) => {
  const { currentReferee, referees, loginReferee, logoutReferee, addReferee } = useTennisData();

  const [selectedName, setSelectedName] = useState<string>(referees[0]?.name || '');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Add new referee sub-form state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedName) {
      setErrorMsg('Lütfen hakem adınızı seçin.');
      return;
    }

    if (!pin) {
      setErrorMsg('Lütfen 4 haneli PIN şifrenizi girin.');
      return;
    }

    const success = loginReferee(selectedName, pin);
    if (success) {
      setSuccessMsg(`Başarıyla giriş yapıldı: ${selectedName}`);
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
        setPin('');
      }, 1000);
    } else {
      setErrorMsg('Hatalı PIN şifresi! Lütfen tekrar deneyin. (Varsayılan PIN: 1234)');
    }
  };

  const handleAddNewReferee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Hakem adı boş olamaz.');
      return;
    }
    if (!newPin.trim() || newPin.length < 2) {
      setErrorMsg('PIN en az 2 karakter olmalıdır.');
      return;
    }

    addReferee(newName.trim(), newPin.trim());
    setSelectedName(newName.trim());
    setPin(newPin.trim());
    setIsAddingNew(false);
    setNewName('');
    setNewPin('');
    setSuccessMsg('Yeni hakem eklendi! Şimdi giriş yapabilirsiniz.');
  };

  const handleLogout = () => {
    logoutReferee();
    setSuccessMsg('Çıkış yapıldı.');
    setTimeout(() => {
      onClose();
      setSuccessMsg('');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden space-y-4 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lime-400/20 text-lime-400 border border-lime-400/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">Hakem Girişi & Profil</h3>
              <p className="text-xs text-slate-400">Girdiğiniz skorlar hakem adınızla kaydedilir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Referee Display */}
        {currentReferee ? (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-black">
                {currentReferee.name.charAt(0)}
              </div>
              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Aktif Giriş Yapan Hakem</span>
                <h4 className="font-extrabold text-sm sm:text-base text-white">{currentReferee.name}</h4>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Oturumu Kapat / Farklı Hakem Girişi</span>
            </button>
          </div>
        ) : (
          <div>
            {!isAddingNew ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Select Referee */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-lime-400" />
                    <span>Hakem Seçin</span>
                  </label>
                  <select
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-lime-400"
                  >
                    {referees.map((ref) => (
                      <option key={ref.name} value={ref.name}>
                        {ref.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PIN Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-lime-400" />
                      <span>4 Haneli PIN Şifresi</span>
                    </span>
                    <span className="text-[10px] text-slate-500">(Varsayılan: 1234)</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg tracking-widest text-white font-mono font-black focus:outline-none focus:border-lime-400"
                  />
                </div>

                {/* Status Messages */}
                {errorMsg && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 active:scale-95 transition"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Giriş Yap</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddingNew(true)}
                    className="w-full py-2 px-3 text-xs text-slate-400 hover:text-lime-300 font-semibold transition text-center"
                  >
                    + Listede adım yok (Yeni Hakem Ekle)
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddNewReferee} className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-lime-400 uppercase tracking-wider">Yeni Hakem Tanımla</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Geri Dön
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Ad Soyad</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Örn: Hasan Yılmaz"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Giriş PIN (4 hane)</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lime-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs rounded-xl shadow transition"
                >
                  Hakemi Ekle ve Seç
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
