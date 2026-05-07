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

export function MetricCard({ title, value, unit, label, icon: Icon, data = [], scale, accent = '#22d3ee', children }: MetricCardProps) {
  const chartData = data.map((v, index) => ({ index, value: v }));

  return (
    <GlassCard className="metric-card">
      <div className="metric-title">{title}</div>
      <Icon className="mb-3 h-8 w-8" style={{ color: accent }} strokeWidth={1.6} />
      <div className="flex items-end gap-1">
        <span className="metric-value">{value}</span>
        {unit && <span className="mb-2 text-sm text-white/80">{unit}</span>}
      </div>
      <p className="text-sm text-white/80">{label}</p>
      {children ? (
        <div className="mt-auto">{children}</div>
      ) : (
        <div className="mt-auto h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area type="monotone" dataKey="value" stroke="#4ade80" fill="rgba(74,222,128,.18)" strokeWidth={2} dot={false} />
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
