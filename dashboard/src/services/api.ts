import { AlertItem, DashboardStats, AuthorityUser, AuditLog, AlertStatus } from '../types';

const DEMO_USERS: Record<string, { password: string; user: AuthorityUser }> = {
  'admin@shesecure.org': {
    password: 'AdminPassword123!',
    user: { id: 'demo-admin', email: 'admin@shesecure.org', name: 'Admin User', role: 'ADMIN' }
  },
  'operator@shesecure.org': {
    password: 'OperatorPassword123!',
    user: { id: 'demo-operator', email: 'operator@shesecure.org', name: 'Response Operator', role: 'OPERATOR' }
  },
  'viewer@shesecure.org': {
    password: 'ViewerPassword123!',
    user: { id: 'demo-viewer', email: 'viewer@shesecure.org', name: 'Read-only Viewer', role: 'VIEWER' }
  }
};

const now = new Date();
const DEMO_ALERTS: AlertItem[] = [
  {
    id: 'alert-demo-001', deviceId: 'device-maya-104', timestamp: new Date(now.getTime() - 8 * 60 * 1000).toISOString(),
    latitude: 40.7128, longitude: -74.006, accuracy: 12, triggerType: 'STEALTH_GESTURE', status: 'ACTIVE',
    isEncrypted: true, transportProtocol: 'INTERNET_DIRECT', createdAt: new Date(now.getTime() - 8 * 60 * 1000).toISOString(), updatedAt: now.toISOString(),
    decryptedPayload: { alertId: 'alert-demo-001', deviceId: 'device-maya-104', timestamp: now.toISOString(), triggerType: 'STEALTH_GESTURE', location: { latitude: 40.7128, longitude: -74.006, accuracy: 12 }, batteryLevel: 68, notes: 'Assistance requested', isDemo: true }
  },
  {
    id: 'alert-demo-002', deviceId: 'device-sana-221', timestamp: new Date(now.getTime() - 34 * 60 * 1000).toISOString(),
    latitude: 34.0522, longitude: -118.2437, accuracy: 24, triggerType: 'SILENT_SEQUENCE', status: 'RESPONDING',
    isEncrypted: true, transportProtocol: 'BLE_MESH_RELAY', relayHopCount: 2, createdAt: new Date(now.getTime() - 34 * 60 * 1000).toISOString(), updatedAt: now.toISOString(),
    decryptedPayload: { alertId: 'alert-demo-002', deviceId: 'device-sana-221', timestamp: now.toISOString(), triggerType: 'SILENT_SEQUENCE', location: { latitude: 34.0522, longitude: -118.2437, accuracy: 24 }, batteryLevel: 41, notes: 'Alert relayed through mesh', isDemo: true }
  },
  {
    id: 'alert-demo-003', deviceId: 'demo-browser-simulator', timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    latitude: 51.5074, longitude: -0.1278, accuracy: 18, triggerType: 'DEMO', status: 'ACKNOWLEDGED',
    isEncrypted: false, transportProtocol: 'INTERNET_DIRECT', createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), updatedAt: now.toISOString(),
    decryptedPayload: { alertId: 'alert-demo-003', deviceId: 'demo-browser-simulator', timestamp: now.toISOString(), triggerType: 'DEMO', location: { latitude: 51.5074, longitude: -0.1278, accuracy: 18 }, batteryLevel: 95, notes: 'Demo alert acknowledged', isDemo: true }
  }
];

let alerts = [...DEMO_ALERTS];
const auditLogs: AuditLog[] = [];
const getUser = () => {
  const email = localStorage.getItem('shesecure_demo_user') || 'operator@shesecure.org';
  return DEMO_USERS[email]?.user || DEMO_USERS['operator@shesecure.org'].user;
};

class ApiService {
  public async login(email: string, password: string): Promise<{ user: AuthorityUser; token: string }> {
    const account = DEMO_USERS[email.toLowerCase()];
    if (!account || account.password !== password) throw new Error('Invalid demo credentials. Use one of the Quick Switch roles.');
    const token = `demo-token-${account.user.id}`;
    localStorage.setItem('shesecure_demo_user', account.user.email);
    return { user: account.user, token };
  }

  public async getMe(): Promise<AuthorityUser> {
    const token = localStorage.getItem('shesecure_token');
    if (!token) throw new Error('No active demo session');
    return getUser();
  }

  public async getStats(): Promise<DashboardStats> {
    return {
      active: alerts.filter((a) => a.status === 'ACTIVE').length,
      unacknowledged: alerts.filter((a) => !['ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'DISMISSED'].includes(a.status)).length,
      responding: alerts.filter((a) => a.status === 'RESPONDING').length,
      resolved: alerts.filter((a) => a.status === 'RESOLVED').length,
      total: alerts.length
    };
  }

  public async getAlerts(filter: { status?: string; triggerType?: string; limit?: number; offset?: number } = {}) {
    let result = alerts.filter((alert) => (!filter.status || alert.status === filter.status) && (!filter.triggerType || alert.triggerType === filter.triggerType));
    const offset = filter.offset || 0;
    result = result.slice(offset, offset + (filter.limit || result.length));
    return { alerts: result, total: alerts.length };
  }

  public async getAlertById(alertId: string) {
    const alert = alerts.find((item) => item.id === alertId);
    if (!alert) throw new Error('Alert not found');
    return alert;
  }

  public async acknowledgeAlert(alertId: string, notes?: string) {
    return this.updateAlert(alertId, 'ACKNOWLEDGED', notes);
  }

  public async updateAlertStatus(alertId: string, status: string, reason?: string) {
    return this.updateAlert(alertId, status as AlertStatus, reason);
  }

  private async updateAlert(alertId: string, status: AlertStatus, reason?: string) {
    const index = alerts.findIndex((item) => item.id === alertId);
    if (index < 0) throw new Error('Alert not found');
    alerts[index] = { ...alerts[index], status, updatedAt: new Date().toISOString(), decryptedPayload: { ...alerts[index].decryptedPayload!, notes: reason || alerts[index].decryptedPayload?.notes } };
    auditLogs.unshift({ id: `audit-${Date.now()}`, authorityId: getUser().id, authorityEmail: getUser().email, authorityRole: getUser().role, alertId, action: `STATUS_${status}`, timestamp: new Date().toISOString(), metadata: { reason } });
    return alerts[index];
  }

  public async triggerTestDemoAlert(payload: { latitude: number; longitude: number; accuracy: number; notes: string }) {
    const timestamp = new Date().toISOString();
    const alert: AlertItem = {
      id: `demo-${Date.now()}`, deviceId: 'demo-browser-simulator', timestamp, latitude: payload.latitude, longitude: payload.longitude, accuracy: payload.accuracy,
      triggerType: 'DEMO', status: 'ACTIVE', isEncrypted: false, transportProtocol: 'INTERNET_DIRECT', createdAt: timestamp, updatedAt: timestamp,
      decryptedPayload: { alertId: `demo-${Date.now()}`, deviceId: 'demo-browser-simulator', timestamp, triggerType: 'DEMO', location: { latitude: payload.latitude, longitude: payload.longitude, accuracy: payload.accuracy }, batteryLevel: 95, notes: payload.notes, isDemo: true }
    };
    alerts = [alert, ...alerts];
    return alert;
  }

  public async getAuditLogs(limit = 100, offset = 0) {
    return { logs: auditLogs.slice(offset, offset + limit), total: auditLogs.length };
  }
}

export const api = new ApiService();
