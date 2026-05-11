import { Cloud, Droplet, Snowflake } from 'lucide-react';
import type { ForecastDay } from '../../types/weather';
import { getConditionIcon, getConditionTheme } from '../../lib/weatherThemes';
import { ConditionBackdrop } from './ConditionBackdrop';

export function ForecastCard({ forecast }: { forecast: ForecastDay }) {
  const theme = getConditionTheme(forecast.condition);
  const Icon = getConditionIcon(forecast.condition);
  const precipAmount = typeof forecast.precipitationAmount === 'number' && Number.isFinite(forecast.precipitationAmount)
    ? `${forecast.precipitationAmount.toFixed(2)} in`
    : 'Amt n/a';
  const amountLabel = typeof forecast.snowfallAmount === 'number' && forecast.snowfallAmount > 0
    ? `Snow ${forecast.snowfallAmount.toFixed(1)} in`
    : precipAmount;
  const isWet = forecast.precipitationChance > 10 || /rain|showers|storm/i.test(forecast.condition);
  const isSnow = /snow|freezing/i.test(forecast.condition) || (typeof forecast.snowfallAmount === 'number' && forecast.snowfallAmount > 0);
  const PrecipIcon = isSnow ? Snowflake : isWet ? Droplet : Cloud;

  return (
    <ConditionBackdrop condition={forecast.condition} className="forecast-card">
      <div className="forecast-card-inner">
        <div className="forecast-day">{forecast.day}</div>
        <div className="forecast-icon-wrap">
          <Icon style={{ color: theme.accent }} strokeWidth={1.55} />
        </div>
        <div className="forecast-meta">
          <div className="forecast-temps">
            <span>{forecast.high}&deg;</span>
            <span>{forecast.low}&deg;</span>
          </div>
          <div className="forecast-label">{theme.label}</div>
          <div className="forecast-pop">
            <PrecipIcon className={isWet || isSnow ? 'h-4 w-4 text-cyan-300' : 'h-4 w-4 text-white/45'} />
            <span>{forecast.precipitationChance}%</span>
            <span className="forecast-amount">{amountLabel}</span>
          </div>
          <div className="source-chip" title={forecast.source || 'Forecast source unavailable'}>{forecast.source || 'Source n/a'}</div>
        </div>
      </div>
    </ConditionBackdrop>
  );
}
