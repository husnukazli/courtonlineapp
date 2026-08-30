import React, { useState } from 'react';
import { TennisDataProvider, useTennisData } from './context/TennisDataContext';
import { TournamentListScreen } from './components/Portal/TournamentListScreen';
import { SuperAdminScreen } from './components/Portal/SuperAdminScreen';
import { MainPortalGate } from './components/Portal/MainPortalGate';
import { Navigation } from './components/Navigation';
import { CourtSupervisorView } from './components/Supervisor/CourtSupervisorView';
import { DeskSupervisorView } from './components/DeskSupervisor/DeskSupervisorView';
import { HelpModal } from './components/Common/HelpModal';

// Uygulama genelinde hangi ekranda olduğumuzu tutan tip
type AppScreen =
  | { type: 'list' }                        // Turnuva listesi (başlangıç)
  | { type: 'superAdmin' }                  // Süper admin paneli
  | { type: 'tournament'; id: string };     // Seçili bir turnuvanın izleyici/hakem ekranı

const AppContent: React.FC = () => {
  const { authRole, setAuthRole, setTournamentId } = useTennisData();
  const [screen, setScreen] = useState<AppScreen>({ type: 'list' });
  const [currentTab, setCurrentTab] = useState<'supervisor' | 'desk'>('supervisor');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Turnuva seçildiğinde
  const handleSelectTournament = (id: string) => {
    setTournamentId(id);
    setScreen({ type: 'tournament', id });
  };

  // Süper admin girişi
  const handleSuperAdminLogin = () => setScreen({ type: 'superAdmin' });

  // Geri (turnuva listesine dön)
  const handleBackToList = () => {
    setTournamentId('');
    setAuthRole('none');
    setScreen({ type: 'list' });
  };

  // Süper admin çıkışı
  const handleSuperAdminLogout = () => setScreen({ type: 'list' });

  // ── Ekran: Turnuva Listesi ──────────────────────────────────────────────
  if (screen.type === 'list') {
    return (
      <TournamentListScreen
        onSelectTournament={handleSelectTournament}
        onSuperAdminLogin={handleSuperAdminLogin}
      />
    );
  }

  // ── Ekran: Süper Admin ──────────────────────────────────────────────────
  if (screen.type === 'superAdmin') {
    return <SuperAdminScreen onLogout={handleSuperAdminLogout} />;
  }

  // ── Ekran: Turnuva (izleyici/hakem/başhakem) ────────────────────────────
  // Giriş yapılmamışsa → izleyici ekranı (MainPortalGate içinde PIN modalları var)
  if (authRole === 'none') {
    return <MainPortalGate onBackToList={handleBackToList} />;
  }

  // PIN ile giriş yapılmış → hakem/başhakem ekranı
  const handleTabChange = (tab: 'supervisor' | 'desk') => {
    setCurrentTab(tab);
    setAuthRole(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-lime-400 selection:text-slate-950">
      <Navigation
        currentTab={currentTab}
        onTabChange={handleTabChange}
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
};

export const App: React.FC = () => (
  <TennisDataProvider>
    <AppContent />
  </TennisDataProvider>
);

export default App;
