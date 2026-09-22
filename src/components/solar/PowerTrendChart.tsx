import { memo } from 'react';
import type { CSSProperties } from 'react';
import { Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import Card from './Card';

const lineChartData = [
  { time: '05:00', inverter: 0, meter: 0, load: 500 },
  { time: '06:00', inverter: 200, meter: 100, load: 600 },
  { time: '07:00', inverter: 500, meter: 300, load: 800 },
  { time: '08:00', inverter: 1000, meter: 700, load: 1200 },
  { time: '09:00', inverter: 1500, meter: 1200, load: 1800 },
  { time: '10:00', inverter: 2000, meter: 1800, load: 2100 },
  { time: '11:00', inverter: 2200, meter: 1900, load: 2150 },
  { time: '12:00', inverter: 2100, meter: 1850, load: 2100 },
  { time: '13:00', inverter: 1900, meter: 1700, load: 2050 },
  { time: '14:00', inverter: 1500, meter: 1300, load: 1900 },
  { time: '15:00', inverter: 800, meter: 600, load: 1600 },
  { time: '16:00', inverter: 200, meter: 100, load: 1500 },
];

// Hoisted chart config: inline literals would give recharts new prop
// identities on every render, forcing full chart recomputation.
const CHART_MARGIN = { top: 5, right: 20, left: -20, bottom: 5 };
const X_TICK = { fill: '#94a3b8', fontSize: 12 };
const X_AXIS_LINE = { stroke: '#94a3b8', strokeOpacity: 0.4 };
const Y_TICK = { fill: '#94a3b8', fontSize: 12 };
const Y_DOMAIN: [number, number] = [0, 2250];
const Y_TICKS = [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250];
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: '#1A202C',
  borderColor: '#4A5568',
  borderRadius: '8px',
  color: '#fff',
};
const TOOLTIP_ITEM_STYLE: CSSProperties = { fontSize: 14 };
const LEGEND_WRAPPER_STYLE: CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  paddingTop: '20px',
};
const LINES = [
  { name: 'TotalActivePowerOfInverter', dataKey: 'inverter', stroke: '#10B981' },
  { name: 'TotalActivePowerOfMeter', dataKey: 'meter', stroke: '#FBBF24' },
  { name: 'TotalActivePowerOfLoad', dataKey: 'load', stroke: '#EF4444' },
];

const PowerTrendChart = memo(function PowerTrendChart() {
  return (
    <Card className="col-span-1 lg:col-span-2 flex flex-col">
      <div className="flex items-center text-sm font-medium text-sky-500 dark:text-sky-400 mb-6">
        <Clock size={16} className="mr-2" />
        Last 12 hours
        <div className="w-2 h-2 rounded-full bg-emerald-500 ml-2 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
      </div>
      {/* Explicit height: ResponsiveContainer with height="100%" inside an
          auto-height flex parent renders at 0px first, then re-renders via
          ResizeObserver. A fixed height renders once. */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineChartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              tick={X_TICK}
              axisLine={X_AXIS_LINE}
              tickLine={false}
              dy={10}
            />
            <YAxis
              stroke="#94a3b8"
              tick={Y_TICK}
              axisLine={false}
              tickLine={false}
              domain={Y_DOMAIN}
              ticks={Y_TICKS}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="plainline"
              iconSize={12}
              wrapperStyle={LEGEND_WRAPPER_STYLE}
            />
            {LINES.map((line) => (
              <Line
                key={line.dataKey}
                name={line.name}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});

export default PowerTrendChart;
