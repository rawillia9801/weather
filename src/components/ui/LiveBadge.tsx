interface LiveBadgeProps {
  label?: string;
  tone?: 'green' | 'cyan';
}

export function LiveBadge({ label = 'LIVE', tone = 'green' }: LiveBadgeProps) {
  return (
    <span className={`live-badge ${tone === 'cyan' ? 'live-badge-cyan' : ''}`}>
      <span className="live-dot" />
      {label}
    </span>
  );
}
