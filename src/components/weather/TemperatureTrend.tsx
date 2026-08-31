import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import type { HourlyTrendPoint } from '../../types/weather';
import { GlassCard } from '../ui/GlassCard';

export function TemperatureTrend({ data }: { data: HourlyTrendPoint[] }) {
  return (
    <GlassCard className="trend-panel">
      <div className="panel-kicker">
        Temperature Trend <span className="trend-kicker-muted">(24H)</span>
      </div>
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="rgba(85, 111, 139, .12)" vertical={false} />
            <XAxis dataKey="time" stroke="rgba(69, 91, 116, .68)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis domain={[40, 85]} stroke="rgba(69, 91, 116, .68)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: '#061a36',
                border: '1px solid rgba(104,155,214,.42)',
                borderRadius: 10,
                color: 'white',
                boxShadow: '0 10px 28px rgba(7,28,55,.18)',
              }}
            />
            <Legend wrapperStyle={{ color: '#5f7188', fontSize: 10 }} />
            <Line type="monotone" name="Temp (F)" dataKey="temp" stroke="#f28b32" strokeWidth={2.4} dot={false} />
            <Line type="monotone" name="Feels Like (F)" dataKey="feelsLike" stroke="#2b7de9" strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
