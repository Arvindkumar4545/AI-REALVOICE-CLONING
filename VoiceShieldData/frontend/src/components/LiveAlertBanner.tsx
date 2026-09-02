import React from 'react';
import { useAlert } from '../store/AlertContext';
import { ShieldAlert, CheckCircle, AlertTriangle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LiveAlertBanner: React.FC = () => {
  const { alerts, removeAlert } = useAlert();

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {alerts.map((alert) => {
          let bgClass = 'bg-slate-900/90 border-slate-700 text-slate-200';
          let icon = Info;

          if (alert.type === 'threat') {
            bgClass = 'bg-red-950/90 border-red-800/90 text-red-200 shadow-lg shadow-red-500/20';
            icon = ShieldAlert;
          } else if (alert.type === 'warning') {
            bgClass = 'bg-amber-950/90 border-amber-800/90 text-amber-200';
            icon = AlertTriangle;
          } else if (alert.type === 'success') {
            bgClass = 'bg-emerald-950/90 border-emerald-800/90 text-emerald-200';
            icon = CheckCircle;
          }

          const IconComponent = icon;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md ${bgClass} shadow-xl flex items-start gap-3`}
            >
              <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold leading-tight">{alert.title}</h5>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug break-words">
                  {alert.message}
                </p>
                <span className="text-[9px] font-mono text-slate-400 mt-1 block">
                  {alert.timestamp}
                </span>
              </div>
              <button
                onClick={() => removeAlert(alert.id)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
