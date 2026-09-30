import React, { useState } from 'react';
import { AlertItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { MapPin, Search, Filter, Eye, CheckCircle, Clock, Send, Share2, MessageSquare } from 'lucide-react';

interface AlertTableProps {
  alerts: AlertItem[];
  onSelectAlert: (alert: AlertItem) => void;
  onAcknowledge?: (alertId: string) => void;
  isOperator?: boolean;
}

export const AlertTable: React.FC<AlertTableProps> = ({
  alerts,
  onSelectAlert,
  onAcknowledge,
  isOperator = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.triggerType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alert.transportProtocol && alert.transportProtocol.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || alert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ID, Device, Protocol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESPONDING">Responding</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Alert ID</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Location Coordinates</th>
              <th className="px-4 py-3">Trigger / Channel</th>
              <th className="px-4 py-3">Delivery Status</th>
              <th className="px-4 py-3">Emergency Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No alerts match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert) => {
                const isDemo = alert.triggerType === 'DEMO';
                const telegramDelivery = alert.deliveries?.find((d) => d.channel === 'TELEGRAM');

                return (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectAlert(alert)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${alert.status === 'ACTIVE' ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                        <span className="truncate max-w-[140px]">{alert.id}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {new Date(alert.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {alert.latitude && alert.longitude ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                          <span>
                            {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (±{alert.accuracy ? alert.accuracy.toFixed(0) : '?'}m)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No GPS fix</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isDemo
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {alert.triggerType}
                        </span>
                        {alert.transportProtocol === 'BLE_MESH_RELAY' && (
                          <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                            <Share2 className="h-3 w-3" /> BLE Mesh
                          </span>
                        )}
                        {alert.transportProtocol === 'SMS_FALLBACK' && (
                          <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> SMS Fallback
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Send className="h-3 w-3 text-blue-400" />
                        <span>TG: {telegramDelivery?.status || 'PENDING'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={alert.status} />
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2" onClick={(e) => e.stopPropagation()}>
                      {isOperator && alert.status === 'ACTIVE' && onAcknowledge && (
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          className="px-2.5 py-1 bg-amber-600/20 text-amber-300 border border-amber-600/40 hover:bg-amber-600/30 rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>Ack</span>
                        </button>
                      )}
                      <button
                        onClick={() => onSelectAlert(alert)}
                        className="px-2.5 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
