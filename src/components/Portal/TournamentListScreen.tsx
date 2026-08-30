import React, { useState, useEffect } from 'react';
import { Trophy, MapPin, Calendar, ChevronRight, Shield, X, Eye, EyeOff } from 'lucide-react';
import { subscribeTournamentList, verifySuperAdmin, TournamentListItem } from '../../utils/firebaseSync';

interface Props {
  onSelectTournament: (id: string) => void;
  onSuperAdminLogin: () => void;
}

export const TournamentListScreen: React.FC<Props> = ({ onSelectTournament, onSuperAdminLogin }) => {
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminSifre, setAdminSifre] = useState('');
  const [showSifre, setShowSifre] = useState(false);
  const [adminHata, setAdminHata] = useState('');
  const [adminYukleniyor, setAdminYukleniyor] = useState(false);

  useEffect(() => {
    const unsub = subscribeTournamentList((list) => {
      setTournaments(list.filter(t => t.aktif));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAdminGiris = async () => {
    if (!adminSifre) { setAdminHata('Şifre boş olamaz.'); return; }
    setAdminYukleniyor(true);
    const ok = await verifySuperAdmin(adminSifre);
    setAdminYukleniyor(false);
    if (ok) {
      setShowAdminModal(false);
      setAdminSifre('');
      onSuperAdminLogin();
    } else {
      setAdminHata('❌ Hatalı şifre.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-base">
              🎾
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">CourtOnline</span>
          </div>
          {/* Süper admin gizli bağlantı */}
          <button
            onClick={() => { setShowAdminModal(true); setAdminSifre(''); setAdminHata(''); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 text-xs transition"
            title="Sistem Yönetimi">
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sistem</span>
          </button>
        </div>
      </header>

      {/* İçerik */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Aktif Turnuvalar</h1>
          <p className="text-slate-400 text-sm">Takip etmek istediğiniz turnuvayı seçin.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-lime-400 rounded-full animate-spin mx-auto mb-3" />
            <p>Turnuvalar yükleniyor...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-bold">Henüz aktif turnuva yok</p>
            <p className="text-xs mt-1">Sistem yöneticisi turnuva ekledikten sonra burada görünecek.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map(t => (
              <button key={t.id} onClick={() => onSelectTournament(t.id)}
                className="text-left p-5 bg-slate-900 border border-slate-700/60 hover:border-lime-500/50 hover:bg-slate-800/80 rounded-2xl transition group shadow-lg active:scale-[0.98]">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-lime-400/15 border border-lime-400/30 text-lime-400 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-lime-400 transition mt-1 shrink-0" />
                </div>
                <h2 className="font-black text-base text-white leading-tight mb-2 group-hover:text-lime-300 transition">
                  {t.ad}
                </h2>
                <div className="space-y-1">
                  {t.yer && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3 h-3 shrink-0" />{t.yer}
                    </div>
                  )}
                  {t.tarih && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3 h-3 shrink-0" />{t.tarih}
                    </div>
                  )}
                </div>
                {t.not && (
                  <p className="text-[11px] text-slate-500 mt-2 italic line-clamp-2">{t.not}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Süper Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-white">Sistem Yönetimi</span>
              </div>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Şifre</label>
              <div className="relative">
                <input
                  type={showSifre ? 'text' : 'password'}
                  value={adminSifre}
                  onChange={e => { setAdminSifre(e.target.value); setAdminHata(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdminGiris()}
                  placeholder="••••••"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400 pr-10" />
                <button type="button" onClick={() => setShowSifre(!showSifre)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                  {showSifre ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {adminHata && <p className="text-xs text-rose-400">{adminHata}</p>}

            <button onClick={handleAdminGiris} disabled={adminYukleniyor}
              className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black rounded-xl text-sm transition disabled:opacity-50">
              {adminYukleniyor ? 'Kontrol ediliyor...' : 'Giriş Yap'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

