import React, { useState } from 'react';
import { AlertItem } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  X,
  MapPin,
  Clock,
  Radio,
  Lock,
  History,
  Send,
  CheckCircle,
  Play,
  CheckCheck,
  Ban,
  Share2,
  MessageSquare,
  Image,
  Globe,
  AlertTriangle
} from 'lucide-react';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
  onAcknowledge: (alertId: string, notes?: string) => Promise<void>;
  onUpdateStatus: (alertId: string, status: string, reason?: string) => Promise<void>;
  isOperator: boolean;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onAcknowledge,
  onUpdateStatus,
  isOperator
}) => {
  if (!alert) return null;

  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const isDemo = alert.triggerType === 'DEMO' || alert.decryptedPayload?.isDemo === true;

  const handleAcknowledge = async () => {
    setActionLoading(true);
    try {
      await onAcknowledge(alert.id, notes || 'Acknowledged via Authority Console');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(true);
    try {
      await onUpdateStatus(alert.id, status, notes || `Status transitioned to ${status}`);
    } finally {
      setActionLoading(false);
    }
  };

  const mapsUrl = alert.latitude && alert.longitude 
    ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
    : null;

  const renderTransportBadge = () => {
    switch (alert.transportProtocol) {
      case 'BLE_MESH_RELAY':
        return (
          <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold text-xs flex items-center gap-1.5">
            <Share2 className="h-3.5 w-3.5" /> BLE Mesh Peer Relay
          </span>
        );
      case 'SMS_FALLBACK':
        return (
          <span className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold text-xs flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Cellular SMS Fallback
          </span>
        );
      case 'STEGO_IMAGE':
        return (
          <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-700/60 font-semibold text-xs flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5" /> LSB Steganography Carrier
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Direct Internet Gateway
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${isDemo ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">Emergency Distress Incident</h2>
                <StatusBadge status={alert.status} />
                {renderTransportBadge()}
                {isDemo && (
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                    DEMO SIMULATION
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">ID: {alert.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs uppercase text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5" /> Incident Timestamp
              </span>
              <p className="text-sm font-medium text-slate-200">
                {new Date(alert.timestamp).toUTCString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Local: {new Date(alert.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs uppercase text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
                <MapPin className="h-3.5 w-3.5" /> Coordinates
              </span>
              {alert.latitude && alert.longitude ? (
                <div>
                  <p className="text-sm font-mono font-bold text-rose-400">
                    {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accuracy: ±{alert.accuracy ? alert.accuracy.toFixed(1) : 'Unknown'} m
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-rose-400 hover:underline font-semibold"
                      >
                        [Open Map ↗]
                      </a>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No GPS fix obtained</p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs uppercase text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
                <Lock className="h-3.5 w-3.5" /> Encryption & Hardware Keystore
              </span>
              <p className="text-sm font-mono text-slate-200 truncate">Device: {alert.deviceId}</p>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <span>AES-256-GCM + HKDF-SHA256</span>
              </p>
              {alert.relayedByDeviceId && (
                <p className="text-[11px] text-indigo-400 mt-1">
                  Relayed by Peer: <strong className="font-mono">{alert.relayedByDeviceId}</strong> ({alert.relayHopCount ?? 1} hops)
                </p>
              )}
            </div>
          </div>

          {/* Decrypted Payload Inspection */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-rose-500" /> Decrypted Emergency Payload
            </h3>
            <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto text-xs font-mono text-slate-300 border border-slate-800">
              <pre>{JSON.stringify(alert.decryptedPayload || alert.rawPayload, null, 2)}</pre>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-blue-400" /> Multi-Channel Delivery Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alert.deliveries?.map((del) => (
                <div key={del.id} className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-200">{del.channel}</span>
                    <p className="text-[11px] text-slate-500">Attempts: {del.attempts}</p>
                    {del.lastError && <p className="text-[11px] text-rose-400">Error: {del.lastError}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${del.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {del.status}
                  </span>
                </div>
              )) || <p className="text-xs text-slate-500">No delivery channel records available.</p>}
            </div>
          </div>

          {/* Operator Action Controls */}
          {isOperator && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
              <h3 className="text-xs uppercase text-rose-300 font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Authority Response & Dispatch Controls
              </h3>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Add dispatch notes or responder unit reference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {alert.status === 'ACTIVE' && (
                    <button
                      disabled={actionLoading}
                      onClick={handleAcknowledge}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Acknowledge Alert
                    </button>
                  )}

                  {alert.status !== 'RESPONDING' && alert.status !== 'RESOLVED' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('RESPONDING')}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5" /> Mark Responding
                    </button>
                  )}

                  {alert.status !== 'RESOLVED' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('RESOLVED')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Mark Resolved
                    </button>
                  )}

                  {alert.status !== 'DISMISSED' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('DISMISSED')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" /> Dismiss / False Alarm
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail Timeline */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-slate-400" /> Incident Audit Log
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alert.auditLogs && alert.auditLogs.length > 0 ? (
                alert.auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-rose-400 font-mono">{log.action}</span>
                      <p className="text-[11px] text-slate-400">
                        By: {log.authorityEmail || 'System'} {log.metadata?.notes ? `— "${log.metadata.notes}"` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No previous audit entries for this incident.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/95 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
