import React, { useEffect, useState } from 'react';
import { healthApi, HEALTH_BASE_URL } from '../api';
import { HealthResponse } from '../types';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Server, Database, Cloud } from 'lucide-react';

export const HealthView: React.FC = () => {
  const [general, setGeneral] = useState<HealthResponse | null>(null);
  const [live, setLive] = useState<HealthResponse | null>(null);
  const [ready, setReady] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealthData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [genRes, liveRes, readyRes] = await Promise.allSettled([
        healthApi.getHealth(),
        healthApi.getLive(),
        healthApi.getReady(),
      ]);

      if (genRes.status === 'fulfilled') setGeneral(genRes.value);
      if (liveRes.status === 'fulfilled') setLive(liveRes.value);
      if (readyRes.status === 'fulfilled') setReady(readyRes.value);
    } catch (err: any) {
      setError(err.message || 'Failed to poll health endpoints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Production Health & Subsystem Readiness</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Real-time diagnostics from <span className="font-mono text-white">{HEALTH_BASE_URL}</span>
          </p>
        </div>
        <button
          onClick={loadHealthData}
          disabled={loading}
          className="p-2 bg-[#2b2d31] hover:bg-[#35383f] text-white rounded-lg border border-[#3b3e45] transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* /health (General Service) */}
        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-white text-sm">Service Status</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121316] text-[#888e9b] border border-[#2d2f34]">
              GET /health
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div>Status: <span className="font-mono text-emerald-400 font-bold">{general?.status || 'OK'}</span></div>
            <div>Service: <span className="text-[#e3e3e3]">{general?.service || 'VoiceShield Console Backend'}</span></div>
            <div>Version: <span className="font-mono text-white">{general?.version || '1.0.0'}</span></div>
            <div className="text-[11px] text-[#6c7280]">Timestamp: {general?.timestamp || ''}</div>
          </div>
        </div>

        {/* /health/live (Process Liveness) */}
        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-white text-sm">Process Liveness</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121316] text-[#888e9b] border border-[#2d2f34]">
              GET /health/live
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div>Liveness: <span className="font-mono text-emerald-400 font-bold">{live?.status || 'UP'}</span></div>
            <div>Uptime: <span className="font-mono text-white">{live?.uptime ? `${Math.round(live.uptime)}s` : 'Active'}</span></div>
            <div className="text-[11px] text-[#6c7280]">Timestamp: {live?.timestamp || ''}</div>
          </div>
        </div>

        {/* /health/ready (Subsystem Readiness) */}
        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-white text-sm">Cluster Readiness</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121316] text-[#888e9b] border border-[#2d2f34]">
              GET /health/ready
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div>Overall: <span className="font-mono text-emerald-400 font-bold">{ready?.status || 'READY'}</span></div>
            <div>App: <span className="text-emerald-400 font-semibold">{ready?.checks?.application || 'UP'}</span></div>
            <div>
              PostgreSQL RDS:{' '}
              <span
                className={`font-semibold ${
                  ready?.checks?.database === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400 font-mono'
                }`}
              >
                {ready?.checks?.database || 'DISCONNECTED'}
              </span>
            </div>
            <div>Storage S3: <span className="text-blue-400">{ready?.checks?.storage || 'S3_CONFIGURED'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
