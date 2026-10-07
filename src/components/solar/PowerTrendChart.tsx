import { memo, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AlertTriangle, Clock, Loader2, RefreshCw } from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { TooltipProps } from 'recharts';
import Card from './Card';
import { formatClockLabel, getPowerYAxisScale, usePowerMeterHistory } from '../../hooks/usePowerMeterHistory';
import { useTotalPltsKw } from '../../hooks/useTotalPltsKw';
import { useTotalPlnKw } from '../../hooks/useTotalPlnKw';

const TOTAL_PLN_KWH_API_URL: string = `${import.meta.env.VITE_NODE_RED_API_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_API_TOTAL_PLN_KWH ?? ''}`;
const TOTAL_PLTS_KWH_API_PATH = import.meta.env.VITE_NODE_RED_API_TOTAL_PLTS_KWH?.trim();
const HAS_PLTS_API = Boolean(TOTAL_PLTS_KWH_API_PATH);
const TOTAL_PLTS_KWH_API_URL = TOTAL_PLTS_KWH_API_PATH
  ? `${import.meta.env.VITE_NODE_RED_API_BASE_URL ?? ''}${TOTAL_PLTS_KWH_API_PATH}`
  : '';
const TOTAL_PLN_PLTS_KWH_API_PATH = import.meta.env.VITE_NODE_RED_API_TOTAL_PLN_PLTS_KWH?.trim();
const HAS_COMBINED_API = Boolean(TOTAL_PLN_PLTS_KWH_API_PATH);
const TOTAL_PLN_PLTS_KWH_API_URL = TOTAL_PLN_PLTS_KWH_API_PATH
  ? `${import.meta.env.VITE_NODE_RED_API_BASE_URL ?? ''}${TOTAL_PLN_PLTS_KWH_API_PATH}`
  : '';

const LINE_TOTAL_PLN = {
  name: 'Total PLN kW',
  dataKey: 'totalPlnKw',
  stroke: '#3B82F6',
} as const;

const LINE_TOTAL_PLTS = {
  name: 'Total PLTS kW',
  dataKey: 'totalPltsKw',
  stroke: '#F59E0B',
} as const;

const LINE_TOTAL_PLN_PLTS = {
  name: 'Total PLN & PLTS kW',
  dataKey: 'totalPlnPltsKw',
  stroke: '#EF4444',
} as const;

// Hoisted chart config: inline literals would give recharts new prop
// identities on every render, forcing full chart recomputation.
const CHART_MARGIN = { top: 8, right: 18, left: 4, bottom: 12 };
const X_TICK = { fill: '#94a3b8', fontSize: 12 };
const X_AXIS_LINE = { stroke: '#94a3b8', strokeOpacity: 0.35 };
const Y_TICK = { fill: '#94a3b8', fontSize: 12 };
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: '#1A202C',
  borderColor: '#4A5568',
  borderRadius: '8px',
  color: '#fff',
};
const TOOLTIP_ITEM_STYLE: CSSProperties = { fontSize: 16 };
const TOOLTIP_LABEL_STYLE: CSSProperties = { color: '#94a3b8', fontSize: 14, marginBottom: '4px' };

const formatPowerKw = (value: unknown): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '--';

/** Hoisted so the tooltip does not get a new identity on every render. */
const TOOLTIP_FORMATTER: NonNullable<TooltipProps['formatter']> = (value, name) => [
  `${formatPowerKw(value)} kW`,
  name,
];
const TOOLTIP_LABEL_FORMATTER: NonNullable<TooltipProps['labelFormatter']> = (label) =>
  new Date(Number(label)).toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

const HOUR_MS = 60 * 60 * 1000;
const WINDOW_MS = 12 * HOUR_MS;
const CLOCK_REFRESH_MS = 60_000;
const FALLBACK_DOMAIN: [number, number] = [0, 1];

interface MergedPoint {
  timestamp: number;
  totalPlnKw: number | null;
  totalPltsKw: number | null;
  totalPlnPltsKw: number | null;
}

const PowerTrendChart = memo(function PowerTrendChart() {
  const { points, error, isLoading, isLive, lastUpdated, refresh } = useTotalPlnKw(TOTAL_PLN_KWH_API_URL);
  const { points: totalPltsPoints, error: totalPltsError, isLoading: totalPltsLoading, isLive: totalPltsLive, lastUpdated: totalPltsLastUpdated, refresh: totalPltsRefresh } = useTotalPltsKw(TOTAL_PLTS_KWH_API_URL);
  const { points: totalPlnPltsPoints, error: totalPlnPltsError, isLoading: totalPlnPltsLoading, isLive: totalPlnPltsLive, lastUpdated: totalPlnPltsLastUpdated, refresh: totalPlnPltsRefresh } = usePowerMeterHistory(TOTAL_PLN_PLTS_KWH_API_URL);
  const [now, setNow] = useState(() => Date.now());

  // Advance the wall-clock window and timestamp warning between API polls.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // Use the device clock for the rolling 12-hour window. Never shift the
  // chart to an API timestamp in the future (or to old historical data).
  const latestTimestamp = Math.max(
    points[points.length - 1]?.timestamp ?? -Infinity,
    totalPltsPoints[totalPltsPoints.length - 1]?.timestamp ?? -Infinity,
    totalPlnPltsPoints[totalPlnPltsPoints.length - 1]?.timestamp ?? -Infinity,
  );
  const hasLatestTimestamp = Number.isFinite(latestTimestamp);
  const isFutureData = hasLatestTimestamp && latestTimestamp > now + 10 * 60_000;
  const windowStart = now - WINDOW_MS;
  const isHistoricalData = hasLatestTimestamp && latestTimestamp < windowStart;
  const pltsError = HAS_PLTS_API ? totalPltsError : null;
  const pltsLoading = HAS_PLTS_API && totalPltsLoading;
  const combinedError = HAS_COMBINED_API ? totalPlnPltsError : null;
  const combinedLoading = HAS_COMBINED_API && totalPlnPltsLoading;

  // Join only identical instants. The API clocks can differ by seconds, so
  // rounding to a 10-minute bucket shifts readings (or drops duplicate rows).
  // A numeric time axis positions each sample at its actual datetime instead.
  const mergedPoints = useMemo<MergedPoint[]>(() => {
    const timestampMap = new Map<number, MergedPoint>();
    const addPoint = (timestamp: number, key: 'totalPlnKw' | 'totalPltsKw' | 'totalPlnPltsKw', value: number) => {
      if (timestamp < windowStart || timestamp > now) return;
      let entry = timestampMap.get(timestamp);
      if (!entry) {
        entry = { timestamp, totalPlnKw: null, totalPltsKw: null, totalPlnPltsKw: null };
        timestampMap.set(timestamp, entry);
      }
      entry[key] = value;
    };

    for (const p of points) addPoint(p.timestamp, 'totalPlnKw', p.totalKw);
    for (const p of totalPltsPoints) addPoint(p.timestamp, 'totalPltsKw', p.totalKw);
    for (const p of totalPlnPltsPoints) addPoint(p.timestamp, 'totalPlnPltsKw', p.meter);

    return Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [points, totalPltsPoints, totalPlnPltsPoints, windowStart, now]);

  // Keep hourly ticks across the full rolling window, even without readings.
  const hourlyTimeTicks = useMemo(() => {
    const firstHour = new Date(windowStart);
    firstHour.setMinutes(0, 0, 0);
    if (firstHour.getTime() < windowStart) firstHour.setHours(firstHour.getHours() + 1);
    const ticks: number[] = [];
    for (let tick = firstHour.getTime(); tick <= now; tick += HOUR_MS) ticks.push(tick);
    return ticks;
  }, [windowStart, now]);

  // The Y axis follows the readings; the old hardcoded [0, 2250] ceiling
  // silently clipped real peaks above 2250 kW.
  const yScale = useMemo(() => getPowerYAxisScale(
    mergedPoints.flatMap((p) => [p.totalPlnKw, p.totalPltsKw, p.totalPlnPltsKw].filter((v): v is number => v !== null)),
  ), [mergedPoints]);

  const hasData = mergedPoints.length > 0;
  const hasTotalPlnData = mergedPoints.some((p) => p.totalPlnKw !== null);
  const hasTotalPltsData = mergedPoints.some((p) => p.totalPltsKw !== null);
  const hasTotalPlnPltsData = mergedPoints.some((p) => p.totalPlnPltsKw !== null);
  const mostRecentUpdate = Math.max(lastUpdated ?? 0, totalPltsLastUpdated ?? 0, totalPlnPltsLastUpdated ?? 0);
  const updatedLabel = mostRecentUpdate > 0 ? formatClockLabel(mostRecentUpdate) : null;

  const statusDotClass = error || pltsError || combinedError
    ? 'bg-error-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
    : isFutureData || isHistoricalData
      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
      : isLive || (HAS_PLTS_API && totalPltsLive) || (HAS_COMBINED_API && totalPlnPltsLive)
        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
        : 'bg-gray-400';

  return (
    <Card className="col-span-1 lg:col-span-2 flex flex-col !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-stroke px-5 py-4 dark:border-gray-800 md:px-6 md:py-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400">
            <Clock size={16} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Last 12 hours</span>
        </div>
        <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-stroke bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <span className={`size-2 shrink-0 rounded-full ${statusDotClass}`} aria-hidden="true" />
          {isLoading || pltsLoading || combinedLoading ? (
            <span className="flex items-center gap-1 text-xs font-normal text-gray-500 dark:text-gray-400">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              Loading history
            </span>
          ) : error || pltsError || combinedError ? (
            <span
              className="flex items-center gap-1 text-xs font-normal text-error-600 dark:text-error-400"
              title={[error, pltsError, combinedError].filter((issue) => issue !== null).map((issue) => issue.message).join(' | ')}
            >
              <AlertTriangle size={12} aria-hidden="true" />
              {hasData ? 'Stale data' : 'Unavailable'}
              <button
                type="button"
                onClick={() => { refresh(); if (HAS_PLTS_API) totalPltsRefresh(); if (HAS_COMBINED_API) totalPlnPltsRefresh(); }}
                className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 underline underline-offset-2 hover:opacity-80"
              >
                <RefreshCw size={11} aria-hidden="true" />
                Retry
              </button>
            </span>
          ) : (
            updatedLabel && (
              <span>Updated {updatedLabel}</span>
            )
          )}
        </div>
        {(isFutureData || isHistoricalData) && (
          <span
            className="flex basis-full items-center gap-1 text-xs font-normal text-amber-600 dark:text-amber-400"
            title={`Latest API datetime: ${new Date(latestTimestamp).toLocaleString()}. Local time: ${new Date(now).toLocaleString()}.`}
          >
            <AlertTriangle size={12} aria-hidden="true" />
            {isFutureData
              ? `API datetime ~${Math.round((latestTimestamp - now) / HOUR_MS)}h ahead — check backend timezone`
              : 'Latest reading is older than 12 hours'}
          </span>
        )}
      </div>
      {/* The minimum height gives ResponsiveContainer an initial size; flex-1
          lets the plot fill the card instead of leaving a blank area below it. */}
      <div className="relative min-h-[300px] flex-1 px-3 pt-4 pb-2 md:px-5 md:pt-5">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mergedPoints} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="power-trend-pln-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_TOTAL_PLN.stroke} stopOpacity={0.55} />
                <stop offset="55%" stopColor={LINE_TOTAL_PLN.stroke} stopOpacity={0.26} />
                <stop offset="100%" stopColor={LINE_TOTAL_PLN.stroke} stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="power-trend-plts-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_TOTAL_PLTS.stroke} stopOpacity={0.55} />
                <stop offset="55%" stopColor={LINE_TOTAL_PLTS.stroke} stopOpacity={0.26} />
                <stop offset="100%" stopColor={LINE_TOTAL_PLTS.stroke} stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="power-trend-total-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_TOTAL_PLN_PLTS.stroke} stopOpacity={0.45} />
                <stop offset="55%" stopColor={LINE_TOTAL_PLN_PLTS.stroke} stopOpacity={0.22} />
                <stop offset="100%" stopColor={LINE_TOTAL_PLN_PLTS.stroke} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.28} />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={[windowStart, now]}
              allowDataOverflow
              stroke="#94a3b8"
              tick={X_TICK}
              tickFormatter={formatClockLabel}
              axisLine={X_AXIS_LINE}
              tickLine={false}
              tickMargin={10}
              minTickGap={16}
              ticks={hourlyTimeTicks}
            />
            <YAxis
              stroke="#94a3b8"
              tick={Y_TICK}
              width={48}
              tickMargin={8}
              axisLine={false}
              tickLine={false}
              domain={hasData ? yScale.domain : FALLBACK_DOMAIN}
              ticks={hasData ? yScale.ticks : FALLBACK_DOMAIN}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              labelFormatter={TOOLTIP_LABEL_FORMATTER}
              formatter={TOOLTIP_FORMATTER}
            />
            {/* Draw fills first so all three line outlines stay sharp. */}
            {hasTotalPlnPltsData && (
              <Area
                type="natural"
                dataKey={LINE_TOTAL_PLN_PLTS.dataKey}
                baseValue={0}
                stroke="none"
                fill="url(#power-trend-total-fill)"
                tooltipType="none"
                connectNulls
                isAnimationActive={false}
              />
            )}
            {hasTotalPlnData && (
              <Area
                type="natural"
                dataKey={LINE_TOTAL_PLN.dataKey}
                baseValue={0}
                stroke="none"
                fill="url(#power-trend-pln-fill)"
                tooltipType="none"
                connectNulls
                isAnimationActive={false}
              />
            )}
            {hasTotalPltsData && (
              <Area
                type="natural"
                dataKey={LINE_TOTAL_PLTS.dataKey}
                baseValue={0}
                stroke="none"
                fill="url(#power-trend-plts-fill)"
                tooltipType="none"
                connectNulls
                isAnimationActive={false}
              />
            )}
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
          </ComposedChart>
        </ResponsiveContainer>
        {!isLoading && !pltsLoading && !combinedLoading && !hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {error || pltsError || combinedError
                ? 'No power data available'
                : isFutureData
                  ? 'API readings are ahead of current time'
                  : hasLatestTimestamp
                    ? 'No readings in the last 12 hours'
                    : 'Waiting for power data'}
            </span>
            {(error || pltsError || combinedError) && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {error?.message ?? pltsError?.message ?? combinedError?.message}
              </span>
            )}
          </div>
        )}
      </div>
      {hasData && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-stroke px-5 py-4 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300 md:px-6">
          {hasTotalPlnPltsData && (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: LINE_TOTAL_PLN_PLTS.stroke }} />
              {LINE_TOTAL_PLN_PLTS.name}
            </span>
          )}
          {hasTotalPlnData && (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: LINE_TOTAL_PLN.stroke }} />
              {LINE_TOTAL_PLN.name}
            </span>
          )}
          {hasTotalPltsData && (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: LINE_TOTAL_PLTS.stroke }} />
              {LINE_TOTAL_PLTS.name}
            </span>
          )}
        </div>
      )}
    </Card>
  );
});

export default PowerTrendChart;
