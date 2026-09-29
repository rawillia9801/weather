import { CloudLightning } from 'lucide-react';
import type { LightningData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function LightningPanel({ lightning }: { lightning: LightningData }) {
  const hasLiveCount = typeof lightning.total === 'number' && Boolean(lightning.source) && !/unavailable|not configured/i.test(lightning.source || '');

  return (
    <GlassCard className="lightning-panel">
      <div className="panel-kicker flex items-center gap-2"><CloudLightning aria-hidden="true" className="h-4 w-4" /> Lightning</div>
      {hasLiveCount ? (
        <div className="lightning-content">
          <strong>{lightning.total}</strong>
          <span>Recorded strikes</span>
          {lightning.closestStrikeDistance != null && <small>Closest: {lightning.closestStrikeDistance} mi</small>}
        </div>
      ) : (
        <div className="lightning-content lightning-unavailable">
          <CloudLightning aria-hidden="true" />
          <strong>Feed unavailable</strong>
          <span>{lightning.statusLabel || 'No live strike source configured'}</span>
        </div>
      )}
    </GlassCard>
  );
}
