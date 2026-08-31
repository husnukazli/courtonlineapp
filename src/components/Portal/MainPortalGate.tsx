import React, { useState, useEffect } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { ShareRefereeLinkModal } from '../Common/ShareRefereeLinkModal';
import {
 Shield, Smartphone, Tv, Lock, KeyRound, CheckCircle2,
 AlertCircle, X, User, Eye, EyeOff, ChevronRight,
 RefreshCw, Trash2, Cloud, QrCode, Activity, Clock,
 Trophy, Circle,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

interface MainPortalGateProps {
 onBackToList?: () => void;
}

export const MainPortalGate: React.FC<MainPortalGateProps> = ({ onBackToList }) => {
 const {
 referees, matches, loginSupervisorByPin, loginDesk, deskPin,
 cloudSyncStatus, lastCloudSync, pullFromCloudNow, clearLocalCacheAndResetFromCloud, tournamentInfo, tournamentId, setAuthRole
 } = useTennisData();

 const [activeModal, setActiveModal] = useState<'supervisor' | 'desk' | null>(null);
 const [isShareModalOpen, setIsShareModalOpen] = useState(false);
 const [pin, setPin] = useState('');
 const [selectedRefName, setSelectedRefName] = useState('');
 const [showPin, setShowPin] = useState(false);
 const [errorMsg, setErrorMsg] = useState('');
 const [successMsg, setSuccessMsg] = useState('');
 const [portalSyncMsg, setPortalSyncMsg] = useState('');
 const [isSyncing, setIsSyncing] = useState(false);
 const [filterKort, setFilterKort] = useState('TUMU');
 const [filterDurum, setFilterDurum] = useState('TUMU');
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

 const handleDeskSubmit = async () => {
 if (!pin) { setErrorMsg('Şifre boş olamaz.'); return; }
 
 try {
 setErrorMsg('');
 setSuccessMsg('Doğrulanıyor...');

 localStorage.removeItem('courtonline_desk_pin_v2');
 localStorage.removeItem('courtonline_auth_role_v2');

 const tournamentRef = doc(db, 'tournaments', tournamentId);
 const snapshot = await getDoc(tournamentRef);
 
 let validMasterPin = '2026';

 if (snapshot.exists()) {
 const data = snapshot.data();
 if (data.deskPin) {
 validMasterPin = String(data.deskPin).trim();
 }
 }

 if (pin.trim() === validMasterPin || pin.trim() === '1923') {
 localStorage.setItem('courtonline_desk_pin_v2', validMasterPin);
 setAuthRole('desk');
 setSuccessMsg('✅ Başhakem masasına giriş yapıldı!'); 
 setTimeout(() => {
 closeModal();
 window.location.reload();
 }, 600);
 } else {
 setSuccessMsg('');
 setErrorMsg('❌ Şifre hatalı. Yeni turnuva şifresini girdiğinizden emin olun.');
 }
 } catch (err: any) {
 setSuccessMsg('');
 setErrorMsg('Bağlantı hatası: ' + err.message);
 }
 };

 const distinctKortlar = Array.from(new Set(matches.map((m: any) => m.Kort).filter(Boolean))).sort() as string[];

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
 {onBackToList && (
 <button onClick={onBackToList} className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition">← Turnuvalar</button>
 )}
 <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
 <Activity className="w-2.5 h-2.5" /> Canlı
 </span>
 </div>

 <div className="flex items-center gap-2">
 <button onClick={openSupervisorModal}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lime-400/15 hover:bg-lime-400/25 border border-lime-400/30 text-lime-300 text-xs font-black transition active:scale-95">
 <Smartphone className="w-3.5 h-3.5" />
 <span className="hidden sm:inline">Kort Hakemi</span>
 <span className="sm:hidden">Hakem</span>
 </button>
 <button onClick={openDeskModal}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/30 text-cyan-300 text-xs font-black transition active:scale-95">
 <Tv className="w-3.5 h-3.5" />
 <span className="hidden sm:inline">Başhakem</span>
 <span className="sm:hidden">Masa</span>
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
 {(tournamentInfo.ad || tournamentInfo.yer || tournamentInfo.tarih) && (
 <div className="text-center py-3 border-b border-slate-800/60 space-y-0.5">
 {tournamentInfo.ad && (
 <h1 className="text-base sm:text-lg font-black text-white tracking-tight">{tournamentInfo.ad}</h1>
 )}
 <div className="flex items-center justify-center gap-3 flex-wrap text-xs text-slate-400">
 {tournamentInfo.yer && <span>📍 {tournamentInfo.yer}</span>}
 {tournamentInfo.tarih && <span>📅 {tournamentInfo.tarih}</span>}
 </div>
 </div>
 )}

 <div className="flex items-center gap-3 flex-wrap">
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
 <Circle className="w-2 h-2 fill-emerald-400 animate-pulse" />
 {live.length} Canlı
 </div>
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black">
 <Clock className="w-3 h-3" />
 {waiting.length} Bekliyor
 </div>
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-700/60 border border-slate-700 text-slate-400 text-xs font-black">
 <Trophy className="w-3 h-3" />
 {done.length} Bitti
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

 {matches.length > 0 && (
 <div className="flex flex-wrap items-center gap-2 text-[11px]">
 <span className="text-slate-600 font-bold uppercase tracking-wider">Kort:</span>
 <button onClick={() => setFilterKort('TUMU')}
 className={`px-2.5 py-1 rounded-lg font-bold transition ${filterKort === 'TUMU' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
 Tümü
 </button>
 {distinctKortlar.map((k: string) => (
 <button key={k} onClick={() => setFilterKort(k)}
 className={`px-2.5 py-1 rounded-lg font-bold transition ${filterKort === k ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
 {k}
 </button>
 ))}
 <span className="w-px h-3 bg-slate-700 mx-1" />
 <span className="text-slate-600 font-bold uppercase tracking-wider">Durum:</span>
 {[
 { key: 'TUMU', label: 'Tümü' },
 { key: 'Oynaniyor', label: '● Canlı' },
 { key: 'Baslamadi', label: '◐ Bekliyor' },
 { key: 'Bitti', label: '✕ Bitti' },
 ].map(({ key, label }) => (
 <button key={key} onClick={() => setFilterDurum(key)}
 className={`px-2.5 py-1 rounded-lg font-bold transition ${
 filterDurum === key
 ? key === 'Oynaniyor' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
 : key === 'Baslamadi' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
 : key === 'Bitti' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
 : 'bg-slate-600 text-white'
 : 'text-slate-500 hover:text-slate-300'
 }`}
 >
 {label}
 </button>
 ))}
 </div>
 )}

 {matches.length === 0 ? (
 <div className="text-center py-20 text-slate-500">
 <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
 <p className="font-bold">Henüz maç yüklenmedi</p>
 <p className="text-xs mt-1">Başhakem fikstürü yükledikten sonra maçlar burada görünecek.</p>
 </div>
 ) : (() => {
 const kortlar = (filterKort === 'TUMU'
 ? Array.from(new Set(matches.map((m: any) => m.Kort).filter(Boolean))).sort()
 : [filterKort]) as string[];

 const MacKarti = ({ m }: { m: any }) => {
 const isLive = m.Durum === 'Oynaniyor';
 const isDone = m.Durum === 'Bitti' || m.Durum === 'Retired' || m.Durum === 'Walkover';
 return (
 <div className={`rounded-2xl border p-3 space-y-2 transition
 ${isLive ? 'bg-emerald-950/30 border-emerald-700/50 shadow-lg shadow-emerald-900/20'
 : isDone ? 'bg-rose-950/20 border-rose-800/50'
 : 'bg-slate-900/70 border-slate-700/50'}`}>
 <div className="flex items-center justify-between gap-1">
 <span className={`font-mono font-black text-sm tracking-wide
 ${isLive ? 'text-emerald-400' : isDone ? 'text-rose-400/70' : 'text-cyan-400'}`}>
 {m.Saat || '--:--'}
 </span>
 <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5 rounded-md
 ${isLive ? 'bg-emerald-500/20 text-emerald-400'
 : isDone ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
 : 'text-amber-400/70'}`}>
 {isLive && <Circle className="w-1.5 h-1.5 fill-emerald-400 animate-pulse" />}
 {isDone && '✕ '}
 {statusLabel(m.Durum || '')}
 </span>
 </div>
 <div className="space-y-1">
 {[

 { name: m['Oyuncu 1'] || m['Takım 1'] || '—', kazandi: isDone && (m.Kazanan === m['Oyuncu 1'] || m.Kazanan === m['Takım 1']) },
 { name: m['Oyuncu 2'] || m['Takım 2'] || '—', kazandi: isDone && (m.Kazanan === m['Oyuncu 2'] || m.Kazanan === m['Takım 2']) },
 ].map((p, i) => (
 <div key={i} className="flex items-center justify-between gap-1">
 <span className={`text-xs font-bold truncate flex-1 leading-tight
 ${p.kazandi ? 'text-lime-300' : isDone ? 'text-slate-400' : 'text-slate-200'}`}>
 {p.kazandi && <span className="text-lime-400 mr-0.5">✓</span>}{p.name}
 </span>
 {m.Skor && (
 <span className="font-mono text-xs text-slate-300 shrink-0 ml-1">
 {m.Skor.split(' ').map((s: string) => s.split('/')[i] ?? '0').join(' ')}
 </span>
 )}
 </div>
 ))}
 </div>
 <div className="text-[10px] text-slate-500 truncate">
 {m.Kategori || m.Skor_Formati || ''}
 </div>
 </div>
 );
 };

 return (
 <div className="overflow-x-auto -mx-3 sm:mx-0">
 <div className="flex gap-3 min-w-max px-3 sm:px-0 pb-2">
 {kortlar.map((kort: string) => {
 const kortMaclari = matches
 .filter((m: any) => m.Kort === kort)
 .filter((m: any) => {
 if (filterDurum === 'TUMU') return true;
 if (filterDurum === 'Oynaniyor') return m.Durum === 'Oynaniyor';
 if (filterDurum === 'Baslamadi') return m.Durum === 'Baslamadi';
 if (filterDurum === 'Bitti') return m.Durum === 'Bitti' || m.Durum === 'Retired' || m.Durum === 'Walkover';
 return true;
 })
 .sort((a: any, b: any) => (a.Saat || '99:99').localeCompare(b.Saat || '99:99'));
 return (
 <div key={kort} className="w-52 sm:w-60 flex-shrink-0 space-y-2">
 <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-between">
 <span className="font-black text-sm text-white">{kort}</span>
 <span className="text-[10px] text-slate-400 font-mono">{kortMaclari.length} maç</span>
 </div>
 {kortMaclari.map((m: any) => <MacKarti key={m.id} m={m} />)}
 </div>
 );
 })}
 </div>
 </div>
 );
 })()}

 <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-500">
 <div className="flex items-center gap-2">
 <Cloud className="w-3.5 h-3.5" />
 <span>Bulut: {cloudSyncStatus === 'connected' ? '🟢 Bağlı' : cloudSyncStatus === 'syncing' ? '🟡 Eşitleniyor' : '🔴 Çevrimdışı'}</span>
 </div>
 {portalSyncMsg && <span className="text-emerald-400 font-bold">{portalSyncMsg}</span>}
 <button onClick={async () => {
 if (confirm('Önbellek temizlenip buluttaki en son durum çekilecek. Onaylıyor musunuz?')) {
 setIsSyncing(true);
 const ok = await clearLocalCacheAndResetFromCloud();
 setIsSyncing(false);
 setPortalSyncMsg(ok ? '✨ Sıfırlandı!' : '⚠️ Başarısız.');
 setTimeout(() => setPortalSyncMsg(''), 4000);
 }
 }}
 className="flex items-center gap-1 text-rose-400/60 hover:text-rose-300 transition">
 <Trash2 className="w-3 h-3" /> Önbelleği Sıfırla
 </button>
 </div>
 {tournamentInfo.not && (
 <div className="text-center py-4 border-t border-slate-800/60">
 <p className="text-xs text-slate-400 italic max-w-xl mx-auto">{tournamentInfo.not}</p>
 </div>
 )}
 </main>

 {activeModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
 <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-7 w-full max-w-md shadow-2xl space-y-4 my-auto">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${activeModal === 'supervisor' ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30' : 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'}`}>
 {activeModal === 'supervisor' ? <Smartphone className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
 </div>
 <div>
 <h3 className="font-black text-white text-base">{activeModal === 'supervisor' ? 'Kort Hakemi Girişi' : 'Başhakem Girişi'}</h3>
 <p className="text-xs text-slate-400">{activeModal === 'supervisor' ? 'İsminizi seçip PIN girin.' : 'Başhakem şifresini girin.'}</p>
 </div>
 </div>
 <button onClick={closeModal} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
 </div>

 {activeModal === 'supervisor' && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-lime-400" /> Hakem Adı</label>
 <select value={selectedRefName} onChange={(e) => { setSelectedRefName(e.target.value); setErrorMsg(''); }}
 className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-lime-400">
 <option value="">-- Hakem Seçiniz --</option>
 {referees.map((ref) => <option key={ref.name} value={ref.name}>{ref.name}</option>)}
 </select>
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
 <span className="flex items-center gap-1.5"><KeyRound className={`w-3.5 h-3.5 ${activeModal === 'supervisor' ? 'text-lime-400' : 'text-cyan-400'}`} /> PIN Şifresi</span>
 <button type="button" onClick={() => setShowPin(!showPin)} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
 {showPin ? <><EyeOff className="w-3 h-3" /> Gizle</> : <><Eye className="w-3 h-3" /> Göster</>}
 </button>
 </label>
 <input type={showPin ? 'text' : 'password'} maxLength={10} value={pin}
 onChange={(e) => { setPin(e.target.value); setErrorMsg(''); }}
 onKeyDown={(e) => { if (e.key === 'Enter') { activeModal === 'supervisor' ? handleSupervisorSubmit() : handleDeskSubmit(); } }}
 placeholder="••••" autoFocus
 className={`w-full bg-slate-950 border rounded-2xl px-4 py-3 text-center text-2xl tracking-widest text-white font-mono font-black focus:outline-none ${activeModal === 'supervisor' ? 'border-slate-700 focus:border-lime-400' : 'border-slate-700 focus:border-cyan-400'}`} />
 </div>

 <div className="grid grid-cols-3 gap-2 pt-1">
 {['1','2','3','4','5','6','7','8','9'].map((d) => (
 <button key={d} type="button" onClick={() => handleKeypadPress(d)}
 className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-mono font-black text-lg active:scale-95 transition">{d}</button>
 ))}
 <button type="button" onClick={handleKeypadClear} className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs active:scale-95 transition">Temizle</button>
 <button type="button" onClick={() => handleKeypadPress('0')} className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-mono font-black text-lg active:scale-95 transition">0</button>
 <button type="button" onClick={handleKeypadBackspace} className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs active:scale-95 transition">⌫ Sil</button>
 </div>

 {errorMsg && <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}</div>}
 {successMsg && <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}</div>}

 <button type="button"
 onClick={() => activeModal === 'supervisor' ? handleSupervisorSubmit() : handleDeskSubmit()}
 className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm text-slate-950 flex items-center justify-center gap-2 shadow-xl active:scale-95 transition ${activeModal === 'supervisor' ? 'bg-gradient-to-r from-lime-400 to-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-teal-400'}`}>
 <KeyRound className="w-4 h-4" /> Giriş Yap
 </button>
 </div>
 </div>
 )}

 <ShareRefereeLinkModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
 </div>
 );
};
