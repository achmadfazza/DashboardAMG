import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { AlertTriangle, Clock, Loader2, RefreshCw } from 'lucide-react';
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
import type { TooltipProps } from 'recharts';
import Card from './Card';
import { formatClockLabel, getPowerYAxisScale, usePowerMeterHistory } from '../../hooks/usePowerMeterHistory';

const API_URL: string = `${import.meta.env.VITE_NODE_RED_API_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_API_POWER_METER_PATH ?? ''}`;

// Only the meter series has a live source (Node-RED /api/power-meter, last 12
// hours). The previous inverter/load lines were hardcoded mock values plotted
// against fabricated timestamps, so they are intentionally not rendered here —
// add a line per LINES entry once a real endpoint backs it.
const LINE = {
  name: 'TotalPowerOnGrid',
  dataKey: 'meter',
  stroke: '#FBBF24',
} as const;

// Hoisted chart config: inline literals would give recharts new prop
// identities on every render, forcing full chart recomputation.
const CHART_MARGIN = { top: 5, right: 20, left: -20, bottom: 5 };
const X_TICK = { fill: '#94a3b8', fontSize: 14 };
const X_AXIS_LINE = { stroke: '#94a3b8', strokeOpacity: 0.4 };
const Y_TICK = { fill: '#94a3b8', fontSize: 14 };
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: '#1A202C',
  borderColor: '#4A5568',
  borderRadius: '8px',
  color: '#fff',
};
const TOOLTIP_ITEM_STYLE: CSSProperties = { fontSize: 16 };
const TOOLTIP_LABEL_STYLE: CSSProperties = { color: '#94a3b8', fontSize: 14, marginBottom: '4px' };
const LEGEND_WRAPPER_STYLE: CSSProperties = {
  fontSize: '14px',
  color: '#94a3b8',
  paddingTop: '20px',
};

const formatPowerKw = (value: unknown): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '--';

/** Hoisted so the tooltip does not get a new identity on every render. */
const TOOLTIP_FORMATTER: NonNullable<TooltipProps['formatter']> = (value) => [
  `${formatPowerKw(value)} kW`,
  '',
];

const FALLBACK_DOMAIN: [number, number] = [0, 1];

const PowerTrendChart = memo(function PowerTrendChart() {
  const { points, error, isLoading, isLive, lastUpdated, refresh } = usePowerMeterHistory(API_URL);

  // The Y axis follows the readings; the old hardcoded [0, 2250] ceiling
  // silently clipped real peaks above 2250 kW.
  const yScale = useMemo(() => getPowerYAxisScale(points.map((point) => point.meter)), [points]);

  const hasData = points.length > 0;
  const updatedLabel = lastUpdated !== null ? formatClockLabel(lastUpdated) : null;

  const statusDotClass = isLive
    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
    : error
      ? 'bg-error-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
      : 'bg-gray-400';

  return (
    <Card className="col-span-1 lg:col-span-2 flex flex-col">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-sky-500 dark:text-sky-400 mb-6">
        <Clock size={16} className="mr-2" />
        Last 12 hours
        <div className={`w-2 h-2 rounded-full ml-2 ${statusDotClass}`}></div>
        {isLoading ? (
          <span className="flex items-center gap-1 text-xs font-normal text-gray-500 dark:text-gray-400">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            Loading history
          </span>
        ) : error ? (
          <span
            className="flex items-center gap-1 text-xs font-normal text-error-600 dark:text-error-400"
            title={error.message}
          >
            <AlertTriangle size={12} aria-hidden="true" />
            {hasData ? 'Stale data' : 'Unavailable'}
            <button
              type="button"
              onClick={refresh}
              className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 underline underline-offset-2 hover:opacity-80"
            >
              <RefreshCw size={11} aria-hidden="true" />
              Retry
            </button>
          </span>
        ) : (
          updatedLabel && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Updated {updatedLabel}</span>
          )
        )}
      </div>
      {/* Explicit height: ResponsiveContainer with height="100%" inside an
          auto-height flex parent renders at 0px first, then re-renders via
          ResizeObserver. A fixed height renders once. */}
      <div className="h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              tick={X_TICK}
              axisLine={X_AXIS_LINE}
              tickLine={false}
              dy={10}
              // ~10 min samples across 12h: thin labels so they never collide.
              // 34px clears a 14px "12:30" label at its widest.
              interval="preserveStartEnd"
              minTickGap={34}
            />
            <YAxis
              stroke="#94a3b8"
              tick={Y_TICK}
              axisLine={false}
              tickLine={false}
              domain={hasData ? yScale.domain : FALLBACK_DOMAIN}
              ticks={hasData ? yScale.ticks : FALLBACK_DOMAIN}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              formatter={TOOLTIP_FORMATTER}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="plainline"
              iconSize={12}
              wrapperStyle={LEGEND_WRAPPER_STYLE}
            />
            <Line
              name={LINE.name}
              type="monotone"
              dataKey={LINE.dataKey}
              stroke={LINE.stroke}
              strokeWidth={2}
              dot={false}
              // Re-animating on every poll reads as a glitch; live data should
              // just settle into place.
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        {!isLoading && !hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {error ? 'No power meter data available' : 'Waiting for power meter data'}
            </span>
            {error && <span className="text-xs text-gray-400 dark:text-gray-500">{error.message}</span>}
          </div>
        )}
      </div>
    </Card>
  );
});

export default PowerTrendChart;
