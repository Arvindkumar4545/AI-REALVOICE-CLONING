import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ThreatLocationPoint } from '../types';
import { ShieldAlert, MapPin, Info } from 'lucide-react';

interface ThreatMapComponentProps {
  points: ThreatLocationPoint[];
  selectedRegion?: string;
  className?: string;
}

export const ThreatMapComponent: React.FC<ThreatMapComponentProps> = ({
  points,
  selectedRegion,
  className = 'h-[480px] w-full rounded-2xl overflow-hidden',
}) => {
  // Center map on India / Asia by default
  const defaultCenter: [number, number] = [22.3511148, 78.6677428];

  const filteredPoints = selectedRegion && selectedRegion !== 'ALL'
    ? points.filter((p) => p.region?.toLowerCase() === selectedRegion.toLowerCase())
    : points;

  const getColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return '#EF4444'; // Red
      case 'medium':
        return '#F59E0B'; // Amber
      default:
        return '#06B6D4'; // Cyan
    }
  };

  return (
    <div className={`relative border border-slate-800 glass-panel shadow-2xl ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={4}
        scrollWheelZoom={false}
        className="w-full h-full z-10 dark-leaflet-map"
        style={{ background: '#030712' }}
      >
        {/* Dark Cyber Free OpenStreetMap Tile Layer - No API Key Required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {filteredPoints.map((point, index) => {
          const color = getColor(point.threat_level);
          return (
            <CircleMarker
              key={point.id || index}
              center={[point.latitude, point.longitude]}
              radius={point.threat_level === 'high' || point.threat_level === 'critical' ? 10 : 7}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Popup className="custom-cyber-popup">
                <div className="p-1 space-y-1 text-slate-900 font-['Outfit']">
                  <div className="flex items-center gap-1 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Scam Incident Report</span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <span className="font-semibold">Region:</span> {point.city ? `${point.city}, ` : ''}{point.region || 'India'}
                  </div>
                  <div className="text-[11px]">
                    <span className="font-semibold">Severity:</span>{' '}
                    <span className="uppercase font-mono font-bold text-red-600">
                      {point.threat_level}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Coords: ~{point.latitude.toFixed(2)}°, ~{point.longitude.toFixed(2)}° (Anonymized)
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Empty State Banner if no verified points */}
      {filteredPoints.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-slate-950/60 backdrop-blur-xs">
          <div className="glass-panel p-4 rounded-2xl border border-slate-700/80 text-center space-y-1.5 pointer-events-auto">
            <Info className="w-5 h-5 text-cyan-400 mx-auto" />
            <h5 className="text-xs font-bold text-white">No Verified Threat Data</h5>
            <p className="text-[11px] text-slate-400">No verified geographic threat data available yet.</p>
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 glass-panel p-3 rounded-xl border border-slate-800 text-xs space-y-2 pointer-events-auto">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Threat Severity
        </div>
        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span className="text-slate-300">High / Critical Deepfake</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-300">Suspicious Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Low Threat Level</span>
          </div>
        </div>
      </div>
    </div>
  );
};
