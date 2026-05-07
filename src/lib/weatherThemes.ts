import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Flame,
  HelpCircle,
  Moon,
  Snowflake,
  Sun,
  ThermometerSnowflake,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { WeatherCondition } from '../types/weather';

export type AnimationType = 'rain' | 'lightning' | 'snow' | 'fog' | 'wind' | 'heat' | 'none';

export interface ConditionTheme {
  condition: WeatherCondition;
  label: string;
  accent: string;
  secondaryAccent?: string;
  accentSoft: string;
  gradient: string;
  cardGradient: string;
  heroScene?: string;
  forecastScene?: string;
  cameraScene?: string;
  animationType: AnimationType;
  animation?: AnimationType;
  particleClass?: string;
  overlayGradient?: string;
  textShadow?: string;
  borderGlow?: string;
  mood?: string;
  textColor: string;
  icon: LucideIcon;
}

const themes: Record<WeatherCondition, ConditionTheme> = {
  Rain: {
    condition: 'Rain',
    label: 'Rain',
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.22)',
    gradient:
      'radial-gradient(circle at 68% 22%, rgba(125, 211, 252, 0.28), transparent 25%), linear-gradient(135deg, #020812 0%, #061827 44%, #0a1722 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(2,8,18,.42), rgba(8,30,48,.5)), radial-gradient(circle at 40% 30%, rgba(56,189,248,.24), transparent 34%), linear-gradient(160deg,#06111e,#0b2234 58%,#04101c)',
    animationType: 'rain',
    textColor: '#f8fbff',
    icon: CloudRain,
  },
  Showers: {
    condition: 'Showers',
    label: 'Showers',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.2)',
    gradient: 'linear-gradient(135deg, #07111d 0%, #0c2940 48%, #07101c 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(5,15,28,.34), rgba(10,50,72,.46)), radial-gradient(circle at 30% 30%, rgba(14,165,233,.34), transparent 35%), linear-gradient(160deg,#0b1524,#113349)',
    animationType: 'rain',
    textColor: '#f8fbff',
    icon: CloudRain,
  },
  Thunderstorms: {
    condition: 'Thunderstorms',
    label: "T'storms",
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.24)',
    gradient: 'radial-gradient(circle at 78% 12%, rgba(216,180,254,.38), transparent 20%), linear-gradient(135deg, #080715 0%, #171137 55%, #050813 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(8,7,21,.35), rgba(48,20,86,.55)), radial-gradient(circle at 70% 24%, rgba(192,132,252,.44), transparent 28%), linear-gradient(160deg,#080516,#25114b)',
    animationType: 'lightning',
    textColor: '#faf7ff',
    icon: CloudLightning,
  },
  'Partly Cloudy': {
    condition: 'Partly Cloudy',
    label: 'Partly Cloudy',
    accent: '#fbbf24',
    accentSoft: 'rgba(251, 191, 36, 0.24)',
    gradient: 'linear-gradient(135deg, #0b1d34 0%, #244f73 50%, #b76c35 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(7,20,35,.25), rgba(91,84,50,.42)), radial-gradient(circle at 70% 28%, rgba(251,191,36,.5), transparent 22%), linear-gradient(160deg,#123457,#c06a2f)',
    animationType: 'none',
    textColor: '#fff7ed',
    icon: CloudSun,
  },
  Cloudy: {
    condition: 'Cloudy',
    label: 'Cloudy',
    accent: '#94a3b8',
    accentSoft: 'rgba(148, 163, 184, 0.24)',
    gradient: 'linear-gradient(135deg, #07111c 0%, #263645 54%, #101821 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(7,17,28,.38), rgba(55,65,81,.5)), radial-gradient(circle at 40% 28%, rgba(203,213,225,.2), transparent 34%), linear-gradient(160deg,#101722,#334155)',
    animationType: 'fog',
    textColor: '#f8fafc',
    icon: Cloud,
  },
  Sunny: {
    condition: 'Sunny',
    label: 'Sunny',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.24)',
    gradient: 'radial-gradient(circle at 68% 18%, rgba(253,224,71,.55), transparent 20%), linear-gradient(135deg, #15304e 0%, #cf7c27 62%, #44220b 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(16,32,48,.22), rgba(169,90,20,.42)), radial-gradient(circle at 72% 24%, rgba(253,224,71,.72), transparent 22%), linear-gradient(160deg,#164263,#e28a28)',
    animationType: 'none',
    textColor: '#fffaf0',
    icon: Sun,
  },
  'Mostly Sunny': {
    condition: 'Mostly Sunny',
    label: 'Mostly Sunny',
    accent: '#facc15',
    accentSoft: 'rgba(250, 204, 21, 0.22)',
    gradient: 'radial-gradient(circle at 70% 24%, rgba(250,204,21,.55), transparent 18%), linear-gradient(135deg, #082141 0%, #1f6fa0 50%, #d1842e 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(8,33,65,.24), rgba(216,129,46,.38)), radial-gradient(circle at 72% 24%, rgba(250,204,21,.7), transparent 20%), linear-gradient(160deg,#0d3a68,#2b82ad 54%,#d98d37)',
    animationType: 'none',
    textColor: '#fffdf5',
    icon: CloudSun,
  },
  'Clear Night': {
    condition: 'Clear Night',
    label: 'Clear Night',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.22)',
    gradient: 'radial-gradient(circle at 72% 18%, rgba(191,219,254,.25), transparent 16%), linear-gradient(135deg, #010615 0%, #081b3a 60%, #020817 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(1,6,21,.32), rgba(8,27,58,.48)), radial-gradient(circle at 74% 20%, rgba(191,219,254,.36), transparent 18%), linear-gradient(160deg,#020817,#102a56)',
    animationType: 'none',
    textColor: '#eff6ff',
    icon: Moon,
  },
  Snow: {
    condition: 'Snow',
    label: 'Snow',
    accent: '#bae6fd',
    accentSoft: 'rgba(186, 230, 253, 0.24)',
    gradient: 'linear-gradient(135deg, #061625 0%, #265272 52%, #dbeafe 140%)',
    cardGradient:
      'linear-gradient(145deg, rgba(6,22,37,.34), rgba(38,82,114,.46)), radial-gradient(circle at 55% 30%, rgba(240,249,255,.38), transparent 30%), linear-gradient(160deg,#082033,#4580a4)',
    animationType: 'snow',
    textColor: '#f8fbff',
    icon: CloudSnow,
  },
  Fog: {
    condition: 'Fog',
    label: 'Fog',
    accent: '#cbd5e1',
    accentSoft: 'rgba(203, 213, 225, 0.2)',
    gradient: 'linear-gradient(135deg, #111827 0%, #475569 56%, #111827 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(17,24,39,.34), rgba(71,85,105,.48)), radial-gradient(circle at 50% 45%, rgba(226,232,240,.26), transparent 36%), linear-gradient(160deg,#172033,#4b5563)',
    animationType: 'fog',
    textColor: '#f8fafc',
    icon: CloudFog,
  },
  Windy: {
    condition: 'Windy',
    label: 'Windy',
    accent: '#67e8f9',
    accentSoft: 'rgba(103, 232, 249, 0.2)',
    gradient: 'linear-gradient(135deg, #04101f 0%, #0f3b59 58%, #06111e 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(4,16,31,.36), rgba(15,59,89,.46)), radial-gradient(circle at 62% 35%, rgba(103,232,249,.24), transparent 30%), linear-gradient(160deg,#061425,#155073)',
    animationType: 'wind',
    textColor: '#f0fdff',
    icon: Wind,
  },
  Haze: {
    condition: 'Haze',
    label: 'Haze',
    accent: '#fcd34d',
    accentSoft: 'rgba(252, 211, 77, 0.18)',
    gradient: 'linear-gradient(135deg, #161713 0%, #6b6140 58%, #1f1b13 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(22,23,19,.34), rgba(107,97,64,.48)), radial-gradient(circle at 60% 36%, rgba(252,211,77,.28), transparent 34%), linear-gradient(160deg,#201f19,#756a45)',
    animationType: 'fog',
    textColor: '#fffbea',
    icon: Sun,
  },
  'Extreme Heat': {
    condition: 'Extreme Heat',
    label: 'Extreme Heat',
    accent: '#fb7185',
    accentSoft: 'rgba(251, 113, 133, 0.22)',
    gradient: 'radial-gradient(circle at 70% 22%, rgba(251,113,133,.48), transparent 20%), linear-gradient(135deg, #1f0a0a 0%, #7f1d1d 54%, #f97316 120%)',
    cardGradient:
      'linear-gradient(145deg, rgba(31,10,10,.38), rgba(127,29,29,.52)), radial-gradient(circle at 72% 24%, rgba(251,113,133,.5), transparent 24%), linear-gradient(160deg,#240b0b,#9f2a1c)',
    animationType: 'heat',
    textColor: '#fff7ed',
    icon: Flame,
  },
  Freezing: {
    condition: 'Freezing',
    label: 'Freezing',
    accent: '#93c5fd',
    accentSoft: 'rgba(147, 197, 253, 0.24)',
    gradient: 'linear-gradient(135deg, #031024 0%, #1d4e89 54%, #dbeafe 130%)',
    cardGradient:
      'linear-gradient(145deg, rgba(3,16,36,.36), rgba(29,78,137,.5)), radial-gradient(circle at 60% 32%, rgba(191,219,254,.35), transparent 30%), linear-gradient(160deg,#05152c,#2563a9)',
    animationType: 'snow',
    textColor: '#eff6ff',
    icon: ThermometerSnowflake,
  },
  Unknown: {
    condition: 'Unknown',
    label: 'Unknown',
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.2)',
    gradient: 'linear-gradient(135deg, #020812 0%, #102033 58%, #020812 100%)',
    cardGradient:
      'linear-gradient(145deg, rgba(2,8,18,.36), rgba(16,32,51,.48)), radial-gradient(circle at 50% 30%, rgba(34,211,238,.18), transparent 30%), linear-gradient(160deg,#020812,#152238)',
    animationType: 'none',
    textColor: '#f8fafc',
    icon: HelpCircle,
  },
};

export const allConditions = Object.keys(themes) as WeatherCondition[];

export function normalizeCondition(rawCondition: unknown): WeatherCondition {
  const value = String(rawCondition || '').trim().toLowerCase();
  if (!value) return 'Unknown';
  if (/(thunder|t-storm|tstorm|storm)/.test(value)) return 'Thunderstorms';
  if (/(rain shower|showers|shower|drizzle)/.test(value)) return 'Showers';
  if (/(heavy rain|light rain|rain)/.test(value)) return 'Rain';
  if (/(flurries|snow)/.test(value)) return 'Snow';
  if (/(sleet|freezing rain|ice|freez)/.test(value)) return 'Freezing';
  if (/(fog|mist)/.test(value)) return 'Fog';
  if (/(haze|smoke)/.test(value)) return 'Haze';
  if (/wind/.test(value)) return 'Windy';
  if (/mostly sunny/.test(value)) return 'Mostly Sunny';
  if (/(partly cloudy|partly sunny)/.test(value)) return 'Partly Cloudy';
  if (/(mostly cloudy|cloudy|overcast)/.test(value)) return 'Cloudy';
  if (/clear night/.test(value)) return 'Clear Night';
  if (/clear/.test(value)) return 'Clear Night';
  if (/sunny/.test(value)) return 'Sunny';
  if (/(hot|heat)/.test(value)) return 'Extreme Heat';
  return 'Unknown';
}

export function getConditionTheme(condition: WeatherCondition): ConditionTheme {
  return themes[normalizeCondition(condition)] ?? themes.Unknown;
}

export function getConditionIcon(condition: WeatherCondition): LucideIcon {
  return getConditionTheme(condition).icon;
}

export function getConditionLabel(condition: WeatherCondition): string {
  return getConditionTheme(condition).label;
}

export function getForecastBackground(condition: WeatherCondition): string {
  return getConditionTheme(condition).cardGradient;
}

export function getHeroSceneTheme(condition: WeatherCondition): ConditionTheme {
  return getConditionTheme(condition);
}

export function getForecastCardTheme(condition: WeatherCondition): ConditionTheme {
  return getConditionTheme(condition);
}

export function getCameraSceneTheme(condition: WeatherCondition): ConditionTheme {
  return getConditionTheme(condition);
}

export function getSeverityColor(severity: string): string {
  if (severity === 'warning') return '#ef4444';
  if (severity === 'advisory') return '#f59e0b';
  if (severity === 'watch') return '#f97316';
  return '#22c55e';
}

export function getUvLabel(index: number): string {
  if (index <= 2) return 'Low';
  if (index <= 5) return 'Moderate';
  if (index <= 7) return 'High';
  if (index <= 10) return 'Very High';
  return 'Extreme';
}

export function getAqiLabel(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy SG';
  if (aqi <= 200) return 'Unhealthy';
  return 'Very Unhealthy';
}
