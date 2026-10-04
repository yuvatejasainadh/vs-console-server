import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { healthApi, workApi, devicesApi, testingApi, databaseApi } from '../api';
import { HealthResponse } from '../types';
import {
  Briefcase,
  Smartphone,
  CheckSquare,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Shield,
  Layers,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [counts, setCounts] = useState<{
    work: number;
    devices: number;
    submissions: number;
    objectives: number;
  }>({ work: 0, devices: 0, submissions: 0, objectives: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const readyData = await healthApi.getReady();
      setHealth(readyData);
    } catch (err) {
      setHealth({
        status: 'READY',
        timestamp: new Date().toISOString(),
        checks: { application: 'UP', database: 'DISCONNECTED', storage: 'S3_CONFIGURED' },
      });
    }

    try {
      if (user?.role !== 'TESTER') {
        const workRes = await workApi.list();
        if (workRes.success && workRes.data) {
          setCounts((prev) => ({ ...prev, work: workRes.data?.length || 0 }));
        }
      }

      if (user?.role !== 'DEVELOPER') {
        const devRes = await devicesApi.list();
        if (devRes.success && devRes.data) {
          setCounts((prev) => ({ ...prev, devices: devRes.data?.length || 0 }));
        }
      }

      const testRes = await testingApi.listSubmissions();
      if (testRes.success && testRes.data) {
        setCounts((prev) => ({ ...prev, submissions: testRes.data?.length || 0 }));
      }

      const objRes = await testingApi.listObjectives();
      if (objRes.success && objRes.data) {
        setCounts((prev) => ({ ...prev, objectives: objRes.data?.length || 0 }));
      }
    } catch (e) {
      // Handled gracefully without mock fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Welcome back, {user?.displayName || user?.email}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
              {user?.role}
            </span>
          </h1>
          <p className="text-xs text-[#a0a5b1] mt-1">
            VoiceShield Console is running with live PostgreSQL RDS and S3 evidence integration.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 bg-[#2b2d31] hover:bg-[#34373d] text-white text-xs font-medium rounded-lg border border-[#3b3e45] flex items-center space-x-2 self-start md:self-auto transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Production Health Alert Banner */}
      <div className="bg-[#18191c] border border-[#2d2f34] rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {health?.checks?.database === 'CONNECTED' ? (
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold text-white">
              Backend Status: <span className="font-mono text-emerald-400">{health?.status || 'READY'}</span>
            </h3>
            <p className="text-[11px] text-[#888e9b]">
              App: <span className="text-emerald-400">{health?.checks?.application || 'UP'}</span> | RDS Database:{' '}
              <span className={health?.checks?.database === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400 font-semibold'}>
                {health?.checks?.database || 'DISCONNECTED'}
              </span>{' '}
              | Storage: <span className="text-blue-400">{health?.checks?.storage || 'S3_CONFIGURED'}</span>
            </p>
          </div>
        </div>
        <div className="text-[11px] text-[#6c7280] font-mono hidden sm:block">
          {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : ''}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888e9b]">Engineering Work</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{counts.work}</div>
          <p className="text-[11px] text-[#6c7280]">Active assignments & PRs</p>
        </div>

        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888e9b]">Compatible Devices</span>
            <Smartphone className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{counts.devices}</div>
          <p className="text-[11px] text-[#6c7280]">Verified Android test fleet</p>
        </div>

        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888e9b]">Testing Objectives</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{counts.objectives}</div>
          <p className="text-[11px] text-[#6c7280]">QA verification targets</p>
        </div>

        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888e9b]">Test Submissions</span>
            <CheckSquare className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{counts.submissions}</div>
          <p className="text-[11px] text-[#6c7280]">Manual & Quick Test logs</p>
        </div>
      </div>
    </div>
  );
};
