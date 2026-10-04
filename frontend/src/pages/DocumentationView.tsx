import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { documentationApi } from '../api';
import { FileCode, Save, Send, CheckCircle2, History, AlertCircle } from 'lucide-react';

export const DocumentationView: React.FC = () => {
  const { user } = useAuth();
  const [docId, setDocId] = useState('');
  const [docData, setDocData] = useState({
    what_i_did: '',
    why_i_did_it: '',
    changes_made: '',
    problems_encountered: '',
    solution: '',
    testing_performed: '',
    result: '',
    next_steps: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFetch = async () => {
    if (!docId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await documentationApi.getById(docId);
      if (res.success && res.data) {
        setDocData({
          what_i_did: res.data.what_i_did || '',
          why_i_did_it: res.data.why_i_did_it || '',
          changes_made: res.data.changes_made || '',
          problems_encountered: res.data.problems_encountered || '',
          solution: res.data.solution || '',
          testing_performed: res.data.testing_performed || '',
          result: res.data.result || '',
          next_steps: res.data.next_steps || '',
        });
        setMessage({ type: 'success', text: 'Loaded documentation snapshot successfully.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to fetch documentation.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await documentationApi.update(docId, docData as any);
      if (res.success) {
        setMessage({ type: 'success', text: 'Documentation draft updated successfully.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to save documentation.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await documentationApi.submit(docId);
      if (res.success) {
        setMessage({ type: 'success', text: 'Documentation submitted for Admin review!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Submission failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <span>Developer Technical Documentation Editor</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Structured architectural logs, implementation rationale, and PR reviews.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Lookup Bar */}
      <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-4 flex items-center space-x-3 text-xs">
        <span className="text-[#888e9b] shrink-0 font-medium">Document ID (UUID):</span>
        <input
          type="text"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
          placeholder="e.g. 8f12a3bc-1b2c-4d5e-9f0a-1234567890ab"
          className="flex-1 px-3 py-1.5 bg-[#121316] border border-[#2d2f34] rounded-lg text-white font-mono"
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={!docId || loading}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg"
        >
          Load Document
        </button>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSave} className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-6 space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#a0a5b1] font-medium mb-1">What I Did</label>
            <textarea
              rows={3}
              value={docData.what_i_did}
              onChange={(e) => setDocData({ ...docData, what_i_did: e.target.value })}
              placeholder="Describe tasks completed..."
              className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-[#a0a5b1] font-medium mb-1">Why I Did It (Design Rationale)</label>
            <textarea
              rows={3}
              value={docData.why_i_did_it}
              onChange={(e) => setDocData({ ...docData, why_i_did_it: e.target.value })}
              placeholder="Architectural motivation..."
              className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[#a0a5b1] font-medium mb-1">Changes Made</label>
          <textarea
            rows={3}
            value={docData.changes_made}
            onChange={(e) => setDocData({ ...docData, changes_made: e.target.value })}
            placeholder="Key functions, SQL schema changes, API handlers..."
            className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white font-mono text-[11px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#a0a5b1] font-medium mb-1">Problems Encountered</label>
            <textarea
              rows={2}
              value={docData.problems_encountered}
              onChange={(e) => setDocData({ ...docData, problems_encountered: e.target.value })}
              className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-[#a0a5b1] font-medium mb-1">Solution Applied</label>
            <textarea
              rows={2}
              value={docData.solution}
              onChange={(e) => setDocData({ ...docData, solution: e.target.value })}
              className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#2d2f34]">
          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={!docId || loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit for Admin Review</span>
          </button>
          <button
            type="submit"
            disabled={!docId || loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
