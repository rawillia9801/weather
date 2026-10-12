import { NavLink } from 'react-router-dom';
import { AlertTriangle, Bell, Clock3, FileText, Grid2X2, History, Settings } from 'lucide-react';
import { LiveBadge } from '../ui/LiveBadge';
import type { Alert, StationInfo, StationStatus, WeatherStationData } from '../../types/weather';

const tabs = [
  { label: 'Dashboard', icon: Grid2X2, to: '/dashboard' },
  { label: 'History', icon: History, to: '/history' },
  { label: 'Alarms', icon: Bell, to: '/alarms', badge: 2 },
  { label: 'Reports', icon: FileText, to: '/reports' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export function Header({ station, clock, status, alerts, alertFeedStatus }: { station: StationInfo; clock: string; status: StationStatus; alerts: Alert[]; alertFeedStatus?: WeatherStationData['alertFeedStatus'] }) {
  const date = new Date(clock);
  const timeLabel = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const badgeLabel = status.online ? 'LIVE' : status.dataQuality === 'Public fallback' ? 'PUBLIC FALLBACK' : 'OFFLINE';
  const badgeTone = status.online ? 'green' : 'amber';
  const priority = { warning: 3, watch: 2, advisory: 1, calm: 0 };
  const rankedAlerts = [...alerts].sort((a, b) => priority[b.severity] - priority[a.severity]);
  const critical = rankedAlerts.some((alert) => alert.severity === 'warning' || alert.severity === 'watch');
  const alertMessage = rankedAlerts.map((alert) => `${alert.severity.toUpperCase()}: ${alert.title}`).join('     ✦     ');

  return (
    <header className="dashboard-header">
      <div className="min-w-0">
        <div className="header-kicker">Live Personal Weather Station</div>
        <h1 className="dashboard-title">{station.name}</h1>
        {rankedAlerts.length > 0 ? (
          <div className="header-alert-ticker" role={critical ? 'alert' : 'status'} aria-label={`Active weather alerts: ${alertMessage}`}>
            <span className="header-alert-label"><AlertTriangle size={15} aria-hidden="true" /> {critical ? 'SEVERE WEATHER' : 'WEATHER ALERT'}</span>
            <a className="header-alert-scroll" href="https://www.weather.gov/alerts" target="_blank" rel="noopener noreferrer" title="Open official National Weather Service alerts">
              <span className="header-alert-track">
                <span className="header-alert-copy">{alertMessage}     ✦     OPEN NWS ALERTS ↗</span>
                <span className="header-alert-copy" aria-hidden="true">{alertMessage}     ✦     OPEN NWS ALERTS ↗</span>
              </span>
            </a>
          </div>
        ) : alertFeedStatus === 'unavailable' ? (
          <a className="header-alert-feed-down" href="https://www.weather.gov/alerts" target="_blank" rel="noopener noreferrer">
            <AlertTriangle size={14} aria-hidden="true" /> Live NWS alert feed unavailable — check official alerts ↗
          </a>
        ) : null}
        <div className="header-subtitle">
          <span>{station.location}</span>
          <span>&bull;</span>
          <span>Station {station.id}</span>
          <span>&bull;</span>
          <LiveBadge label={badgeLabel} tone={badgeTone} />
        </div>
      </div>

      <div className="header-actions">
        <div className="header-live-stack">
          <LiveBadge label={status.online ? 'LIVE FROM STALEY STREET' : badgeLabel} tone={badgeTone} />
          <div className="time-pill">
            <Clock3 className="h-4 w-4" />
            {timeLabel}
          </div>
          <small>Weather Station {station.id} · Updates every 2 minutes</small>
        </div>
        <nav className="top-tabs" aria-label="Dashboard sections">
          {tabs.map(({ label, icon: Icon, to, badge }) => (
            <NavLink key={label} to={to} className={({ isActive }) => `top-tab ${isActive ? 'active' : ''}`} aria-label={label}>
              <span className="relative">
                <Icon className="top-tab-icon" />
                {badge && <span className="alarm-badge">{badge}</span>}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
