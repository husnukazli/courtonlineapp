import React, { useState } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { ShareRefereeLinkModal } from '../Common/ShareRefereeLinkModal';
import {
  Shield,
  Smartphone,
  Tv,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Cloud,
  QrCode,
  Zap,
} from 'lucide-react';

export const MainPortalGate: React.FC = () => {
  const {
    referees,
    loginSupervisorByPin,
    loginRefereeDirect,
    loginDesk,
    deskPin,
    cloudSyncStatus,
    lastCloudSync,
    pullFromCloudNow,
    clearLocalCacheAndResetFromCloud,
  } = useTennisData();

  const [activeModal, setActiveModal] = useState<'supervisor' | 'desk' | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [pin, setPin] = useState<string>('');
  const [selectedRefName, setSelectedRefName] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [portalSyncMsg, setPortalSyncMsg] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const openSupervisorModal = () => {
    setActiveModal('supervisor');
    setPin('');
    setSelectedRefName('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowPin(false);
  };

  const openDeskModal = () => {
    setActiveModal('desk');
    setPin('');
    setSelectedRefName('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowPin(false);
  };

  const closeModal = () => {
    setActiveModal(null);
    setPin('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
      setErrorMsg('');
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleKeypadClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleSupervisorSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!pin.trim()) {
      setErrorMsg('Lütfen PIN şifrenizi giriniz.');
      return;
    }

    const success = loginSupervisorByPin(pin, selectedRefName || undefined);
    if (success) {
      setSuccessMsg('Giriş başarılı! Saha Gözlemcisi paneli açılıyor...');
      setTimeout(() => {
        closeModal();
      }, 500);
    } else {
      setErrorMsg('Hatalı PIN! Lütfen kayıtlı hakem PIN kodunuzu veya varsayılan 1234 kodunu girin.');
    }
  };

  const handleDeskSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!pin.trim()) {
      setErrorMsg('Lütfen Turnuva Masası şifresini giriniz.');
      return;
    }

    const success = loginDesk(pin);
    if (success) {
      setSuccessMsg('Yetkilendirme başarılı! Turnuva Masası açılıyor...');
      setTimeout(() => {
        closeModal();
      }, 500);
    } else {
      setErrorMsg(`Hatalı Turnuva Masası Şifresi! Lütfen doğru şifreyi giriniz. (Varsayılan: ${deskPin})`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-lime-400 selection:text-slate-950 relative overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-900/30 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Tennis Court Line Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"
      />

      {/* Top Security Banner */}
      <header className="relative z-10 pt-6 sm:pt-8 px-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-lime-400/25">
              🎾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">CourtOnline</span>
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Güvenli Giriş
                </span>
              </div>
              <p className="text-xs text-slate-400">Tenis Turnuvası & Canlı Skor Sistemi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-400/20 hover:bg-lime-400/30 text-lime-300 border border-lime-400/40 text-xs font-black transition active:scale-95 shadow-sm"
              title="Hakemler için telefon bağlantısı ve QR karekod üret"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>📲 Hakem Telefon Linki & QR</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800 backdrop-blur">
              <Shield className="w-3.5 h-3.5 text-lime-400" />
              <span>Şifre Korumalı Erişim</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Two Selection Cards */}
      <main className="relative z-10 my-auto py-8 sm:py-12 px-4 max-w-5xl mx-auto w-full space-y-8 sm:space-y-10">
        {/* Title & Introduction */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-lime-400" />
            <span>Yetkisiz Erişime Karşı Korumalı Portal</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Turnuva Paneline Giriş Yapın
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Turnuva skorları ve yönetim paneli şifreyle korunmaktadır. Lütfen kullanmak istediğiniz paneli seçip PIN şifrenizi giriniz.
          </p>
        </div>

        {/* 2 Big Primary Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Card 1: Saha Gözlemcisi */}
          <div
            onClick={openSupervisorModal}
            className="group relative bg-slate-900/90 hover:bg-slate-850 border-2 border-slate-800 hover:border-lime-400/80 rounded-3xl p-6 sm:p-8 transition-all duration-200 cursor-pointer shadow-xl hover:shadow-lime-400/15 flex flex-col justify-between overflow-hidden active:scale-[0.99]"
          >
            {/* Top badge & glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-lime-400/10 rounded-full blur-2xl group-hover:bg-lime-400/20 transition-all pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-lime-400/25 group-hover:scale-105 transition">
                  <Smartphone className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-lime-400/15 text-lime-300 border border-lime-400/30">
                  Kortlar & Hakem
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-lime-300 transition">
                  Saha Gözlemcisi
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                  Kortlar arası mobil skor takibi, canlı set düzenleme, maç başlatma ve hakem yönetimi.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-slate-300 font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">🎾 Canlı Kort Skorları</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">⚡ Hızlı Skor Düzeltme</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">📋 Hakem Atama</span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between relative z-10">
              <span className="text-xs text-slate-400 font-bold">
                Varsayılan PIN: <strong className="text-lime-300 font-mono">1234</strong>
              </span>
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-lime-400 group-hover:bg-lime-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-lime-400/20 transition"
              >
                <span>Giriş Yap</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Turnuva Masası */}
          <div
            onClick={openDeskModal}
            className="group relative bg-slate-900/90 hover:bg-slate-850 border-2 border-slate-800 hover:border-cyan-400/80 rounded-3xl p-6 sm:p-8 transition-all duration-200 cursor-pointer shadow-xl hover:shadow-cyan-400/15 flex flex-col justify-between overflow-hidden active:scale-[0.99]"
          >
            {/* Top badge & glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-400/10 rounded-full blur-2xl group-hover:bg-cyan-400/20 transition-all pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-cyan-400/25 group-hover:scale-105 transition">
                  <Tv className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/30">
                  Başhakem & Fikstür
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-300 transition">
                  Turnuva Masası
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                  Başhakem masası, tüm kortların anlık tablosu, fikstür yükleme, kategori formatları ve sonuç raporlama.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-slate-300 font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">📊 Genel Durum & Akış</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">📂 Fikstür Yükleme</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">📥 Excel / CSV İndir</span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between relative z-10">
              <span className="text-xs text-slate-400 font-bold">
                Varsayılan PIN: <strong className="text-cyan-300 font-mono">{deskPin}</strong>
              </span>
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-cyan-400 group-hover:bg-cyan-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-cyan-400/20 transition"
              >
                <span>Başhakem Girişi</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Phone Quick Cloud Sync & Local Cache Clear Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Bulut Durumu: {cloudSyncStatus === 'connected' ? '🟢 Bağlı' : cloudSyncStatus === 'syncing' ? '🟡 Eşitleniyor...' : '🔴 Çevrimdışı'}</span>
              <span className="text-[11px] text-slate-400">{lastCloudSync ? `Son eşitleme: ${lastCloudSync}` : 'Masaüstündeki son verileri çekmek için yenileyin.'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSyncing}
              onClick={async () => {
                setIsSyncing(true);
                setPortalSyncMsg('');
                const success = await pullFromCloudNow();
                setIsSyncing(false);
                if (success) {
                  setPortalSyncMsg('✅ En son veriler başarıyla buluttan çekildi!');
                } else {
                  setPortalSyncMsg('⚠️ Buluttan çekilemedi.');
                }
                setTimeout(() => setPortalSyncMsg(''), 4000);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Buluttan Son Verileri Çek</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={async () => {
                if (confirm('Telefonda takılı kalan eski maç verileri temizlenip buluttaki en son durum çekilecek. Onaylıyor musunuz?')) {
                  setIsSyncing(true);
                  setPortalSyncMsg('');
                  const success = await clearLocalCacheAndResetFromCloud();
                  setIsSyncing(false);
                  if (success) {
                    setPortalSyncMsg('✨ Önbellek temizlendi ve buluttaki en güncel fikstür indirildi!');
                  } else {
                    setPortalSyncMsg('⚠️ Sıfırlanamadı.');
                  }
                  setTimeout(() => setPortalSyncMsg(''), 4000);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 font-bold text-xs transition active:scale-95 disabled:opacity-50"
              title="Eski verileri sıfırla"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Önbelleği Sıfırla</span>
            </button>
          </div>
        </div>

        {portalSyncMsg && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold text-center animate-in fade-in shadow-lg">
            {portalSyncMsg}
          </div>
        )}

        {/* Security Notice / Privacy Assurance */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-slate-200 block font-bold">Veri Gizliliği & Güvenli Oturum</strong>
              <span>Giriş yapılmadığı sürece dışarıdan hiçbir maç skoru veya turnuva verisi değiştirilemez.</span>
            </div>
          </div>
          <div className="font-mono text-[11px] bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0 text-slate-300">
            PIN Şifreleme Aktif
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 border-t border-slate-900 text-center text-xs text-slate-500">
        CourtOnline Tenis Skor & Saha Gözlemcisi Sistemi • Güvenli Giriş Portalı
      </footer>

      {/* PIN Entry Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-7 w-full max-w-md shadow-2xl space-y-4 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                    activeModal === 'supervisor'
                      ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                      : 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                  }`}
                >
                  {activeModal === 'supervisor' ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Tv className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-white text-base sm:text-lg">
                    {activeModal === 'supervisor'
                      ? 'Saha Gözlemcisi Girişi'
                      : 'Turnuva Masası Girişi'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeModal === 'supervisor'
                      ? 'Lütfen hakem PIN kodunuzu girin'
                      : 'Lütfen Başhakem Masa Şifresini girin'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Supervisor: Instant 1-Click Direct Start Button */}
            {activeModal === 'supervisor' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    loginRefereeDirect(selectedRefName || undefined);
                    setSuccessMsg('Giriş başarılı!');
                    setTimeout(() => {
                      closeModal();
                    }, 300);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:from-lime-300 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-lime-400/25 active:scale-95 transition"
                >
                  <Zap className="w-4 h-4" />
                  <span>Şifresiz Doğrudan Skor Girişine Başla ⚡</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider absolute">
                    veya PIN ile giriş yapın
                  </span>
                </div>
              </div>
            )}

            {/* If Supervisor: Optional Referee Selection */}
            {activeModal === 'supervisor' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-lime-400" />
                  <span>Hakem Adı (İsteğe Bağlı)</span>
                </label>
                <select
                  value={selectedRefName}
                  onChange={(e) => setSelectedRefName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-lime-400"
                >
                  <option value="">Tüm Saha Gözlemcileri (Hızlı Giriş)</option>
                  {referees.map((ref) => (
                    <option key={ref.name} value={ref.name}>
                      {ref.name} (PIN: {ref.pin})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PIN Input Display */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound
                    className={`w-3.5 h-3.5 ${
                      activeModal === 'supervisor' ? 'text-lime-400' : 'text-cyan-400'
                    }`}
                  />
                  <span>PIN Şifresi</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>Gizle</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Göster</span>
                    </>
                  )}
                </button>
              </label>

              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={10}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (activeModal === 'supervisor') handleSupervisorSubmit();
                      else handleDeskSubmit();
                    }
                  }}
                  placeholder="••••"
                  autoFocus
                  className={`w-full bg-slate-950 border rounded-2xl px-4 py-3 text-center text-2xl tracking-widest text-white font-mono font-black focus:outline-none ${
                    activeModal === 'supervisor'
                      ? 'border-slate-700 focus:border-lime-400'
                      : 'border-slate-700 focus:border-cyan-400'
                  }`}
                />
              </div>
            </div>

            {/* Touch Keypad for Fast Tablet / Mobile Entry */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-mono font-black text-lg active:scale-95 transition"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs active:scale-95 transition"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-mono font-black text-lg active:scale-95 transition"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs active:scale-95 transition"
              >
                ⌫ Sil
              </button>
            </div>

            {/* Status Messages */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Quick Default Pin Helper Note */}
            <div className="text-[11px] text-center text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
              {activeModal === 'supervisor' ? (
                <span>
                  💡 Varsayılan Saha Gözlemcisi PIN: <strong className="text-lime-400 font-mono">1234</strong>
                </span>
              ) : (
                <span>
                  💡 Varsayılan Turnuva Masası Şifresi: <strong className="text-cyan-400 font-mono">{deskPin}</strong>
                </span>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (activeModal === 'supervisor') handleSupervisorSubmit();
                  else handleDeskSubmit();
                }}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm text-slate-950 flex items-center justify-center gap-2 shadow-xl active:scale-95 transition ${
                  activeModal === 'supervisor'
                    ? 'bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 shadow-lime-400/20'
                    : 'bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow-cyan-400/20'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Yetkilendir ve Giriş Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public Share Referee Link & QR Modal */}
      <ShareRefereeLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
