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
import { useTotalPltsKw } from '../../hooks/useTotalPltsKw';
import { useTotalPlnKw } from '../../hooks/useTotalPlnKw';

const TOTAL_PLN_KWH_API_URL: string = `${import.meta.env.VITE_NODE_RED_API_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_API_TOTAL_PLN_KWH ?? ''}`;
const TOTAL_PLTS_KWH_API_URL: string = `${import.meta.env.VITE_NODE_RED_API_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_API_TOTAL_PLTS_KWH ?? ''}`;
const TOTAL_PLN_PLTS_KWH_API_URL: string = `${import.meta.env.VITE_NODE_RED_API_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_API_TOTAL_PLN_PLTS_KWH ?? ''}`;

const LINE_TOTAL_PLN = {
  name: 'Total PLN kW',
  dataKey: 'totalPlnKw',
  stroke: '#FBBF24',
} as const;

const LINE_TOTAL_PLTS = {
  name: 'Total PLTS kW',
  dataKey: 'totalPltsKw',
  stroke: '#3B82F6',
} as const;

const LINE_TOTAL_PLN_PLTS = {
  name: 'Total PLN & PLTS kW',
  dataKey: 'totalPlnPltsKw',
  stroke: '#EF4444',
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
const TOOLTIP_FORMATTER: NonNullable<TooltipProps['formatter']> = (value, name) => [
  `${formatPowerKw(value)} kW`,
  name,
];

const FALLBACK_DOMAIN: [number, number] = [0, 1];

interface MergedPoint {
  timestamp: number;
  time: string;
  totalPlnKw: number | null;
  totalPltsKw: number | null;
  totalPlnPltsKw: number | null;
}

const PowerTrendChart = memo(function PowerTrendChart() {
  const { points, error, isLoading, isLive, lastUpdated, refresh } = useTotalPlnKw(TOTAL_PLN_KWH_API_URL);
  const { points: totalPltsPoints, error: totalPltsError, isLoading: totalPltsLoading, isLive: totalPltsLive, lastUpdated: totalPltsLastUpdated, refresh: totalPltsRefresh } = useTotalPltsKw(TOTAL_PLTS_KWH_API_URL);
  const { points: totalPlnPltsPoints, error: totalPlnPltsError, isLoading: totalPlnPltsLoading, isLive: totalPlnPltsLive, lastUpdated: totalPlnPltsLastUpdated, refresh: totalPlnPltsRefresh } = usePowerMeterHistory(TOTAL_PLN_PLTS_KWH_API_URL);

  // Merge both series by timestamp so they share a single X axis. The two
  // endpoints stamp rows a few seconds apart (and PLTS returns two rows per
  // slot), so bucket timestamps to 10-minute marks — exact-ms matching left
  // almost every point unpaired and the lines in different x positions.
  const mergedPoints = useMemo<MergedPoint[]>(() => {
    const BUCKET_MS = 10 * 60 * 1000;
    const bucketOf = (timestamp: number): number => Math.floor(timestamp / BUCKET_MS) * BUCKET_MS;
    const timestampMap = new Map<number, MergedPoint>();

    // Points arrive oldest-first, so overwriting keeps the latest sample in
    // each 10-minute bucket (dedupes the PLTS double rows and any overlaps).
    for (const p of points) {
      const bucket = bucketOf(p.timestamp);
      const existing = timestampMap.get(bucket);
      if (existing) {
        existing.totalPlnKw = p.totalKw;
      } else {
        timestampMap.set(bucket, { timestamp: bucket, time: formatClockLabel(bucket), totalPlnKw: p.totalKw, totalPltsKw: null, totalPlnPltsKw: null });
      }
    }
    for (const p of totalPltsPoints) {
      const bucket = bucketOf(p.timestamp);
      const existing = timestampMap.get(bucket);
      if (existing) {
        existing.totalPltsKw = p.totalKw;
      } else {
        timestampMap.set(bucket, { timestamp: bucket, time: formatClockLabel(bucket), totalPlnKw: null, totalPltsKw: p.totalKw, totalPlnPltsKw: null });
      }
    }
    for (const p of totalPlnPltsPoints) {
      const bucket = bucketOf(p.timestamp);
      const existing = timestampMap.get(bucket);
      if (existing) {
        existing.totalPlnPltsKw = p.meter;
      } else {
        timestampMap.set(bucket, { timestamp: bucket, time: formatClockLabel(bucket), totalPlnKw: null, totalPltsKw: null, totalPlnPltsKw: p.meter });
      }
    }

    return Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [points, totalPltsPoints, totalPlnPltsPoints]);

  // The Y axis follows the readings; the old hardcoded [0, 2250] ceiling
  // silently clipped real peaks above 2250 kW.
  // One tick per hour: the 10-minute bucketed rows include exact :00 marks,
  // so keep those and drop the rest.
  const hourlyTimeTicks = useMemo(
    () => mergedPoints.filter((p) => new Date(p.timestamp).getMinutes() === 0).map((p) => p.time),
    [mergedPoints],
  );

  const allValues = mergedPoints.flatMap((p) => [p.totalPlnKw, p.totalPltsKw, p.totalPlnPltsKw].filter((v): v is number => v !== null));
  const yScale = useMemo(() => getPowerYAxisScale(allValues), [allValues]);

  const hasData = mergedPoints.length > 0;
  const hasTotalPlnData = points.length > 0;
  const hasTotalPltsData = totalPltsPoints.length > 0;
  const hasTotalPlnPltsData = totalPlnPltsPoints.length > 0;
  const mostRecentUpdate = Math.max(lastUpdated ?? 0, totalPltsLastUpdated ?? 0, totalPlnPltsLastUpdated ?? 0);
  const updatedLabel = mostRecentUpdate > 0 ? formatClockLabel(mostRecentUpdate) : null;

  const statusDotClass = isLive || totalPltsLive || totalPlnPltsLive
    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
    : error || totalPltsError || totalPlnPltsError
      ? 'bg-error-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
      : 'bg-gray-400';

  return (
    <Card className="col-span-1 lg:col-span-2 flex flex-col">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-sky-500 dark:text-sky-400 mb-6">
        <Clock size={16} className="mr-2" />
        Last 12 hours
        <div className={`w-2 h-2 rounded-full ml-2 ${statusDotClass}`}></div>
        {isLoading || totalPltsLoading || totalPlnPltsLoading ? (
          <span className="flex items-center gap-1 text-xs font-normal text-gray-500 dark:text-gray-400">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            Loading history
          </span>
        ) : error || totalPltsError || totalPlnPltsError ? (
          <span
            className="flex items-center gap-1 text-xs font-normal text-error-600 dark:text-error-400"
            title={error?.message ?? totalPltsError?.message}
          >
            <AlertTriangle size={12} aria-hidden="true" />
            {hasData ? 'Stale data' : 'Unavailable'}
            <button
              type="button"
              onClick={() => { refresh(); totalPltsRefresh(); totalPlnPltsRefresh(); }}
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
          <LineChart data={mergedPoints} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.4} />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              tick={X_TICK}
              axisLine={X_AXIS_LINE}
              tickLine={false}
              dy={10}
              ticks={hourlyTimeTicks}
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
            {hasTotalPlnData && (
              <Line
                name={LINE_TOTAL_PLN.name}
                type="natural"
                dataKey={LINE_TOTAL_PLN.dataKey}
                stroke={LINE_TOTAL_PLN.stroke}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {hasTotalPltsData && (
              <Line
                name={LINE_TOTAL_PLTS.name}
                type="natural"
                dataKey={LINE_TOTAL_PLTS.dataKey}
                stroke={LINE_TOTAL_PLTS.stroke}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {hasTotalPlnPltsData && (
              <Line
                name={LINE_TOTAL_PLN_PLTS.name}
                type="natural"
                dataKey={LINE_TOTAL_PLN_PLTS.dataKey}
                stroke={LINE_TOTAL_PLN_PLTS.stroke}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        {!isLoading && !totalPltsLoading && !totalPlnPltsLoading && !hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {error || totalPltsError || totalPlnPltsError ? 'No power data available' : 'Waiting for power data'}
            </span>
            {(error || totalPltsError || totalPlnPltsError) && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {error?.message ?? totalPltsError?.message}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

export default PowerTrendChart;
