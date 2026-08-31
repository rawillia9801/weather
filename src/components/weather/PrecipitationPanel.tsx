import { useEffect, useState } from 'react';
import { CloudRain, Droplets } from 'lucide-react';
import type { PrecipitationData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

const wetConditions = new Set(['Rain', 'Showers', 'Thunderstorms']);

function valueLabel(value: number | null, label?: string) {
  if (value == null || /unavailable/i.test(label || '')) return '—';
  return `${value.toFixed(2)} in`;
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

  const hasTodayGauge = precipitation.today != null && !/unavailable/i.test(precipitation.todayLabel || '');
  const zeroGauge = hasTodayGauge && Number(precipitation.today) === 0;
  const secondaryStats = [
    [precipitation.weekLabel || '7 days', precipitation.week],
    [precipitation.monthLabel || 'Month', precipitation.month],
    [precipitation.yearLabel || 'Year', precipitation.year],
  ] as const;

  return (
    <GlassCard className="tile-panel precipitation-panel">
      <div className="precipitation-heading">
        <div className="panel-kicker flex items-center gap-2"><Droplets className="h-4 w-4" />Precipitation</div>
        <span className={`precipitation-status ${isRaining ? 'active' : ''}`}>
          <CloudRain aria-hidden="true" />
          {isRaining ? 'Rain in progress' : 'Gauge accumulation'}
        </span>
      </div>

      <div className="precipitation-primary">
        <span>Today&apos;s gauge total</span>
        <strong>{isRaining && zeroGauge ? 'Collecting' : valueLabel(precipitation.today, precipitation.todayLabel)}</strong>
        <small>
          {isRaining && zeroGauge
            ? 'Rain is being reported now. The accumulated station total has not registered a measurable amount yet.'
            : zeroGauge
              ? '0.00 in is the accumulated gauge total, not a current rain-rate reading.'
              : precipitation.todayLabel || 'Accumulated precipitation reported by the current source.'}
        </small>
      </div>

      <div className="precipitation-secondary-grid">
        {secondaryStats.map(([label, value]) => (
          <div key={label}>
            <strong>{valueLabel(value, label)}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {precipitation.source && <div className="panel-source precipitation-source">Source: {precipitation.source}</div>}
    </GlassCard>
  );
}
