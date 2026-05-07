import type { ForecastDay } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';
import { ForecastCard } from './ForecastCard';

export function ForecastStrip({ forecast }: { forecast: ForecastDay[] }) {
  return (
    <GlassCard className="forecast-section">
      <div className="panel-kicker mb-3">5 Day Forecast</div>
      <div className="forecast-grid">
        {forecast.map((day) => (
          <ForecastCard key={`${day.day}-${day.condition}`} forecast={day} />
        ))}
      </div>
    </GlassCard>
  );
}
