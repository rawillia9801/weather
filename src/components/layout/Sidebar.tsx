import { NavLink } from 'react-router-dom';
import { Bell, Camera, CloudLightning, FileText, History, Home, MapPin, Settings, Signal } from 'lucide-react';
import type { StationStatus } from '../../types/weather';

const navItems = [
  { label: 'Dashboard', icon: Home, to: '/dashboard' },
  { label: 'History', icon: History, to: '/history' },
  { label: 'Alarms', icon: Bell, to: '/alarms' },
  { label: 'Reports', icon: FileText, to: '/reports' },
  { label: 'Maps', icon: MapPin, to: '/maps' },
  { label: 'Cameras', icon: Camera, to: '/cameras' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export function Sidebar({ status }: { status: StationStatus }) {
  return (
    <aside className="sidebar">
      <div className="station-logo" aria-label="Staley Street Weather logo">
        <CloudLightning className="h-10 w-10" />
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink key={label} to={to} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} aria-label={label}>
            <Icon className="h-6 w-6" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="station-status-card">
        <div className="panel-kicker">Station Status</div>
        <div className={`mt-3 flex items-center gap-2 text-sm font-semibold uppercase ${status.online ? 'text-green-400' : 'text-amber-300'}`}>
          <span className={`live-dot ${status.online ? '' : 'live-dot-amber'}`} />
          {status.online ? 'Online' : 'Offline'}
        </div>
        <div className="mt-3 space-y-2 text-xs text-white/70">
          <div className="flex justify-between gap-2">
            <span>Signal: {status.signal}%</span>
            <Signal className={`h-4 w-4 ${status.online ? 'text-green-400' : 'text-amber-300'}`} />
          </div>
          <div>Uptime: {status.uptime}</div>
          <div>
            Last Restart:<br />
            {status.lastRestart}
          </div>
        </div>
        <div className="mt-4 border-t border-cyan-300/15 pt-3">
          <div className="panel-kicker text-[11px]">Data Quality</div>
          <div className={`mt-2 text-sm ${status.online ? 'text-green-400' : 'text-amber-300'}`}>{status.dataQuality}</div>
          <div className={`mt-1 text-lg ${status.online ? 'text-green-400' : 'text-amber-300'}`}>{status.dataQualityScore}%</div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-green-400" style={{ width: `${status.dataQualityScore}%` }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
