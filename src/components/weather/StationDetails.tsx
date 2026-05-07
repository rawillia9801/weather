import type { StationInfo } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function StationDetails({ station }: { station: StationInfo }) {
  const rows = [
    ['Station', station.id],
    ['Location', station.location],
    ['Elevation', station.elevation],
    ['Lat / Lon', `${station.latitude}, ${station.longitude}`],
  ];

  return (
    <GlassCard className="detail-panel">
      <div className="panel-kicker">Station Details</div>
      <div className="mt-3 space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[74px_1fr] gap-2">
            <span className="text-white/60">{label}:</span>
            <span className="font-medium text-white">{value}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
