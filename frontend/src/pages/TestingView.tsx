import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { testingApi } from '../api';
import { TestingObjective, TestSubmission } from '../types';
import { CheckSquare, Play, Plus, RefreshCw, AlertCircle, FileCheck } from 'lucide-react';

export const TestingView: React.FC = () => {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<TestingObjective[]>([]);
  const [submissions, setSubmissions] = useState<TestSubmission[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'submissions' | 'objectives' | 'quicktest'>('submissions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Submission form state
  const [subForm, setSubForm] = useState({
    scenarioName: '',
    description: '',
    expectedResult: '',
    actualResult: '',
    outcome: 'PASS',
    testerNotes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [objRes, subRes] = await Promise.allSettled([
        testingApi.listObjectives(),
        testingApi.listSubmissions(),
      ]);

      if (objRes.status === 'fulfilled' && objRes.value.success) {
        setObjectives(objRes.value.data || []);
      }
      if (subRes.status === 'fulfilled' && subRes.value.success) {
        setSubmissions(subRes.value.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load test data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await testingApi.createSubmission({
        ...subForm,
        outcome: subForm.outcome as any,
      });
      if (res.success) {
        alert('Test submission recorded successfully!');
        setSubForm({
          scenarioName: '',
          description: '',
          expectedResult: '',
          actualResult: '',
          outcome: 'PASS',
          testerNotes: '',
        });
        loadData();
        setActiveSubTab('submissions');
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record test submission');
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'PASS':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'FAIL':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'BLOCKED':
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
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            <span>QA Testing & Quick Test Operations</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Execute manual test cases, verify call interception models, and submit evidence.
          </p>
        </div>
        <button
          onClick={loadData}
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

      {/* Sub-tabs */}
      <div className="flex space-x-2 border-b border-[#2d2f34] pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('submissions')}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            activeSubTab === 'submissions' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-[#888e9b] hover:text-white'
          }`}
        >
          Test Submissions ({submissions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('objectives')}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            activeSubTab === 'objectives' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-[#888e9b] hover:text-white'
          }`}
        >
          Testing Objectives ({objectives.length})
        </button>
        <button
          onClick={() => setActiveSubTab('quicktest')}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            activeSubTab === 'quicktest' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-[#888e9b] hover:text-white'
          }`}
        >
          Submit Manual Test
        </button>
      </div>

      {activeSubTab === 'submissions' && (
        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#18191c] text-[#888e9b] border-b border-[#2d2f34] uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Scenario</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expected vs Actual</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d2f34] text-[#e3e3e3]">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#888e9b]">
                    No test submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#25272c] transition">
                    <td className="py-3 px-4 font-semibold text-white">{sub.scenario_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getOutcomeBadge(sub.outcome)}`}>
                        {sub.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono text-[#a0a5b1]">{sub.status}</span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#888e9b] max-w-xs truncate">
                      {sub.actual_result || sub.expected_result}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#6c7280]">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'objectives' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {objectives.map((obj) => (
            <div key={obj.id} className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">{obj.title}</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                  {obj.status}
                </span>
              </div>
              <p className="text-xs text-[#888e9b]">{obj.description}</p>
              <div className="text-[11px] text-[#6c7280]">Target Area: <span className="text-white font-mono">{obj.target_area}</span></div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'quicktest' && (
        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-6 max-w-2xl">
          <h2 className="text-base font-bold text-white mb-4">Record New Manual Test Result</h2>
          <form onSubmit={handleCreateSubmission} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#a0a5b1] mb-1">Scenario Name</label>
              <input
                type="text"
                required
                value={subForm.scenarioName}
                onChange={(e) => setSubForm({ ...subForm, scenarioName: e.target.value })}
                placeholder="e.g. Detect synthetic clone with 15dB background noise"
                className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-[#a0a5b1] mb-1">Description / Setup</label>
              <textarea
                rows={2}
                required
                value={subForm.description}
                onChange={(e) => setSubForm({ ...subForm, description: e.target.value })}
                placeholder="Describe testing environment, carrier network, and input waveform..."
                className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#a0a5b1] mb-1">Expected Result</label>
                <input
                  type="text"
                  required
                  value={subForm.expectedResult}
                  onChange={(e) => setSubForm({ ...subForm, expectedResult: e.target.value })}
                  placeholder="e.g. Flagged as SYNTHETIC within 350ms"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-[#a0a5b1] mb-1">Actual Result</label>
                <input
                  type="text"
                  required
                  value={subForm.actualResult}
                  onChange={(e) => setSubForm({ ...subForm, actualResult: e.target.value })}
                  placeholder="e.g. Flagged accurately with 99.2% confidence"
                  className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#a0a5b1] mb-1">Outcome</label>
              <select
                value={subForm.outcome}
                onChange={(e) => setSubForm({ ...subForm, outcome: e.target.value })}
                className="w-full px-3 py-2 bg-[#121316] border border-[#2d2f34] rounded-lg text-white"
              >
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="NOT_TESTED">NOT_TESTED</option>
              </select>
            </div>
            <div className="pt-2">
              <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow">
                Submit Test Results
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
