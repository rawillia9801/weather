import { Info } from 'lucide-react';
import type { MoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function MoonPanel({ moon }: { moon: MoonData }) {
  return (
    <GlassCard className="moon-panel">
      <div className="flex items-center gap-2">
        <div className="panel-kicker">Current Moon</div>
        <Info className="h-4 w-4 text-white/55" />
      </div>
      <div className="moon-sky">
        <div className="moon-orb" style={{ '--moon-shadow': `${Math.max(8, Math.min(78, 100 - moon.illumination))}%` } as React.CSSProperties} />
      </div>
      <div className="moon-copy">
        <div className="moon-phase">{moon.phase}</div>
        <div className="moon-details">
          <span>Illumination: {moon.illumination}%</span>
          <span>Age: {moon.age} days</span>
        </div>
        {moon.skyEvent && <div className="moon-event">{moon.skyEvent}</div>}
      </div>
    </GlassCard>
  );
}
