import { GlassCard } from '../ui/GlassCard';
import type { RadarMetadata } from '../../types/weather';

export function RadarPanel({ radar }: { radar: RadarMetadata }) {
  return (
    <GlassCard className="radar-panel">
      <div className="panel-kicker">Radar Context</div>
      <div className="radar-map">
        <div className="radar-terrain terrain-a" />
        <div className="radar-terrain terrain-b" />
        <div className="radar-sweep" />
        <svg viewBox="0 0 500 220" aria-hidden="true">
          <path d="M-30 185 C70 120, 105 142, 170 92 S292 56, 365 30 S450 40, 535 -4" className="road road-major" />
          <path d="M-10 64 C65 90, 135 80, 205 125 S333 170, 510 130" className="road" />
          <path d="M128 -20 C135 60, 170 130, 155 240" className="road" />
          <path d="M8 215 C70 175, 112 160, 178 176 S290 208, 420 165" className="road" />
          <path d="M250 24 C282 62, 304 96, 292 138 C279 183, 234 198, 197 174 C161 150, 159 98, 188 62 C204 42, 225 31, 250 24Z" className="radar-range" />
          <path d="M250 52 C272 79, 283 104, 276 132 C268 162, 238 173, 213 158 C188 142, 187 108, 206 82 C217 67, 231 57, 250 52Z" className="radar-range inner" />
        </svg>
        {radar.configured && !radar.isPlaceholder && (
          <>
            <div className="radar-rain rain-a" />
            <div className="radar-rain rain-b" />
            <div className="radar-rain rain-c" />
          </>
        )}
        <span className="map-label abingdon">{radar.labels[0]}</span>
        <span className="map-label bristol">{radar.labels[1]}</span>
        <span className="map-label wytheville">{radar.labels[2]}</span>
        <span className="station-dot" aria-label="Station location" />
        <span className="radar-crosshair horizontal" />
        <span className="radar-crosshair vertical" />
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
