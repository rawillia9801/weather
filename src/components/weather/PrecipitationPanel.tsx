import { useEffect, useState } from 'react';
import { CloudRain, Droplets } from 'lucide-react';
import type { PrecipitationData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

const wetConditions = new Set(['Rain', 'Showers', 'Thunderstorms']);

function valueLabel(value: number | null | undefined, label?: string) {
  if (value == null || /unavailable/i.test(label || '')) return '—';
  return `${value.toFixed(2)} in`;
}

function rateLabel(value: number | null | undefined) {
  if (value == null) return null;
  return `${value.toFixed(2)} in/hr`;
}

export function PrecipitationPanel({ precipitation }: { precipitation: PrecipitationData }) {
  const [isRaining, setIsRaining] = useState(false);

  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    if (!shell) return;

    const sync = () => setIsRaining(wetConditions.has(shell.getAttribute('data-condition') || ''));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(shell, { attributes: true, attributeFilter: ['data-condition'] });
    return () => observer.disconnect();
  }, []);

  const liveRate = rateLabel(precipitation.rate);
  const gaugeReportsRain = precipitation.rate != null && precipitation.rate > 0;
  const rainNow = gaugeReportsRain || isRaining;
  const status = rainNow ? 'Raining now' : precipitation.rate != null ? 'No rain detected' : 'Rain status from conditions';
  const primary = liveRate || (rainNow ? 'RAINING' : '—');
  const primaryLabel = liveRate ? 'Live station rain rate' : rainNow ? 'Current precipitation' : 'Live rate unavailable';

  return (
    <GlassCard className="tile-panel precipitation-panel">
      <div className="precipitation-heading">
        <div className="panel-kicker flex items-center gap-2"><Droplets className="h-4 w-4" />Precipitation</div>
        <span className={`precipitation-status ${rainNow ? 'active' : ''}`}>
          <CloudRain aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="precipitation-primary precipitation-primary-v2">
        <span>{primaryLabel}</span>
        <strong>{primary}</strong>
        <small>
          {liveRate
            ? `${precipitation.rateLabel || 'Weather Underground PWS'}${precipitation.observedAt ? ` · ${precipitation.observedAt}` : ''}`
            : rainNow
              ? 'Current weather reports precipitation. The station rain-rate field is not available, so the dashboard is not substituting a fake zero.'
              : 'No live station rain-rate reading is available right now.'}
        </small>
      </div>

      <div className="precipitation-secondary-grid precipitation-secondary-grid-v2">
        <div>
          <strong>{valueLabel(precipitation.today, precipitation.todayLabel)}</strong>
          <small>Today gauge</small>
        </div>
        <div>
          <strong>{valueLabel(precipitation.week, precipitation.weekLabel)}</strong>
          <small>{precipitation.weekLabel || '7-day total'}</small>
        </div>
      </div>

      {(precipitation.gaugeSource || precipitation.source) && (
        <div className="panel-source precipitation-source">Source: {precipitation.gaugeSource || precipitation.source}</div>
      )}
    </GlassCard>
  );
}
