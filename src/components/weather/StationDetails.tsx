import { MapPin, Mountain, Navigation, RadioTower } from 'lucide-react';
import type { StationInfo } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

function displayValue(value: string | undefined) {
  const normalized = String(value || '').trim();
  return normalized && !/^undefined|null$/i.test(normalized) ? normalized : 'Unavailable';
}

export function StationDetails({ station }: { station: StationInfo }) {
  const rows = [
    { label: 'Station ID', value: displayValue(station.id), icon: RadioTower },
    { label: 'Location', value: displayValue(station.location), icon: MapPin },
    { label: 'Elevation', value: displayValue(station.elevation), icon: Mountain },
  ];
  const latitude = displayValue(station.latitude);
  const longitude = displayValue(station.longitude);

  return (
    <GlassCard className="detail-panel station-details-panel">
      <div className="station-details-heading">
        <div>
          <div className="panel-kicker">Station Details</div>
          <div className="station-details-subtitle">Personal weather station telemetry</div>
        </div>
        <RadioTower className="station-details-icon" aria-hidden="true" />
      </div>

      <div className="station-detail-list">
        {rows.map(({ label, value, icon: Icon }) => (
          <div className="station-detail-row" key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="station-coordinate-row">
        <Navigation aria-hidden="true" />
        <span>Coordinates</span>
        <strong>{latitude} / {longitude}</strong>
      </div>
    </GlassCard>
  );
}
