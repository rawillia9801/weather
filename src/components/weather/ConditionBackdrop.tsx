import type { WeatherCondition } from '../../types/weather';
import { getConditionTheme } from '../../lib/weatherThemes';

interface ConditionBackdropProps {
  condition: WeatherCondition;
  className?: string;
  children?: React.ReactNode;
}

export function ConditionBackdrop({ condition, className = '', children }: ConditionBackdropProps) {
  const theme = getConditionTheme(condition);

  return (
    <div className={`condition-backdrop ${className}`} data-condition={condition} style={{ background: theme.cardGradient, color: theme.textColor }}>
      <div className="weather-texture" />
      <div className="distant-trees" />
      {theme.animationType !== 'none' && <div className={`weather-animation ${theme.animationType}`} />}
      <div className="condition-vignette" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
