import { ArrowDown, ArrowUp, Droplets, Gauge, Sun, Wind } from 'lucide-react';
import type { CurrentConditions as CurrentConditionsType, WeatherCondition } from '../../types/weather';
import { getConditionIcon, getConditionTheme, getUvLabel } from '../../lib/weatherThemes';
import { ConditionBackdrop } from './ConditionBackdrop';
import { MetricCard } from '../ui/MetricCard';

const humiditySpark = [55, 57, 54, 56, 55, 58, 53, 57, 60, 55, 61, 58, 59, 57, 59];
const pressureSpark = [29.9, 29.92, 29.91, 29.93, 29.92, 29.91, 29.89, 29.94, 29.93, 29.95, 29.93];

export function CurrentConditions({ current, overrideCondition }: { current: CurrentConditionsType; overrideCondition?: WeatherCondition }) {
  const condition = overrideCondition || current.condition;
  const theme = getConditionTheme(condition);
  const Icon = getConditionIcon(condition);

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
                  <div className="high-low-label">Today High</div>
                </div>
                <div>
                  <div className="high-low-value">
                    <ArrowDown className="low-icon" /> {current.low}&deg;
                  </div>
                  <div className="high-low-label">Today Low</div>
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
        <MetricCard title="Humidity" value={`${current.humidity}`} unit="%" label={current.humidityLabel} icon={Droplets} data={humiditySpark} scale={['0', '50', '100']} />
        <MetricCard title="Pressure" value={current.pressure.toFixed(2)} unit="inHg" label={current.pressureTrend} icon={Gauge} data={pressureSpark} scale={['28.5', '29.5', '30.5']} />
        <MetricCard title="Wind" value={`${current.windSpeed}`} unit="mph" label={`${current.windDirection} / Gust ${current.windGust} mph`} icon={Wind} scale={['0', '10', '20', '30']}>
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
