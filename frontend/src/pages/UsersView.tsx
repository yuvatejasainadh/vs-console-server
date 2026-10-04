import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api';
import { User, UserRole } from '../types';
import { Users, Plus, RefreshCw, AlertCircle, Shield, UserX } from 'lucide-react';

export const UsersView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'DEVELOPER' as UserRole,
  });

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.list();
      if (res.success && res.data) {
        setUsersList(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await usersApi.create(formData);
      if (res.success) {
        setShowModal(false);
        setFormData({ email: '', password: '', displayName: '', role: 'DEVELOPER' });
        loadUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'User creation failed');
    }
  };

  const handleDisable = async (id: string) => {
    if (!window.confirm('Are you sure you want to disable this user and revoke all active sessions?')) return;
    try {
      await usersApi.disable(id);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to disable user');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'ADMIN':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'DEVELOPER':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'TESTER':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Internal User Management</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Role-based account provisioning, access tier configuration, and credential security.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadUsers}
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
            <span>Create User Account</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#18191c] text-[#888e9b] border-b border-[#2d2f34] uppercase font-semibold text-[10px]">
            <tr>
              <th className="py-3 px-4">Display Name & Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">User ID</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2f34] text-[#e3e3e3]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                  Loading users...
                </td>
              </tr>
            ) : usersList.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                  No user accounts found.
                </td>
              </tr>
            ) : (
              usersList.map((u) => (
                <tr key={u.id} className="hover:bg-[#25272c] transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{u.displayName}</div>
                    <div className="text-[11px] text-[#888e9b]">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#6c7280]">
                    {u.id}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.status === 'ACTIVE' && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDisable(u.id)}
                        className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[10px]"
                      >
                        Disable
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-white">Create New User Account</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[#a0a5b1] mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-[#a0a5b1] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. jane@voiceshield.internal"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-[#a0a5b1] mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-[#a0a5b1] mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e: any) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                >
                  {currentUser?.role === 'SUPER_ADMIN' && <option value="ADMIN">ADMIN</option>}
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="TESTER">TESTER</option>
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
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
