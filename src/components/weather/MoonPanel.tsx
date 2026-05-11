import { Info } from 'lucide-react';
import type { MoonData } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

function phaseGeometry(moon: MoonData) {
  const phase = String(moon.phase || '').toLowerCase();
  const value = typeof moon.phaseValue === 'number' ? Math.max(0, Math.min(1, moon.phaseValue)) : 0.5;
  const illumination = Math.max(0, Math.min(100, Number(moon.illumination) || 0));
  const litWidth = 10 + illumination * 0.9;
  const isWaxing = phase.includes('waxing') || (value > 0 && value < 0.5);
  const isNew = illumination <= 3 || phase.includes('new');
  const isFull = illumination >= 97 || phase.includes('full');

  if (isNew) {
    return { shadowX: 50, shadowWidth: 116, shadowOpacity: 0.93, litClipX: isWaxing ? 82 : 8, litClipWidth: 10 };
  }

  if (isFull) {
    return { shadowX: isWaxing ? -95 : 195, shadowWidth: 108, shadowOpacity: 0.08, litClipX: 0, litClipWidth: 100 };
  }

  return {
    shadowX: isWaxing ? 6 + litWidth * 0.38 : 94 - litWidth * 0.38,
    shadowWidth: Math.max(24, 112 - litWidth * 0.52),
    shadowOpacity: 0.84,
    litClipX: isWaxing ? 100 - litWidth : 0,
    litClipWidth: litWidth,
  };
}

function MoonVisual({ moon }: { moon: MoonData }) {
  const geometry = phaseGeometry(moon);

  return (
    <svg
      aria-label={`${moon.phase} moon phase`}
      role="img"
      viewBox="0 0 120 120"
      style={{
        position: 'absolute',
        right: '13%',
        top: 5,
        width: 'clamp(86px, 6.4vw, 112px)',
        height: 'clamp(86px, 6.4vw, 112px)',
        filter: 'drop-shadow(0 0 22px rgba(191,219,254,.32)) drop-shadow(0 0 52px rgba(59,130,246,.18))',
      }}
    >
      <defs>
        <radialGradient id="moonSurface" cx="34%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fffef4" />
          <stop offset="24%" stopColor="#dfe4ea" />
          <stop offset="56%" stopColor="#aeb8c6" />
          <stop offset="82%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#2f3745" />
        </radialGradient>
        <radialGradient id="moonHighlands" cx="48%" cy="45%" r="62%">
          <stop offset="0%" stopColor="rgba(255,255,255,.34)" />
          <stop offset="52%" stopColor="rgba(203,213,225,.16)" />
          <stop offset="100%" stopColor="rgba(15,23,42,.52)" />
        </radialGradient>
        <radialGradient id="moonShadow" cx="50%" cy="48%" r="54%">
          <stop offset="0%" stopColor="rgba(2,6,23,.72)" />
          <stop offset="62%" stopColor="rgba(2,6,23,.88)" />
          <stop offset="100%" stopColor="rgba(2,6,23,.98)" />
        </radialGradient>
        <clipPath id="moonDiscClip">
          <circle cx="60" cy="60" r="48" />
        </clipPath>
        <clipPath id="moonLitClip">
          <rect x={geometry.litClipX} y="0" width={geometry.litClipWidth} height="120" />
        </clipPath>
        <filter id="moonTextureNoise">
          <feTurbulence baseFrequency="0.82" numOctaves="3" seed="11" type="fractalNoise" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 .16" />
          </feComponentTransfer>
        </filter>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      <circle cx="60" cy="60" r="49" fill="rgba(96,165,250,.13)" />
      <g clipPath="url(#moonDiscClip)">
        <circle cx="60" cy="60" r="48" fill="url(#moonSurface)" />
        <circle cx="60" cy="60" r="48" filter="url(#moonTextureNoise)" opacity=".95" />
        <circle cx="60" cy="60" r="48" fill="url(#moonHighlands)" opacity=".62" />

        <ellipse cx="38" cy="40" rx="10" ry="6" fill="#6f7886" opacity=".32" transform="rotate(-18 38 40)" />
        <ellipse cx="72" cy="44" rx="13" ry="8" fill="#586273" opacity=".28" transform="rotate(21 72 44)" />
        <ellipse cx="49" cy="72" rx="15" ry="9" fill="#4b5563" opacity=".25" transform="rotate(11 49 72)" />
        <ellipse cx="80" cy="77" rx="9" ry="13" fill="#334155" opacity=".23" transform="rotate(-31 80 77)" />
        <circle cx="54" cy="53" r="4.5" fill="#263244" opacity=".26" />
        <circle cx="85" cy="55" r="3.8" fill="#1f2937" opacity=".22" />
        <circle cx="67" cy="89" r="3.6" fill="#1f2937" opacity=".18" />
        <circle cx="32" cy="62" r="3.2" fill="#334155" opacity=".17" />
        <path d="M20 58 C34 48, 44 52, 54 42 S82 22, 105 35" stroke="rgba(255,255,255,.22)" strokeWidth="2" fill="none" opacity=".36" />
        <path d="M12 84 C30 76, 52 88, 70 78 S94 66, 113 72" stroke="rgba(15,23,42,.22)" strokeWidth="3" fill="none" opacity=".35" />

        <g clipPath="url(#moonLitClip)">
          <circle cx="60" cy="60" r="48" fill="rgba(255,255,255,.16)" />
        </g>
        <ellipse
          cx={geometry.shadowX}
          cy="60"
          rx={geometry.shadowWidth / 2}
          ry="51"
          fill="url(#moonShadow)"
          opacity={geometry.shadowOpacity}
          filter="url(#softBlur)"
        />
        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(15,23,42,.46)" strokeWidth="3" />
      </g>
    </svg>
  );
}

export function MoonPanel({ moon }: { moon: MoonData }) {
  const skyWatch = [moon.nextFullMoon && `Full ${moon.nextFullMoon}`, moon.nextNewMoon && `New ${moon.nextNewMoon}`].filter(Boolean).join(' | ');

  return (
    <GlassCard className="moon-panel">
      <div className="flex items-center gap-2">
        <div className="panel-kicker">Current Moon</div>
        <Info className="h-4 w-4 text-white/55" />
      </div>
      <div className="moon-sky">
        <MoonVisual moon={moon} />
      </div>
      <div className="moon-copy">
        <div className="moon-phase">{moon.phase}</div>
        <div className="moon-details">
          <span>Illumination: {moon.illumination}%</span>
          <span>Age: {moon.age} days</span>
        </div>
        {skyWatch && <div className="moon-event">Sky Watch: {skyWatch}</div>}
        {moon.skyEvent && <div className="moon-event">{moon.skyEvent}</div>}
      </div>
    </GlassCard>
  );
}
