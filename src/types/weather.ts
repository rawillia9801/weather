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
}

export interface ForecastDay {
  day: string;
  condition: WeatherCondition;
  high: number;
  low: number;
  precipitationChance: number;
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
}

export interface MoonData {
  phase: string;
  illumination: number;
  age: number;
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
  today: number;
  week: number;
  month: number;
  year: number;
}

export interface LightningData {
  total: number;
  nearStation: number;
  cloudStrikes: number;
  cloudToGround: number;
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
  camera: {
    snapshotUrl: string;
    name: string;
  };
}
