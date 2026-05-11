import { GlassCard } from '../ui/GlassCard';
import type { RadarMetadata } from '../../types/weather';

export function RadarPanel({ radar }: { radar: RadarMetadata }) {
  return (
    <GlassCard className="radar-panel">
      <div className="panel-kicker">Radar Context</div>
      <div
        className="radar-map"
        style={{
          background:
            'radial-gradient(circle at 58% 58%, rgba(0, 225, 255, .26), transparent 4px), radial-gradient(ellipse at 82% 50%, rgba(255, 31, 70, .72), transparent 34px), radial-gradient(ellipse at 75% 44%, rgba(255, 190, 0, .78), transparent 54px), radial-gradient(ellipse at 66% 46%, rgba(70, 255, 72, .55), transparent 82px), radial-gradient(ellipse at 48% 28%, rgba(46, 196, 255, .18), transparent 82px), linear-gradient(180deg, rgba(4, 36, 32, .96), rgba(0, 20, 26, .95))',
          boxShadow: 'inset 0 0 38px rgba(0,0,0,.55), inset 0 0 28px rgba(0,255,221,.12)',
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
            opacity: .65,
          }}
        />
        <div className="radar-terrain terrain-a" />
        <div className="radar-terrain terrain-b" />
        <div className="radar-terrain terrain-c" />
        <div className="radar-sweep" />
        <svg viewBox="0 0 500 220" aria-hidden="true">
          <defs>
            <filter id="radarGlow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="radarCell" x1="0" x2="1">
              <stop offset="0" stopColor="#35ff66" stopOpacity=".78" />
              <stop offset=".42" stopColor="#f3ff24" stopOpacity=".9" />
              <stop offset=".72" stopColor="#ff8a14" stopOpacity=".95" />
              <stop offset="1" stopColor="#ff265c" stopOpacity=".88" />
            </linearGradient>
          </defs>
          <path d="M-15 26 C74 8, 126 32, 190 20 S326 18, 408 55 S505 62, 535 38" className="radar-county" />
          <path d="M-20 154 C58 148, 118 132, 196 148 S322 184, 520 158" className="radar-county" />
          <path d="M-30 185 C70 120, 105 142, 170 92 S292 56, 365 30 S450 40, 535 -4" className="road road-major" />
          <path d="M-10 64 C65 90, 135 80, 205 125 S333 170, 510 130" className="road" />
          <path d="M128 -20 C135 60, 170 130, 155 240" className="road" />
          <path d="M8 215 C70 175, 112 160, 178 176 S290 208, 420 165" className="road" />
          <path d="M250 24 C282 62, 304 96, 292 138 C279 183, 234 198, 197 174 C161 150, 159 98, 188 62 C204 42, 225 31, 250 24Z" className="radar-range" />
          <path d="M250 52 C272 79, 283 104, 276 132 C268 162, 238 173, 213 158 C188 142, 187 108, 206 82 C217 67, 231 57, 250 52Z" className="radar-range inner" />
          <path d="M314 70 C358 48, 423 55, 469 90 C514 124, 508 171, 452 183 C390 197, 315 165, 293 126 C281 105, 289 83, 314 70Z" fill="url(#radarCell)" opacity=".82" filter="url(#radarGlow)" />
          <path d="M382 88 C413 75, 454 88, 468 112 C484 140, 452 162, 407 153 C367 146, 353 102, 382 88Z" fill="#ff7a18" opacity=".72" filter="url(#radarGlow)" />
          <path d="M444 112 C466 101, 493 111, 502 132 C513 158, 482 175, 448 166 C418 157, 418 126, 444 112Z" fill="#ff2e63" opacity=".76" filter="url(#radarGlow)" />
          <path d="M260 92 C291 80, 319 91, 332 111 C348 136, 318 155, 280 150 C244 145, 228 106, 260 92Z" fill="#4dff6b" opacity=".45" filter="url(#radarGlow)" />
          <path d="M220 28 C260 8, 316 4, 348 23 C320 42, 264 49, 219 42Z" fill="#67e8f9" opacity=".16" />
        </svg>
        <div className="radar-noaa-band" />
        <span className="map-label abingdon">{radar.labels[0]}</span>
        <span className="map-label bristol">{radar.labels[1]}</span>
        <span className="map-label wytheville">{radar.labels[2]}</span>
        <span className="station-dot" aria-label="Station location" />
        <span className="radar-crosshair horizontal" />
        <span className="radar-crosshair vertical" />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '47%',
            top: '28%',
            width: '46%',
            height: '58%',
            borderRadius: '999px',
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,.22), transparent 16%, rgba(103,232,249,.12), transparent 58%)',
            transform: 'rotate(-10deg)',
            mixBlendMode: 'screen',
          }}
        />
      </div>
      <div className={`radar-placeholder-label ${radar.configured ? 'configured' : ''}`}>
        {radar.statusLabel}
      </div>
      <div className="radar-legend">
        {radar.legend.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      {radar.externalUrl && (
        <a className="radar-open-link" href={radar.externalUrl} target="_blank" rel="noreferrer">
          Open {radar.sourceName}
        </a>
      )}
      <div className="panel-source">{radar.sourceName}{radar.updatedAt ? ` • ${new Date(radar.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</div>
    </GlassCard>
  );
}
