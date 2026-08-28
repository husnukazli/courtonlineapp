import React, { useState } from 'react';
import {
 Tv, Smartphone, HelpCircle, ShieldCheck, LogIn, Lock, X, KeyRound, AlertCircle, Eye, EyeOff, RefreshCw, QrCode,
} from 'lucide-react';
import { useTennisData } from '../context/TennisDataContext';
import { RefereeLoginModal } from './RefereeLoginModal';
import { ShareRefereeLinkModal } from './Common/ShareRefereeLinkModal';

interface NavigationProps {
 currentTab: 'supervisor' | 'desk';
 onTabChange: (tab: 'supervisor' | 'desk') => void;
 onOpenHelp: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange, onOpenHelp }) => {
 const { currentReferee, matches, authRole, deskPin, cloudSyncStatus, pullFromCloudNow, loginDesk, logoutAuth } = useTennisData();
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
 <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md w-full">
 <div className="max-w-7xl mx-auto px-2 sm:px-6">
 <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2 md:h-16 gap-2">
 {/* Sol Logo & Başlık Kısmı */}
 <div className="flex items-center gap-2.5 shrink-0 justify-between md:justify-start">
 <div className="flex items-center gap-2">
 <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-bold text-base shadow-md shrink-0">🎾</div>
 <div>
 <div className="flex items-center gap-1.5">
 <span className="font-extrabold text-sm tracking-tight text-white">CourtOnline</span>
 <span className={`text-[9px] uppercase font-black tracking-wider px-1.5 py-0.2 rounded border ${currentTab === 'supervisor' ? 'bg-lime-400/15 text-lime-400 border-lime-400/20' : 'bg-cyan-400/15 text-cyan-400 border-cyan-400/20'}`}>{currentTab === 'supervisor' ? 'Hakem' : 'Masa'}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Orta Sekme Değiştirici Butonlar */}
 <div className="flex items-center justify-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 shadow-inner max-w-sm mx-auto md:mx-0">
 <button type="button" onClick={() => handleTabClick('supervisor')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTab === 'supervisor' ? 'bg-lime-400 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>
 <Smartphone className="w-3.5 h-3.5" /> <span>Kort Hakemi</span>
 {activeMatchesCount > 0 && <span className="inline-flex items-center justify-center px-1 py-0.2 text-[9px] font-black rounded-full bg-slate-950/20 text-slate-950">{activeMatchesCount}</span>}
 </button>
 <button type="button" onClick={() => handleTabClick('desk')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTab === 'desk' ? 'bg-cyan-400 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>
 <Tv className="w-3.5 h-3.5" /> <span>Turnuva Masası</span>
 </button>
 </div>

 {/* Sağ Operasyonel Butonlar - Mobil Esnekliği Artırıldı */}
 <div className="flex items-center justify-center gap-1.5 flex-wrap md:flex-nowrap">
 <button type="button" disabled={isNavSyncing} onClick={async () => { setIsNavSyncing(true); await pullFromCloudNow(); setIsNavSyncing(false); }} className={`p-1.5 rounded-lg border text-[10px] font-bold transition ${cloudSyncStatus === 'connected' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/30 border-rose-500/30 text-rose-400'}`}>
 <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' || isNavSyncing ? 'animate-spin' : ''}`} />
 </button>

 <button type="button" onClick={() => setIsShareLinkModalOpen(true)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-300 text-[10px] font-bold"><QrCode className="w-3.5 h-3.5" /> <span className="hidden sm:inline">QR</span></button>

 <button type="button" onClick={() => setIsRefereeModalOpen(true)} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-bold ${currentReferee ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
 {currentReferee ? <><ShieldCheck className="w-3 h-3 text-emerald-400" /> <span className="truncate max-w-[60px]">{currentReferee.name.split(' ')[0]}</span></> : <><LogIn className="w-3 h-3 text-lime-400" /> <span>Giriş</span></>}
 </button>

 <button type="button" onClick={onOpenHelp} className="p-1.5 text-slate-400 hover:text-slate-200"><HelpCircle className="w-4 h-4" /></button>

 {/* Kilitle / Çıkış Butonu - Mobilde Kesin Görünüm Koruyucu */}
 <button type="button" onClick={() => { if (confirm('Güvenli çıkış yapılsın mı?')) logoutAuth(); }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black transition active:scale-95 shadow-sm">
 <Lock className="w-3 h-3 text-rose-400" /> <span>Çıkış</span>
 </button>
 </div>
 </div>
 </div>
 </header>

 <RefereeLoginModal isOpen={isRefereeModalOpen} onClose={() => setIsRefereeModalOpen(false)} />
 <ShareRefereeLinkModal isOpen={isShareLinkModalOpen} onClose={() => setIsShareLinkModalOpen(false)} />

 {isDeskPinModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
 <div className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-slate-800 pb-2">
 <h4 className="font-black text-white text-sm">Başhakem Masa Şifresi Gerekli</h4>
 <button type="button" onClick={() => setIsDeskPinModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
 </div>
 <form onSubmit={handleDeskPinSubmit} className="space-y-3">
 <input type={showDeskPin ? 'text' : 'password'} maxLength={10} value={deskPinInput} onChange={(e) => { setDeskPinInput(e.target.value); setDeskPinError(''); }} autoFocus placeholder="••••" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-center text-lg text-white font-mono font-black focus:outline-none" />
 <div className="flex justify-between items-center text-[10px] text-slate-400"><button type="button" onClick={() => setShowDeskPin(!showDeskPin)}>{showDeskPin ? 'Gizle' : 'Göster'}</button><span>Varsayılan PIN: <strong className="text-cyan-400 font-mono">{deskPin}</strong></span></div>
 {deskPinError && <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">{deskPinError}</div>}
 <div className="flex gap-2"><button type="button" onClick={() => setIsDeskPinModalOpen(false)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">İptal</button><button type="submit" className="flex-1 py-2 rounded-lg bg-cyan-400 text-slate-950 text-xs font-black">Onayla</button></div>
 </form>
 </div>
 </div>
 )}
 </>
 );
};
