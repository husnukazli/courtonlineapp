import React, { useState, useEffect } from 'react';
import { TennisDataProvider, useTennisData } from './context/TennisDataContext';
import { MainPortalGate } from './components/Portal/MainPortalGate';
import { Navigation } from './components/Navigation';
import { CourtSupervisorView } from './components/Supervisor/CourtSupervisorView';
import { CourtRefereeView } from './components/CourtReferee/CourtRefereeView';
import { DeskSupervisorView } from './components/DeskSupervisor/DeskSupervisorView';
import { HelpModal } from './components/Common/HelpModal';

const AppContent: React.FC = () => {
  const { authRole, setAuthRole, currentReferee } = useTennisData();
  const [currentTab, setCurrentTab] = useState<'supervisor' | 'desk'>('supervisor');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    if (authRole === 'desk') {
      setCurrentTab('desk');
    } else if (authRole === 'supervisor') {
      setCurrentTab('supervisor');
    }
  }, [authRole]);

  // If not authenticated, render the secure Landing Screen with 2 big selection buttons
  if (authRole === 'none') {
    return <MainPortalGate />;
  }

  const handleTabChange = (tab: 'supervisor' | 'desk') => {
    setCurrentTab(tab);
    setAuthRole(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-lime-400 selection:text-slate-950">
      {/* Navigation Bar with Tab switching, Referee login and Lock / Exit button */}
      <Navigation
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {currentTab === 'supervisor' ? (
          currentReferee ? <CourtRefereeView /> : <CourtSupervisorView />
        ) : (
          <DeskSupervisorView />
        )}
      </main>

      {/* Help / Guide Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Subtle Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-[11px] text-slate-500">
        CourtOnline Tenis Skor & Saha Gözlemcisi Sistemi • Canlı Senkronize & Güvenli Oturum
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <TennisDataProvider>
      <AppContent />
    </TennisDataProvider>
  );
};

export default App;
