import { Info } from 'lucide-react';
import type { MoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

const moonPhaseSprite = 'data:image/webp;base64,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';

function phaseIndex(moon: MoonData) {
  const phase = String(moon.phase || '').toLowerCase();
  if (phase.includes('new')) return 0;
  if (phase.includes('waxing crescent')) return 1;
  if (phase.includes('first quarter')) return 2;
  if (phase.includes('waxing gibbous')) return 3;
  if (phase.includes('full')) return 4;
  if (phase.includes('waning gibbous')) return 5;
  if (phase.includes('last quarter') || phase.includes('third quarter')) return 6;
  if (phase.includes('waning crescent')) return 7;
  const phaseValue = typeof moon.phaseValue === 'number' ? moon.phaseValue : 0.5;
  return Math.max(0, Math.min(7, Math.round(phaseValue * 7)));
}

export function MoonPanel({ moon }: { moon: MoonData }) {
  const index = phaseIndex(moon);
  const skyWatch = [moon.nextFullMoon && `Full ${moon.nextFullMoon}`, moon.nextNewMoon && `New ${moon.nextNewMoon}`].filter(Boolean).join(' | ');
  const backgroundPosition = `center ${(index / 7) * 100}%`;

  return (
    <GlassCard className="moon-panel">
      <div className="flex items-center gap-2">
        <div className="panel-kicker">Current Moon</div>
        <Info className="h-4 w-4 text-white/55" />
      </div>
      <div className="moon-sky">
        <div
          aria-label={`${moon.phase} moon phase`}
          role="img"
          style={{
            position: 'absolute',
            right: '14%',
            top: 10,
            width: 'clamp(78px, 6vw, 104px)',
            height: 'clamp(78px, 6vw, 104px)',
            borderRadius: '999px',
            backgroundImage: `url(${moonPhaseSprite})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% auto',
            backgroundPosition,
            boxShadow: '0 0 34px rgba(191,219,254,.34), inset 0 0 18px rgba(255,255,255,.12)',
            filter: 'saturate(1.06) contrast(1.08)',
          }}
        />
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
