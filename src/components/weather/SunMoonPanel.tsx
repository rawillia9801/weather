import { Moon, Sun } from 'lucide-react';
import type { SunMoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function SunMoonPanel({ data }: { data: SunMoonData }) {
  return (
    <GlassCard className="sunmoon-panel">
      <div className="panel-kicker">Sun & Moon</div>
      <svg viewBox="0 0 360 160" className="sunmoon-svg" aria-hidden="true">
        <path d="M35 88 Q180 5 325 88" className="sun-arc" />
        <path d="M35 134 Q180 92 325 134" className="moon-arc" />
        <circle cx="35" cy="88" r="4" className="sun-dot" />
        <circle cx="180" cy="22" r="12" className="sun-body" />
        <circle cx="325" cy="88" r="4" className="sun-dot" />
        <circle cx="35" cy="134" r="4" className="moon-dot" />
        <circle cx="180" cy="112" r="11" className="moon-body" />
        <circle cx="325" cy="134" r="4" className="moon-dot" />
        <line x1="18" y1="88" x2="342" y2="88" className="horizon" />
      </svg>
      <div className="arc-labels">
        <span><Sun className="h-4 w-4" />{data.sunrise}<small>Sunrise</small></span>
        <span>{data.daylight}<small>Daylight</small></span>
        <span>{data.sunset}<small>Sunset</small></span>
      </div>
      <div className="arc-labels mt-3">
        <span><Moon className="h-4 w-4" />{data.moonrise}<small>Moonrise</small></span>
        <span>{data.visible}<small>Visible</small></span>
        <span>{data.moonset}<small>Moonset</small></span>
      </div>
    </GlassCard>
  );
}
