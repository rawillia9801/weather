import { ArrowRight } from 'lucide-react';
import type { WeatherCondition } from '../../types/weather';
import { ConditionBackdrop } from './ConditionBackdrop';

export function StationCamera({ condition, snapshotUrl, name }: { condition: WeatherCondition; snapshotUrl?: string; name: string }) {
  return (
    <ConditionBackdrop condition={condition} className="camera-panel">
      <div className="flex items-center justify-between">
        <div className="panel-kicker">Station Camera</div>
        <span className="camera-state">{snapshotUrl ? 'CONFIGURED' : 'OFFLINE'}</span>
      </div>
      <div className="camera-preview">
        <span>{name}</span>
      </div>
      {snapshotUrl ? (
        <a className="camera-button" href={snapshotUrl} target="_blank" rel="noreferrer">
          View Camera <ArrowRight className="h-4 w-4" />
        </a>
      ) : (
        <button type="button" className="camera-button" disabled>
          Camera Unavailable <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </ConditionBackdrop>
  );
}
