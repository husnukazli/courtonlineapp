import React, { useState, useEffect } from 'react';
import {
 Plus, Trash2, LogOut, Trophy, Save, X, Shield, Eye, EyeOff, RefreshCw, Edit2
} from 'lucide-react';
import {
 fetchTournamentList, createTournament, deleteTournamentFromCloud,
 fetchSuperAdminConfig, saveSuperAdminConfig, TournamentListItem, SuperAdminConfig
} from '../../utils/firebaseSync';

interface Props {
 onLogout: () => void;
}

export const SuperAdminScreen: React.FC<Props> = ({ onLogout }) => {
 const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
 const [config, setConfig] = useState<SuperAdminConfig | null>(null);
 const [loading, setLoading] = useState(true);
 const [msg, setMsg] = useState('');

 // Yeni turnuva formu
 const [yeniForm, setYeniForm] = useState({ ad: '', yer: '', tarih: '', not: '' });
 const [yeniGosteriliyor, setYeniGosteriliyor] = useState(false);
 const [kayitYukleniyor, setKayitYukleniyor] = useState(false);

 // Turnuva Düzenleme State'leri
 const [duzenlenenTurnuvaId, setDuzenlenenTurnuvaId] = useState<string | null>(null);
 const [duzenleTurnuvaForm, setDuzenleTurnuvaForm] = useState({ ad: '', yer: '', tarih: '', not: '' });

 // Başhakem formu
 const [baskahakemForm, setBaskahakemForm] = useState({ ad: '', pin: '', tournamentId: '' });
 const [baskahakemGosteriliyor, setBaskahakemGosteriliyor] = useState(false);
 const [sifreGoster, setSifreGoster] = useState(false);

 // Başhakem Düzenleme State'leri
 const [duzenlenenBaskahakemId, setDuzenlenenBaskahakemId] = useState<string | null>(null);
 const [duzenleBaskahakemForm, setDuzenleBaskahakemForm] = useState({ ad: '', pin: '', tournamentId: '' });
 const [duzenleSifreGoster, setDuzenleSifreGoster] = useState(false);

 // Süper admin şifre değiştirme
 const [yeniSuperSifre, setYeniSuperSifre] = useState('');
 const [superSifreGoster, setSuperSifreGoster] = useState(false);

 const yukle = async () => {
 setLoading(true);
 const [list, cfg] = await Promise.all([fetchTournamentList(), fetchSuperAdminConfig()]);
 setTournaments(list);
 setConfig(cfg || { bashakem_listesi: [], superAdminSifre: '' });
 setLoading(false);
 };

 useEffect(() => { yukle(); }, []);

 const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

 const handleTurnuvaOlustur = async () => {
 if (!yeniForm.ad.trim()) { flash('❌ Turnuva adı zorunlu.'); return; }
 setKayitYukleniyor(true);
 const id = await createTournament(yeniForm);
 setKayitYukleniyor(false);
 if (id) {
 flash('✅ Turnuva oluşturuldu!');
 setYeniForm({ ad: '', yer: '', tarih: '', not: '' });
 setYeniGosteriliyor(false);
 yukle();
 } else flash('❌ Oluşturulamadı.');
 };

 const handleTurnuvaSil = async (t: TournamentListItem) => {
 if (!confirm(`"${t.ad}" turnuvasını ve tüm maçlarını silmek istediğinize emin misiniz?`)) return;
 const ok = await deleteTournamentFromCloud(t.id);
 if (ok) { flash('✅ Silindi.'); yukle(); }
 else flash('❌ Silinemedi.');
 };

 const handleTurnuvaDuzenleAc = (t: TournamentListItem) => {
 setDuzenlenenTurnuvaId(t.id);
 setDuzenleTurnuvaForm({
 ad: t.ad,
 yer: t.yer || '',
 tarih: t.tarih || '',
 not: (t as any).not || ''
 });
 };

 const handleTurnuvaGuncelle = async () => {
 if (!duzenlenenTurnuvaId) return;
 if (!duzenleTurnuvaForm.ad.trim()) { flash('❌ Turnuva adı zorunlu.'); return; }

 setKayitYukleniyor(true);
 const id = await createTournament({ ...duzenleTurnuvaForm, id: duzenlenenTurnuvaId });
 setKayitYukleniyor(false);

 if (id) {
 flash('✅ Turnuva güncellendi!');
 setDuzenlenenTurnuvaId(null);
 yukle();
 } else flash('❌ Güncellenemedi.');
 };

 const handleBaskahakemEkle = async () => {
 if (!baskahakemForm.ad.trim() || !baskahakemForm.pin.trim() || !baskahakemForm.tournamentId) {
 flash('❌ Tüm alanları doldurun.'); return;
 }
 const yeniCfg: SuperAdminConfig = {
 ...config!,
 bashakem_listesi: [
 ...(config?.bashakem_listesi || []),
 { id: `bh_${Date.now()}`, ad: baskahakemForm.ad, pin: baskahakemForm.pin, tournamentId: baskahakemForm.tournamentId }
 ]
 };
 const ok = await saveSuperAdminConfig(yeniCfg);
 if (ok) {
 setConfig(yeniCfg);
 setBaskahakemForm({ ad: '', pin: '', tournamentId: '' });
 setBaskahakemGosteriliyor(false);
 flash('✅ Başhakem eklendi.');
 } else flash('❌ Kaydedilemedi.');
 };

 const handleBaskahakemSil = async (id: string) => {
 const yeniCfg: SuperAdminConfig = {
 ...config!,
 bashakem_listesi: (config?.bashakem_listesi || []).filter(b => b.id !== id)
 };
 await saveSuperAdminConfig(yeniCfg);
 setConfig(yeniCfg);
 flash('✅ Başhakem silindi.');
 };

 const handleBaskahakemDuzenleAc = (bh: any) => {
 setDuzenlenenBaskahakemId(bh.id);
 setDuzenleBaskahakemForm({
 ad: bh.ad,
 pin: bh.pin || bh.sifre || '',
 tournamentId: bh.tournamentId
 });
 };

 const handleBaskahakemGuncelle = async () => {
 if (!duzenlenenBaskahakemId) return;
 if (!duzenleBaskahakemForm.ad.trim() || !duzenleBaskahakemForm.pin.trim() || !duzenleBaskahakemForm.tournamentId) {
 flash('❌ Tüm alanları doldurun.'); return;
 }

 const guncelListe = (config?.bashakem_listesi || []).map(bh => {
 if (bh.id === duzenlenenBaskahakemId) {
 return { id: duzenlenenBaskahakemId, ad: duzenleBaskahakemForm.ad, pin: duzenleBaskahakemForm.pin, tournamentId: duzenleBaskahakemForm.tournamentId };
 }
 return bh;
 });

 const yeniCfg: SuperAdminConfig = {
 ...config!,
 bashakem_listesi: guncelListe
 };

 const ok = await saveSuperAdminConfig(yeniCfg);
 if (ok) {
 setConfig(yeniCfg);
 setDuzenlenenBaskahakemId(null);
 flash('✅ Başhakem bilgileri güncellendi.');
 } else flash('❌ Güncellenemedi.');
 };

 const handleSuperSifreGuncelle = async () => {
 if (!yeniSuperSifre.trim()) { flash('❌ Şifre boş olamaz.'); return; }
 const yeniCfg: SuperAdminConfig = { ...config!, superAdminSifre: yeniSuperSifre };
 const ok = await saveSuperAdminConfig(yeniCfg);
 if (ok) { setConfig(yeniCfg); setYeniSuperSifre(''); flash('✅ Süper admin şifresi güncellendi.'); }
 else flash('❌ Güncellenemedi.');
 };

 if (loading) return (
 <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
 <div className="text-center"><div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2" /><p>Yükleniyor...</p></div>
 </div>
 );

 return (
 <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
 <header className="sticky top-0 z-20 bg-white dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
 <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Shield className="w-5 h-5 text-cyan-400" />
 <span className="font-black">Süper Admin</span>
 </div>
 <div className="flex items-center gap-2">
 {msg && <span className="text-xs font-bold text-emerald-400">{msg}</span>}
 <button onClick={yukle} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"><RefreshCw className="w-4 h-4" /></button>
 <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 text-xs transition">
 <LogOut className="w-3.5 h-3.5" />Çıkış
 </button>
 </div>
 </div>
 </header>

 <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">

 {/* Turnuvalar */}
 <section>
 <div className="flex items-center justify-between mb-4">
 <h2 className="font-black text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-lime-400" />Turnuvalar</h2>
 <button onClick={() => setYeniGosteriliyor(!yeniGosteriliyor)}
 className="flex items-center gap-1.5 px-3 py-2 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black rounded-xl text-xs transition">
 <Plus className="w-4 h-4" />Yeni Turnuva
 </button>
 </div>

 {yeniGosteriliyor && (
 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-lime-500/30 rounded-2xl p-5 mb-4 space-y-3 shadow-sm">
 <h3 className="font-bold text-sm text-lime-600 dark:text-lime-300">Yeni Turnuva</h3>
 {[
 { key: 'ad', label: 'Turnuva Adı *', ph: 'örn. 2025 Türkiye Şampiyonası' },
 { key: 'yer', label: 'Lokasyon', ph: 'örn. İstanbul Tenis Kulübü' },
 { key: 'tarih', label: 'Tarih', ph: 'örn. 15-20 Ağustos 2025' },
 ].map(({ key, label, ph }) => (
 <div key={key}>
 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">{label}</label>
 <input type="text" value={(yeniForm as any)[key]} placeholder={ph}
 onChange={e => setYeniForm(p => ({ ...p, [key]: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-lime-400" />
 </div>
 ))}
 <div>
 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Not</label>
 <textarea value={yeniForm.not} placeholder="İsteğe bağlı not..."
 onChange={e => setYeniForm(p => ({ ...p, not: e.target.value }))}
 rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-lime-400 resize-none" />
 </div>
 <div className="flex gap-2">
 <button onClick={handleTurnuvaOlustur} disabled={kayitYukleniyor}
 className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black rounded-xl text-sm transition disabled:opacity-50">
 {kayitYukleniyor ? 'Oluşturuluyor...' : <><Save className="w-4 h-4 inline mr-1" />Oluştur</>}
 </button>
 <button onClick={() => setYeniGosteriliyor(false)}
 className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm">İptal</button>
 </div>
 </div>
 )}

 <div className="space-y-2">
 {tournaments.map(t => (
 <div key={t.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-3 shadow-sm">
 {duzenlenenTurnuvaId === t.id ? (
 <div className="space-y-3">
 <h4 className="text-xs font-bold text-lime-600 dark:text-lime-400">Turnuvayı Düzenle</h4>
 <div>
 <label className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 block">Turnuva Adı *</label>
 <input type="text" value={duzenleTurnuvaForm.ad}
 onChange={e => setDuzenleTurnuvaForm(p => ({ ...p, ad: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-lime-400" />
 </div>
 <div>
 <label className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 block">Lokasyon</label>
 <input type="text" value={duzenleTurnuvaForm.yer}
 onChange={e => setDuzenleTurnuvaForm(p => ({ ...p, yer: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-lime-400" />
 </div>
 <div>
 <label className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 block">Tarih</label>
 <input type="text" value={duzenleTurnuvaForm.tarih}
 onChange={e => setDuzenleTurnuvaForm(p => ({ ...p, tarih: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-lime-400" />
 </div>
 <div>
 <label className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 block">Not</label>
 <textarea value={duzenleTurnuvaForm.not}
 onChange={e => setDuzenleTurnuvaForm(p => ({ ...p, not: e.target.value }))}
 rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-lime-400 resize-none" />
 </div>
 <div className="flex gap-2">
 <button onClick={handleTurnuvaGuncelle} disabled={kayitYukleniyor}
 className="px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black rounded-lg text-xs transition">
 {kayitYukleniyor ? 'Güncelleniyor...' : 'Kaydet'}
 </button>
 <button onClick={() => setDuzenlenenTurnuvaId(null)}
 className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs">İptal</button>
 </div>
 </div>
 ) : (
 <div className="flex items-center gap-3">
 <div className="flex-1 min-w-0">
 <div className="font-bold text-sm">{t.ad}</div>
 <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-3 mt-0.5">
 {t.yer && <span>📍 {t.yer}</span>}
 {t.tarih && <span>📅 {t.tarih}</span>}
 <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">{t.id}</span>
 </div>
 </div>
 <div className="flex items-center gap-1 shrink-0">
 <button onClick={() => handleTurnuvaDuzenleAc(t)}
 className="p-2 text-cyan-600 dark:text-cyan-400/80 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
 <Edit2 className="w-4 h-4" />
 </button>
 <button onClick={() => handleTurnuvaSil(t)}
 className="p-2 text-rose-600 dark:text-rose-400/60 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/30 rounded-lg transition">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}
 </div>
 ))}
 {tournaments.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Henüz turnuva yok.</p>}
 </div>
 </section>

 {/* Başhakemler */}
 <section>
 <div className="flex items-center justify-between mb-4">
 <h2 className="font-black text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-cyan-400" />Başhakemler</h2>
 <button onClick={() => setBaskahakemGosteriliyor(!baskahakemGosteriliyor)}
 className="flex items-center gap-1.5 px-3 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black rounded-xl text-xs transition">
 <Plus className="w-4 h-4" />Başhakem Ekle
 </button>
 </div>

 {baskahakemGosteriliyor && (
 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 rounded-2xl p-5 mb-4 space-y-3 shadow-sm">
 <h3 className="font-bold text-sm text-cyan-600 dark:text-cyan-300">Yeni Başhakem</h3>
 <div>
 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Ad Soyad</label>
 <input type="text" value={baskahakemForm.ad} placeholder="örn. Ali YILMAZ"
 onChange={e => setBaskahakemForm(p => ({ ...p, ad: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-cyan-400" />
 </div>
 <div>
 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Şifre / PIN</label>
 <div className="relative">
 <input type={sifreGoster ? 'text' : 'password'} value={baskahakemForm.pin} placeholder="Şifre belirleyin"
 onChange={e => setBaskahakemForm(p => ({ ...p, pin: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-cyan-400 pr-10" />
 <button type="button" onClick={() => setSifreGoster(!sifreGoster)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white">
 {sifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <div>
 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Atanacak Turnuva</label>
 <select value={baskahakemForm.tournamentId} onChange={e => setBaskahakemForm(p => ({ ...p, tournamentId: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-cyan-400">
 <option value="">-- Turnuva Seçin --</option>
 {tournaments.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
 </select>
 </div>
 <div className="flex gap-2">
 <button onClick={handleBaskahakemEkle}
 className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black rounded-xl text-sm transition">
 <Save className="w-4 h-4 inline mr-1" />Ekle
 </button>
 <button onClick={() => setBaskahakemGosteriliyor(false)}
 className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm">İptal</button>
 </div>
 </div>
 )}

 <div className="space-y-2">
 {(config?.bashakem_listesi || []).map(bh => {
 const turnuva = tournaments.find(t => t.id === bh.tournamentId);
 return (
 <div key={bh.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-3 shadow-sm">
 {duzenlenenBaskahakemId === bh.id ? (
 <div className="space-y-3">
 <h4 className="text-xs font-bold text-cyan-600 dark:text-cyan-400">Başhakemi Düzenle</h4>
 <div>
 <label className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 block">Ad Soyad</label>
 <input type="text" value={duzenleBaskahakemForm.ad}
 onChange={e => setDuzenleBaskahakemForm(p => ({ ...p, ad: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-cyan-400" />
 </div>
 <div>
 <label className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 block">Şifre / PIN</label>
 <div className="relative">
 <input type={duzenleSifreGoster ? 'text' : 'password'} value={duzenleBaskahakemForm.pin}
 onChange={e => setDuzenleBaskahakemForm(p => ({ ...p, pin: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-cyan-400 pr-10" />
 <button type="button" onClick={() => setDuzenleSifreGoster(!duzenleSifreGoster)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white">
 {duzenleSifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <div>
 <label className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 block">Atanan Turnuva</label>
 <select value={duzenleBaskahakemForm.tournamentId}
 onChange={e => setDuzenleBaskahakemForm(p => ({ ...p, tournamentId: e.target.value }))}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-cyan-400">
 <option value="">-- Turnuva Seçin --</option>
 {tournaments.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
 </select>
 </div>
 <div className="flex gap-2">
 <button onClick={handleBaskahakemGuncelle}
 className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black rounded-lg text-xs transition">
 Kaydet
 </button>
 <button onClick={() => setDuzenlenenBaskahakemId(null)}
 className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs">İptal</button>
 </div>
 </div>
 ) : (
 <div className="flex items-center gap-3">
 <div className="flex-1">
 <div className="font-bold text-sm">{bh.ad}</div>
 <div className="text-xs text-slate-500 dark:text-slate-400">{turnuva?.ad || bh.tournamentId}</div>
 </div>
 <div className="flex items-center gap-1 shrink-0">
 <button onClick={() => handleBaskahakemDuzenleAc(bh)}
 className="p-2 text-cyan-600 dark:text-cyan-400/80 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
 <Edit2 className="w-4 h-4" />
 </button>
 <button onClick={() => handleBaskahakemSil(bh.id)}
 className="p-2 text-rose-600 dark:text-rose-400/60 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/30 rounded-lg transition">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}
 </div>
 );
 })}
 {(config?.bashakem_listesi || []).length === 0 && <p className="text-slate-400 text-sm text-center py-4">Henüz başhakem eklenmedi.</p>}
 </div>
 </section>

 {/* Süper Admin Şifre */}
 <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 space-y-3 max-w-sm shadow-sm">
 <h3 className="font-bold text-sm">Süper Admin Şifresini Değiştir</h3>
 <div className="relative">
 <input type={superSifreGoster ? 'text' : 'password'} value={yeniSuperSifre} placeholder="Yeni şifre"
 onChange={e => setYeniSuperSifre(e.target.value)}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none pr-10" />
 <button type="button" onClick={() => setSuperSifreGoster(!superSifreGoster)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white">
 {superSifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 <button onClick={handleSuperSifreGuncelle}
 className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-sm transition">
 Güncelle
 </button>
 </section>
 </main>
 </div>
 );
};
