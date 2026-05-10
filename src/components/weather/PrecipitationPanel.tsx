import { Droplets } from 'lucide-react';
import type { PrecipitationData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function PrecipitationPanel({ precipitation }: { precipitation: PrecipitationData }) {
  const stats = [
    [precipitation.todayLabel || 'Today', precipitation.today],
    [precipitation.weekLabel || 'Week', precipitation.week],
    [precipitation.monthLabel || 'Month', precipitation.month],
    [precipitation.yearLabel || 'Year', precipitation.year],
  ];

  return (
    <GlassCard className="tile-panel">
      <div className="panel-kicker flex items-center gap-2"><Droplets className="h-4 w-4" />Precipitation</div>
      <div className="stat-tiles">
        {stats.map(([label, value]) => (
          <div key={label}>
            <strong>{typeof value === 'number' ? value.toFixed(2) : 'N/A'}{typeof value === 'number' && <span> in</span>}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
      {precipitation.source && <div className="panel-source">{precipitation.source}</div>}
    </GlassCard>
  );
}
