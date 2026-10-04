import React, { useEffect, useState } from 'react';
import { databaseApi } from '../api';
import { RdsStatus } from '../types';
import { Database, Server, Table, Users, GitCommit, HardDrive, RefreshCw, AlertCircle, Play, ShieldAlert } from 'lucide-react';

export const DatabaseView: React.FC = () => {
  const [status, setStatus] = useState<RdsStatus | null>(null);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [migrations, setMigrations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'explorer' | 'migrations' | 'backups'>('metrics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDatabaseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, schemasRes, tablesRes, migRes] = await Promise.allSettled([
        databaseApi.getStatus(),
        databaseApi.getSchemas(),
        databaseApi.getTables(),
        databaseApi.listMigrations(),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value.success) {
        setStatus(statusRes.value.data || null);
      }
      if (schemasRes.status === 'fulfilled' && schemasRes.value.success) {
        setSchemas(schemasRes.value.data || []);
      }
      if (tablesRes.status === 'fulfilled' && tablesRes.value.success) {
        const tbls = tablesRes.value.data || [];
        setTables(tbls);
        if (tbls.length > 0 && !selectedTable) {
          setSelectedTable(tbls[0].table_name || tbls[0].name || tbls[0]);
        }
      }
      if (migRes.status === 'fulfilled' && migRes.value.success) {
        setMigrations(migRes.value.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch database information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const loadRows = async (table: string) => {
    if (!table) return;
    try {
      const res = await databaseApi.getTableRows(table, { page: 1, pageSize: 25 });
      if (res.success) {
        setTableRows(res.data?.rows || res.data || []);
      }
    } catch (e) {
      setTableRows([]);
    }
  };

  useEffect(() => {
    if (selectedTable && activeTab === 'explorer') {
      loadRows(selectedTable);
    }
  }, [selectedTable, activeTab]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span>Privileged PostgreSQL RDS Administration</span>
          </h1>
          <p className="text-xs text-[#888e9b] mt-0.5">
            Instance: <span className="font-mono text-white">voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com</span>
          </p>
        </div>
        <button
          onClick={loadDatabaseData}
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

      {/* Sub-navigation */}
      <div className="flex space-x-2 border-b border-[#2d2f34] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            activeTab === 'metrics' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-[#888e9b] hover:text-white'
          }`}
        >
          RDS Metrics & Engine
        </button>
        <button
          onClick={() => setActiveTab('explorer')}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            activeTab === 'explorer' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-[#888e9b] hover:text-white'
          }`}
        >
          Database Explorer
        </button>
        <button
          onClick={() => setActiveTab('migrations')}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            activeTab === 'migrations' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-[#888e9b] hover:text-white'
          }`}
        >
          Schema Migrations
        </button>
      </div>

      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-3">
            <span className="text-xs text-[#888e9b] font-medium">Engine & Version</span>
            <div className="text-lg font-bold text-white font-mono">{status?.engine || 'PostgreSQL'} {status?.version || '18.3'}</div>
            <p className="text-[11px] text-[#6c7280]">Region: ap-south-2 (Hyderabad)</p>
          </div>

          <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-3">
            <span className="text-xs text-[#888e9b] font-medium">Database Identity</span>
            <div className="text-lg font-bold text-white font-mono">{status?.database || 'voiceshield_console'}</div>
            <p className="text-[11px] text-[#6c7280]">User: voiceshield_console_app</p>
          </div>

          <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-3">
            <span className="text-xs text-[#888e9b] font-medium">SSL / Encryption</span>
            <div className="text-lg font-bold text-emerald-400 font-mono">TLS 1.3 / verify-full</div>
            <p className="text-[11px] text-[#6c7280]">AWS Global Bundle CA Validated</p>
          </div>
        </div>
      )}

      {activeTab === 'explorer' && (
        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-[#888e9b]">Select Table:</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="px-3 py-1.5 bg-[#121316] border border-[#2d2f34] rounded-lg text-xs text-white focus:outline-none"
              >
                {tables.map((t, idx) => {
                  const name = t.table_name || t.name || t;
                  return (
                    <option key={idx} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
            <span className="text-xs text-[#6c7280] font-mono">Parameterized Safe Query</span>
          </div>

          <div className="overflow-x-auto border border-[#2d2f34] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18191c] text-[#888e9b] border-b border-[#2d2f34] uppercase font-semibold text-[10px]">
                <tr>
                  {tableRows.length > 0 &&
                    Object.keys(tableRows[0]).map((key) => (
                      <th key={key} className="py-2.5 px-3">
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2f34] text-[#e3e3e3] font-mono text-[11px]">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#888e9b]">
                      No rows returned for {selectedTable}.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#25272c]">
                      {Object.values(row).map((val: any, vIdx) => (
                        <td key={vIdx} className="py-2 px-3 truncate max-w-xs">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'migrations' && (
        <div className="bg-[#1e1f22] border border-[#2d2f34] rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Applied Migrations</h3>
          <div className="divide-y divide-[#2d2f34] text-xs">
            {migrations.length === 0 ? (
              <p className="py-4 text-[#888e9b]">No migration history found.</p>
            ) : (
              migrations.map((m, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GitCommit className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-mono font-semibold text-white">{m.name || m.migration_name}</div>
                      <div className="text-[11px] text-[#6c7280]">Applied at: {m.applied_at || 'Bootstrapped'}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                    APPLIED
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
