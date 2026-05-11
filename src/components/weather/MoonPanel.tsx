import { Info } from 'lucide-react';
import type { MoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function MoonPanel({ moon }: { moon: MoonData }) {
  const phaseValue = typeof moon.phaseValue === 'number' ? moon.phaseValue : 0.5;
  const lit = `${Math.max(4, Math.min(100, moon.illumination))}%`;
  const moonClass = phaseValue > 0 && phaseValue < 0.5 ? 'moon-orb moon-orb-waxing' : 'moon-orb moon-orb-waning';
  const skyWatch = [moon.nextFullMoon && `Full ${moon.nextFullMoon}`, moon.nextNewMoon && `New ${moon.nextNewMoon}`].filter(Boolean).join(' | ');

  return (
    <GlassCard className="moon-panel">
      <div className="flex items-center gap-2">
        <div className="panel-kicker">Current Moon</div>
        <Info className="h-4 w-4 text-white/55" />
      </div>
      <div className="moon-sky">
        <div className={moonClass} style={{ '--moon-lit': lit } as React.CSSProperties} />
      </div>
      <div className="moon-copy">
        <div className="moon-phase">{moon.phase}</div>
        <div className="moon-details">
          <span>Illumination: {moon.illumination}%</span>
          <span>Age: {moon.age} days</span>
        </div>
        {skyWatch && <div className="moon-event">Sky Watch: {skyWatch}</div>}
        {moon.skyEvent && <div className="moon-event">{moon.skyEvent}</div>}
      </div>
    </GlassCard>
  );
}
