import React, { useState, useEffect } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { ShareRefereeLinkModal } from '../Common/ShareRefereeLinkModal';
import {
 Shield, Smartphone, Tv, Lock, KeyRound, CheckCircle2,
 AlertCircle, X, User, Eye, EyeOff, ChevronRight,
 RefreshCw, Trash2, Cloud, QrCode, Activity, Clock,
 Trophy, Circle,
} from 'lucide-react';

export const MainPortalGate: React.FC = () => {
 const {
 referees, matches, loginSupervisorByPin, loginDesk, deskPin,
 cloudSyncStatus, lastCloudSync, pullFromCloudNow, clearLocalCacheAndResetFromCloud,
 } = useTennisData();

 const [activeModal, setActiveModal] = useState<'supervisor' | 'desk' | null>(null);
 const [isShareModalOpen, setIsShareModalOpen] = useState(false);
 const [pin, setPin] = useState('');
 const [selectedRefName, setSelectedRefName] = useState('');
 const [showPin, setShowPin] = useState(false);
 const [errorMsg, setErrorMsg] = useState('');
 const [successMsg, setSuccessMsg] = useState('');
 const [portalSyncMsg, setPortalSyncMsg] = useState('');
 const [filterKort, setFilterKort] = useState('TUMU');
 const [filterDurum, setFilterDurum] = useState('TUMU');
 const [isSyncing, setIsSyncing] = useState(false);
 const [now, setNow] = useState(Date.now());

 useEffect(() => {
 const t = setInterval(() => setNow(Date.now()), 30000);
 return () => clearInterval(t);
 }, []);

 const openSupervisorModal = () => { setActiveModal('supervisor'); setPin(''); setSelectedRefName(''); setErrorMsg(''); setSuccessMsg(''); setShowPin(false); };
 const openDeskModal = () => { setActiveModal('desk'); setPin(''); setSelectedRefName(''); setErrorMsg(''); setSuccessMsg(''); setShowPin(false); };
 const closeModal = () => { setActiveModal(null); setPin(''); setErrorMsg(''); setSuccessMsg(''); };
 const handleKeypadPress = (d: string) => { if (pin.length < 8) { setPin(p => p + d); setErrorMsg(''); } };
 const handleKeypadBackspace = () => setPin(p => p.slice(0, -1));
 const handleKeypadClear = () => setPin('');

 const handleSupervisorSubmit = () => {
 if (!selectedRefName) { setErrorMsg('Lütfen hakem adınızı seçin.'); return; }
 if (!pin) { setErrorMsg('PIN şifresi boş olamaz.'); return; }
 const ok = loginSupervisorByPin(pin, selectedRefName);
 if (ok) { setSuccessMsg('✅ Giriş başarılı! Yönlendiriliyorsunuz...'); setTimeout(closeModal, 800); }
 else setErrorMsg('❌ PIN hatalı. Lütfen tekrar deneyin.');
 };

 const handleDeskSubmit = () => {
 if (!pin) { setErrorMsg('Şifre boş olamaz.'); return; }
 const ok = loginDesk(pin);
 if (ok) { setSuccessMsg('✅ Başhakem masasına giriş yapıldı!'); setTimeout(closeModal, 800); }
 else setErrorMsg('❌ Şifre hatalı.');
 };

 const distinctKortlar = Array.from(new Set(matches.map(m => m.Kort).filter(Boolean))).sort();

 const live = matches.filter(m => m.Durum === 'Oynaniyor');
 const waiting = matches.filter(m => m.Durum === 'Baslamadi');
 const done = matches.filter(m => m.Durum === 'Bitti' || m.Durum === 'Retired' || m.Durum === 'Walkover');

 const statusLabel = (d: string) => {
 if (d === 'Oynaniyor') return 'CANLI';
 if (d === 'Baslamadi') return 'BEKL.';
 if (d === 'Bitti') return 'BİTTİ';
 if (d === 'Retired') return 'RET.';
 if (d === 'Walkover') return 'W/O';
 return d;
 };

 return (
 <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-lime-400 selection:text-slate-950">
 <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800/60">
 <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
 <div className="flex items-center gap-2.5 shrink-0">
 <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-base shadow shadow-lime-400/20">
 🎾
 </div>
 <span className="font-extrabold text-base tracking-tight text-white hidden sm:block">CourtOnline</span>
 <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
 <Activity className="w-2.5 h-2.5" /> Canlı İzleme Panosu
 </span>
 </div>

 <div className="flex items-center gap-2">
 <button onClick={openSupervisorModal}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lime-400/15 hover:bg-lime-400/25 border border-lime-400/30 text-lime-300 text-xs font-black transition active:scale-95">
 <Smartphone className="w-3.5 h-3.5" />
 <span>Kort Hakemi</span>
 </button>
 <button onClick={openDeskModal}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/30 text-cyan-300 text-xs font-black transition active:scale-95">
 <Tv className="w-3.5 h-3.5" />
 <span>Başhakem Masası</span>
 </button>
 <button onClick={() => setIsShareModalOpen(true)}
 className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition"
 title="Hakem Linki & QR">
 <QrCode className="w-4 h-4" />
 </button>
 </div>
 </div>
 </header>

 <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
 <div className="flex items-center gap-3 flex-wrap">
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
 <Circle className="w-2 h-2 fill-emerald-400 animate-pulse" />
 {live.length} Canlı Maç
 </div>
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black">
 <Clock className="w-3 h-3" />
 {waiting.length} Bekliyor
 </div>
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-700/60 border border-slate-700 text-slate-400 text-xs font-black">
 <Trophy className="w-3 h-3" />
 {done.length} Tamamlandı
 </div>
 <div className="ml-auto flex items-center gap-1.5">
 <div className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
 <span className="text-[11px] text-slate-400">{lastCloudSync ? `Güncellendi: ${lastCloudSync}` : 'Bağlanıyor...'}</span>
 <button onClick={async () => { setIsSyncing(true); await pullFromCloudNow(); setIsSyncing(false); }}
 disabled={isSyncing}
 className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition disabled:opacity-40">
 <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>

 {matches.length === 0 ? (
 <div className="text-center py-20 text-slate-500">
 <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
 <p className="font-bold">Yayında olan aktif maç bulunmamaktadır</p>
 <p className="text-xs mt-1">Başhakem programı yükledikten sonra canlı skor akışı burada başlayacaktır.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
 {(filterKort === 'TUMU' ? distinctKortlar : [filterKort]).map((courtName) => {
 const courtMatches = matches
 .filter(m => m.Kort === courtName)
 .filter(m => {
 if (filterDurum === 'TUMU') return true;
 if (filterDurum === 'Oynaniyor') return m.Durum === 'Oynaniyor';
 if (filterDurum === 'Baslamadi') return m.Durum === 'Baslamadi';
 if (filterDurum === 'Bitti') return ['Bitti', 'Retired', 'Walkover'].includes(m.Durum || '');
 return true;
 })
 .sort((a, b) => (a.Saat || '99:99').localeCompare(b.Saat || '99:99'));

 return (
 <div key={courtName} className="bg-slate-900 border border-slate-800/80 rounded-3xl p-4 space-y-4 flex flex-col shadow-xl w-full">
 <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
 <div className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse"></div>
 <h3 className="font-black text-sm text-white tracking-wider uppercase">{courtName}</h3>
 </div>
 <span className="text-[10px] font-mono text-slate-400 font-extrabold px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">{courtMatches.length} Program</span>
 </div>

 <div className="space-y-4 flex-1">
 {courtMatches.length > 0 ? (
 courtMatches.map((m) => {
 const isLive = m.Durum === 'Oynaniyor';
 const isDone = ['Bitti', 'Retired', 'Walkover'].includes(m.Durum || '');
 const state = m.detailedState;

 return (
 <div key={m.id}
 className={`rounded-2xl border p-4 space-y-3 transition relative overflow-hidden
 ${isLive ? 'bg-slate-950 border-l-4 border-l-emerald-400 border-emerald-700/50 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/10'
 : isDone ? 'bg-slate-950/40 border-l-4 border-l-slate-700 border-slate-800/60 opacity-60'
 : 'bg-slate-950/60 border-l-4 border-l-amber-500/60 border-slate-800/80'}`}>
 
 <div className="flex items-center justify-between gap-2">
 <span className="text-amber-400 font-mono text-xs font-black bg-amber-950/90 px-3 py-1 rounded-xl ring-2 ring-amber-500/40 flex items-center gap-1.5 shadow-md">
 <Clock className="w-3.5 h-3.5" />
 {m.Saat || '—'}
 </span>
 <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-md
 ${isLive ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
 : isDone ? 'bg-slate-800 text-slate-400 border border-slate-700/50'
 : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
 {isLive && <Circle className="w-1.5 h-1.5 fill-emerald-400 animate-pulse" />}
 {statusLabel(m.Durum || '')}
 </span>
 </div>

 <div className="text-[10px] text-slate-400 font-semibold truncate px-0.5">{m.Kategori || m.Skor_Formati || ''}</div>

 <div className="space-y-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40">
 {[
 { name: m['Oyuncu 1'] || m['Takım 1'] || '—', idx: 0, isServer: state?.currentServer === 1 },
 { name: m['Oyuncu 2'] || m['Takım 2'] || '—', idx: 1, isServer: state?.currentServer === 2 },
 ].map((p, i) => {
 const isWinner = isDone && m.Kazanan === p.name;
 return (
 <div key={i} className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-1.5 truncate">
 {p.isServer && isLive && <span className="text-lime-400 text-[10px] animate-bounce">🎾</span>}
 <span className={`text-xs font-black truncate ${isWinner ? 'text-lime-300' : p.isServer ? 'text-white' : 'text-slate-300'}`}>
 {isWinner && '✓ '}{p.name}
 </span>
 </div>
 <span className="font-mono text-xs font-black text-white tracking-wider">
 {state ? (i === 0 ? `${state.set1_p1} ${state.set2_p1} ${state.set3_p1}` : `${state.set1_p2} ${state.set2_p2} ${state.set3_p2}`) : m.Skor && m.Skor !== '-' ? m.Skor.split(' ').map((s: string) => s.split('/')[i] ?? '0').join(' ') : '0'}
 </span>
 </div>
 );
 })}
 </div>

 <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/50">
 {isLive && state ? (
 <div className="font-mono font-black text-lime-400 bg-lime-950/50 px-2 py-0.5 rounded-md border border-lime-500/30">
 {state.isTiebreak ? `TB: ${state.tiebreak_p1}-${state.tiebreak_p2}` : `${state.gamePoint_p1} - ${state.gamePoint_p2}`}
 </div>
 ) : (
 <div className="text-slate-500 font-mono text-[10px]">Skor: <span className="text-slate-300 font-bold">{m.Skor || '-'}</span></div>
 )}
 {m.Baslangic_Saati && <span className="font-mono text-slate-500 text-[10px]">Başlangıç: {m.Baslangic_Saati}</span>}
 </div>
 </div>
 );
 })
 ) : (
 <div className="p-8 text-center text-xs text-slate-600 border border-dashed border-slate-800/60 rounded-2xl flex-1 flex flex-col justify-center items-center">Bu kortta planlanmış maç yok.</div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-500">
 <div className="flex items-center gap-2">
 <Cloud className="w-3.5 h-3.5" />
 <span>Pano Durumu: {cloudSyncStatus === 'connected' ? '🟢 Canlı Bağlı' : '🔴 Bağlantı Kesildi'}</span>
 </div>
 {portalSyncMsg && <span className="text-emerald-400 font-bold">{portalSyncMsg}</span>}
 </div>
 </main>

 <ShareRefereeLinkModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
 </div>
 );
};
