import React from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { Sliders, Shield, Key, Bell } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Sliders className="h-6 w-6 text-rose-500" />
            <span>Authority Console Settings & Security Configuration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational parameters, encryption key identifiers, and dispatch channels
          </p>
        </div>

        <div className="space-y-4">
          {/* User Profile Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-rose-400" /> Authenticated Operator Identity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 uppercase font-semibold block mb-1">Name</span>
                <span className="font-bold text-slate-200">{user?.name}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 uppercase font-semibold block mb-1">Email</span>
                <span className="font-mono text-slate-200">{user?.email}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 uppercase font-semibold block mb-1">Assigned Role</span>
                <span className="font-bold text-rose-400 uppercase">{user?.role}</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Architecture Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" /> Cryptographic Parameters
            </h2>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400">Primary Encryption Cipher:</span>
                <span className="font-mono font-bold text-emerald-400">AES-256-GCM (Authenticated)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400">Steganography Carrier Protocol:</span>
                <span className="font-mono font-bold text-emerald-400">LSB PNG Framing (SHES v1 + CRC32)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400">Active Key Identifier:</span>
                <span className="font-mono font-bold text-slate-200">key-v1</span>
              </div>
            </div>
          </div>

          {/* Telemetry & Gateway Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-400" /> Notification & Dispatch Channels
            </h2>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400">Telegram Bot Gateway:</span>
                <span className="font-semibold text-slate-200">Configured via Backend Environment</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400">Offline Resilience State:</span>
                <span className="font-semibold text-emerald-400">Active (Automatic Replay & Deduplication)</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
