import { GlassCard } from '../ui/GlassCard';
import type { RadarMetadata } from '../../types/weather';

export function RadarPanel({ radar }: { radar: RadarMetadata }) {
  return (
    <GlassCard className="radar-panel">
      <div className="panel-kicker">Radar Context</div>
      <div className="radar-map">
        <svg viewBox="0 0 500 220" aria-hidden="true">
          <path d="M-30 185 C70 120, 105 142, 170 92 S292 56, 365 30 S450 40, 535 -4" className="road road-major" />
          <path d="M-10 64 C65 90, 135 80, 205 125 S333 170, 510 130" className="road" />
          <path d="M128 -20 C135 60, 170 130, 155 240" className="road" />
          <path d="M8 215 C70 175, 112 160, 178 176 S290 208, 420 165" className="road" />
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
