import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Alert } from '../../types/weather';

export function AlertBar({ alerts }: { alerts: Alert[] }) {
  const alert = alerts[0];
  const calm = !alert;

  return (
    <section className={`alert-bar ${calm ? 'calm' : ''}`} aria-live="polite">
      {calm ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      <span>{calm ? 'No active alerts for Marion, Virginia' : alert.title}</span>
      <NavLink to="/alarms" className="alert-action" aria-label={calm ? 'View alarm details' : 'View active weather alerts'}>
        {calm ? 'Details' : 'View Alerts'} <ArrowRight className="h-4 w-4" />
      </NavLink>
    </section>
  );
}
