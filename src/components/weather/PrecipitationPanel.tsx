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

  const noMeasuredAccumulationYet = isRaining && (precipitation.today ?? 0) <= 0;
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
          {isRaining ? 'Rain in progress' : 'Station gauge'}
        </span>
      </div>

      <div className="precipitation-primary">
        <span>{precipitation.todayLabel || 'Today'}</span>
        <strong>{noMeasuredAccumulationYet ? 'Collecting' : valueLabel(precipitation.today, precipitation.todayLabel)}</strong>
        {noMeasuredAccumulationYet && (
          <small>Rain is being reported now. The station total has not registered measurable accumulation yet.</small>
        )}
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
