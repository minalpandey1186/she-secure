import { useState, useEffect, useCallback } from 'react';
import { AlertItem, DashboardStats } from '../types';
import { api } from '../services/api';

export function useAlerts(pollIntervalMs = 5000) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    active: 0,
    unacknowledged: 0,
    responding: 0,
    resolved: 0,
    total: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const fetchAlertsAndStats = useCallback(async () => {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        api.getAlerts({ limit: 100 }),
        api.getStats()
      ]);
      setAlerts(alertsRes.alerts);
      setStats(statsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertsAndStats();
    const interval = setInterval(fetchAlertsAndStats, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchAlertsAndStats, pollIntervalMs]);

  const selectAlert = async (alertId: string) => {
    try {
      const fullAlert = await api.getAlertById(alertId);
      setSelectedAlert(fullAlert);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const acknowledge = async (alertId: string, notes?: string) => {
    const updated = await api.acknowledgeAlert(alertId, notes);
    await fetchAlertsAndStats();
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(updated);
    }
  };

  const updateStatus = async (alertId: string, status: string, reason?: string) => {
    const updated = await api.updateAlertStatus(alertId, status, reason);
    await fetchAlertsAndStats();
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(updated);
    }
  };

  return {
    alerts,
    stats,
    loading,
    error,
    selectedAlert,
    setSelectedAlert,
    selectAlert,
    refresh: fetchAlertsAndStats,
    acknowledge,
    updateStatus
  };
}
