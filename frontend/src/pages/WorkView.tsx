import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { workApi } from '../api';
import { WorkItem } from '../types';
import { Briefcase, Plus, Play, CheckCircle, FileText, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';

export const WorkView: React.FC = () => {
  const { user } = useAuth();
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  });

  const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const loadWork = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await workApi.list();
      if (response.success && response.data) {
        setWorkItems(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load work items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWork();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await workApi.create(formData);
      if (res.success) {
        setShowCreateModal(false);
        setFormData({ title: '', description: '', priority: 'HIGH' });
        loadWork();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error creating work item');
    }
  };

  const handleAction = async (action: 'accept' | 'start' | 'complete', id: string) => {
    try {
      if (action === 'accept') await workApi.accept(id);
      if (action === 'start') await workApi.start(id);
      if (action === 'complete') await workApi.complete(id);
      loadWork();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || `Failed to perform ${action}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'ACCEPTED':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      case 'IN_PROGRESS':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'DOCUMENTATION_SUBMITTED':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'APPROVED':
      case 'COMPLETED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            <span>Engineering Work Management</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Track engineering tickets, documentation deliverables, and state machine transitions.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadWork}
            disabled={loading}
            className="p-2 bg-[#2b2d31] hover:bg-[#35383f] text-white rounded-lg border border-[#3b3e45] transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Work Item</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Work Items Table */}
      <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#18191c] text-[#888e9b] border-b border-[#2d2f34] uppercase font-semibold text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Title & Description</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Assigned To</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2f34] text-[#e3e3e3]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                  Loading work items from production backend...
                </td>
              </tr>
            ) : workItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                  No engineering work items found in database.
                </td>
              </tr>
            ) : (
              workItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#25272c] transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-[11px] text-[#888e9b] line-clamp-1">{item.description}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] font-semibold text-[#c0c5d0]">{item.priority}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#888e9b]">
                    {item.assigned_to ? item.assigned_to.substring(0, 8) + '...' : 'Unassigned'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {item.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleAction('accept', item.id)}
                        className="px-2 py-1 bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded text-[11px]"
                      >
                        Accept
                      </button>
                    )}
                    {item.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleAction('start', item.id)}
                        className="px-2 py-1 bg-amber-900/50 hover:bg-amber-800 text-amber-200 border border-amber-700 rounded text-[11px]"
                      >
                        Start
                      </button>
                    )}
                    {item.status === 'APPROVED' && (
                      <button
                        onClick={() => handleAction('complete', item.id)}
                        className="px-2 py-1 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 rounded text-[11px]"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Create New Work Item</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a0a5b1] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Implement real-time audio pipeline TLS"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#a0a5b1] mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide technical scope and acceptance criteria..."
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#a0a5b1] mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e: any) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#2b2d31] hover:bg-[#35383f] text-white text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
