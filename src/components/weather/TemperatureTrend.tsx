import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import type { HourlyTrendPoint } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function TemperatureTrend({ data }: { data: HourlyTrendPoint[] }) {
  return (
    <GlassCard className="trend-panel">
      <div className="panel-kicker">
        Temperature Trend <span className="text-white/55">(24H)</span>
      </div>
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, .12)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,.55)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis domain={[40, 85]} stroke="rgba(255,255,255,.55)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(3, 10, 22, .92)',
                border: '1px solid rgba(34,211,238,.35)',
                borderRadius: 12,
                color: 'white',
              }}
            />
            <Legend wrapperStyle={{ color: 'white', fontSize: 10 }} />
            <Line type="monotone" name="Temp (F)" dataKey="temp" stroke="#f97316" strokeWidth={2.4} dot={false} />
            <Line type="monotone" name="Feels Like (F)" dataKey="feelsLike" stroke="#0ea5e9" strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
