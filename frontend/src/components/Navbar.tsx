import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { healthApi } from '../api';
import { HealthResponse } from '../types';
import { Shield, Bell, User as UserIcon, LogOut, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await healthApi.getReady();
      setHealth(data);
    } catch (err) {
      setHealth({
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        checks: { application: 'DOWN', database: 'DISCONNECTED', storage: 'UNKNOWN' },
      });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  const getDbStatusColor = () => {
    const dbStatus = health?.checks?.database;
    if (dbStatus === 'CONNECTED') return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
    if (dbStatus === 'DISCONNECTED') return 'text-amber-400 bg-amber-950/60 border-amber-800';
    return 'text-rose-400 bg-rose-950/60 border-rose-800';
  };

  return (
    <header className="h-14 bg-[#1e1f22] border-b border-[#2d2f34] flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Brand & Project Selector */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-white font-medium text-base tracking-tight">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-wider">VOICESHIELD</span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#2b2d31] text-[#9da5b4] font-mono border border-[#3b3e45]">
            CONSOLE
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-xs text-[#a0a5b1] bg-[#121316] px-3 py-1.5 rounded-md border border-[#2d2f34]">
          <span className="text-[#6c7280]">Project:</span>
          <span className="text-white font-medium">voiceshield-prod-ap-south-2</span>
        </div>
      </div>

      {/* Center/Right Status & User Actions */}
      <div className="flex items-center space-x-4">
        {/* Real Backend & Database Health Status */}
        <div
          className={`flex items-center space-x-2 text-xs px-2.5 py-1 rounded-full border ${getDbStatusColor()} transition-colors`}
          title={`Application: ${health?.checks?.application || 'UP'} | DB: ${health?.checks?.database || 'DISCONNECTED'} | Storage: ${health?.checks?.storage || 'S3'}`}
        >
          {health?.checks?.database === 'CONNECTED' ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
          )}
          <span className="font-mono text-[11px]">
            RDS: {health?.checks?.database || 'CHECKING...'}
          </span>
          <button
            onClick={fetchHealth}
            disabled={healthLoading}
            className="hover:opacity-75 focus:outline-none ml-1"
            title="Refresh health status"
          >
            <RefreshCw className={`w-3 h-3 ${healthLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* User Role Badge */}
        {user && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            {user.role}
          </span>
        )}

        {/* Notification Bell */}
        <button className="p-1.5 text-[#a0a5b1] hover:text-white rounded-md hover:bg-[#2b2d31] transition">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Profile Menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-[#2b2d31] transition text-left"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-[#e3e3e3]">
                {user.displayName || user.email}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#1e1f22] border border-[#2d2f34] rounded-lg shadow-2xl py-1 text-xs z-50">
                <div className="px-3 py-2 border-b border-[#2d2f34]">
                  <p className="font-semibold text-white truncate">{user.displayName}</p>
                  <p className="text-[#888e9b] truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950/30 flex items-center space-x-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
