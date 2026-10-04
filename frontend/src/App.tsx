import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardView } from './pages/DashboardView';
import { WorkView } from './pages/WorkView';
import { DocumentationView } from './pages/DocumentationView';
import { DevicesView } from './pages/DevicesView';
import { TestingView } from './pages/TestingView';
import { DatabaseView } from './pages/DatabaseView';
import { ExportsView } from './pages/ExportsView';
import { AuditView } from './pages/AuditView';
import { UsersView } from './pages/UsersView';
import { HealthView } from './pages/HealthView';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center text-[#888e9b] space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono">Initializing VoiceShield Console Session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#121316] text-[#e3e3e3] flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto bg-[#121316]">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'work' && <WorkView />}
          {activeTab === 'documentation' && <DocumentationView />}
          {activeTab === 'devices' && <DevicesView />}
          {activeTab === 'testing' && <TestingView />}
          {activeTab === 'database' && <DatabaseView />}
          {activeTab === 'exports' && <ExportsView />}
          {activeTab === 'audit' && <AuditView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'health' && <HealthView />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
