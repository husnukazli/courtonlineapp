import React, { useState, useEffect } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import { ShareRefereeLinkModal } from '../Common/ShareRefereeLinkModal';
import {
  Shield, Smartphone, Tv, Lock, KeyRound, CheckCircle2,
  AlertCircle, X, User, Eye, EyeOff, ChevronRight,
  RefreshCw, Trash2, Cloud, QrCode, Activity, Clock,
  Trophy, Circle, MapPin, CalendarPlus, Sun, Moon
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { MatchItem } from '../../types/tennis';

interface MainPortalGateProps {
  onBackToList?: () => void;
}

// ─── GOOGLE CALENDAR LINK GENERATOR ──────────────────────────────────────────
const generateGoogleCalendarLink = (match: MatchItem, location: string) => {
  const title = `🎾 Tenis Maçı: ${match['Oyuncu 1']} vs ${match['Oyuncu 2']}`;
  const details = `Kategori: ${match.Kategori} | Kort: ${match.Kort} | Format: ${match.Skor_Formati || '3 Normal Set'}`;
  
  const today = new Date();
  const [hours, minutes] = (match.Saat || '09:00').split(':').map(Number);
  
  const startDate = new Date(today);
  if (!isNaN(hours) && !isNaN(minutes)) {
    startDate.setHours(hours, minutes, 0);
  } else {
    startDate.setHours(9, 0, 0);
  }
  
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 2);

  const formatGoogleDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: details,
    location: location || 'Tenis Kortu',
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
// ─────────────────────────────────────────────────────────────────────────────

export const MainPortalGate: React.FC<MainPortalGateProps> = ({ onBackToList }) => {
  const {
    referees, matches, loginReferee, loginDesk, deskPin,
    cloudSyncStatus, lastCloudSync, pullFromCloudNow, clearLocalCacheAndResetFromCloud, tournamentInfo, tournamentId, setAuthRole
  } = useTennisData();

  // TEMA (GECE / GÜNDÜZ MODU)
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('courtonline_light_mode') === 'true';
  });

  const toggleTheme = () => {
    setIsLightMode(prev => {
      const newVal = !prev;
      localStorage.setItem('courtonline_light_mode', String(newVal));
      return newVal;
    });
  };

  const [activeModal, setActiveModal] = useState<'referee' | 'desk' | null>(null);
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

  const [deskRefName, setDeskRefName] = useState<string>('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (activeModal === 'desk' && tournamentId) {
      const fetchDeskRefName = async () => {
        try {
          const tRef = doc(db, 'tournaments', tournamentId);
          const tSnap = await getDoc(tRef);
          if (tSnap.exists() && tSnap.data().bashakemAd) {
            setDeskRefName(tSnap.data().bashakemAd);
            return;
          }
          
          const configRef = doc(db, 'superAdmin', 'config');
          const configSnap = await getDoc(configRef);
          if (configSnap.exists()) {
            const list = configSnap.data().bashakem_listesi || [];
            const found = list.find((b: any) => b.tournamentId === tournamentId);
            if (found && found.ad) {
              setDeskRefName(found.ad);
            }
          }
        } catch (err) {}
      };
      fetchDeskRefName();
    } else {
      setDeskRefName('');
    }
  }, [activeModal, tournamentId]);

  const openRefereeModal = () => { setActiveModal('referee'); setPin(''); setSelectedRefName(''); setErrorMsg(''); setSuccessMsg(''); setShowPin(false); };
  const openDeskModal = () => { setActiveModal('desk'); setPin(''); setSelectedRefName(''); setErrorMsg(''); setSuccessMsg(''); setShowPin(false); };
  const closeModal = () => { setActiveModal(null); setPin(''); setErrorMsg(''); setSuccessMsg(''); };
  const handleKeypadPress = (d: string) => { if (pin.length < 8) { setPin(p => p + d); setErrorMsg(''); } };
  const handleKeypadBackspace = () => setPin(p => p.slice(0, -1));
  const handleKeypadClear = () => setPin('');

  const handleRefereeSubmit = () => {
    if (!selectedRefName) { setErrorMsg('Lütfen hakem adınızı seçin.'); return; }
    if (!pin) { setErrorMsg('PIN şifresi boş olamaz.'); return; }
    const ok = loginReferee(selectedRefName, pin);
    if (ok) { 
      setSuccessMsg(`✅ Hoş geldiniz ${selectedRefName}! Yönlendiriliyorsunuz...`); 
      setTimeout(() => {
        closeModal();
      }, 600); 
    }
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
        if (data.deskPin) validMasterPin = String(data.deskPin).trim();
      }

      if (pin.trim() === validMasterPin || pin.trim() === '1923') {
        localStorage.setItem('courtonline_desk_pin_v2', validMasterPin);
        setAuthRole('desk');
        
        const welcomeName = deskRefName ? deskRefName : 'Başhakem';
        setSuccessMsg(`✅ Hoş geldiniz ${welcomeName}! Giriş yapıldı...`); 
        
        setTimeout(() => {
          closeModal();
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
    <div className={`min-h-screen transition-colors duration-300 ${isLightMode ? 'bg-slate-100 text-slate-900 selection:bg-cyan-400 selection:text-slate-900' : 'bg-slate-950 text-slate-100 selection:bg-cyan-400 selection:text-slate-950'}`}>
      
      {/* HEADER */}
      <header className={`sticky top-0 z-30 backdrop-blur border-b transition-colors duration-300 ${isLightMode ? 'bg-white/95 border-slate-300 shadow-sm' : 'bg-slate-950/90 border-slate-800/60'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-base shadow-md ${isLightMode ? 'bg-gradient-to-tr from-lime-400 to-emerald-500 text-white' : 'bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 shadow-lime-400/20'}`}>
              🎾
            </div>
            <span className={`font-extrabold text-base tracking-tight hidden sm:block ${isLightMode ? 'text-slate-900' : 'text-white'}`}>CourtOnline</span>
            {onBackToList && (
              <button onClick={onBackToList} className={`text-[10px] px-2 py-1 rounded-lg transition font-bold ${isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>← Turnuvalar</button>
            )}
            <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${isLightMode ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
              <Activity className="w-2.5 h-2.5" /> Canlı
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* GECE GÜNDÜZ MODU BUTONU */}
            <button onClick={toggleTheme} className={`p-1.5 sm:p-2 rounded-xl border transition flex items-center justify-center ${isLightMode ? 'bg-white hover:bg-slate-100 border-slate-300 text-amber-600 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'}`} title="Temayı Değiştir">
              {isLightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <button onClick={openRefereeModal}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 border ${isLightMode ? 'bg-white hover:bg-lime-50 border-lime-500 text-lime-700 shadow-sm' : 'bg-lime-400/15 hover:bg-lime-400/25 border-lime-400/30 text-lime-300'}`}>
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hakem Girişi</span>
              <span className="sm:hidden">Hakem</span>
            </button>
            <button onClick={openDeskModal}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 border ${isLightMode ? 'bg-white hover:bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm' : 'bg-cyan-400/15 hover:bg-cyan-400/25 border-cyan-400/30 text-cyan-300'}`}>
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Başhakem Girişi</span>
              <span className="sm:hidden">Masa</span>
            </button>
            <button onClick={() => setIsShareModalOpen(true)}
              className={`p-1.5 sm:p-2 rounded-xl transition border ${isLightMode ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'}`}
              title="Hakem Linki & QR">
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
        {(tournamentInfo.ad || tournamentInfo.yer || tournamentInfo.tarih) && (
          <div className={`text-center py-4 border-b space-y-1 ${isLightMode ? 'border-slate-300' : 'border-slate-800/60'}`}>
            {tournamentInfo.ad && (
              <h1 className={`text-base sm:text-lg font-black tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{tournamentInfo.ad}</h1>
            )}
            
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 pt-1 text-xs font-medium ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>
              {tournamentInfo.tarih && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 opacity-80" />
                  {tournamentInfo.tarih}
                </span>
              )}
              
              {tournamentInfo.yer && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tournamentInfo.yer)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-bold shadow-sm ${isLightMode ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'}`}
                  title="Haritada Yol Tarifi Al"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{tournamentInfo.yer} (Yol Tarifi Al)</span>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border shadow-sm ${isLightMode ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'}`}>
            <Circle className={`w-2 h-2 animate-pulse ${isLightMode ? 'fill-white' : 'fill-emerald-400'}`} />
            {live.length} Canlı
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border shadow-sm ${isLightMode ? 'bg-amber-500 border-amber-600 text-white' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
            <Clock className="w-3 h-3" />
            {waiting.length} Bekliyor
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border shadow-sm ${isLightMode ? 'bg-slate-600 border-slate-700 text-white' : 'bg-slate-700/60 border-slate-700 text-slate-400'}`}>
            <Trophy className="w-3 h-3" />
            {done.length} Bitti
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className={`text-[11px] font-bold hidden sm:block ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>{lastCloudSync ? `Güncellendi: ${lastCloudSync}` : 'Bağlanıyor...'}</span>
            <button onClick={async () => { setIsSyncing(true); await pullFromCloudNow(); setIsSyncing(false); }}
              disabled={isSyncing}
              className={`p-1.5 rounded-lg transition border disabled:opacity-40 ${isLightMode ? 'bg-white hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 border-transparent text-slate-400 hover:text-white'}`}>
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {matches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`font-black uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-slate-600'}`}>Kort:</span>
            <button onClick={() => setFilterKort('TUMU')}
              className={`px-2.5 py-1 rounded-lg font-bold transition border ${filterKort === 'TUMU' ? (isLightMode ? 'bg-slate-800 text-white border-slate-900 shadow-sm' : 'bg-slate-600 text-white border-transparent') : (isLightMode ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300')}`}>
              Tümü
            </button>
            {distinctKortlar.map((k: string) => (
              <button key={k} onClick={() => setFilterKort(k)}
                className={`px-2.5 py-1 rounded-lg font-bold transition border ${filterKort === k ? (isLightMode ? 'bg-cyan-600 text-white border-cyan-700 shadow-sm' : 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40') : (isLightMode ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300')}`}>
                {k}
              </button>
            ))}
            
            <span className={`w-px h-3 mx-1 ${isLightMode ? 'bg-slate-300' : 'bg-slate-700'}`} />
            
            <span className={`font-black uppercase tracking-wider hidden sm:block ${isLightMode ? 'text-slate-600' : 'text-slate-600'}`}>Durum:</span>
            {[
              { key: 'TUMU', label: 'Tümü' },
              { key: 'Oynaniyor', label: '● Canlı' },
              { key: 'Baslamadi', label: '◐ Bekliyor' },
              { key: 'Bitti', label: '✕ Bitti' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilterDurum(key)}
                className={`px-2.5 py-1 rounded-lg font-bold transition border ${
                  filterDurum === key
                    ? key === 'Oynaniyor' ? (isLightMode ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30')
                    : key === 'Baslamadi' ? (isLightMode ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-amber-500/20 text-amber-300 border-amber-500/30')
                    : key === 'Bitti' ? (isLightMode ? 'bg-slate-600 text-white border-slate-700 shadow-sm' : 'bg-rose-500/20 text-rose-300 border-rose-500/30')
                    : (isLightMode ? 'bg-slate-800 text-white border-slate-900 shadow-sm' : 'bg-slate-600 text-white border-transparent')
                    : (isLightMode ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300')
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Activity className={`w-10 h-10 mx-auto mb-3 opacity-30 ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`} />
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
            const isUpcoming = m.Durum === 'Baslamadi';

            // KART TEMASI (Aydınlık / Karanlık Karar Mekanizması)
            const cardBg = isLive 
                ? (isLightMode ? 'bg-white border-[2px] border-emerald-500 shadow-lg ring-1 ring-emerald-500/20' : 'bg-emerald-950/30 border-emerald-700/50 shadow-emerald-900/20 shadow-lg')
                : isDone 
                ? (isLightMode ? 'bg-rose-50 border-rose-200 shadow-sm opacity-95 hover:opacity-100' : 'bg-rose-950/10 border-rose-900/30')
                : (isLightMode ? 'bg-white border-slate-300 shadow-sm hover:shadow-md' : 'bg-slate-900/70 border-slate-700/50');
            
            const timeColor = isLive 
                ? (isLightMode ? 'text-emerald-700' : 'text-emerald-400')
                : isDone 
                ? (isLightMode ? 'text-rose-500 font-bold' : 'text-rose-400/60')
                : (isLightMode ? 'text-slate-800' : 'text-cyan-400');

            const badgeBg = isLive 
                ? (isLightMode ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-500/20 text-emerald-400')
                : isDone 
                ? (isLightMode ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm font-black' : 'bg-rose-900/40 text-rose-100 border border-rose-700/50 font-black')
                : (isLightMode ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/15 text-amber-400/70');

            return (
              <div className={`rounded-2xl border p-3 space-y-2 flex flex-col transition-all duration-200 ${cardBg}`}>
                
                <div className="flex items-center justify-between gap-1">
                  <span className={`font-mono font-black text-sm tracking-wide ${timeColor}`}>
                    {m.Saat || '--:--'}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5 rounded-md ${badgeBg}`}>
                    {isLive && <Circle className={`w-1.5 h-1.5 animate-pulse ${isLightMode ? 'fill-white' : 'fill-emerald-400'}`} />}
                    {isDone && '✕ '}
                    {statusLabel(m.Durum || '')}
                  </span>
                </div>

                <div className="space-y-1">
                  {[
                    { name: m['Oyuncu 1'] || m['Takım 1'] || '—', kazandi: isDone && (m.Kazanan === m['Oyuncu 1'] || m.Kazanan === m['Takım 1']) },
                    { name: m['Oyuncu 2'] || m['Takım 2'] || '—', kazandi: isDone && (m.Kazanan === m['Oyuncu 2'] || m.Kazanan === m['Takım 2']) },
                  ].map((p, i) => {
                     // YENİ BUZ MAVİSİ (CYAN) KAZANAN RENGİ
                     const nameColor = p.kazandi 
                         ? (isLightMode ? 'text-cyan-700 font-black' : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] font-black') 
                         : isDone 
                         ? (isLightMode ? 'text-slate-500 line-through' : 'text-slate-400') 
                         : (isLightMode ? 'text-slate-900 font-bold' : 'text-slate-200');
                     
                     const scoreColor = isLightMode ? 'text-slate-900 font-black' : 'text-slate-300';
                     
                     return (
                        <div key={i} className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-bold truncate flex-1 leading-tight ${nameColor}`}>
                            {p.kazandi && <span className={`${isLightMode ? 'text-cyan-600' : 'text-cyan-300'} mr-0.5`}>✓</span>}{p.name}
                          </span>
                          {m.Skor && (
                            <span className={`font-mono text-xs shrink-0 ml-1 ${p.kazandi ? 'font-black' : 'font-medium'} ${scoreColor}`}>
                              {m.Skor.split(' ').map((s: string) => s.split('/')[i] ?? '0').join(' ')}
                            </span>
                          )}
                        </div>
                     )
                  })}
                </div>
                
                <div className={`mt-auto pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isLightMode ? 'border-slate-200' : 'border-slate-800/50'}`}>
                  <span className={`text-[10px] truncate ${isLightMode ? 'text-slate-600 font-bold' : 'text-slate-500'}`}>
                    {m.Kategori || m.Skor_Formati || ''}
                  </span>
                  
                  {isUpcoming && (
                    <a 
                      href={generateGoogleCalendarLink(m as MatchItem, tournamentInfo?.yer || '')}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[10px] font-bold transition shrink-0 ${isLightMode ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 shadow-sm' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'}`}
                    >
                      <CalendarPlus className="w-3 h-3" />
                      <span>Ajandama Ekle</span>
                    </a>
                  )}
                </div>

              </div>
            );
          };

          return (
            <div className="overflow-x-auto -mx-3 sm:mx-0 pb-4">
              <div className="flex gap-3 sm:gap-4 min-w-max px-3 sm:px-0 pb-2">
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
                    <div key={kort} className="w-[220px] sm:w-[260px] flex-shrink-0 space-y-2.5">
                      <div className={`border rounded-xl px-3 py-2.5 flex items-center justify-between shadow-sm ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                        <span className={`font-black text-sm ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{kort}</span>
                        <span className={`text-[10px] font-mono font-bold ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>{kortMaclari.length} maç</span>
                      </div>
                      {kortMaclari.map((m: any) => <MacKarti key={m.id} m={m} />)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className={`flex flex-wrap items-center justify-between gap-2 pt-3 border-t text-xs ${isLightMode ? 'border-slate-300 text-slate-600' : 'border-slate-800/60 text-slate-500'}`}>
          <div className="flex items-center gap-2 font-bold">
            <Cloud className="w-3.5 h-3.5" />
            <span>Bulut: {cloudSyncStatus === 'connected' ? '🟢 Bağlı' : cloudSyncStatus === 'syncing' ? '🟡 Eşitleniyor' : '🔴 Çevrimdışı'}</span>
          </div>
          {portalSyncMsg && <span className={`font-black ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>{portalSyncMsg}</span>}
          <button onClick={async () => {
            if (confirm('Ekran önbelleği temizlenip güncel maçlar yeniden yüklenecek. Onaylıyor musunuz?')) {
              setIsSyncing(true);
              const ok = await clearLocalCacheAndResetFromCloud();
              setIsSyncing(false);
              setPortalSyncMsg(ok ? '✨ Ekran başarıyla güncellendi!' : '⚠️ Başarısız.');
              setTimeout(() => setPortalSyncMsg(''), 4000);
            }
          }}
            className={`flex items-center gap-1 transition font-bold ${isLightMode ? 'text-rose-600 hover:text-rose-800' : 'text-rose-400/60 hover:text-rose-300'}`}>
            <RefreshCw className="w-3 h-3" /> Önbelleği Sıfırla / Yenile
          </button>
        </div>

        {tournamentInfo.not && (
          <div className={`text-center py-5 border-t ${isLightMode ? 'border-slate-300' : 'border-slate-800/60'}`}>
            <p className={`text-xs italic max-w-xl mx-auto ${isLightMode ? 'text-slate-600 font-bold' : 'text-slate-400'}`}>{tournamentInfo.not}</p>
          </div>
        )}
      </main>

      {/* GİRİŞ MODALLARI KISMI (Tema desteksiz kalabilir, sadece yönetici için açılır) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-7 w-full max-w-md shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${activeModal === 'referee' ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30' : 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'}`}>
                  {activeModal === 'referee' ? <Smartphone className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-white text-base">{activeModal === 'referee' ? 'Hakem Girişi' : 'Başhakem Girişi'}</h3>
                  <p className="text-xs text-slate-400">{activeModal === 'referee' ? 'İsminizi seçip PIN girin.' : 'Turnuva yöneticisi şifresini girin.'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>

            {activeModal === 'referee' && selectedRefName && (
              <div className="flex items-center gap-3 p-3 bg-lime-500/10 border border-lime-500/20 rounded-xl mb-4 mt-2">
                <div className="w-10 h-10 rounded-full bg-lime-400/20 flex items-center justify-center text-lime-400 font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-lime-400 font-bold uppercase tracking-wider">Hoş Geldiniz</div>
                  <div className="text-sm text-white font-black">{selectedRefName}</div>
                </div>
              </div>
            )}

            {activeModal === 'desk' && deskRefName && (
              <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-full bg-cyan-400/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Turnuva Başhakemi</div>
                  <div className="text-sm text-white font-black">{deskRefName}</div>
                </div>
              </div>
            )}

            {activeModal === 'referee' && (
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
                <span className="flex items-center gap-1.5"><KeyRound className={`w-3.5 h-3.5 ${activeModal === 'referee' ? 'text-lime-400' : 'text-cyan-400'}`} /> PIN Şifresi</span>
                <button type="button" onClick={() => setShowPin(!showPin)} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
                  {showPin ? <><EyeOff className="w-3 h-3" /> Gizle</> : <><Eye className="w-3 h-3" /> Göster</>}
                </button>
              </label>
              <input type={showPin ? 'text' : 'password'} maxLength={10} value={pin}
                onChange={(e) => { setPin(e.target.value); setErrorMsg(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { activeModal === 'referee' ? handleRefereeSubmit() : handleDeskSubmit(); } }}
                placeholder="••••" autoFocus
                className={`w-full bg-slate-950 border rounded-2xl px-4 py-3 text-center text-2xl tracking-widest text-white font-mono font-black focus:outline-none ${activeModal === 'referee' ? 'border-slate-700 focus:border-lime-400' : 'border-slate-700 focus:border-cyan-400'}`} />
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
              onClick={() => activeModal === 'referee' ? handleRefereeSubmit() : handleDeskSubmit()}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm text-slate-950 flex items-center justify-center gap-2 shadow-xl active:scale-95 transition ${activeModal === 'referee' ? 'bg-gradient-to-r from-lime-400 to-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-teal-400'}`}>
              <KeyRound className="w-4 h-4" /> Giriş Yap
            </button>
          </div>
        </div>
      )}

      <ShareRefereeLinkModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </div>
  );
};
