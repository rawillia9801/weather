import { Moon, Sunrise, Sunset, SunMedium } from 'lucide-react';
import type { SunMoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

function available(value: string | undefined) {
  return Boolean(value && !/unavailable/i.test(value));
}

export function SunMoonPanel({ data }: { data: SunMoonData }) {
  const hasMoonWindow = available(data.moonrise) || available(data.moonset);

  return (
    <GlassCard className="sunmoon-panel sunmoon-panel-v2">
      <div className="sunmoon-heading">
        <div>
          <div className="panel-kicker">Sunlight Today</div>
          <div className="sunmoon-subtitle">Local solar timing</div>
        </div>
        <SunMedium className="sunmoon-heading-icon" aria-hidden="true" />
      </div>

      <div className="solar-window">
        <div className="sky-time">
          <Sunrise aria-hidden="true" />
          <strong>{available(data.sunrise) ? data.sunrise : '—'}</strong>
          <span>Sunrise</span>
        </div>
        <div className="sky-time sky-time-primary">
          <SunMedium aria-hidden="true" />
          <strong>{available(data.daylight) ? data.daylight : '—'}</strong>
          <span>Daylight</span>
        </div>
        <div className="sky-time">
          <Sunset aria-hidden="true" />
          <strong>{available(data.sunset) ? data.sunset : '—'}</strong>
          <span>Sunset</span>
        </div>
      </div>

      {hasMoonWindow && (
        <div className="moon-window-row">
          <Moon aria-hidden="true" />
          <span><small>Moonrise</small><strong>{available(data.moonrise) ? data.moonrise : '—'}</strong></span>
          <span><small>Moonset</small><strong>{available(data.moonset) ? data.moonset : '—'}</strong></span>
        </div>
      )}
    </GlassCard>
  );
}
