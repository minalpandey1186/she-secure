import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AlertItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { MapPin, Navigation, Battery, ShieldAlert } from 'lucide-react';

interface AlertMapProps {
  alerts: AlertItem[];
  selectedAlert: AlertItem | null;
  onSelectAlert: (alert: AlertItem) => void;
}

// Custom icon creator
const createAlertIcon = (status: string, isDemo: boolean) => {
  let color = '#ef4444'; // Red
  if (isDemo) color = '#f59e0b'; // Amber
  else if (status === 'ACKNOWLEDGED') color = '#f59e0b';
  else if (status === 'RESPONDING') color = '#3b82f6';
  else if (status === 'RESOLVED') color = '#10b981';

  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid #0f172a;
        box-shadow: 0 0 12px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const AlertMap: React.FC<AlertMapProps> = ({ alerts, selectedAlert, onSelectAlert }) => {
  // Find alerts with valid coordinates
  const mappedAlerts = alerts.filter(
    (a) => a.latitude !== null && a.longitude !== null && !isNaN(Number(a.latitude)) && !isNaN(Number(a.longitude))
  );

  // Center coordinate logic
  const defaultCenter: [number, number] = [28.6139, 77.2090]; // Default fallback
  const mapCenter: [number, number] = selectedAlert?.latitude && selectedAlert?.longitude
    ? [Number(selectedAlert.latitude), Number(selectedAlert.longitude)]
    : mappedAlerts.length > 0
    ? [Number(mappedAlerts[0].latitude), Number(mappedAlerts[0].longitude)]
    : defaultCenter;

  return (
    <div className="relative h-[480px] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapViewUpdater center={mapCenter} zoom={selectedAlert ? 15 : 12} />

        {mappedAlerts.map((alert) => {
          const lat = Number(alert.latitude);
          const lng = Number(alert.longitude);
          const isDemo = alert.triggerType === 'DEMO' || alert.decryptedPayload?.isDemo === true;
          const accuracy = Number(alert.accuracy) || 20;

          return (
            <React.Fragment key={alert.id}>
              {/* Accuracy circle */}
              <Circle
                center={[lat, lng]}
                radius={accuracy}
                pathOptions={{
                  color: isDemo ? '#f59e0b' : '#ef4444',
                  fillColor: isDemo ? '#f59e0b' : '#ef4444',
                  fillOpacity: 0.15,
                  weight: 1
                }}
              />

              <Marker
                position={[lat, lng]}
                icon={createAlertIcon(alert.status, isDemo)}
                eventHandlers={{
                  click: () => onSelectAlert(alert)
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 text-slate-900 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-rose-600 flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {isDemo ? 'DEMO ALERT' : alert.triggerType}
                      </span>
                      <StatusBadge status={alert.status} />
                    </div>

                    <p className="text-xs font-mono font-bold text-slate-800 mb-1">{alert.id}</p>
                    <p className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {lat.toFixed(5)}, {lng.toFixed(5)} (±{accuracy.toFixed(0)}m)
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      <button
                        onClick={() => onSelectAlert(alert)}
                        className="px-2 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-800 text-xs shadow-lg space-y-1.5 pointer-events-auto">
        <p className="font-bold text-slate-300 mb-1">Emergency Map Status</p>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
          <span className="text-slate-300">Active Distress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-300">Acknowledged / Demo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-300">Responding Units</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-300">Resolved</span>
        </div>
      </div>
    </div>
  );
};
