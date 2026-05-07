import { Zap } from 'lucide-react';
import type { LightningData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function LightningPanel({ lightning }: { lightning: LightningData }) {
  const stats = [
    ['Total Strikes', lightning.total],
    ['Near Station', lightning.nearStation],
    ['Cloud Strikes', lightning.cloudStrikes],
    ['Cloud to Ground', lightning.cloudToGround],
  ];

  return (
    <GlassCard className="tile-panel">
      <div className="panel-kicker flex items-center gap-2"><Zap className="h-4 w-4" />Lightning <span className="text-white/55">(24H)</span></div>
      <div className="stat-tiles">
        {stats.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
