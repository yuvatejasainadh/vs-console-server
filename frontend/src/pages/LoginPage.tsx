import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    status?: number;
    code?: string;
    message?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetails(null);
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      const status = err.response?.status;
      const code = err.response?.data?.error?.code || 'AUTH_ERROR';
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify credentials.';
      setErrorDetails({ status, code, message });
    } finally {
      setLoading(false);
    }
  };

  const setCredentials = (eMail: string, pass: string) => {
    setEmail(eMail);
    setPassword(pass);
    setErrorDetails(null);
  };

  return (
    <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Console Logo */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">VoiceShield Console</h1>
          <p className="text-xs text-[#888e9b]">Production Engineering & Operations Management</p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#1e1f22] border border-[#2d2f34] rounded-xl shadow-2xl p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Sign In to Console</h2>
          <p className="text-xs text-[#a0a5b1] mt-1">
            Connected to API Endpoint:{' '}
            <span className="font-mono text-blue-400 break-all">{API_BASE_URL}/auth/login</span>
          </p>
        </div>

        {/* Detailed Error Banner */}
        {errorDetails && (
          <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-start space-x-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center space-x-2">
                <span>{errorDetails.code}</span>
                {errorDetails.status && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 text-[10px]">
                    HTTP {errorDetails.status}
                  </span>
                )}
              </div>
              <p className="text-rose-200/90">{errorDetails.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#c0c5d0] mb-1.5">
              Internal Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6c7280] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sainadh@voiceshield.internal"
                className="w-full pl-9 pr-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-xs text-white placeholder-[#555a64] focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#c0c5d0] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6c7280] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-xs text-white placeholder-[#555a64] focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="animate-spin mr-2">⟳</span>
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{loading ? 'Authenticating with Backend...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Seed Credentials for Testing */}
        <div className="mt-8 pt-6 border-t border-[#2d2f34]">
          <p className="text-[11px] font-semibold text-[#888e9b] uppercase tracking-wider mb-2.5">
            Test Accounts (Pre-Seeded)
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setCredentials('sainadh@voiceshield.internal', 'SuperAdmin123!')}
              className="p-2 bg-[#141518] hover:bg-[#252830] border border-[#2d2f34] rounded text-left transition"
            >
              <span className="font-semibold text-blue-400 block">Super Admin</span>
              <span className="text-[#6c7280] text-[10px]">sainadh@...</span>
            </button>
            <button
              type="button"
              onClick={() => setCredentials('admin@voiceshield.internal', 'AdminPass123!')}
              className="p-2 bg-[#141518] hover:bg-[#252830] border border-[#2d2f34] rounded text-left transition"
            >
              <span className="font-semibold text-purple-400 block">Admin</span>
              <span className="text-[#6c7280] text-[10px]">admin@...</span>
            </button>
            <button
              type="button"
              onClick={() => setCredentials('dev1@voiceshield.internal', 'DevPass123!')}
              className="p-2 bg-[#141518] hover:bg-[#252830] border border-[#2d2f34] rounded text-left transition"
            >
              <span className="font-semibold text-emerald-400 block">Developer</span>
              <span className="text-[#6c7280] text-[10px]">dev1@...</span>
            </button>
            <button
              type="button"
              onClick={() => setCredentials('tester1@voiceshield.internal', 'TesterPass123!')}
              className="p-2 bg-[#141518] hover:bg-[#252830] border border-[#2d2f34] rounded text-left transition"
            >
              <span className="font-semibold text-amber-400 block">Tester</span>
              <span className="text-[#6c7280] text-[10px]">tester1@...</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-[#555a64]">
        Target Backend: <span className="font-mono text-[#888e9b]">https://vs-console-server.onrender.com</span>
      </div>
    </div>
  );
};
