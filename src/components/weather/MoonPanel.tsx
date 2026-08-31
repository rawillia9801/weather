import { MoonStar } from 'lucide-react';
import type { MoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

const LUNAR_MONTH_DAYS = 29.5306;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function phaseFraction(moon: MoonData) {
  if (typeof moon.phaseValue === 'number' && Number.isFinite(moon.phaseValue)) {
    return clamp(moon.phaseValue, 0, 1);
  }
  if (typeof moon.age === 'number' && Number.isFinite(moon.age)) {
    return clamp(moon.age / LUNAR_MONTH_DAYS, 0, 1);
  }
  return 0.5;
}

function MoonDisc({ moon }: { moon: MoonData }) {
  const fraction = phaseFraction(moon);
  const illumination = clamp(Number(moon.illumination) || 0, 0, 100);
  const waxing = fraction <= 0.5;
  const radius = 42;
  const shadowShift = (waxing ? -1 : 1) * (radius * 2 * illumination) / 100;

  return (
    <svg className="moon-phase-disc" viewBox="0 0 100 100" role="img" aria-label={`${moon.phase}, ${Math.round(illumination)} percent illuminated`}>
      <defs>
        <clipPath id="moon-phase-clip">
          <circle cx="50" cy="50" r={radius} />
        </clipPath>
        <radialGradient id="moon-phase-light" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="58%" stopColor="#dbe7f2" />
          <stop offset="100%" stopColor="#91a4b8" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" className="moon-phase-halo" />
      <g clipPath="url(#moon-phase-clip)">
        <circle cx="50" cy="50" r={radius} fill="url(#moon-phase-light)" />
        <circle cx={50 + shadowShift} cy="50" r={radius} className="moon-phase-shadow" />
      </g>
      <circle cx="50" cy="50" r={radius} className="moon-phase-outline" />
    </svg>
  );
}

export function MoonPanel({ moon }: { moon: MoonData }) {
  const illumination = Number.isFinite(Number(moon.illumination)) ? Math.round(Number(moon.illumination)) : null;
  const age = Number.isFinite(Number(moon.age)) ? Number(moon.age).toFixed(1) : null;
  const nextEvents = [
    moon.nextFullMoon ? { label: 'Next full', value: moon.nextFullMoon } : null,
    moon.nextNewMoon ? { label: 'Next new', value: moon.nextNewMoon } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <GlassCard className="moon-panel moon-panel-v2">
      <div className="moon-panel-header">
        <div>
          <div className="panel-kicker">Moon Phase</div>
          <div className="moon-phase-name">{moon.phase || 'Unavailable'}</div>
        </div>
        <MoonStar className="moon-panel-icon" aria-hidden="true" />
      </div>

      <div className="moon-panel-body">
        <MoonDisc moon={moon} />
        <div className="moon-panel-readings">
          <div>
            <strong>{illumination == null ? '—' : `${illumination}%`}</strong>
            <span>Illuminated</span>
          </div>
          <div>
            <strong>{age == null ? '—' : `${age} d`}</strong>
            <span>Lunar age</span>
          </div>
        </div>
      </div>

      {nextEvents.length > 0 && (
        <div className="moon-next-events">
          {nextEvents.map((event) => (
            <span key={event.label}><small>{event.label}</small>{event.value}</span>
          ))}
        </div>
      )}
      {moon.skyEvent && <div className="moon-sky-event">{moon.skyEvent}</div>}
    </GlassCard>
  );
}
