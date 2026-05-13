import { GlassCard } from '../ui/GlassCard';
import type { RadarMetadata } from '../../types/weather';

const MARION_LAT = 36.8348;
const MARION_LON = -81.5148;
const WINDY_RADAR_EMBED = `https://embed.windy.com/embed2.html?lat=${MARION_LAT}&lon=${MARION_LON}&detailLat=${MARION_LAT}&detailLon=${MARION_LON}&width=650&height=260&zoom=7&level=surface&overlay=radar&product=radar&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1`;

export function RadarPanel({ radar }: { radar: RadarMetadata }) {
  const updatedAt = radar.updatedAt
    ? new Date(radar.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const externalUrl = radar.externalUrl || 'https://radar.weather.gov/';

  return (
    <GlassCard className="radar-panel">
      <div className="panel-kicker">Live Radar</div>
      <div
        className="radar-map"
        style={{
          background: 'linear-gradient(180deg, rgba(3, 20, 30, .98), rgba(1, 9, 16, .98))',
          boxShadow: 'inset 0 0 42px rgba(0,0,0,.62), inset 0 0 30px rgba(0,255,221,.11)',
        }}
      >
        <iframe
          title="Live radar centered on Marion, Virginia"
          src={WINDY_RADAR_EMBED}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{
            position: 'absolute',
            inset: '-42px -36px -44px -36px',
            width: 'calc(100% + 72px)',
            height: 'calc(100% + 86px)',
            border: 0,
            filter: 'saturate(1.1) contrast(1.05) brightness(.92)',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(rgba(103,232,249,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.07) 1px, transparent 1px), radial-gradient(circle at 50% 52%, transparent 0 34px, rgba(103,232,249,.18) 35px 36px, transparent 37px 74px, rgba(103,232,249,.11) 75px 76px, transparent 77px)',
            backgroundSize: '28px 28px, 28px 28px, 100% 100%',
            mixBlendMode: 'screen',
            opacity: .42,
          }}
        />
        <span className="station-dot" aria-label="Station location" />
        <span className="radar-crosshair horizontal" />
        <span className="radar-crosshair vertical" />
        <div className="radar-live-badge">LIVE RADAR</div>
      </div>
      <div className="radar-placeholder-label configured">
        Live radar embed centered on 24354
      </div>
      <div className="radar-legend">
        {['Light', 'Moderate', 'Heavy', 'Severe'].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <a className="radar-open-link" href={externalUrl} target="_blank" rel="noreferrer">
        Open NOAA/NWS Radar
      </a>
      <div className="panel-source">Windy live radar embed • NOAA/NWS backup link • {updatedAt}</div>
    </GlassCard>
  );
}
