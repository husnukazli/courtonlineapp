import React, { useState, useEffect } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { ShareRefereeLinkModal } from '../Common/ShareRefereeLinkModal';
import {
 Smartphone, Tv, X, User, KeyRound, Eye, EyeOff,
 AlertCircle, CheckCircle2, RefreshCw, Trash2, Cloud, QrCode, Activity, Clock,
 Trophy, Circle,
} from 'lucide-react';

export const MainPortalGate: React.FC = () => {
 const {
 referees, matches, loginSupervisorByPin, loginDesk, deskPin,
 cloudSyncStatus, lastCloudSync, pullFromCloudNow,
 } = useTennisData();

 const [activeModal, setActiveModal] = useState<'supervisor' | 'desk' | null>(null);
 const [isShareModalOpen, setIsShareModalOpen] = useState(false);
 const [pin, setPin] = useState('');
 const [selectedRefName, setSelectedRefName] = useState('');
 const [showPin, setShowPin] = useState(false);
 const [errorMsg, setErrorMsg] = useState('');
 const [successMsg, setSuccessMsg] = useState('');
 const [filterKort, setFilterKort] = useState('TUMU');
 const [filterDurum, setFilterDurum] = useState('TUMU');
 const [isSyncing, setIsSyncing] = useState(false);
 const [, setNow] = useState(Date.now());

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
 if (ok) { setSuccessMsg('✅ Giriş başarılı!'); setTimeout(closeModal, 800); }
 else setErrorMsg('❌ PIN hatalı.');
 };

 const handleDeskSubmit = () => {
 if (!pin) { setErrorMsg('Şifre boş olamaz.'); return; }
 const ok = loginDesk(pin);
 if (ok) { setSuccessMsg('✅ Giriş başarılı!'); setTimeout(closeModal, 800); }
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
 <div className="min-h-screen bg-slate-950 text-slate-100 w-full overflow-x-auto selection:bg-lime-400 selection:text-slate-950">
 <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800/60 w-full">
 <div className="max-w-7xl mx-auto px-3 h-14 flex items-center justify-between gap-3">
 <div className="flex items-center gap-2 shrink-0">
 <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-base shadow shadow-lime-400/20">🎾</div>
 <span className="font-extrabold text-base tracking-tight text-white hidden sm:block">CourtOnline</span>
 <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
 <Activity className="w-2.5 h-2.5" /> Canlı
 </span>
 </div>

 <div className="flex items-center gap-1.5">
 <button onClick={openSupervisorModal} className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-lime-400/15 hover:bg-lime-400/25 text-lime-300 text-xs font-black border border-lime-400/20 transition active:scale-95">
 <Smartphone className="w-3.5 h-3.5" /> <span>Hakem</span>
 </button>
 <button onClick={openDeskModal} className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 text-xs font-black border border-cyan-400/20 transition active:scale-95">
 <Tv className="w-3.5 h-3.5" /> <span>Masa</span>
 </button>
 <button onClick={() => setIsShareModalOpen(true)} className="p-2 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 hover:text-white transition">
 <QrCode className="w-4 h-4" />
 </button>
 </div>
 </div>
 </header>

 <main className="p-3 space-y-4 min-w-max md:min-w-0 md:max-w-7xl md:mx-auto">
 <div className="flex items-center gap-2 flex-wrap">
 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
 <Circle className="w-2 h-2 fill-emerald-400 animate-pulse" /> {live.length} Canlı
 </div>
 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black">
 <Clock className="w-3 h-3" /> {waiting.length} Bekliyor
 </div>
 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/60 border border-slate-700 text-slate-400 text-xs font-black">
 <Trophy className="w-3 h-3" /> {done.length} Bitti
 </div>
 <div className="flex items-center gap-1.5 ml-auto">
 <div className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
 <span className="text-[10px] text-slate-400">{lastCloudSync ? `Uyum: ${lastCloudSync}` : 'Bağlanıyor...'}</span>
 <button onClick={async () => { setIsSyncing(true); await pullFromCloudNow(); setIsSyncing(false); }} disabled={isSyncing} className="p-1 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-40">
 <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>

 {matches.length > 0 && (
 <div className="flex gap-2 p-2 bg-slate-900/40 rounded-2xl border border-slate-800/60 flex-wrap">
 <div className="flex items-center gap-1.5 flex-wrap">
 <span className="text-[10px] font-black uppercase text-slate-500">Kort:</span>
 <button onClick={() => setFilterKort('TUMU')} className={`px-2 py-0.5 rounded-md text-[11px] font-black ${filterKort === 'TUMU' ? 'bg-slate-700 text-white' : 'bg-slate-800/60 text-slate-400'}`}>Tümü</button>
 {distinctKortlar.map(k => (
 <button key={k} onClick={() => setFilterKort(k)} className={`px-2 py-0.5 rounded-md text-[11px] font-black ${filterKort === k ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800/60 text-slate-400'}`}>{k}</button>
 ))}
 </div>
 <div className="w-px h-4 bg-slate-700 hidden sm:block" />
 <div className="flex items-center gap-1.5 flex-wrap">
 <span className="text-[10px] font-black uppercase text-slate-500">Durum:</span>
 {[
 { key: 'TUMU', label: 'Tümü', cls: 'bg-slate-700 text-white', inact: 'bg-slate-800/60 text-slate-400' },
 { key: 'Oynaniyor', label: '● Canlı', cls: 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40', inact: 'bg-slate-800/60 text-slate-400' },
 { key: 'Baslamadi', label: '◐ Bekliyor', cls: 'bg-amber-500/30 text-amber-300 border border-amber-500/40', inact: 'bg-slate-800/60 text-slate-400' },
 { key: 'Bitti', label: '✕ Bitti', cls: 'bg-rose-500/30 text-rose-300 border border-rose-500/40', inact: 'bg-slate-800/60 text-slate-400' },
 ].map(({ key, label, cls, inact }) => (
 <button key={key} onClick={() => setFilterDurum(key)} className={`px-2 py-0.5 rounded-md text-[11px] font-black ${filterDurum === key ? cls : inact}`}>{label}</button>
 ))}
 </div>
 </div>
 )}

 <div className="flex flex-nowrap gap-4 items-start">
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

 if (courtMatches.length === 0 && filterKort !== 'TUMU') return null;

 return (
 <div key={courtName} className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-3 flex flex-col shadow-xl w-[290px] shrink-0">
 <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/50 mb-2">
 <div className="flex items-center gap-1.5">
 <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
 <h3 className="font-extrabold text-xs text-white uppercase">{courtName}</h3>
 </div>
 <span className="text-[10px] font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-950">{courtMatches.length} Maç</span>
 </div>

 <div className="space-y-2">
 {courtMatches.map((m) => {
 const isLive = m.Durum === 'Oynaniyor';
 const isDone = ['Bitti', 'Retired', 'Walkover'].includes(m.Durum || '');
 const state = m.detailedState;

 return (
 <div key={m.id} className={`rounded-xl border p-2.5 space-y-2 transition relative overflow-hidden ${isLive ? 'bg-emerald-950/20 border-emerald-600/50 shadow-md' : isDone ? 'bg-slate-950/30 border-slate-800/60 opacity-55' : 'bg-slate-900/70 border-slate-800/70'}`}>
 <div className="flex items-center justify-between gap-1">
 <div className="flex items-center gap-1.5">
 {m.Saat && <span className="text-cyan-400 font-mono text-[11px] font-black bg-cyan-950/80 px-2.5 py-0.5 rounded-md ring-1 ring-cyan-500/40 shadow-sm">{m.Saat}</span>}
 </div>
 <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border transition-colors
 ${isLive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
 : isDone ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-sm' 
 : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
 {isLive && <Circle className="w-1 h-1 fill-emerald-400 animate-pulse" />} {statusLabel(m.Durum || '')}
 </span>
 </div>

 <div className="space-y-1 bg-slate-950/40 p-1.5 rounded-lg border border-slate-900/60">
 {[

  { name: m['Oyuncu 1'] || m['Takım 1'] || '—', won: isDone && m.Kazanan === (m['Oyuncu 1'] || m['Takım 1']), isServer: state?.currentServer === 1 },
  { name: m['Oyuncu 2'] || m['Takım 2'] || '—', won: isDone && m.Kazanan === (m['Oyuncu 2'] || m['Takım 2']), isServer: state?.currentServer === 2 },
 ].map((p, i) => (
 <div key={i} className="flex items-center justify-between gap-2 text-xs">
 <span className={`truncate font-bold ${p.won ? 'text-lime-300 font-extrabold' : isLive && p.isServer ? 'text-white' : 'text-slate-400'}`}>{p.won && '✓ '}{p.name}</span>
 <span className="font-mono text-xs font-black text-white tracking-wide shrink-0">
  {state ? (i === 0 ? `${state.set1_p1} ${state.set2_p1} ${state.set3_p1}` : `${state.set1_p2} ${state.set2_p2} ${state.set3_p2}`) : m.Skor && m.Skor !== '-' ? m.Skor.split(' ').map((s: string) => s.split('/')[i] ?? '0').join(' ') : '-'}
 </span>
 </div>
 ))}
 </div>

 <div className="flex items-center justify-between text-[9px] text-slate-500 px-0.5">
 <span className="truncate max-w-[120px]">{m.Kategori || ''}</span>
 {isLive && state ? (
 <span className="font-mono font-bold text-lime-400 bg-lime-950/40 px-1 rounded border border-lime-500/20">{state.isTiebreak ? `TB: ${state.tiebreak_p1}-${state.tiebreak_p2}` : `${state.gamePoint_p1}-${state.gamePoint_p2}`}</span>
 ) : (
 <span className="truncate font-mono max-w-[100px]">{m.Son_Hakem && m.Son_Hakem !== '-' ? `👤 ${m.Son_Hakem.split(' ')[0]}` : ''}</span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 </main>

 <ShareRefereeLinkModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />

 {/* ŞİFRELİ GİRİŞ MODALLARI */}
 {activeModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 my-auto">
 <div className="flex items-center justify-between border-b border-slate-800 pb-2">
 <h3 className="font-black text-white text-sm">{activeModal === 'supervisor' ? 'Kort Hakemi Girişi' : 'Başhakem Girişi'}</h3>
 <button onClick={closeModal} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
 </div>

 {activeModal === 'supervisor' && (
 <div className="space-y-1">
 <label className="text-xs font-bold text-slate-400">Hakem Seçin</label>
 <select value={selectedRefName} onChange={(e) => { setSelectedRefName(e.target.value); setErrorMsg(''); }}
 className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none">
 <option value="">-- Seçiniz --</option>
 {referees.map((ref) => <option key={ref.name} value={ref.name}>{ref.name}</option>)}
 </select>
 </div>
 )}

 <div className="space-y-1">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-slate-400">PIN Şifresi</label>
 <button type="button" onClick={() => setShowPin(!showPin)} className="text-[10px] text-slate-500">
 {showPin ? 'Gizle' : 'Göster'}
 </button>
 </div>
 <input type={showPin ? 'text' : 'password'} maxLength={10} value={pin}
 onChange={(e) => { setPin(e.target.value); setErrorMsg(''); }}
 onKeyDown={(e) => { if (e.key === 'Enter') { activeModal === 'supervisor' ? handleSupervisorSubmit() : handleDeskSubmit(); } }}
 placeholder="••••" autoFocus
 className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 text-center text-xl text-white font-mono focus:outline-none" />
 </div>

 <div className="grid grid-cols-3 gap-1.5 pt-1">
 {['1','2','3','4','5','6','7','8','9'].map((d) => (
 <button key={d} type="button" onClick={() => handleKeypadPress(d)}
 className="py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-mono font-bold text-base transition">{d}</button>
 ))}
 <button type="button" onClick={handleKeypadClear} className="py-2 rounded-xl bg-slate-950 text-slate-500 text-xs font-bold">C</button>
 <button type="button" onClick={() => handleKeypadPress('0')} className="py-2 rounded-xl bg-slate-950 text-white font-mono font-bold text-base">0</button>
 <button type="button" onClick={handleKeypadBackspace} className="py-2 rounded-xl bg-slate-950 text-slate-500 text-xs font-bold">⌫</button>
 </div>

 {errorMsg && <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">{errorMsg}</div>}
 {successMsg && <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">{successMsg}</div>}

 <button type="button" onClick={() => activeModal === 'supervisor' ? handleSupervisorSubmit() : handleDeskSubmit()}
 className={`w-full py-3 rounded-xl font-black text-xs text-slate-950 text-center transition ${activeModal === 'supervisor' ? 'bg-lime-400' : 'bg-cyan-400'}`}>
 Sorumlu Girişi Yap
 </button>
 </div>
 </div>
 )}
 </div>
 );
};
