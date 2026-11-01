import React, { useState, useMemo, useEffect } from 'react';
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
  Check,
  SlidersHorizontal,
  Flame,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface RefereeLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: 'credentials' | 'court_select';
}

export const RefereeLoginModal: React.FC<RefereeLoginModalProps> = ({
  isOpen,
  onClose,
  initialStep = 'credentials',
}) => {
  const {
    currentReferee,
    referees,
    matches,
    customCourts,
    activeCourtFilter,
    setActiveCourtFilter,
    loginReferee,
    loginRefereeDirect,
    logoutReferee,
    addReferee,
  } = useTennisData();

  const [step, setStep] = useState<'credentials' | 'court_select'>(initialStep);
  const [selectedName, setSelectedName] = useState<string>(referees[0]?.name || '');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Sorumlu Hakem Adı (Geçiş esnasında)
  const [activeLoginName, setActiveLoginName] = useState<string>('');

  // Add new referee sub-form state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');

  // Available unique courts in the tournament
  const availableCourts = useMemo(() => {
    const set = new Set<string>();
    (customCourts || []).forEach((c) => { if (c) set.add(c); });
    matches.forEach((m) => {
      if (m.Kort) set.add(m.Kort);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [matches, customCourts]);

  // Selected courts for the active referee
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      if (initialStep === 'court_select' || (currentReferee && initialStep !== 'credentials')) {
        setStep('court_select');
        setActiveLoginName(currentReferee?.name || '');
        setSelectedCourts(activeCourtFilter && activeCourtFilter.length > 0 ? activeCourtFilter : availableCourts);
      } else {
        setStep('credentials');
        if (currentReferee) {
          setActiveLoginName(currentReferee.name);
          setSelectedCourts(activeCourtFilter && activeCourtFilter.length > 0 ? activeCourtFilter : availableCourts);
        } else {
          setSelectedCourts(availableCourts);
        }
      }
    }
  }, [isOpen, initialStep, currentReferee, activeCourtFilter, availableCourts]);

  if (!isOpen) return null;

  const handleToggleCourt = (court: string) => {
    setSelectedCourts((prev) => {
      if (prev.includes(court)) {
        return prev.filter((c) => c !== court);
      } else {
        return [...prev, court];
      }
    });
  };

  const handleSelectAllCourts = () => {
    setSelectedCourts([...availableCourts]);
  };

  const handleClearCourts = () => {
    setSelectedCourts([]);
  };

  const handleDirectLogin = (nameToUse?: string) => {
    const finalName = nameToUse || selectedName || 'Saha Gözlemcisi';
    loginRefereeDirect(finalName);
    setActiveLoginName(finalName);
    setSelectedCourts(activeCourtFilter && activeCourtFilter.length > 0 ? activeCourtFilter : availableCourts);
    setStep('court_select');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedName) {
      setErrorMsg('Lütfen hakem adınızı seçin.');
      return;
    }

    if (!pin) {
      handleDirectLogin(selectedName);
      return;
    }

    const success = loginReferee(selectedName, pin);
    if (success) {
      setActiveLoginName(selectedName);
      setSelectedCourts(activeCourtFilter && activeCourtFilter.length > 0 ? activeCourtFilter : availableCourts);
      setStep('court_select');
    } else {
      setErrorMsg('Hatalı PIN şifresi! (Şifresiz girmek için aşağıdaki hızlı hakem butonuna basabilirsiniz)');
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
    setActiveLoginName(newName.trim());
    setIsAddingNew(false);
    setNewName('');
    setNewPin('');
    setSelectedCourts(availableCourts);
    setStep('court_select');
  };

  const handleConfirmCourts = () => {
    // If no courts selected, treat as all courts
    if (selectedCourts.length === 0 || selectedCourts.length === availableCourts.length) {
      setActiveCourtFilter(null);
      setSuccessMsg('Tüm kortlar ekranda gösterilecek.');
    } else {
      setActiveCourtFilter(selectedCourts);
      setSuccessMsg(`${selectedCourts.length} adet kort ekranınıza tanımlandı.`);
    }

    setTimeout(() => {
      onClose();
      setSuccessMsg('');
    }, 450);
  };

  const handleLogout = () => {
    logoutReferee();
    setActiveCourtFilter(null);
    setSuccessMsg('Çıkış yapıldı.');
    setTimeout(() => {
      onClose();
      setSuccessMsg('');
      setStep('credentials');
    }, 400);
  };

  // Helper to get court match count and live status
  const getCourtMeta = (courtName: string) => {
    const courtMatches = matches.filter((m) => m.Kort === courtName);
    const liveMatch = courtMatches.find((m) =>
      ['oynaniyor', 'duraklatildi'].includes((m.Durum || '').toLowerCase().trim())
    );
    return {
      totalMatches: courtMatches.length,
      hasLive: !!liveMatch,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden space-y-4 p-5 sm:p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lime-400/20 text-lime-400 border border-lime-400/30 flex items-center justify-center shrink-0">
              {step === 'court_select' ? <SlidersHorizontal className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                {step === 'court_select' ? 'Görevli Kortlarınızı Seçin' : 'Hakem Girişi & Profil'}
              </h3>
              <p className="text-xs text-lime-400 font-semibold">
                {step === 'court_select'
                  ? `👤 ${activeLoginName || currentReferee?.name || 'Kort Hakemi'}`
                  : '✨ Hesap veya Google şifresi gerekmez'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* STEP 2: COURT SELECTION SCREEN */}
          {step === 'court_select' ? (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">
                    Bugün hangi kortları yöneteceksiniz?
                  </span>
                  <span className="text-[11px] font-black text-lime-400">
                    {selectedCourts.length === 0 || selectedCourts.length === availableCourts.length
                      ? 'Tüm Kortlar Seçili'
                      : `${selectedCourts.length} / ${availableCourts.length} Kort`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Seçtiğiniz kortlar ekranınızda görünür, diğer kortlar gizlenir. Dilediğiniz an değiştirebilirsiniz.
                </p>
              </div>

              {/* Quick action buttons */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllCourts}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-lime-400" />
                  <span>Tümünü Seç</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearCourts}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 font-semibold transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Seçimi Temizle</span>
                </button>
              </div>

              {/* Courts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableCourts.map((court) => {
                  const isSelected = selectedCourts.includes(court);
                  const meta = getCourtMeta(court);
                  return (
                    <button
                      key={court}
                      type="button"
                      onClick={() => handleToggleCourt(court)}
                      className={`p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-lime-400/15 border-lime-400 text-white shadow-md shadow-lime-400/10'
                          : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                            isSelected
                              ? 'bg-lime-400 text-slate-950 font-black'
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-white truncate">{court}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{meta.totalMatches} Maç</span>
                            {meta.hasLive && (
                              <span className="flex items-center gap-0.5 text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded">
                                <Flame className="w-3 h-3 text-emerald-400" />
                                Canlı Maç
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                          isSelected
                            ? 'bg-lime-400 text-slate-950 border-lime-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        {isSelected ? 'Sorumlu' : 'Dışarıda'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {availableCourts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                  Henüz tanımlı kort bulunmuyor.
                </div>
              )}
            </div>
          ) : (
            /* STEP 1: CREDENTIALS OR ALREADY LOGGED IN */
            <div>
              {currentReferee ? (
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-black">
                      {currentReferee.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        Aktif Giriş Yapan Hakem
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                        {currentReferee.name}
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        🎯 Görevli Kortlar:{' '}
                        <strong className="text-lime-300">
                          {activeCourtFilter && activeCourtFilter.length > 0
                            ? activeCourtFilter.join(', ')
                            : 'Tüm Kortlar'}
                        </strong>
                      </p>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLoginName(currentReferee.name);
                        setStep('court_select');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow transition"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Kortlarımı Güncelle</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Oturumu Kapat</span>
                    </button>
                  </div>
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
                        <span>Hızlı Hakem Girişi & Kort Seçimi</span>
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
                          <span>Hakem Seçimi</span>
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
                                Kort Seç →
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

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
                        <h4 className="text-xs font-bold text-lime-400 uppercase tracking-wider">
                          Yeni Hakem Tanımla
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsAddingNew(false)}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          Geri Dön
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Ad Soyad
                        </label>
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
                        Hakemi Ekle ve Kort Seçimine Geç
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

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
        </div>

        {/* Footer for Step 2 */}
        {step === 'court_select' && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Geri
            </button>

            <button
              type="button"
              onClick={handleConfirmCourts}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 active:scale-95 transition"
            >
              <span>
                {selectedCourts.length === 0 || selectedCourts.length === availableCourts.length
                  ? 'Tüm Kortlarla Devam Et'
                  : `${selectedCourts.length} Kort ile Devam Et`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
