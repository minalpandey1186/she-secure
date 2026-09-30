import React, { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { MetricCards } from '../components/MetricCards';
import { AlertMap } from '../components/AlertMap';
import { AlertTable } from '../components/AlertTable';
import { AlertDetailModal } from '../components/AlertDetailModal';
import { DemoTriggerSimulator } from '../components/DemoTriggerSimulator';
import { RefreshCw, Radio, ShieldAlert } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    alerts,
    stats,
    selectedAlert,
    setSelectedAlert,
    refresh,
    acknowledge,
    updateStatus
  } = useAlerts(4000); // Poll every 4 seconds

  const { isOperator } = useAuth();
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Header
        unacknowledgedCount={stats.unacknowledged}
        onOpenDemoSimulator={() => setIsDemoOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Overview Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Emergency Command Operations</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-ping" /> Live Telemetry
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Encrypted distress feeds, geolocation tracking, and rapid response dispatches
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsDemoOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/50"
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Simulate SOS</span>
            </button>
          </div>
        </div>

        {/* 1. Emergency Metrics Cards */}
        <MetricCards stats={stats} />

        {/* 2. Interactive Map Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              Live Emergency Geolocation Grid
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {alerts.filter(a => a.latitude && a.longitude).length} Incidents Mapped
            </span>
          </div>

          <AlertMap
            alerts={alerts}
            selectedAlert={selectedAlert}
            onSelectAlert={(a) => setSelectedAlert(a)}
          />
        </div>

        {/* 3. Emergency Incident Stream */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Recent Emergency Distress Alerts
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {alerts.length} Total Alerts Ingested
            </span>
          </div>

          <AlertTable
            alerts={alerts}
            onSelectAlert={(a) => setSelectedAlert(a)}
            onAcknowledge={async (id) => {
              await acknowledge(id, 'Rapid acknowledgment from Command Center Table');
            }}
            isOperator={isOperator}
          />
        </div>
      </main>

      {/* Detail Inspection Modal */}
      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={acknowledge}
        onUpdateStatus={updateStatus}
        isOperator={isOperator}
      />

      {/* Demo SOS Simulator Modal */}
      <DemoTriggerSimulator
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onAlertTriggered={refresh}
      />
    </div>
  );
};
