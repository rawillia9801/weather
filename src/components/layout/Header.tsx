import { NavLink } from 'react-router-dom';
import { Bell, Clock3, FileText, Grid2X2, History, Settings } from 'lucide-react';
import { LiveBadge } from '../ui/LiveBadge';
import type { StationInfo } from '../../types/weather';

const tabs = [
  { label: 'Dashboard', icon: Grid2X2, to: '/dashboard' },
  { label: 'History', icon: History, to: '/history' },
  { label: 'Alarms', icon: Bell, to: '/alarms', badge: 2 },
  { label: 'Reports', icon: FileText, to: '/reports' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export function Header({ station, clock }: { station: StationInfo; clock: string }) {
  const date = new Date(clock);
  const timeLabel = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="dashboard-header">
      <div className="min-w-0">
        <div className="header-kicker">Live Personal Weather Station</div>
        <h1 className="dashboard-title">{station.name}</h1>
        <div className="header-subtitle">
          <span>{station.location}</span>
          <span>&bull;</span>
          <span>Station {station.id}</span>
          <span>&bull;</span>
          <LiveBadge />
        </div>
      </div>

      <div className="header-actions">
        <div className="time-pill">
          <Clock3 className="h-4 w-4" />
          {timeLabel}
        </div>
        <LiveBadge />
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
