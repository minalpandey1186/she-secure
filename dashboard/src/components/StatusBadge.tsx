import React from 'react';
import { AlertStatus } from '../types';

interface StatusBadgeProps {
  status: AlertStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'ACKNOWLEDGED':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'RESPONDING':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'DISMISSED':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
      case 'QUEUED':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyles()} ${className}`}
    >
      {status}
    </span>
  );
};
