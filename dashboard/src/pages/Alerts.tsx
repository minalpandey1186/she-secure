import React, { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { AlertTable } from '../components/AlertTable';
import { AlertDetailModal } from '../components/AlertDetailModal';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const {
    alerts,
    stats,
    selectedAlert,
    setSelectedAlert,
    refresh,
    acknowledge,
    updateStatus
  } = useAlerts(5000);

  const { isOperator } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Header unacknowledgedCount={stats.unacknowledged} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-rose-500" />
              <span>All Distress Alerts & Incident Records</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive registry of active, acknowledged, and resolved distress calls
            </p>
          </div>

          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Alerts</span>
          </button>
        </div>

        <AlertTable
          alerts={alerts}
          onSelectAlert={(a) => setSelectedAlert(a)}
          onAcknowledge={async (id) => {
            await acknowledge(id, 'Acknowledged from Alerts Table');
          }}
          isOperator={isOperator}
        />
      </main>

      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={acknowledge}
        onUpdateStatus={updateStatus}
        isOperator={isOperator}
      />
    </div>
  );
};
