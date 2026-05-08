import { CheckCircle2 } from 'lucide-react';
import type { AirQuality } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function AirQualityPanel({ airQuality }: { airQuality: AirQuality }) {
  const hasAqi = typeof airQuality.aqi === 'number';
  return (
    <GlassCard className="air-panel">
      <div className="panel-kicker">Air Quality</div>
      {hasAqi ? <div className="aqi-layout">
        <div className="aqi-gauge" style={{ '--aqi': `${Math.min(100, airQuality.aqi ?? 0)}%` } as React.CSSProperties}>
          <div>
            <strong>{airQuality.aqi}</strong>
            <span>{airQuality.label}</span>
            <small>AQI (US)</small>
          </div>
        </div>
        <div className="pollutant-list">
          {airQuality.pollutants.map((pollutant) => (
            <div key={pollutant.label} className="pollutant-row">
              <span>{pollutant.label}</span>
              <span>{pollutant.value}</span>
            </div>
          ))}
        </div>
      </div> : <div className="panel-unavailable">AQI source is not configured. Add an AQI provider in Settings to display live air quality.</div>}
      <div className="aqi-message">
        <CheckCircle2 className="h-4 w-4" />
        <span>{airQuality.message}</span>
      </div>
      {airQuality.source && <div className="aqi-source">Source: {airQuality.source}</div>}
    </GlassCard>
  );
}
