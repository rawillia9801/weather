import { Moon, Sunrise, Sunset, SunMedium } from 'lucide-react';
import type { SunMoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

function clockMinutes(value: string) {
  const match = value?.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (hours === 12) hours = 0;
  if (period === 'PM') hours += 12;
  return hours * 60 + minutes;
}

function formatMinutes(value: number | null) {
  if (value == null) return 'Unavailable';
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours = hours24 % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function SunMoonPanel({ data }: { data: SunMoonData }) {
  const sunriseMinutes = clockMinutes(data.sunrise);
  const sunsetMinutes = clockMinutes(data.sunset);
  const solarNoon = sunriseMinutes != null && sunsetMinutes != null ? formatMinutes((sunriseMinutes + sunsetMinutes) / 2) : 'Unavailable';
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
          <strong>{solarNoon}</strong>
          <span>Solar noon</span>
        </div>
        <div className="sky-time">
          <Sunset aria-hidden="true" />
          <strong>{data.sunset || 'Unavailable'}</strong>
          <span>Sunset</span>
        </div>
      </div>

      <div className="daylight-readout">
        <span>Daylight</span>
        <strong>{data.daylight || 'Unavailable'}</strong>
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
