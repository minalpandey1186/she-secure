import React, { useState } from 'react';
import { api } from '../services/api';
import { BellRing, X, Sparkles, MapPin, CheckCircle } from 'lucide-react';

interface DemoTriggerSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertTriggered: () => void;
}

const PRESET_LOCATIONS = [
  { name: 'New Delhi (Central)', lat: 28.6139, lng: 77.2090 },
  { name: 'San Francisco (Market St)', lat: 37.7749, lng: -122.4194 },
  { name: 'London (Trafalgar Sq)', lat: 51.5074, lng: -0.1278 },
  { name: 'New York (Times Sq)', lat: 40.7580, lng: -73.9855 }
];

export const DemoTriggerSimulator: React.FC<DemoTriggerSimulatorProps> = ({
  isOpen,
  onClose,
  onAlertTriggered
}) => {
  if (!isOpen) return null;

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [latitude, setLatitude] = useState(PRESET_LOCATIONS[0].lat);
  const [longitude, setLongitude] = useState(PRESET_LOCATIONS[0].lng);
  const accuracy = 3.5;
  const [notes, setNotes] = useState('Demo: Silent triple-tap trigger from purse');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handlePresetChange = (index: number) => {
    setSelectedPreset(index);
    setLatitude(PRESET_LOCATIONS[index].lat);
    setLongitude(PRESET_LOCATIONS[index].lng);
  };

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      await api.triggerTestDemoAlert({
        latitude,
        longitude,
        accuracy,
        notes
      });

      setSuccessMsg('Simulated Demo SOS alert successfully injected!');
      onAlertTriggered();
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(`Error triggering demo SOS: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Demo Mode SOS Simulator</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400">Safely trigger and demonstrate live covert emergency alert</p>
          </div>
        </div>

        {successMsg ? (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>{successMsg}</span>
          </div>
        ) : (
          <form onSubmit={handleTrigger} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Preset Incident Locations
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_LOCATIONS.map((preset, idx) => (
                  <button
                    type="button"
                    key={preset.name}
                    onClick={() => handlePresetChange(idx)}
                    className={`p-2 rounded-lg text-xs font-medium border text-left flex items-center gap-1.5 transition-all ${
                      selectedPreset === idx
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Simulated Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                placeholder="Discreet trigger simulation note..."
              />
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg text-xs text-amber-300">
              ⚡ <strong>Safe Demo Alert:</strong> Marked with <code className="bg-amber-900/60 px-1 py-0.5 rounded">triggerType = DEMO</code> so live emergency dispatchers know this is a test simulation.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <BellRing className="h-4 w-4" />
                <span>{loading ? 'Transmitting...' : 'Trigger Demo SOS'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
