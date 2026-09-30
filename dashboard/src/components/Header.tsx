import React from 'react';
import { Shield, Radio, ShieldAlert, LogOut, BellRing, History, Sliders } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  unacknowledgedCount?: number;
  onOpenDemoSimulator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ unacknowledgedCount = 0, onOpenDemoSimulator }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { name: 'Command Center', path: '/', icon: Radio },
    { name: 'Active Alerts', path: '/alerts', icon: ShieldAlert },
    { name: 'Audit Trail', path: '/audit', icon: History },
    { name: 'Settings', path: '/settings', icon: Sliders }
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-950/50">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">SheSecure</span>
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-rose-950 border border-rose-800/60 text-rose-300 font-semibold">
                  Authority Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">Covert Emergency Response Network</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-rose-900/30 text-rose-300 border border-rose-800/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {item.name === 'Active Alerts' && unacknowledgedCount > 0 && (
                    <span className="ml-1.5 px-2 py-0.2 text-xs font-bold rounded-full bg-rose-600 text-white animate-pulse">
                      {unacknowledgedCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Controls & Demo Trigger */}
          <div className="flex items-center space-x-3">
            {onOpenDemoSimulator && (
              <button
                onClick={onOpenDemoSimulator}
                className="hidden sm:inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                title="Launch Demo SOS Trigger Simulator"
              >
                <BellRing className="h-3.5 w-3.5" />
                <span>Simulate Demo SOS</span>
              </button>
            )}

            <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-200">{user?.name || 'Operator'}</p>
                <div className="flex items-center justify-end space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs text-rose-400 font-mono font-medium">{user?.role || 'VIEWER'}</span>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
