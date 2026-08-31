import { Moon, Sunrise, Sunset, SunMedium } from 'lucide-react';
import type { SunMoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function SunMoonPanel({ data }: { data: SunMoonData }) {
  const hasMoonWindow = !/unavailable/i.test(data.moonrise || '') || !/unavailable/i.test(data.moonset || '');

  return (
    <GlassCard className="sunmoon-panel sunmoon-panel-v2">
      <div className="sunmoon-heading">
        <div>
          <div className="panel-kicker">Sun & Moon</div>
          <div className="sunmoon-subtitle">Today&apos;s local sky timing</div>
        </div>
        <SunMedium className="sunmoon-heading-icon" aria-hidden="true" />
      </div>

      <div className="solar-window">
        <div className="sky-time">
          <Sunrise aria-hidden="true" />
          <strong>{data.sunrise || 'Unavailable'}</strong>
          <span>Sunrise</span>
        </div>
        <div className="sky-time sky-time-primary">
          <SunMedium aria-hidden="true" />
          <strong>{data.daylight || 'Unavailable'}</strong>
          <span>Daylight</span>
        </div>
        <div className="sky-time">
          <Sunset aria-hidden="true" />
          <strong>{data.sunset || 'Unavailable'}</strong>
          <span>Sunset</span>
        </div>
      </div>

      {hasMoonWindow ? (
        <div className="moon-window-row">
          <Moon aria-hidden="true" />
          <span><small>Moonrise</small><strong>{data.moonrise || 'Unavailable'}</strong></span>
          <span><small>Moonset</small><strong>{data.moonset || 'Unavailable'}</strong></span>
        </div>
      ) : (
        <div className="moon-window-unavailable">Moonrise and moonset timing are unavailable from the current provider.</div>
      )}
    </GlassCard>
  );
}
