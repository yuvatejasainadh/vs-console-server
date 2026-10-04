import React, { useEffect, useState } from 'react';
import { auditApi } from '../api';
import { AuditLog } from '../types';
import { ShieldCheck, RefreshCw, AlertCircle, Eye } from 'lucide-react';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.list({ page: 1, pageSize: 50 });
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load audit trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span>Immutable System Audit Trail</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Append-only security log recording all administrative, state, and authentication operations.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="p-2 bg-[#2b2d31] hover:bg-[#35383f] text-white rounded-lg border border-[#3b3e45] transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#18191c] text-[#888e9b] border-b border-[#2d2f34] uppercase font-semibold text-[10px]">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Actor ID</th>
              <th className="py-3 px-4">Entity Type</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2f34] text-[#e3e3e3] font-mono text-[11px]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                  Loading audit records...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                  No audit trail records found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#25272c] transition">
                  <td className="py-3 px-4 text-[#888e9b]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-blue-300">{log.action}</td>
                  <td className="py-3 px-4 text-[#a0a5b1]">{log.actor_id ? log.actor_id.substring(0, 8) + '...' : 'System'}</td>
                  <td className="py-3 px-4 text-emerald-400">{log.entity_type}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2 py-1 bg-[#2b2d31] hover:bg-[#383b42] text-white rounded text-[10px]"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-white">Audit Event Details</h2>
            <div className="space-y-2">
              <div>Action: <span className="font-mono text-blue-400 font-semibold">{selectedLog.action}</span></div>
              <div>Actor: <span className="font-mono text-white">{selectedLog.actor_id}</span></div>
              <div>Entity: <span className="font-mono text-white">{selectedLog.entity_type} ({selectedLog.entity_id || 'N/A'})</span></div>
              <div>Date: <span className="text-[#888e9b]">{new Date(selectedLog.created_at).toISOString()}</span></div>
              <div>
                <label className="block text-[#a0a5b1] mb-1 font-semibold">Event Payload / Diff:</label>
                <pre className="p-3 bg-[#121316] border border-[#2d2f34] rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-[#2b2d31] hover:bg-[#35383f] text-white font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
