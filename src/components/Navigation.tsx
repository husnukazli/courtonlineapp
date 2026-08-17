import React, { useState } from 'react';
import {
  Tv,
  Smartphone,
  HelpCircle,
  ShieldCheck,
  LogIn,
  LogOut,
  Lock,
  X,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  Cloud,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { useTennisData } from '../context/TennisDataContext';
import { RefereeLoginModal } from './RefereeLoginModal';
import { ShareRefereeLinkModal } from './Common/ShareRefereeLinkModal';

interface NavigationProps {
  currentTab: 'supervisor' | 'desk';
  onTabChange: (tab: 'supervisor' | 'desk') => void;
  onOpenHelp: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenHelp,
}) => {
  const {
    currentReferee,
    matches,
    authRole,
    deskPin,
    cloudSyncStatus,
    lastCloudSync,
    pullFromCloudNow,
    syncWithCloudNow,
    loginDesk,
    logoutAuth,
  } = useTennisData();

  const [isRefereeModalOpen, setIsRefereeModalOpen] = useState(false);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
  const [isDeskPinModalOpen, setIsDeskPinModalOpen] = useState(false);
  const [deskPinInput, setDeskPinInput] = useState('');
  const [deskPinError, setDeskPinError] = useState('');
  const [showDeskPin, setShowDeskPin] = useState(false);
  const [isNavSyncing, setIsNavSyncing] = useState(false);

  const activeMatchesCount = matches.filter((m) => m.Durum === 'Oynaniyor').length;

  const handleTabClick = (tab: 'supervisor' | 'desk') => {
    if (tab === 'desk' && authRole !== 'desk') {
      // Prompt for desk master PIN before granting access
      setDeskPinInput('');
      setDeskPinError('');
      setIsDeskPinModalOpen(true);
    } else {
      onTabChange(tab);
    }
  };

  const handleDeskPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!deskPinInput.trim()) {
      setDeskPinError('Lütfen şifre giriniz.');
      return;
    }
    const success = loginDesk(deskPinInput);
    if (success) {
      setIsDeskPinModalOpen(false);
      onTabChange('desk');
    } else {
      setDeskPinError(`Hatalı şifre! (Varsayılan: ${deskPin})`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-bold text-xl shadow-lg shadow-lime-400/20 shrink-0">
                🎾
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">CourtOnline</span>
                  <span
                    className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${
                      currentTab === 'supervisor'
                        ? 'bg-lime-400/20 text-lime-400 border-lime-400/30'
                        : 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30'
                    }`}
                  >
                    {currentTab === 'supervisor' ? 'Saha Gözlemcisi' : 'Turnuva Masası'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-slate-400 hidden md:block">
                    {currentTab === 'supervisor'
                      ? 'Kortlar Arası Gezici Skor & Hakem Yönetimi'
                      : 'Başhakem Masası & Canlı Fikstür'}
                  </p>
                  <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Bulut Canlı (Telefon ↔ Masaüstü)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Center Tabs: Saha Gözlemcisi vs Başhakem Masası */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => handleTabClick('supervisor')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  currentTab === 'supervisor'
                    ? 'bg-lime-400 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Saha Gözlemcisi</span>
                {activeMatchesCount > 0 && (
                  <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-black rounded-full bg-slate-950/20 text-slate-950">
                    {activeMatchesCount} Canlı
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('desk')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  currentTab === 'desk'
                    ? 'bg-cyan-400 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Turnuva Masası</span>
              </button>
            </div>

            {/* Right Status & Referee Login & Help & Lock / Exit */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Cloud Sync Status Badge */}
              <button
                type="button"
                disabled={isNavSyncing}
                onClick={async () => {
                  setIsNavSyncing(true);
                  await pullFromCloudNow();
                  setIsNavSyncing(false);
                }}
                title={`Bulut Senkronizasyonu: ${cloudSyncStatus === 'connected' ? 'Bağlı' : cloudSyncStatus === 'syncing' ? 'Eşitleniyor...' : 'Çevrimdışı'}. Buluttan son verileri çekmek için tıklayın.`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition active:scale-95 disabled:opacity-50 ${
                  cloudSyncStatus === 'connected'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                    : cloudSyncStatus === 'syncing' || isNavSyncing
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-400 hover:bg-amber-900/50'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-900/50'
                }`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    cloudSyncStatus === 'syncing' || isNavSyncing ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden sm:inline">
                  {isNavSyncing
                    ? 'Çekiliyor...'
                    : cloudSyncStatus === 'connected'
                    ? 'Canlı Bulut'
                    : cloudSyncStatus === 'syncing'
                    ? 'Eşitleniyor'
                    : 'Yenile'}
                </span>
              </button>

              {/* Share Referee Phone Link & QR Code */}
              <button
                type="button"
                onClick={() => setIsShareLinkModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-lime-400/15 hover:bg-lime-400/25 border border-lime-400/40 text-lime-300 text-xs font-black transition active:scale-95 shadow-sm"
                title="Hakemler için telefon bağlantısı ve QR karekod üret / paylaş"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hakem Linki & QR</span>
              </button>

              {/* Referee Authentication Pill Button */}
              <button
                type="button"
                onClick={() => setIsRefereeModalOpen(true)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-black transition ${
                  currentReferee
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={
                  currentReferee
                    ? `Aktif Hakem: ${currentReferee.name} (Profil/Değiştir)`
                    : 'Hakem Girişi Yap'
                }
              >
                {currentReferee ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="max-w-[80px] sm:max-w-[110px] truncate">
                      {currentReferee.name.split(' ')[0]}
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 text-lime-400" />
                    <span className="hidden sm:inline">Hakem</span>
                  </>
                )}
              </button>

              {/* Help Button */}
              <button
                type="button"
                onClick={onOpenHelp}
                title="Kullanım Kılavuzu"
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Master Lock / Return to Protected Main Portal */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Oturumu kapatıp güvenli ana ekrana dönmek istiyor musunuz?')) {
                    logoutAuth();
                  }
                }}
                title="Oturumu Kilitle & Güvenli Ana Ekrana Dön"
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-slate-950 border border-rose-500/30 text-xs font-black transition active:scale-95 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kilitle / Çıkış</span>
                <span className="sm:hidden">Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Referee Login / Profile Modal */}
      <RefereeLoginModal
        isOpen={isRefereeModalOpen}
        onClose={() => setIsRefereeModalOpen(false)}
      />

      {/* Share Referee Public Phone Link & QR Code Modal */}
      <ShareRefereeLinkModal
        isOpen={isShareLinkModalOpen}
        onClose={() => setIsShareLinkModalOpen(false)}
      />

      {/* Desk Master PIN Prompt Modal when switching tab */}
      {isDeskPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center">
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-white text-sm sm:text-base">Turnuva Masası Girişi</h4>
                  <p className="text-[11px] text-slate-400">Başhakem Masa Şifresi Gerekli</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeskPinModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeskPinSubmit} className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Masa Şifresi / PIN</span>
                  <button
                    type="button"
                    onClick={() => setShowDeskPin(!showDeskPin)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showDeskPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showDeskPin ? 'Gizle' : 'Göster'}</span>
                  </button>
                </div>
                <input
                  type={showDeskPin ? 'text' : 'password'}
                  maxLength={10}
                  value={deskPinInput}
                  onChange={(e) => {
                    setDeskPinInput(e.target.value);
                    setDeskPinError('');
                  }}
                  autoFocus
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-xl tracking-widest text-white font-mono font-black focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {deskPinError && (
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deskPinError}</span>
                </div>
              )}

              <div className="text-[11px] text-center text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800">
                💡 Varsayılan Masa Şifresi: <strong className="text-cyan-400 font-mono">{deskPin}</strong>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDeskPinModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Giriş Yap</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
