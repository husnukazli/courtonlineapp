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
  Plus,
  Zap,
  Smartphone,
} from 'lucide-react';

interface RefereeLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RefereeLoginModal: React.FC<RefereeLoginModalProps> = ({ isOpen, onClose }) => {
  const {
    currentReferee,
    referees,
    loginReferee,
    loginRefereeDirect,
    logoutReferee,
    addReferee,
  } = useTennisData();

  const [selectedName, setSelectedName] = useState<string>(referees[0]?.name || '');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Add new referee sub-form state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');

  if (!isOpen) return null;

  const handleDirectLogin = (nameToUse?: string) => {
    const finalName = nameToUse || selectedName || 'Saha Gözlemcisi';
    loginRefereeDirect(finalName);
    setSuccessMsg(`Başarıyla giriş yapıldı: ${finalName}`);
    setTimeout(() => {
      onClose();
      setSuccessMsg('');
    }, 400);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedName) {
      setErrorMsg('Lütfen hakem adınızı seçin.');
      return;
    }

    if (!pin) {
      // If PIN was empty, directly log in
      handleDirectLogin(selectedName);
      return;
    }

    const success = loginReferee(selectedName, pin);
    if (success) {
      setSuccessMsg(`Başarıyla giriş yapıldı: ${selectedName}`);
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
        setPin('');
      }, 500);
    } else {
      setErrorMsg('Hatalı PIN şifresi! (Şifresiz girmek için aşağıdaki butona basabilirsiniz)');
    }
  };

  const handleAddNewReferee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Hakem adı boş olamaz.');
      return;
    }
    const cleanPin = newPin.trim() || '1234';

    addReferee(newName.trim(), cleanPin);
    loginRefereeDirect(newName.trim());
    setIsAddingNew(false);
    setNewName('');
    setNewPin('');
    setSuccessMsg(`Yeni hakem eklendi ve oturum açıldı: ${newName.trim()}`);
    setTimeout(() => {
      onClose();
      setSuccessMsg('');
    }, 600);
  };

  const handleLogout = () => {
    logoutReferee();
    setSuccessMsg('Çıkış yapıldı.');
    setTimeout(() => {
      onClose();
      setSuccessMsg('');
    }, 500);
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
              <p className="text-xs text-lime-400 font-semibold">✨ Hesap veya Google şifresi gerekmez</p>
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
              <div className="space-y-4">
                {/* 1-Click Instant Passwordless Entry */}
                <button
                  type="button"
                  onClick={() => handleDirectLogin()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:from-lime-300 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-lime-400/20 active:scale-95 transition"
                >
                  <Zap className="w-4 h-4" />
                  <span>Şifresiz Doğrudan Skor Girişine Başla</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider absolute">
                    veya hakem seçin
                  </span>
                </div>

                {/* Quick 1-Click Referee Selection List */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-lime-400" />
                    <span>Hızlı Hakem Seçimi (Tek Tık)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {referees.map((ref) => (
                      <button
                        key={ref.name}
                        type="button"
                        onClick={() => handleDirectLogin(ref.name)}
                        className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-lime-400/50 rounded-xl text-left transition text-xs flex items-center justify-between group active:scale-98"
                      >
                        <span className="font-bold text-slate-200 group-hover:text-lime-300 truncate">
                          👤 {ref.name}
                        </span>
                        <span className="text-[10px] text-lime-400 font-bold opacity-0 group-hover:opacity-100 transition">
                          Başla →
                        </span>
                      </button>
                    ))}
                  </div>
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

                {/* Add new referee button */}
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="w-full py-2 px-3 text-xs text-slate-400 hover:text-lime-300 font-semibold transition text-center"
                >
                  + Listede adım yok (Yeni Hakem Ekle)
                </button>
              </div>
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
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs rounded-xl shadow transition"
                >
                  Hakemi Ekle ve Doğrudan Başla
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
