import { GlassCard } from '../ui/GlassCard';
import type { RadarMetadata } from '../../types/weather';

export function RadarPanel({ radar }: { radar: RadarMetadata }) {
  const contextOnly = radar.isPlaceholder || /context|link/i.test(`${radar.sourceName} ${radar.statusLabel}`);
  const sourceLabel = contextOnly ? 'NOAA/NWS link only - live overlay not embedded' : radar.sourceName;

  return (
    <GlassCard className="radar-panel">
      <div className="panel-kicker">Radar Context</div>
      <div
        className="radar-map"
        style={{
          background:
            'radial-gradient(circle at 58% 58%, rgba(0, 225, 255, .28), transparent 4px), radial-gradient(ellipse at 50% 52%, rgba(6, 182, 212, .13), transparent 120px), radial-gradient(ellipse at 23% 18%, rgba(47, 113, 101, .38), transparent 110px), linear-gradient(180deg, rgba(4, 42, 37, .98), rgba(0, 20, 28, .98))',
          boxShadow: 'inset 0 0 42px rgba(0,0,0,.62), inset 0 0 30px rgba(0,255,221,.11)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(rgba(103,232,249,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.08) 1px, transparent 1px), radial-gradient(circle at 58% 58%, transparent 0 34px, rgba(103,232,249,.10) 35px 36px, transparent 37px 72px, rgba(103,232,249,.08) 73px 74px, transparent 75px)',
            backgroundSize: '28px 28px, 28px 28px, 100% 100%',
            opacity: .7,
          }}
        />
        <div className="radar-terrain terrain-a" />
        <div className="radar-terrain terrain-b" />
        <div className="radar-terrain terrain-c" />
        <div className="radar-sweep" />
        <svg viewBox="0 0 500 220" aria-hidden="true">
          <defs>
            <filter id="softMapGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="ridgeLine" x1="0" x2="1">
              <stop offset="0" stopColor="#164e63" stopOpacity=".1" />
              <stop offset=".5" stopColor="#67e8f9" stopOpacity=".28" />
              <stop offset="1" stopColor="#164e63" stopOpacity=".08" />
            </linearGradient>
          </defs>
          <path d="M-15 26 C74 8, 126 32, 190 20 S326 18, 408 55 S505 62, 535 38" className="radar-county" />
          <path d="M-20 154 C58 148, 118 132, 196 148 S322 184, 520 158" className="radar-county" />
          <path d="M-30 185 C70 120, 105 142, 170 92 S292 56, 365 30 S450 40, 535 -4" className="road road-major" />
          <path d="M-10 64 C65 90, 135 80, 205 125 S333 170, 510 130" className="road" />
          <path d="M128 -20 C135 60, 170 130, 155 240" className="road" />
          <path d="M8 215 C70 175, 112 160, 178 176 S290 208, 420 165" className="road" />
          <path d="M-25 118 C64 92, 130 114, 198 93 S334 54, 520 88" stroke="url(#ridgeLine)" strokeWidth="15" fill="none" opacity=".44" filter="url(#softMapGlow)" />
          <path d="M23 208 C86 166, 141 176, 204 150 S329 113, 498 132" stroke="url(#ridgeLine)" strokeWidth="10" fill="none" opacity=".34" filter="url(#softMapGlow)" />
          <path d="M250 24 C282 62, 304 96, 292 138 C279 183, 234 198, 197 174 C161 150, 159 98, 188 62 C204 42, 225 31, 250 24Z" className="radar-range" />
          <path d="M250 52 C272 79, 283 104, 276 132 C268 162, 238 173, 213 158 C188 142, 187 108, 206 82 C217 67, 231 57, 250 52Z" className="radar-range inner" />
          <path d="M220 28 C260 8, 316 4, 348 23 C320 42, 264 49, 219 42Z" fill="#67e8f9" opacity=".13" filter="url(#softMapGlow)" />
          <path d="M302 80 C342 68, 393 76, 442 105 C394 117, 345 116, 296 100Z" fill="#94a3b8" opacity=".10" filter="url(#softMapGlow)" />
        </svg>
        <div className="radar-noaa-band" />
        <span className="map-label abingdon">{radar.labels[0]}</span>
        <span className="map-label bristol">{radar.labels[1]}</span>
        <span className="map-label wytheville">{radar.labels[2]}</span>
        <span className="station-dot" aria-label="Station location" />
        <span className="radar-crosshair horizontal" />
        <span className="radar-crosshair vertical" />
        {contextOnly && <span className="radar-context-note">Link only</span>}
      </div>
      <div className={`radar-placeholder-label ${radar.configured ? 'configured' : ''}`}>
        {contextOnly ? 'NOAA/NWS radar link configured' : radar.statusLabel}
      </div>
      <div className="radar-legend radar-legend-context">
        <span>Terrain</span>
        <span>Roads</span>
        <span>Range</span>
        <span>Station</span>
      </div>
      {radar.externalUrl && (
        <a className="radar-open-link" href={radar.externalUrl} target="_blank" rel="noreferrer">
          Open {radar.sourceName}
        </a>
      )}
      <div className="panel-source">{sourceLabel}{radar.updatedAt ? ` • ${new Date(radar.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</div>
    </GlassCard>
  );
}
