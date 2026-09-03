import React, { useState } from 'react';
import { TennisDataProvider, useTennisData } from './context/TennisDataContext';
import { TournamentListScreen } from './components/Portal/TournamentListScreen';
import { SuperAdminScreen } from './components/Portal/SuperAdminScreen';
import { MainPortalGate } from './components/Portal/MainPortalGate';
import { Navigation } from './components/Navigation';
import { CourtSupervisorView } from './components/Supervisor/CourtSupervisorView';
import { CourtRefereeView } from './components/CourtReferee/CourtRefereeView';
import { DeskSupervisorView } from './components/DeskSupervisor/DeskSupervisorView';
import { HelpModal } from './components/Common/HelpModal';

type AppScreen =
  | { type: 'list' }
  | { type: 'superAdmin' }
  | { type: 'tournament'; id: string };

const AppContent: React.FC = () => {
  const { authRole, setAuthRole, setTournamentId } = useTennisData();
  const [screen, setScreen] = useState<AppScreen>({ type: 'list' });
  const [currentTab, setCurrentTab] = useState<'supervisor' | 'desk'>('supervisor');
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

  // ── Kule Hakemi girişi yaptıysa → doğrudan CourtRefereeView ────────────
  if (authRole === 'referee') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-lime-400 selection:text-slate-950">
        <div className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <CourtRefereeView onBackToList={handleBackToList} />
        </div>
      </div>
    );
  }

  // ── Giriş yapılmamış → izleyici ekranı ─────────────────────────────────
  if (authRole === 'none') {
    return <MainPortalGate onBackToList={handleBackToList} />;
  }

  // ── Başhakem (supervisor) veya Masa (desk) ──────────────────────────────
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
