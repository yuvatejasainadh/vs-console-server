import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { devicesApi } from '../api';
import { Device } from '../types';
import { Smartphone, Plus, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export const DevicesView: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    deviceName: '',
    modelNumber: '',
    manufacturer: '',
    androidVersion: '14.0',
    notes: '',
  });

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await devicesApi.list();
      if (res.success && res.data) {
        setDevices(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load device list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await devicesApi.create(formData);
      if (res.success) {
        setShowModal(false);
        setFormData({ deviceName: '', modelNumber: '', manufacturer: '', androidVersion: '14.0', notes: '' });
        loadDevices();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to register device');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await devicesApi.deactivate(id);
      loadDevices();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to deactivate device');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-purple-400" />
            <span>Compatible Android Device Fleet</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Hardware compatibility inventory for VoiceShield call interception testing.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDevices}
            disabled={loading}
            className="p-2 bg-[#2b2d31] hover:bg-[#35383f] text-white rounded-lg border border-[#3b3e45] transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register Device</span>
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

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-[#888e9b]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
            Loading compatible devices from backend...
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-[#888e9b]">
            No devices currently registered.
          </div>
        ) : (
          devices.map((device) => (
            <div key={device.id} className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm">{device.device_name}</h3>
                  <p className="text-xs text-[#888e9b]">{device.manufacturer} • {device.model_number}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    device.status === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {device.status}
                </span>
              </div>
              <div className="text-xs text-[#a0a5b1] space-y-1">
                <div>Android OS: <span className="font-mono text-white">{device.android_version}</span></div>
                <div className="text-[11px] text-[#6c7280]">ID: <span className="font-mono">{device.id}</span></div>
              </div>
              {canManage && device.status === 'ACTIVE' && (
                <div className="pt-2 border-t border-[#2d2f34] flex justify-end">
                  <button
                    onClick={() => handleDeactivate(device.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 transition"
                  >
                    Deactivate
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Register Compatible Android Device</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#a0a5b1] mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  value={formData.deviceName}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  placeholder="e.g. Pixel 8 Pro"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-[#a0a5b1] mb-1">Model Number</label>
                <input
                  type="text"
                  required
                  value={formData.modelNumber}
                  onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                  placeholder="e.g. GC3VE"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-[#a0a5b1] mb-1">Manufacturer</label>
                <input
                  type="text"
                  required
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g. Google"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-[#a0a5b1] mb-1">Android Version</label>
                <input
                  type="text"
                  required
                  value={formData.androidVersion}
                  onChange={(e) => setFormData({ ...formData, androidVersion: e.target.value })}
                  placeholder="e.g. 14.0"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#2b2d31] text-white rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg">
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
