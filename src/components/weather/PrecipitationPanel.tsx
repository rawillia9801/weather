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
  if (value == null) return '—';
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

  const hasLiveRate = precipitation.rate != null;
  const gaugeReportsRain = hasLiveRate && Number(precipitation.rate) > 0;
  const secondaryStats = [
    ['Today gauge', precipitation.today, precipitation.todayLabel],
    [precipitation.weekLabel || '7 days', precipitation.week, precipitation.weekLabel],
    [precipitation.monthLabel || 'Month', precipitation.month, precipitation.monthLabel],
  ] as const;

  const statusLabel = gaugeReportsRain
    ? 'Live rain detected'
    : isRaining
      ? 'Rain reported'
      : hasLiveRate
        ? 'Live gauge'
        : 'Gauge accumulation';

  const rateNote = hasLiveRate
    ? gaugeReportsRain
      ? `${precipitation.rateLabel || 'Live PWS rain rate'}${precipitation.observedAt ? ` · ${precipitation.observedAt}` : ''}`
      : isRaining
        ? `Weather conditions report rain, but the station gauge currently reports 0.00 in/hr${precipitation.observedAt ? ` · ${precipitation.observedAt}` : ''}.`
        : `${precipitation.rateLabel || 'Live PWS rain rate'}${precipitation.observedAt ? ` · ${precipitation.observedAt}` : ''}`
    : isRaining
      ? 'Rain is being reported, but a live station rain-rate reading is unavailable.'
      : 'Live rain rate is unavailable; accumulation totals are shown below.';

  return (
    <GlassCard className="tile-panel precipitation-panel">
      <div className="precipitation-heading">
        <div className="panel-kicker flex items-center gap-2"><Droplets className="h-4 w-4" />Precipitation</div>
        <span className={`precipitation-status ${gaugeReportsRain || isRaining ? 'active' : ''}`}>
          <CloudRain aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <div className="precipitation-primary">
        <span>Live rain rate</span>
        <strong>{rateLabel(precipitation.rate)}</strong>
        <small>{rateNote}</small>
      </div>

      <div className="precipitation-secondary-grid">
        {secondaryStats.map(([label, value, sourceLabel]) => (
          <div key={label}>
            <strong>{valueLabel(value, sourceLabel)}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {(precipitation.gaugeSource || precipitation.source) && (
        <div className="panel-source precipitation-source">Source: {precipitation.gaugeSource || precipitation.source}</div>
      )}
    </GlassCard>
  );
}
