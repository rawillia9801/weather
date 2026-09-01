import { ArrowDown, ArrowUp, Droplets, Gauge, Sun, Wind } from 'lucide-react';
import type { CurrentConditions as CurrentConditionsType, WeatherCondition } from '../../types/weather';
import { getConditionIcon, getConditionTheme, getUvLabel } from '../../lib/weatherThemes';
import { ConditionBackdrop } from './ConditionBackdrop';
import { MetricCard } from '../ui/MetricCard';

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function CurrentConditions({ current, overrideCondition }: { current: CurrentConditionsType; overrideCondition?: WeatherCondition }) {
  const condition = overrideCondition || current.condition;
  const theme = getConditionTheme(condition);
  const Icon = getConditionIcon(condition);
  const humidityPosition = clampPercent(current.humidity);
  const pressurePosition = clampPercent(((current.pressure - 28.5) / 2) * 100);
  const windLabel = current.windSpeed < 1 && current.windGust < 1
    ? 'Calm'
    : `${current.windDirection} / Gust ${current.windGust} mph`;

  return (
    <>
      <ConditionBackdrop condition={condition} className="current-hero">
        <div>
          <div className="panel-kicker">Current Conditions</div>
          <div className="current-hero-content">
            <div>
              <div className="temperature-readout">
                {current.temperature.toFixed(1)}
                <span>F</span>
              </div>
              <div className="feels-like">Feels Like {current.feelsLike}&deg;</div>
              <div className="high-low-row">
                <div>
                  <div className="high-low-value">
                    <ArrowUp className="high-icon" /> {current.high}&deg;
                  </div>
                  <div className="high-low-label">Forecast High</div>
                </div>
                <div>
                  <div className="high-low-value">
                    <ArrowDown className="low-icon" /> {current.low}&deg;
                  </div>
                  <div className="high-low-label">Forecast Low</div>
                </div>
              </div>
            </div>
            <div className="hero-condition-art">
              <Icon style={{ color: theme.accent }} strokeWidth={1.5} />
              <div>{theme.label}</div>
            </div>
          </div>
        </div>
      </ConditionBackdrop>

      <div className="metrics-grid">
        <MetricCard title="Humidity" value={`${current.humidity}`} unit="%" label={current.humidityLabel} icon={Droplets} scale={['0', '50', '100']}>
          <div className="metric-linear-gauge" aria-label={`Humidity ${current.humidity}%`}>
            <span className="metric-linear-fill" style={{ width: `${humidityPosition}%` }} />
          </div>
        </MetricCard>

        <MetricCard title="Pressure" value={current.pressure.toFixed(2)} unit="inHg" label={current.pressureTrend} icon={Gauge} scale={['28.5', '29.5', '30.5']}>
          <div className="metric-position-gauge" aria-label={`Pressure ${current.pressure.toFixed(2)} inches of mercury`}>
            <span className="metric-position-marker" style={{ left: `${pressurePosition}%` }} />
          </div>
        </MetricCard>

        <MetricCard title="Wind" value={`${current.windSpeed}`} unit="mph" label={windLabel} icon={Wind} scale={['0', '10', '20', '30']}>
          <div className="segmented-bar">
            {Array.from({ length: 6 }).map((_, index) => (
              <span key={index} className={index < Math.ceil(current.windSpeed / 5) ? 'filled' : ''} />
            ))}
          </div>
        </MetricCard>

        <MetricCard
          title="UV Index"
          value={`${current.uvIndex}`}
          label={`${getUvLabel(current.uvIndex)}${current.uvPeak != null ? ` / Peak ${current.uvPeak}` : ''}`}
          icon={Sun}
          scale={['0', '5', '11+']}
          accent="#fde047"
        >
          <div className="uv-bar">
            <span style={{ left: `${Math.min(100, (current.uvIndex / 11) * 100)}%` }} />
          </div>
        </MetricCard>
      </div>
    </>
  );
}
