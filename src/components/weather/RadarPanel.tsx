import { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import type { RadarMetadata } from '../../types/weather';

const LOCAL_RADAR = 'https://radar.weather.gov/ridge/standard/KFCX_loop.gif';

export function RadarPanel({ radar }: { radar: RadarMetadata }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const externalUrl = radar.externalUrl || 'https://radar.weather.gov/station/KFCX/standard';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setImageFailed(false);
      setRefreshKey(Date.now());
    }, 120000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <GlassCard className="radar-panel">
      <div className="radar-heading">
        <div className="panel-kicker">Local Radar</div>
        <span>NWS · KFCX</span>
      </div>
      <div className="radar-map nws-radar-map">
        {imageFailed ? (
          <div className="radar-image-error">Radar image unavailable. Open the NWS map below.</div>
        ) : (
          <img
            src={`${LOCAL_RADAR}?refresh=${refreshKey}`}
            alt="Animated National Weather Service radar for southwest Virginia, including the Marion region"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <div className="radar-legend">
        {['Light', 'Moderate', 'Heavy', 'Severe'].map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="radar-footer">
        <span>Southwest Virginia · NWS animated radar</span>
        <a href={externalUrl} target="_blank" rel="noreferrer">Full radar ↗</a>
      </div>
    </GlassCard>
  );
}
