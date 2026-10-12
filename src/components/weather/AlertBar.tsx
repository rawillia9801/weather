import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Alert, WeatherStationData } from '../../types/weather';

export function AlertBar({ alerts, feedStatus }: { alerts: Alert[]; feedStatus?: WeatherStationData['alertFeedStatus'] }) {
  const priority = { warning: 3, watch: 2, advisory: 1, calm: 0 };
  const alert = [...alerts].sort((a, b) => priority[b.severity] - priority[a.severity])[0];
  const unavailable = !alert && feedStatus === 'unavailable';
  const calm = !alert && !unavailable;

  return (
    <section className={`alert-bar ${calm ? 'calm' : ''}`} aria-live="polite">
      {calm ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      <span>{unavailable ? 'Live weather alert feed unavailable — check official NWS alerts' : calm ? 'No active alerts for Marion, Virginia' : alert.title}</span>
      {calm ? (
        <NavLink to="/alarms" className="alert-action" aria-label="View alarm details">
          Details <ArrowRight className="h-4 w-4" />
        </NavLink>
      ) : (
        <a href="https://www.weather.gov/alerts" className="alert-action" target="_blank" rel="noopener noreferrer" aria-label="View official National Weather Service alerts">
          NWS Alerts <ArrowRight className="h-4 w-4" />
        </a>
      )}
    </section>
  );
}
