import type { LucideIcon } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { GlassCard } from './GlassCard';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  label: string;
  icon: LucideIcon;
  data?: number[];
  scale: string[];
  accent?: string;
  children?: React.ReactNode;
}

export function MetricCard({ title, value, unit, label, icon: Icon, data = [], scale, accent = '#2b7de9', children }: MetricCardProps) {
  const chartData = data.map((v, index) => ({ index, value: v }));

  return (
    <GlassCard className="metric-card">
      <div className="metric-head">
        <div className="metric-title">{title}</div>
        <span className="metric-icon-wrap">
          <Icon style={{ color: accent }} strokeWidth={1.7} />
        </span>
      </div>
      <div className="metric-readout">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <p className="metric-label">{label}</p>
      {children ? (
        <div className="metric-children">{children}</div>
      ) : (
        <div className="metric-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area type="monotone" dataKey="value" stroke="#2b7de9" fill="rgba(43,125,233,.10)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="metric-scale">
        {scale.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </GlassCard>
  );
}
