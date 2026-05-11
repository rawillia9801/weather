import { Zap } from 'lucide-react';
import type { LightningData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function LightningPanel({ lightning }: { lightning: LightningData }) {
  const hasLiveCounts = [lightning.total, lightning.nearStation, lightning.cloudStrikes, lightning.cloudToGround].some((value) => typeof value === 'number');
  const stormRisk = /storm risk/i.test(lightning.statusLabel || '');
  const stats = hasLiveCounts
    ? [
        ['Total Strikes', lightning.total],
        ['Near Station', lightning.nearStation],
        ['Cloud Strikes', lightning.cloudStrikes],
        ['Cloud to Ground', lightning.cloudToGround],
      ]
    : [
        ['Mode', 'Risk only'],
        ['Live Feed', 'Not configured'],
        ['Storm Risk', stormRisk ? 'Possible' : 'Low'],
        ['Strikes', 'Unavailable'],
      ];

  return (
    <GlassCard className="tile-panel">
      <div className="panel-kicker flex items-center gap-2"><Zap className="h-4 w-4" />Lightning <span className="text-white/55">(24H)</span></div>
      <div className="stat-tiles">
        {stats.map(([label, value]) => (
          <div key={label}>
            <strong>{typeof value === 'number' ? value : value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="panel-source">{lightning.statusLabel || lightning.source || 'Live strike source not configured'}</div>
    </GlassCard>
  );
}
