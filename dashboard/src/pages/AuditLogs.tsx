import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { History, Shield, RefreshCw, UserCheck, ShieldAlert, Eye, CheckCircle, RefreshCcw } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await api.getAuditLogs(100, 0);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return UserCheck;
    if (action.includes('CREATED')) return ShieldAlert;
    if (action.includes('VIEWED')) return Eye;
    if (action.includes('ACKNOWLEDGED')) return CheckCircle;
    return History;
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <History className="h-6 w-6 text-rose-500" />
              <span>Immutable Authority Audit Trail</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographically verified timeline of responder actions, alert accesses, and status changes
            </p>
          </div>

          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Trail</span>
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Showing {logs.length} of {total} total logged security & dispatch events</span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Tamper-Evident Ledger
            </span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Loading audit trail entries...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No audit entries recorded yet.
              </div>
            ) : (
              logs.map((log) => {
                const Icon = getActionIcon(log.action);
                return (
                  <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-rose-400 shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-200">{log.action}</span>
                          {log.authorityRole && (
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-rose-300 border border-slate-700">
                              {log.authorityRole}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Actor: <strong className="text-slate-300">{log.authorityEmail || 'System Service'}</strong>
                          {log.alertId && (
                            <span className="ml-2 font-mono text-slate-500">
                              Target Alert: {log.alertId}
                            </span>
                          )}
                        </p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800">
                            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-500 whitespace-nowrap">
                      <p>{new Date(log.timestamp).toLocaleDateString()}</p>
                      <p className="font-mono text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
