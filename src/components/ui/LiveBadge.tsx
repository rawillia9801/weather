interface LiveBadgeProps {
  label?: string;
  tone?: 'green' | 'cyan' | 'amber';
}

export function LiveBadge({ label = 'LIVE', tone = 'green' }: LiveBadgeProps) {
  return (
    <span className={`live-badge ${tone === 'cyan' ? 'live-badge-cyan' : ''} ${tone === 'amber' ? 'live-badge-amber' : ''}`}>
      <span className="live-dot" />
      {label}
    </span>
  );
}
