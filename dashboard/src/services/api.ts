import { AlertItem, DashboardStats, AuthorityUser, AuditLog } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('shesecure_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  public async login(email: string, password: string): Promise<{ user: AuthorityUser; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }
    return { user: data.data.user, token: data.data.tokens.accessToken };
  }

  public async getMe(): Promise<AuthorityUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch session');
    }
    return data.data.user;
  }

  public async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/alerts/stats`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch metrics');
    }
    return data.data;
  }

  public async getAlerts(filter: { status?: string; triggerType?: string; limit?: number; offset?: number } = {}): Promise<{ alerts: AlertItem[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.triggerType) params.append('triggerType', filter.triggerType);
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.offset) params.append('offset', String(filter.offset));

    const res = await fetch(`${API_BASE}/alerts?${params.toString()}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch alerts');
    }
    return { alerts: data.data, total: data.pagination?.total ?? data.data.length };
  }

  public async getAlertById(alertId: string): Promise<AlertItem> {
    const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch alert details');
    }
    return data.data;
  }

  public async acknowledgeAlert(alertId: string, notes?: string): Promise<AlertItem> {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to acknowledge alert');
    }
    return data.data;
  }

  public async updateAlertStatus(alertId: string, status: string, reason?: string): Promise<AlertItem> {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, reason })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update alert status');
    }
    return data.data;
  }

  public async triggerTestDemoAlert(payload: { latitude: number; longitude: number; accuracy: number; notes: string }): Promise<AlertItem> {
    // Generate AES-256 encrypted payload structure
    const alertId = `demo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();
    
    // In demo trigger, construct envelope for backend decryption
    const rawPayload = {
      alertId,
      deviceId: 'demo-browser-simulator',
      timestamp,
      triggerType: 'DEMO',
      location: {
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        capturedAt: timestamp
      },
      batteryLevel: 95,
      isDemo: true,
      notes: payload.notes || 'Simulated distress alert from Dashboard Demo Console'
    };

    // Client-side simulation of envelope format using standard base64/dummy key for demo API
    // Or call standard backend JSON alert submission endpoint
    const res = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId,
        deviceId: 'demo-browser-simulator',
        timestamp,
        triggerType: 'DEMO',
        encryptedPayload: {
          version: 1,
          keyId: 'key-v1',
          // Base64 demo payload
          nonce: btoa('123456789012'),
          ciphertext: btoa(JSON.stringify(rawPayload)),
          tag: btoa('1234567890123456')
        }
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to trigger test alert');
    }
    return data.data;
  }

  public async getAuditLogs(limit = 100, offset = 0): Promise<{ logs: AuditLog[]; total: number }> {
    const res = await fetch(`${API_BASE}/audit?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch audit trail');
    }
    return { logs: data.data, total: data.pagination?.total ?? data.data.length };
  }
}

export const api = new ApiService();
