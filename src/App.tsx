import React, { useState } from 'react';
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
  const { authRole, setAuthRole, setTournamentId } = useTennisData();
  const [screen, setScreen] = useState<AppScreen>({ type: 'list' });
  // Başhakem için varsayılan açılış sekmesini desk (Grid ve Yönetim) yapıyoruz.
  const [currentTab, setCurrentTab] = useState<'supervisor' | 'desk'>('desk');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleSelectTournament = (id: string) => {
    setTournamentId(id);
    setScreen({ type: 'tournament', id });
  };

  const handleSuperAdminLogin = () => setScreen({ type: 'superAdmin' });

  const handleBackToList = () => {
    setAuthRole('none');
    setTournamentId('');
    setScreen({ type: 'list' });
  };

  const handleSuperAdminLogout = () => setScreen({ type: 'list' });

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
