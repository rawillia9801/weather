import { Droplets } from 'lucide-react';
import type { PrecipitationData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function PrecipitationPanel({ precipitation }: { precipitation: PrecipitationData }) {
  const stats = [
    ['Today', precipitation.today],
    ['Week', precipitation.week],
    ['Month', precipitation.month],
    ['Year', precipitation.year],
  ];

  return (
    <GlassCard className="tile-panel">
      <div className="panel-kicker flex items-center gap-2"><Droplets className="h-4 w-4" />Precipitation</div>
      <div className="stat-tiles">
        {stats.map(([label, value]) => (
          <div key={label}>
            <strong>{Number(value).toFixed(2)}<span> in</span></strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
