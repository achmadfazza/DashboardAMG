import { memo } from 'react';
import type { CSSProperties } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import type { OeeChartCardProps } from '../../types/oee';

// Matches recharts LabelList `content` prop: all fields optional.
interface BarLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: string | number | boolean | null;
}

// Factories so label colors can follow the theme. Created per theme (not
// per render) inside the memoized component.
const makeOeeBarLabel = (fill: string) => ({ x = 0, y = 0, width = 0, value = 0 }: BarLabelProps) => (
  <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} fill={fill} textAnchor="middle" fontSize={10} fontWeight="bold">
    {Number(value).toFixed(1)}%
  </text>
);

const makeActualBarLabel = (fill: string) => ({ x = 0, y = 0, width = 0, value = 0 }: BarLabelProps) => (
  <text x={Number(x) + Number(width) / 2} y={Number(y) + 12} fill={fill} textAnchor="middle" fontSize={10}>
    {String(value)}k
  </text>
);

// Theme-independent config hoisted so recharts never receives new identities.
const CHART_MARGIN = { top: 20, right: 0, left: 0, bottom: 0 };
const LEFT_DOMAIN: [number, number] = [0, 120];
const RIGHT_DOMAIN: [number, number] = [0, 500];
const TARGET_DOT = { r: 4, fill: '#ef4444', strokeWidth: 0 };
const TARGET_ACTIVE_DOT = { r: 6 };
const formatPercentTick = (val: number | string) => `${val}%`;
const formatKTick = (val: number | string) => `${val}k`;

const OeeChartCard = memo(function OeeChartCard({ title, tags, data, dataKeyActual = 'actual' }: OeeChartCardProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  // Recharts takes inline props (no CSS classes), so colors must switch here.
  const gridStroke = dark ? '#334155' : '#e2e8f0';
  const tickFill = dark ? '#94a3b8' : '#64748b';
  const oeeLabelFill = dark ? '#cbd5e1' : '#475569';
  const tooltipStyle: CSSProperties = dark
    ? { borderRadius: '8px', border: 'none', backgroundColor: '#1A202C', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.4)' }
    : { borderRadius: '8px', border: 'none', backgroundColor: '#ffffff', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };
  const cursorFill = dark ? '#1e293b' : '#f8fafc';
  const legendStyle: CSSProperties = { fontSize: '12px', fontWeight: '600', color: tickFill };

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-md shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-extrabold text-gray-800 dark:text-white/90 text-sm tracking-widest uppercase">{title}</h3>
        <span className="bg-brand-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
          {tags}
        </span>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={CHART_MARGIN}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickFill, fontWeight: 'bold' }} axisLine={false} tickLine={false} />

            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatPercentTick}
              domain={LEFT_DOMAIN}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatKTick}
              domain={RIGHT_DOMAIN}
            />

            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: cursorFill }}
            />
            <Legend wrapperStyle={legendStyle} iconType="square" />

            <Bar yAxisId="left" dataKey="oee" name="OEE %" fill="#3b82f6" barSize={20} radius={[2, 2, 0, 0]}>
              <LabelList dataKey="oee" content={makeOeeBarLabel(oeeLabelFill)} />
            </Bar>
            <Bar yAxisId="right" dataKey={dataKeyActual} name="Actual Pads" fill="#fbbf24" barSize={20} radius={[2, 2, 0, 0]}>
              <LabelList dataKey={dataKeyActual} content={makeActualBarLabel(tickFill)} />
            </Bar>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="target"
              name="Target OEE"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={TARGET_DOT}
              activeDot={TARGET_ACTIVE_DOT}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default OeeChartCard;
