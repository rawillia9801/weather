export type WeatherCondition =
  | 'Rain'
  | 'Showers'
  | 'Thunderstorms'
  | 'Partly Cloudy'
  | 'Cloudy'
  | 'Sunny'
  | 'Mostly Sunny'
  | 'Clear Night'
  | 'Snow'
  | 'Fog'
  | 'Windy'
  | 'Haze'
  | 'Extreme Heat'
  | 'Freezing'
  | 'Unknown';

export interface StationInfo {
  name: string;
  id: string;
  location: string;
  elevation: string;
  latitude: string;
  longitude: string;
}

export interface CurrentConditions {
  condition: WeatherCondition;
  temperature: number;
  feelsLike: number;
  high: number;
  low: number;
  humidity: number;
  humidityLabel: string;
  pressure: number;
  pressureTrend: string;
  windSpeed: number;
  windDirection: string;
  windGust: number;
  uvIndex: number;
  uvPeak?: number;
  uvPeakTime?: string;
  uvSource?: string;
}

export interface ForecastDay {
  day: string;
  date?: string;
  condition: WeatherCondition;
  high: number;
  low: number;
  precipitationChance: number;
  precipitationAmount?: number;
  snowfallAmount?: number;
  windGust?: number;
  source?: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: 'calm' | 'watch' | 'advisory' | 'warning';
}

export interface AirQuality {
  aqi: number | null;
  label: string;
  message: string;
  pollutants: { label: string; value: number | string }[];
  source?: string;
  updatedAt?: string | null;
  pollutantDriver?: string;
}

export interface MoonData {
  phase: string;
  illumination: number;
  age: number;
  phaseValue?: number;
  nextFullMoon?: string;
  nextNewMoon?: string;
  skyEvent?: string;
}

export interface SunMoonData {
  sunrise: string;
  daylight: string;
  sunset: string;
  moonrise: string;
  visible: string;
  moonset: string;
}

export interface PrecipitationData {
  today: number | null;
  week: number | null;
  month: number | null;
  year: number | null;
  todayLabel?: string;
  weekLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
  source?: string;
}

export interface LightningData {
  total: number | null;
  nearStation: number | null;
  cloudStrikes: number | null;
  cloudToGround: number | null;
  source?: string;
  statusLabel?: string;
  lastStrikeTime?: string | null;
  closestStrikeDistance?: number | null;
}

export interface StationStatus {
  online: boolean;
  signal: number;
  uptime: string;
  lastRestart: string;
  dataQuality: string;
  dataQualityScore: number;
}

export interface HourlyTrendPoint {
  time: string;
  temp: number;
  feelsLike: number;
}

export interface RadarMetadata {
  labels: string[];
  legend: string[];
  configured: boolean;
  sourceName: string;
  externalUrl?: string;
  statusLabel: string;
  updatedAt?: string | null;
  isPlaceholder?: boolean;
}

export interface WeatherSourceStatus {
  primary: string;
  forecast: string;
  current: string;
  aqi: string;
  radar: string;
  uv: string;
  lightning: string;
  errors: { source: string; message: string }[];
}

export interface WeatherStationData {
  station: StationInfo;
  clock: string;
  current: CurrentConditions;
  forecast: ForecastDay[];
  hourlyTrend: HourlyTrendPoint[];
  alerts: Alert[];
  airQuality: AirQuality;
  moon: MoonData;
  sunMoon: SunMoonData;
  radar: RadarMetadata;
  precipitation: PrecipitationData;
  lightning: LightningData;
  stationStatus: StationStatus;
  dataSource?: WeatherSourceStatus;
  camera: {
    snapshotUrl: string;
    name: string;
  };
}
