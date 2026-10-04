import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  FileCode,
  Smartphone,
  CheckSquare,
  Database,
  Download,
  ShieldCheck,
  Users,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    { id: 'dashboard', label: 'Console Overview', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TESTER'] },
    { id: 'work', label: 'Engineering Work', icon: Briefcase, roles: ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER'] },
    { id: 'documentation', label: 'Tech Documentation', icon: FileCode, roles: ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER'] },
    { id: 'devices', label: 'Device Inventory', icon: Smartphone, roles: ['SUPER_ADMIN', 'ADMIN', 'TESTER'] },
    { id: 'testing', label: 'QA & Testing', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TESTER'] },
    { id: 'database', label: 'PostgreSQL RDS', icon: Database, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'exports', label: 'Database Exports', icon: Download, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'audit', label: 'Audit Trail Logs', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'health', label: 'System Health', icon: Activity, roles: ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TESTER'] },
  ];

  const visibleItems = navItems.filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="w-64 bg-[#18191c] border-r border-[#2d2f34] flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="p-3">
        <div className="text-[11px] font-bold text-[#6c7280] uppercase tracking-wider px-3 py-2">
          Platform Operations
        </div>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition text-left ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 font-semibold'
                    : 'text-[#9da5b4] hover:bg-[#222428] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-[#6c7280]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-[#2d2f34] text-[11px] text-[#6c7280]">
        <p className="font-semibold text-[#888e9b]">VoiceShield Engine</p>
        <p>API: <span className="font-mono text-white text-[10px]">v1.0.0</span></p>
        <p className="truncate" title="https://vs-console-server.onrender.com/api/v1">
          Target: Render Prod
        </p>
      </div>
    </aside>
  );
};
