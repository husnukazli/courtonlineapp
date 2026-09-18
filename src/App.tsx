import React, { useState, useEffect } from 'react';
import { TennisDataProvider, useTennisData } from './context/TennisDataContext';
import { TournamentListScreen } from './components/Portal/TournamentListScreen';
import { SuperAdminScreen } from './components/Portal/SuperAdminScreen';
import { MainPortalGate } from './components/Portal/MainPortalGate';
import { Navigation } from './components/Navigation';
import { CourtSupervisorView } from './components/Supervisor/CourtSupervisorView';
import { DeskSupervisorView } from './components/DeskSupervisor/DeskSupervisorView';
import { HelpModal } from './components/Common/HelpModal';

type AppScreen =
  | { type: 'list' }
  | { type: 'superAdmin' }
  | { type: 'tournament'; id: string };

const AppContent: React.FC = () => {
  const { authRole, setAuthRole, setTournamentId, tournamentId } = useTennisData();

  // Tarayıcı açılıp kapandığında veya yenilendiğinde kalınan ekranı hatırla
  const [screen, setScreen] = useState<AppScreen>(() => {
    if (typeof window !== 'undefined') {
      const savedScreen = localStorage.getItem('courtonline_saved_screen');
      if (savedScreen) {
        try {
          const parsed = JSON.parse(savedScreen);
          if (parsed && (parsed.type === 'list' || parsed.type === 'superAdmin' || (parsed.type === 'tournament' && parsed.id))) {
            return parsed;
          }
        } catch {}
      }
      const savedTId = localStorage.getItem('courtonline_active_tournament_id');
      if (savedTId) {
        return { type: 'tournament', id: savedTId };
      }
    }
    return { type: 'list' };
  });

  // Başhakem için kalınan sekmeyi (supervisor veya desk) hatırla
  const [currentTab, setCurrentTab] = useState<'supervisor' | 'desk'>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('courtonline_current_tab');
      if (savedTab === 'supervisor' || savedTab === 'desk') {
        return savedTab;
      }
    }
    return 'desk';
  });

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Ekran değiştikçe kaydet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('courtonline_saved_screen', JSON.stringify(screen));
    }
  }, [screen]);

  // Sekme değiştikçe kaydet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('courtonline_current_tab', currentTab);
    }
  }, [currentTab]);

  // Turnuva ekranı geri yüklendiğinde Context'teki tournamentId ile senkronize et
  useEffect(() => {
    if (screen.type === 'tournament' && screen.id && screen.id !== tournamentId) {
      setTournamentId(screen.id);
    }
  }, [screen, tournamentId, setTournamentId]);

  const handleSelectTournament = (id: string) => {
    setTournamentId(id);
    const nextScreen: AppScreen = { type: 'tournament', id };
    setScreen(nextScreen);
    if (typeof window !== 'undefined') {
      localStorage.setItem('courtonline_saved_screen', JSON.stringify(nextScreen));
    }
  };

  const handleSuperAdminLogin = () => {
    const nextScreen: AppScreen = { type: 'superAdmin' };
    setScreen(nextScreen);
    if (typeof window !== 'undefined') {
      localStorage.setItem('courtonline_saved_screen', JSON.stringify(nextScreen));
    }
  };

  const handleBackToList = () => {
    setAuthRole('none');
    setTournamentId('');
    const nextScreen: AppScreen = { type: 'list' };
    setScreen(nextScreen);
    if (typeof window !== 'undefined') {
      localStorage.setItem('courtonline_saved_screen', JSON.stringify(nextScreen));
      localStorage.removeItem('courtonline_active_tournament_id');
      localStorage.removeItem('courtonline_active_chair_match');
    }
  };

  const handleSuperAdminLogout = () => {
    const nextScreen: AppScreen = { type: 'list' };
    setScreen(nextScreen);
    if (typeof window !== 'undefined') {
      localStorage.setItem('courtonline_saved_screen', JSON.stringify(nextScreen));
    }
  };

  // ── Turnuva Listesi ─────────────────────────────────────────────────────
  if (screen.type === 'list') {
    return (
      <TournamentListScreen
        onSelectTournament={handleSelectTournament}
        onSuperAdminLogin={handleSuperAdminLogin}
      />
    );
  }

  // ── Süper Admin ─────────────────────────────────────────────────────────
  if (screen.type === 'superAdmin') {
    return <SuperAdminScreen onLogout={handleSuperAdminLogout} />;
  }

  // ── ROL 1: HAKEM (Kort Hakemi) ──────────────────────────────────────────
  // Hakem giriş yaptığında artık eski ekran GELMEZ. Doğrudan Zen Modu açılır.
  if (authRole === 'referee') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-lime-400 selection:text-slate-950">
        <Navigation
          currentTab="supervisor" // Sekme görseli olarak bunu kullanıyoruz
          onTabChange={() => {}} // Hakem sekmeleri değiştiremez, sadece Zen modunda kalır
          onOpenHelp={() => setIsHelpOpen(true)}
          onBackToList={handleBackToList}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <CourtSupervisorView /> {/* İŞTE YENİ HİBRİT ZEN MODU EKRANI BURASI! */}
        </main>
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </div>
    );
  }

  // ── ROL 2: BAŞHAKEM (Turnuva Masası ve İzleme) ──────────────────────────
  if (authRole === 'desk') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-lime-400 selection:text-slate-950">
        <Navigation
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)} // Başhakem Grid ve Zen Modu arasında rahatça gezebilir
          onOpenHelp={() => setIsHelpOpen(true)}
          onBackToList={handleBackToList}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {currentTab === 'supervisor' ? <CourtSupervisorView /> : <DeskSupervisorView />}
        </main>
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        <footer className="py-4 border-t border-slate-900 text-center text-[11px] text-slate-500">
          CourtOnline Tenis Skor & Saha Gözlemcisi Sistemi
        </footer>
      </div>
    );
  }

  // ── ROL 0: İZLEYİCİ (Giriş Yapılmamış) ──────────────────────────────────
  if (authRole === 'none') {
    return <MainPortalGate onBackToList={handleBackToList} />;
  }

  return null;
};

export const App: React.FC = () => (
  <TennisDataProvider>
    <AppContent />
  </TennisDataProvider>
);

export default App;
