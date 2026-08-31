import { NavLink } from 'react-router-dom';
import { Bell, Camera, Clock3, FileText, Grid2X2, History, MapPin, Settings, Signal } from 'lucide-react';
import { LiveBadge } from '../ui/LiveBadge';
import type { StationInfo, StationStatus } from '../../types/weather';

const tabs = [
  { label: 'Command', icon: Grid2X2, to: '/dashboard' },
  { label: 'History', icon: History, to: '/history' },
  { label: 'Alarms', icon: Bell, to: '/alarms' },
  { label: 'Reports', icon: FileText, to: '/reports' },
  { label: 'Maps', icon: MapPin, to: '/maps' },
  { label: 'Cameras', icon: Camera, to: '/cameras' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export function Header({ station, clock, status }: { station: StationInfo; clock: string; status: StationStatus }) {
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
  const operationalLabel = status.online ? 'Canonical station feed online' : status.dataQuality === 'Public fallback' ? 'Fallback weather feed active' : 'Station feed interrupted';

  return (
    <header className="dashboard-header">
      <div className="system-rail">
        <div className="system-identity">
          <strong>WXOPS // MISSION CONTROL</strong>
          <span className={status.online ? 'system-state online' : 'system-state fallback'}>
            <i aria-hidden="true" />
            {operationalLabel}
          </span>
        </div>
        <div className="system-telemetry">
          <span><Signal /> Signal {status.signal}%</span>
          <span>Quality {status.dataQualityScore}%</span>
          <span>{station.id}</span>
        </div>
      </div>

      <div className="dashboard-header-main">
        <div className="dashboard-heading">
          <div className="header-kicker"><span aria-hidden="true" /> Live Personal Weather Station</div>
          <h1 className="dashboard-title">{station.name}</h1>
          <div className="header-subtitle">
            <span>{station.location}</span>
            <span className="header-divider" aria-hidden="true" />
            <span>Station {station.id}</span>
            <LiveBadge label={badgeLabel} tone={badgeTone} />
          </div>
        </div>

        <div className="header-actions">
          <div className="time-pill">
            <Clock3 />
            <span>{timeLabel}</span>
          </div>
          <nav className="top-tabs" aria-label="Dashboard sections">
            {tabs.map(({ label, icon: Icon, to }) => (
              <NavLink key={label} to={to} className={({ isActive }) => `top-tab ${isActive ? 'active' : ''}`} aria-label={label}>
                <Icon className="top-tab-icon" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
