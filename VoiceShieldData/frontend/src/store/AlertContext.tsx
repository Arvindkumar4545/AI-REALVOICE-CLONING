import React, { createContext, useContext, useState, useEffect } from 'react';
import { realtimeService } from '../services/websocket';
import { getAlertMessageForPrediction, normalizePrediction } from '../utils/detectionStatus';

export interface AlertNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'threat';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

interface AlertContextType {
  alerts: AlertNotification[];
  addAlert: (alert: Omit<AlertNotification, 'id' | 'timestamp'>) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);

  const addAlert = (alert: Omit<AlertNotification, 'id' | 'timestamp'>) => {
    const newAlert: AlertNotification = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]); // Keep top 5 latest alerts
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAlerts = () => setAlerts([]);

  useEffect(() => {
    realtimeService.connect();

    // Listen for high-risk detection broadcast
    const unsubHighRisk = realtimeService.subscribe('HIGH_RISK_DETECTED', (data) => {
      addAlert({
        type: 'threat',
        title: '🚨 High-Risk AI Voice Scam Detected!',
        message: `Prediction: ${data.prediction} | Risk Score: ${data.riskScore}/100 | Confidence: ${data.confidence}%`,
        data,
      });
    });

    // Listen for general detection completed
    const unsubCompleted = realtimeService.subscribe('DETECTION_COMPLETED', (data) => {
      if (!data || data.success === false || data.error) return;

      const normalized = normalizePrediction(data.prediction ?? data.classification ?? data.status ?? '');
      if (normalized === 'INVALID_RESULT' || normalized === 'UNKNOWN') return;

      const alert = getAlertMessageForPrediction(normalized, Number(data.confidence ?? 0));

      addAlert({
        type: alert.type,
        title: alert.title,
        message: alert.message,
        data,
      });
    });

    return () => {
      unsubHighRisk();
      unsubCompleted();
    };
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert, clearAlerts }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
