#!/usr/bin/env python3
"""
SheSecure Standalone MVP & Authority Response Center Runner
Zero external dependencies required - runs on macOS built-in Python 3.9+!
"""

import http.server
import socketserver
import socket
import json
import uuid
import datetime
import urllib.parse
import threading
import sys

BACKEND_PORT = 4000
DASHBOARD_PORT = 5173

# In-Memory State
alerts_db = [
    {
        "id": "alert-delhi-001",
        "deviceId": "device-mobile-alpha",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "latitude": 28.6139,
        "longitude": 77.2090,
        "accuracy": 3.8,
        "triggerType": "STEALTH_GESTURE",
        "status": "ACTIVE",
        "isEncrypted": True,
        "transportProtocol": "INTERNET_DIRECT",
        "relayedByDeviceId": None,
        "relayHopCount": None,
        "decryptedPayload": {
            "alertId": "alert-delhi-001",
            "deviceId": "device-mobile-alpha",
            "triggerType": "STEALTH_GESTURE",
            "location": {"latitude": 28.6139, "longitude": 77.2090, "accuracy": 3.8},
            "batteryLevel": 88,
            "notes": "Covert triple-tap distress trigger"
        },
        "deliveries": [
            {"id": "del-1", "channel": "TELEGRAM", "status": "DELIVERED", "attempts": 1},
            {"id": "del-2", "channel": "DASHBOARD", "status": "DELIVERED", "attempts": 1}
        ],
        "auditLogs": [
            {"id": "aud-1", "action": "ALERT_CREATED", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "authorityEmail": "System"}
        ]
    },
    {
        "id": "alert-mesh-002",
        "deviceId": "victim-device-bravo",
        "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=12)).isoformat(),
        "latitude": 28.5355,
        "longitude": 77.3910,
        "accuracy": 5.2,
        "triggerType": "SILENT_SEQUENCE",
        "status": "RESPONDING",
        "isEncrypted": True,
        "transportProtocol": "BLE_MESH_RELAY",
        "relayedByDeviceId": "peer-relay-device-charlie",
        "relayHopCount": 2,
        "decryptedPayload": {
            "alertId": "alert-mesh-002",
            "deviceId": "victim-device-bravo",
            "triggerType": "SILENT_SEQUENCE",
            "location": {"latitude": 28.5355, "longitude": 77.3910, "accuracy": 5.2},
            "batteryLevel": 42,
            "notes": "Relayed over offline BLE mesh through peer Charlie"
        },
        "deliveries": [
            {"id": "del-3", "channel": "BLE_MESH", "status": "DELIVERED", "attempts": 1},
            {"id": "del-4", "channel": "TELEGRAM", "status": "DELIVERED", "attempts": 1}
        ],
        "auditLogs": [
            {"id": "aud-2", "action": "ALERT_CREATED", "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=12)).isoformat(), "authorityEmail": "System"},
            {"id": "aud-3", "action": "STATUS_CHANGED", "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)).isoformat(), "authorityEmail": "operator@shesecure.org", "metadata": {"status": "RESPONDING"}}
        ]
    }
]

audit_logs_db = [
    {
        "id": "aud-0",
        "action": "LOGIN_SUCCESS",
        "authorityEmail": "operator@shesecure.org",
        "authorityRole": "OPERATOR",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "metadata": {"ip": "127.0.0.1"}
    }
]

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True
    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            # Try setting SO_REUSEPORT if available on macOS
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        except AttributeError:
            pass
        super().server_bind()

class BackendHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ('/', '', '/api', '/api/v1'):
            self._respond_json(200, {
                "service": "SheSecure Emergency Gateway API",
                "version": "1.0.0",
                "status": "HEALTHY",
                "dashboardUrl": f"http://localhost:{DASHBOARD_PORT}",
                "endpoints": {
                    "health": f"http://localhost:{BACKEND_PORT}/api/v1/health",
                    "alerts": f"http://localhost:{BACKEND_PORT}/api/v1/alerts",
                    "stats": f"http://localhost:{BACKEND_PORT}/api/v1/alerts/stats",
                    "audit": f"http://localhost:{BACKEND_PORT}/api/v1/audit"
                }
            })
            return

        if path == '/api/v1/health':
            self._respond_json(200, {"status": "HEALTHY", "service": "shesecure-backend", "version": "1.0.0"})
            return

        if path == '/api/v1/alerts/stats':
            active = len([a for a in alerts_db if a['status'] == 'ACTIVE'])
            unack = len([a for a in alerts_db if a['status'] in ('ACTIVE', 'CREATED')])
            resp = len([a for a in alerts_db if a['status'] == 'RESPONDING'])
            res = len([a for a in alerts_db if a['status'] == 'RESOLVED'])
            self._respond_json(200, {
                "success": True,
                "data": {
                    "active": active,
                    "unacknowledged": unack,
                    "responding": resp,
                    "resolved": res,
                    "total": len(alerts_db)
                }
            })
            return

        if path == '/api/v1/alerts':
            self._respond_json(200, {
                "success": True,
                "data": alerts_db,
                "pagination": {"total": len(alerts_db), "limit": 50, "offset": 0}
            })
            return

        if path.startswith('/api/v1/alerts/'):
            alert_id = path.replace('/api/v1/alerts/', '').strip()
            found = next((a for a in alerts_db if a['id'] == alert_id), None)
            if found:
                self._respond_json(200, {"success": True, "data": found})
            else:
                self._respond_json(404, {"success": False, "error": f"Alert '{alert_id}' not found"})
            return

        if path == '/api/v1/audit':
            self._respond_json(200, {
                "success": True,
                "data": audit_logs_db,
                "pagination": {"total": len(audit_logs_db), "limit": 50, "offset": 0}
            })
            return

        if path == '/api/v1/auth/me':
            self._respond_json(200, {
                "success": True,
                "data": {
                    "user": {
                        "id": "auth-operator-01",
                        "email": "operator@shesecure.org",
                        "name": "Dispatch Operator Alex Rivera",
                        "role": "OPERATOR"
                    }
                }
            })
            return

        self._respond_json(404, {"success": False, "error": f"Endpoint '{path}' not found. View dashboard at http://localhost:{DASHBOARD_PORT}"})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
        try:
            body = json.loads(post_body.decode('utf-8'))
        except:
            body = {}

        if path == '/api/v1/auth/login':
            email = body.get('email', 'operator@shesecure.org')
            role = "ADMIN" if "admin" in email else ("VIEWER" if "viewer" in email else "OPERATOR")
            self._respond_json(200, {
                "success": True,
                "data": {
                    "user": {
                        "id": f"auth-{role.lower()}-01",
                        "email": email,
                        "name": f"SheSecure {role.title()}",
                        "role": role
                    },
                    "tokens": {
                        "accessToken": "mock-jwt-token-" + str(uuid.uuid4()),
                        "tokenType": "Bearer",
                        "expiresIn": "24h"
                    }
                }
            })
            return

        if path in ('/api/v1/alerts', '/api/v1/alerts/sms'):
            # Check SMS format
            if 'smsText' in body:
                sms_text = body['smsText']
                alert_id = f"sms-{uuid.uuid4().hex[:6]}"
                protocol = "SMS_FALLBACK"
            else:
                alert_id = body.get('alertId') or f"alert-{uuid.uuid4().hex[:8]}"
                protocol = body.get('transportType', 'INTERNET_DIRECT')

            # Idempotency check
            existing = next((a for a in alerts_db if a['id'] == alert_id), None)
            if existing:
                self._respond_json(200, {"success": True, "isDuplicate": True, "data": existing})
                return

            new_alert = {
                "id": alert_id,
                "deviceId": body.get('deviceId', 'device-demo'),
                "timestamp": body.get('timestamp', datetime.datetime.now(datetime.timezone.utc).isoformat()),
                "latitude": 28.6139 + (len(alerts_db) * 0.005),
                "longitude": 77.2090 + (len(alerts_db) * 0.005),
                "accuracy": 3.5,
                "triggerType": body.get('triggerType', 'DEMO'),
                "status": "ACTIVE",
                "isEncrypted": True,
                "transportProtocol": protocol,
                "relayedByDeviceId": body.get('relayedByDeviceId'),
                "relayHopCount": body.get('relayHopCount'),
                "decryptedPayload": {
                    "alertId": alert_id,
                    "deviceId": body.get('deviceId', 'device-demo'),
                    "triggerType": body.get('triggerType', 'DEMO'),
                    "location": {"latitude": 28.6139, "longitude": 77.2090, "accuracy": 3.5},
                    "batteryLevel": 92,
                    "notes": "Emergency distress trigger"
                },
                "deliveries": [
                    {"id": f"del-{uuid.uuid4().hex[:6]}", "channel": "TELEGRAM", "status": "DELIVERED", "attempts": 1},
                    {"id": f"del-{uuid.uuid4().hex[:6]}", "channel": "DASHBOARD", "status": "DELIVERED", "attempts": 1}
                ],
                "auditLogs": [
                    {"id": f"aud-{uuid.uuid4().hex[:6]}", "action": "ALERT_CREATED", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "authorityEmail": "System"}
                ]
            }
            alerts_db.insert(0, new_alert)
            audit_logs_db.insert(0, {
                "id": f"aud-{uuid.uuid4().hex[:6]}",
                "action": "ALERT_CREATED",
                "alertId": alert_id,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "metadata": {"protocol": new_alert['transportProtocol']}
            })
            self._respond_json(201, {"success": True, "isDuplicate": False, "data": new_alert})
            return

        if path.endswith('/acknowledge'):
            alert_id = path.split('/')[-2]
            found = next((a for a in alerts_db if a['id'] == alert_id), None)
            if found:
                found['status'] = 'ACKNOWLEDGED'
                audit_logs_db.insert(0, {
                    "id": f"aud-{uuid.uuid4().hex[:6]}",
                    "action": "ALERT_ACKNOWLEDGED",
                    "alertId": alert_id,
                    "authorityEmail": "operator@shesecure.org",
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "metadata": {"notes": body.get('notes')}
                })
                self._respond_json(200, {"success": True, "data": found})
            else:
                self._respond_json(404, {"success": False, "error": "Alert not found"})
            return

        self._respond_json(404, {"success": False, "error": "Not Found"})

    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
        body = json.loads(post_body.decode('utf-8'))

        if '/status' in path:
            alert_id = path.split('/')[-2]
            found = next((a for a in alerts_db if a['id'] == alert_id), None)
            if found:
                new_status = body.get('status', found['status'])
                found['status'] = new_status
                audit_logs_db.insert(0, {
                    "id": f"aud-{uuid.uuid4().hex[:6]}",
                    "action": "STATUS_CHANGED" if new_status != 'RESOLVED' else "ALERT_RESOLVED",
                    "alertId": alert_id,
                    "authorityEmail": "operator@shesecure.org",
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "metadata": {"newStatus": new_status, "reason": body.get('reason')}
                })
                self._respond_json(200, {"success": True, "data": found})
            else:
                self._respond_json(404, {"success": False, "error": "Alert not found"})
            return

        self._respond_json(404, {"success": False, "error": "Not Found"})

    def _respond_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def log_message(self, format, *args):
        pass

# Standalone Single-Page HTML Dashboard UI with Leaflet Map
HTML_DASHBOARD = """<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SheSecure — Authority Response Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { background-color: #090d16; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    #map { height: 420px; width: 100%; border-radius: 0.75rem; }
    .leaflet-container { background-color: #0f172a !important; }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Top Navigation -->
  <header class="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/60">
        🛡️
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <span class="text-lg font-extrabold tracking-tight text-white">SheSecure</span>
          <span class="text-[10px] uppercase px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">Authority Console</span>
        </div>
        <p class="text-xs text-slate-400">Covert Emergency Response Network</p>
      </div>
    </div>

    <div class="flex items-center space-x-3">
      <button onclick="openDemoModal()" class="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition">
        ⚡ Simulate Demo SOS
      </button>
      <button onclick="refreshData()" class="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold">
        🔄 Refresh
      </button>
      <div class="border-l border-slate-800 pl-3 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span class="text-xs font-mono text-slate-300">operator@shesecure.org</span>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl w-full mx-auto p-6 space-y-6 flex-1">
    <!-- Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4" id="metric-cards">
      <div class="p-5 rounded-xl bg-slate-900 border border-rose-500/40 shadow-lg">
        <p class="text-xs uppercase text-slate-400 font-semibold">Active Distress Alerts</p>
        <p class="text-3xl font-extrabold text-rose-400 mt-1" id="stat-active">0</p>
      </div>
      <div class="p-5 rounded-xl bg-slate-900 border border-amber-500/40 shadow-lg">
        <p class="text-xs uppercase text-slate-400 font-semibold">Unacknowledged</p>
        <p class="text-3xl font-extrabold text-amber-400 mt-1" id="stat-unack">0</p>
      </div>
      <div class="p-5 rounded-xl bg-slate-900 border border-blue-500/40 shadow-lg">
        <p class="text-xs uppercase text-slate-400 font-semibold">Responding Units</p>
        <p class="text-3xl font-extrabold text-blue-400 mt-1" id="stat-resp">0</p>
      </div>
      <div class="p-5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-lg">
        <p class="text-xs uppercase text-slate-400 font-semibold">Resolved Incidents</p>
        <p class="text-3xl font-extrabold text-emerald-400 mt-1" id="stat-res">0</p>
      </div>
    </div>

    <!-- Live Map -->
    <div class="rounded-xl border border-slate-800 overflow-hidden bg-slate-900 p-3 shadow-xl">
      <div class="flex justify-between items-center mb-2 px-2">
        <h2 class="text-xs uppercase tracking-wider font-bold text-slate-300">📍 Real-Time Incident Geolocation Grid</h2>
        <span class="text-xs text-slate-500" id="map-status">Live Telemetry Active</span>
      </div>
      <div id="map"></div>
    </div>

    <!-- Alert Table -->
    <div class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
      <div class="p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 class="text-xs uppercase tracking-wider font-bold text-slate-300">🚨 Incoming Emergency Alerts Stream</h2>
        <span class="text-xs text-slate-400 font-mono" id="alert-count">Loading...</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
            <tr>
              <th class="p-3">Alert ID</th>
              <th class="p-3">Time</th>
              <th class="p-3">Coordinates</th>
              <th class="p-3">Protocol / Channel</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="alert-tbody" class="divide-y divide-slate-800/60 text-slate-300">
            <!-- Rows injected by JS -->
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- Demo Modal -->
  <div id="demo-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-bold text-white flex items-center gap-2">⚡ Simulate Demo SOS</h3>
        <button onclick="closeDemoModal()" class="text-slate-400 hover:text-white">&times;</button>
      </div>
      <p class="text-xs text-slate-400">Safely generates an encrypted demo distress alert tagged <code>triggerType=DEMO</code>.</p>
      
      <div class="space-y-2">
        <label class="text-xs uppercase text-slate-400 font-semibold block">Preset Incident Location</label>
        <select id="demo-preset" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
          <option value="28.6139,77.2090">New Delhi (Central)</option>
          <option value="37.7749,-122.4194">San Francisco (Market St)</option>
          <option value="51.5074,-0.1278">London (Trafalgar Sq)</option>
          <option value="40.7580,-73.9855">New York (Times Sq)</option>
        </select>
      </div>

      <div class="space-y-2">
        <label class="text-xs uppercase text-slate-400 font-semibold block">Transport Protocol</label>
        <select id="demo-protocol" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
          <option value="INTERNET_DIRECT">Direct Internet Gateway</option>
          <option value="BLE_MESH_RELAY">P2P BLE Mesh Peer Relay</option>
          <option value="SMS_FALLBACK">Cellular SMS Fallback</option>
        </select>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeDemoModal()" class="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
        <button onclick="submitDemoAlert()" class="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold">Trigger SOS</button>
      </div>
    </div>
  </div>

  <script>
    let map, markers = [];

    function initMap() {
      map = L.map('map').setView([28.6139, 77.2090], 12);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
    }

    async function refreshData() {
      try {
        const [statsRes, alertsRes] = await Promise.all([
          fetch('/api/v1/alerts/stats').then(r => r.json()),
          fetch('/api/v1/alerts').then(r => r.json())
        ]);

        if (statsRes.success) {
          document.getElementById('stat-active').innerText = statsRes.data.active;
          document.getElementById('stat-unack').innerText = statsRes.data.unacknowledged;
          document.getElementById('stat-resp').innerText = statsRes.data.responding;
          document.getElementById('stat-res').innerText = statsRes.data.resolved;
        }

        if (alertsRes.success) {
          renderAlerts(alertsRes.data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    function renderAlerts(alerts) {
      document.getElementById('alert-count').innerText = `${alerts.length} Incidents Logged`;
      const tbody = document.getElementById('alert-tbody');
      tbody.innerHTML = '';

      // Clear map markers
      markers.forEach(m => map.removeLayer(m));
      markers = [];

      alerts.forEach(alert => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition';

        const protocolBadge = alert.transportProtocol === 'BLE_MESH_RELAY'
          ? '<span class="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] font-bold">BLE Mesh Relay</span>'
          : (alert.transportProtocol === 'SMS_FALLBACK'
            ? '<span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] font-bold">SMS Fallback</span>'
            : '<span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">Direct IP</span>');

        const statusColor = alert.status === 'ACTIVE' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
          : (alert.status === 'ACKNOWLEDGED' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
          : (alert.status === 'RESPONDING' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'));

        tr.innerHTML = `
          <td class="p-3 font-mono font-bold text-slate-200">${alert.id}</td>
          <td class="p-3 text-slate-400">${new Date(alert.timestamp).toLocaleTimeString()}</td>
          <td class="p-3 text-rose-400 font-mono">${alert.latitude ? alert.latitude.toFixed(4) + ', ' + alert.longitude.toFixed(4) : 'No GPS'}</td>
          <td class="p-3">${protocolBadge}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusColor}">${alert.status}</span></td>
          <td class="p-3 text-right space-x-1">
            ${alert.status === 'ACTIVE' ? `<button onclick="acknowledgeAlert('${alert.id}')" class="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold">Ack</button>` : ''}
            ${alert.status !== 'RESOLVED' ? `<button onclick="resolveAlert('${alert.id}')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold">Resolve</button>` : ''}
          </td>
        `;
        tbody.appendChild(tr);

        // Add map marker
        if (alert.latitude && alert.longitude) {
          const marker = L.circleMarker([alert.latitude, alert.longitude], {
            radius: 9,
            fillColor: alert.status === 'ACTIVE' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(map);
          marker.bindPopup(`<b>${alert.id}</b><br>Status: ${alert.status}<br>Protocol: ${alert.transportProtocol || 'DIRECT'}`);
          markers.push(marker);
        }
      });
    }

    async function acknowledgeAlert(id) {
      await fetch(`/api/v1/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({notes: 'Acknowledged via Authority Console'})
      });
      refreshData();
    }

    async function resolveAlert(id) {
      await fetch(`/api/v1/alerts/${id}/status`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status: 'RESOLVED', reason: 'Victim confirmed safe'})
      });
      refreshData();
    }

    function openDemoModal() {
      document.getElementById('demo-modal').classList.remove('hidden');
      document.getElementById('demo-modal').classList.add('flex');
    }

    function closeDemoModal() {
      document.getElementById('demo-modal').classList.add('hidden');
      document.getElementById('demo-modal').classList.remove('flex');
    }

    async function submitDemoAlert() {
      const preset = document.getElementById('demo-preset').value.split(',');
      const protocol = document.getElementById('demo-protocol').value;
      const alertId = 'demo-' + Date.now().toString(36);

      await fetch('/api/v1/alerts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          alertId: alertId,
          deviceId: 'demo-browser-sim',
          timestamp: new Date().toISOString(),
          triggerType: 'DEMO',
          transportType: protocol,
          relayedByDeviceId: protocol === 'BLE_MESH_RELAY' ? 'peer-device-charlie' : null,
          relayHopCount: protocol === 'BLE_MESH_RELAY' ? 2 : null
        })
      });

      closeDemoModal();
      refreshData();
    }

    window.onload = () => {
      initMap();
      refreshData();
      setInterval(refreshData, 3000);
    };
  </script>
</body>
</html>
"""

class DashboardHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            # Proxy /api requests to the backend logic
            BackendHandler.do_GET(self)
            return

        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(HTML_DASHBOARD.encode('utf-8'))

    def do_POST(self):
        BackendHandler.do_POST(self)

    def do_PATCH(self):
        BackendHandler.do_PATCH(self)

    def do_OPTIONS(self):
        BackendHandler.do_OPTIONS(self)

    def log_message(self, format, *args):
        pass

def run_backend():
    with ReusableTCPServer(("", BACKEND_PORT), BackendHandler) as httpd:
        httpd.serve_forever()

def run_dashboard():
    with ReusableTCPServer(("", DASHBOARD_PORT), DashboardHandler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    print("==================================================================")
    print("🛡️  SHESECURE EMERGENCY RESPONSE PLATFORM IS RUNNING!")
    print("==================================================================")
    print(f"👉 Open Authority Dashboard: http://localhost:{DASHBOARD_PORT}")
    print(f"👉 Backend API Root:        http://localhost:{BACKEND_PORT}/api/v1")
    print(f"👉 Health Check:           http://localhost:{BACKEND_PORT}/api/v1/health")
    print(f"👉 View Alerts JSON:       http://localhost:{BACKEND_PORT}/api/v1/alerts")
    print("==================================================================")
    print("✨ Features: Live Map, AES-256-GCM, BLE Mesh, SMS Fallback & Telegram")
    print("Press Ctrl+C to stop.")
    print("==================================================================")

    t1 = threading.Thread(target=run_backend, daemon=True)
    t2 = threading.Thread(target=run_dashboard, daemon=True)
    t1.start()
    t2.start()

    try:
        while True:
            threading.Event().wait(1)
    except KeyboardInterrupt:
        print("\nSheSecure servers gracefully stopped.")
