import React from 'react';
import { ShieldAlert, AlertCircle, RadioTower, CheckCircle2 } from 'lucide-react';
import { DashboardStats } from '../types';

interface MetricCardsProps {
  stats: DashboardStats;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Active Alerts',
      value: stats.active,
      icon: ShieldAlert,
      color: 'from-rose-500/20 to-rose-900/10 border-rose-500/30 text-rose-400',
      iconBg: 'bg-rose-500/20 text-rose-400',
      highlight: stats.active > 0
    },
    {
      title: 'Unacknowledged',
      value: stats.unacknowledged,
      icon: AlertCircle,
      color: 'from-amber-500/20 to-amber-900/10 border-amber-500/30 text-amber-400',
      iconBg: 'bg-amber-500/20 text-amber-400',
      highlight: stats.unacknowledged > 0
    },
    {
      title: 'Responding Units',
      value: stats.responding,
      icon: RadioTower,
      color: 'from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-400',
      iconBg: 'bg-blue-500/20 text-blue-400',
      highlight: false
    },
    {
      title: 'Resolved Today',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      highlight: false
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`p-5 rounded-xl bg-gradient-to-br bg-slate-900 border ${card.color} transition-all shadow-lg shadow-black/20`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">{card.title}</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-white">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full mr-2 bg-slate-500" />
              <span>Realtime telemetry active</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
