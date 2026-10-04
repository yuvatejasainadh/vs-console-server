import React, { useEffect, useState } from 'react';
import { exportsApi } from '../api';
import { Download, Plus, RefreshCw, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const ExportsView: React.FC = () => {
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [format, setFormat] = useState<'SQL' | 'CSV' | 'JSON'>('SQL');

  const loadExports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await exportsApi.list();
      if (res.success && res.data) {
        setExportsList(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load database exports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExports();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await exportsApi.create({
        format,
        tables: ['users', 'devices', 'work_items', 'testing_objectives', 'test_submissions'],
        includeSchema: true,
      });
      if (res.success) {
        setShowModal(false);
        loadExports();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Export creation failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <span>Database Data Exports</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Generate and securely download point-in-time PostgreSQL database exports.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadExports}
            disabled={loading}
            className="p-2 bg-[#2b2d31] hover:bg-[#35383f] text-white rounded-lg border border-[#3b3e45] transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Exports Table */}
      <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#18191c] text-[#888e9b] border-b border-[#2d2f34] uppercase font-semibold text-[10px]">
            <tr>
              <th className="py-3 px-4">Export ID</th>
              <th className="py-3 px-4">Format</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created At</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2f34] text-[#e3e3e3]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                  Loading exports...
                </td>
              </tr>
            ) : exportsList.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                  No database exports generated yet.
                </td>
              </tr>
            ) : (
              exportsList.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#25272c]">
                  <td className="py-3 px-4 font-mono text-[11px] text-white">{exp.id}</td>
                  <td className="py-3 px-4 font-bold text-blue-400">{exp.format}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                      {exp.status || 'COMPLETED'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#888e9b] text-[11px]">
                    {new Date(exp.created_at || Date.now()).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={exportsApi.getDownloadUrl(exp.id)}
                      className="px-2.5 py-1 bg-[#2b2d31] hover:bg-[#383b42] text-white rounded text-[11px] font-medium transition inline-flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl max-w-sm w-full p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-white">Generate Database Export</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[#a0a5b1] mb-1 font-medium">Export File Format</label>
                <select
                  value={format}
                  onChange={(e: any) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                >
                  <option value="SQL">SQL Dump (.sql)</option>
                  <option value="CSV">CSV Archive (.csv)</option>
                  <option value="JSON">JSON Document (.json)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#2b2d31] text-white rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg">
                  Start Export
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
