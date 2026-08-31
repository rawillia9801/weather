import { NavLink } from 'react-router-dom';
import { Bell, Camera, CloudLightning, FileText, History, Home, MapPin, Settings, Signal } from 'lucide-react';
import type { StationStatus } from '../../types/weather';

type NavItem = {
  label: string;
  icon: typeof Home;
  to: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Command',
    items: [
      { label: 'Command Center', icon: Home, to: '/dashboard' },
      { label: 'Station History', icon: History, to: '/history' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Alarms', icon: Bell, to: '/alarms' },
      { label: 'Reports', icon: FileText, to: '/reports' },
    ],
  },
  {
    label: 'Observation',
    items: [
      { label: 'Maps', icon: MapPin, to: '/maps' },
      { label: 'Cameras', icon: Camera, to: '/cameras' },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', icon: Settings, to: '/settings' }],
  },
];

export function Sidebar({ status }: { status: StationStatus }) {
  const usingFallback = !status.online && status.dataQuality === 'Public fallback';
  const statusLabel = status.online ? 'Station online' : usingFallback ? 'Public fallback' : 'Station offline';
  const statusClass = status.online ? 'online' : usingFallback ? 'fallback' : 'offline';

  return (
    <aside className="sidebar">
      <NavLink className="station-brand" to="/dashboard" aria-label="Staley Street Weather Command Center">
        <span className="station-logo" aria-hidden="true">
          <CloudLightning />
        </span>
        <span className="station-brand-copy">
          <strong>Staley Weather</strong>
          <small>Station Operations</small>
        </span>
      </NavLink>

      <div className="station-context-card">
        <div className="station-context-topline">
          <span>Weather station</span>
          <i className={statusClass} aria-hidden="true" />
        </div>
        <strong>KVAMARIO42</strong>
        <small>Marion, Virginia · Live telemetry</small>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navGroups.map((group) => (
          <div className="sidebar-nav-group" key={group.label}>
            <div className="sidebar-nav-label">{group.label}</div>
            <div className="sidebar-nav-items">
              {group.items.map(({ label, icon: Icon, to }) => (
                <NavLink
                  key={label}
                  to={to}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  aria-label={label}
                >
                  <Icon />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="station-status-card">
        <div className="station-status-heading">
          <div>
            <span>Station telemetry</span>
            <strong className={statusClass}>{statusLabel}</strong>
          </div>
          <Signal className={statusClass} />
        </div>

        <div className="station-status-grid">
          <div>
            <span>Signal</span>
            <strong>{status.signal}%</strong>
          </div>
          <div>
            <span>Quality</span>
            <strong>{status.dataQualityScore}%</strong>
          </div>
        </div>

        <div className="station-quality-track" aria-label={`Data quality ${status.dataQualityScore}%`}>
          <span style={{ width: `${Math.max(0, Math.min(100, status.dataQualityScore))}%` }} />
        </div>

        <div className="station-status-meta">
          <span>{status.dataQuality}</span>
          <span>Uptime {status.uptime}</span>
        </div>
        <div className="station-restart">Last restart · {status.lastRestart}</div>
      </div>

      <div className="sidebar-watermark" aria-hidden="true">WX // MISSION CONTROL</div>
    </aside>
  );
}
