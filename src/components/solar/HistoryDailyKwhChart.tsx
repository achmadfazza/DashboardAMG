import { memo, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AlertTriangle, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import Card from './Card';
import { formatClockLabel, formatKWh, useTotalKWhDayAll } from '../../hooks/useTotalKWhDayAll';
import type { TotalKWhDayAllPoint } from '../../hooks/useTotalKWhDayAll';

const TOTAL_KWH_DAY_ALL_API_PATH = import.meta.env.VITE_NODE_RED_API_TOTAL_KWH_DAY_ALL?.trim();
const HAS_DAY_ALL_API = Boolean(TOTAL_KWH_DAY_ALL_API_PATH);
const TOTAL_KWH_DAY_ALL_API_URL = TOTAL_KWH_DAY_ALL_API_PATH
  ? `${import.meta.env.VITE_NODE_RED_API_BASE_URL ?? ''}${TOTAL_KWH_DAY_ALL_API_PATH}`
  : '';

const SERIES_PLN = {
  name: 'PLN kWh',
  dataKey: 'plnKwh',
  fill: '#3B82F6',
  gradient: 'url(#daily-pln-bar)',
} as const;

const SERIES_PLTS = {
  name: 'PLTS kWh',
  dataKey: 'pltsKwh',
  fill: '#F59E0B',
  gradient: 'url(#daily-plts-bar)',
} as const;

const LINE_TOTAL = {
  name: 'Total kWh',
  dataKey: 'totalKwh',
  stroke: '#EF4444',
} as const;

type ViewMode = 'daily' | 'weekly';
/** Daily point, optionally carrying the number of source days in a weekly bucket. */
interface ChartPoint extends TotalKWhDayAllPoint {
  readonly daysIncluded?: number;
  /** Like `dayLabel` but with the year, for the tooltip heading. */
  readonly fullLabel?: string;
}

/** Line overlays for the same series, drawn on top of their bars. */
const TREND_PLN = { name: SERIES_PLN.name, dataKey: SERIES_PLN.dataKey, stroke: SERIES_PLN.fill } as const;
const TREND_PLTS = { name: SERIES_PLTS.name, dataKey: SERIES_PLTS.dataKey, stroke: SERIES_PLTS.fill } as const;

// Hoisted chart config: inline literals would give recharts new prop
// identities on every render, forcing full chart recomputation.
const CHART_MARGIN = { top: 8, right: 18, left: 4, bottom: 12 };
const X_TICK = { fill: '#94a3b8', fontSize: 12 };
const X_AXIS_LINE = { stroke: '#94a3b8', strokeOpacity: 0.35 };
const Y_TICK = { fill: '#94a3b8', fontSize: 12 };
const BAR_CURSOR = { fill: '#94a3b8', fillOpacity: 0.1, radius: 4 };

/**
 * Estimated daily full-load hours of sunlight. 8 is the assumed effective
 * daylight duration for the installed solar capacity.
 */
const ESTIMATED_DAYLIGHT_HOURS = 8;
/** Installed solar panel capacity, in kWp. */
const INSTALLED_SOLAR_CAPACITY_KWP = 2650;
/** Expected PLTS yield for one full-sun day: 8 × 2,650 kWh. */
const PLTS_EXPECTED_DAILY_KWH =
  ESTIMATED_DAYLIGHT_HOURS * INSTALLED_SOLAR_CAPACITY_KWP;

const formatPerformanceRatio = (point: ChartPoint): string | null => {
  if (point.pltsKwh === null || !Number.isFinite(point.pltsKwh)) {
    return null;
  }

  // Weekly buckets sum several days; the expected yield must scale too.
  const expectedForecastKwh = PLTS_EXPECTED_DAILY_KWH * (point.daysIncluded ?? 1);
  return `${((point.pltsKwh / expectedForecastKwh) * 100).toFixed(1)}%`;
};

/** One row per series, in this order, plus the colour used for its swatch. */
const TOOLTIP_SERIES: ReadonlyArray<{ name: string; dataKey: string; color: string }> = [
  { name: SERIES_PLN.name, dataKey: SERIES_PLN.dataKey, color: SERIES_PLN.fill },
  { name: SERIES_PLTS.name, dataKey: SERIES_PLTS.dataKey, color: SERIES_PLTS.fill },
  { name: LINE_TOTAL.name, dataKey: LINE_TOTAL.dataKey, color: LINE_TOTAL.stroke },
];

const TOOLTIP_SURFACE_STYLE: CSSProperties = {
  background: 'rgba(26, 32, 44, 0.96)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  borderRadius: '10px',
  boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.45)',
  padding: '10px 12px',
  minWidth: '190px',
};
const TOOLTIP_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: 13,
  lineHeight: 1.7,
  color: '#e2e8f0',
};
const TOOLTIP_VALUE_STYLE: CSSProperties = {
  marginLeft: 'auto',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  color: '#fff',
};

/**
 * Custom tooltip: PLN and PLTS are each drawn twice (a Bar and a Line), so the
 * default tooltip lists every entry and shows the same series twice. This
 * renders exactly one row per series instead, deduplicating by dataKey.
 */
const DAILY_TOOLTIP: NonNullable<TooltipProps['content']> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) {
    return null;
  }

  const valueByKey = new Map<string, number | null>([
    [SERIES_PLN.dataKey, point.plnKwh],
    [SERIES_PLTS.dataKey, point.pltsKwh],
    [LINE_TOTAL.dataKey, point.totalKwh],
  ]);

  // The X axis is numeric, so `label` arrives as an epoch; prefer the labelled
  // heading, which includes the year (the axis ticks stay compact).
  const heading = point.fullLabel
    || point.dayLabel
    || (typeof label === 'number' ? formatClockLabel(label) : String(label ?? ''));

  const visible = TOOLTIP_SERIES.filter((series) => (valueByKey.get(series.dataKey) ?? null) !== null);
  const performanceRatio = formatPerformanceRatio(point);

  return (
    <div style={TOOLTIP_SURFACE_STYLE}>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', marginBottom: '2px' }}>
        {heading}
      </div>
      {point.daysIncluded !== undefined && (
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: '6px' }}>
          Days included: {point.daysIncluded}/7
        </div>
      )}
      {visible.map((series) => {
        // Separate the combined total from its two components.
        const isTotal = series.dataKey === LINE_TOTAL.dataKey;

        return (
          <div
            key={series.dataKey}
            style={{
              ...TOOLTIP_ROW_STYLE,
              marginTop: isTotal ? '4px' : 0,
              paddingTop: isTotal ? '6px' : 0,
              borderTop: isTotal
                ? '1px solid rgba(148, 163, 184, 0.2)'
                : 'none',
            }}
          >
          <span
            aria-hidden="true"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              flexShrink: 0,
              backgroundColor: series.color,
            }}
          />
          <span>{series.name}</span>
          <span style={TOOLTIP_VALUE_STYLE}>{formatKWh(valueByKey.get(series.dataKey) ?? null)} kWh</span>
          </div>
        );
      })}
      {performanceRatio !== null && (
        <div
          title="PLTS kWh ÷ (8 × 2,650 kWh expected daily yield)"
          style={{
            ...TOOLTIP_ROW_STYLE,
            marginTop: visible.length > 0 ? '4px' : 0,
            paddingTop: visible.length > 0 ? '6px' : 0,
            borderTop: visible.length > 0
              ? '1px solid rgba(148, 163, 184, 0.2)'
              : 'none',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              flexShrink: 0,
              backgroundColor: '#10B981',
            }}
          />
          <span>Performance Ratio PLTS</span>
          <span style={TOOLTIP_VALUE_STYLE}>{performanceRatio}</span>
        </div>
      )}
      {performanceRatio !== null && (
        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: '3px' }}>
          {point.daysIncluded && point.daysIncluded > 1
            ? `PLTS kWh ÷ (${point.daysIncluded} days × 8 × 2,650 kWh expected yield)`
            : 'PLTS kWh ÷ (8 × 2,650 kWh expected daily yield)'}
        </div>
      )}
    </div>
  );
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const FALLBACK_DOMAIN: [number, number] = [0, 1];
const Y_TICK_COUNT = 5;
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Local midnight at the start (Monday) of the ISO week containing timestamp. */
const startOfWeek = (timestamp: number): number => {
  const at = new Date(timestamp);
  const daysSinceMonday = (at.getDay() + 6) % 7;

  return new Date(at.getFullYear(), at.getMonth(), at.getDate() - daysSinceMonday).getTime();
};

const formatDayMonth = (timestamp: number): string => {
  const at = new Date(timestamp);
  return `${String(at.getDate()).padStart(2, '0')} ${MONTH_LABELS[at.getMonth()]}`;
};

const formatDayMonthYear = (timestamp: number): string =>
  `${formatDayMonth(timestamp)} ${new Date(timestamp).getFullYear()}`;

/** Aggregates daily kWh rows into Monday–Sunday buckets. */
const aggregateByWeek = (points: TotalKWhDayAllPoint[]): ChartPoint[] => {
  const weeks = new Map<number, {
    timestamp: number;
    dayCount: number;
    plnSum: number;
    plnCount: number;
    pltsSum: number;
    pltsCount: number;
  }>();

  for (const point of points) {
    const weekStart = startOfWeek(point.timestamp);
    let bucket = weeks.get(weekStart);

    if (!bucket) {
      bucket = {
        timestamp: weekStart,
        dayCount: 0,
        plnSum: 0,
        plnCount: 0,
        pltsSum: 0,
        pltsCount: 0,
      };
      weeks.set(weekStart, bucket);
    }

    bucket.dayCount += 1;
    if (point.plnKwh !== null) {
      bucket.plnSum += point.plnKwh;
      bucket.plnCount += 1;
    }
    if (point.pltsKwh !== null) {
      bucket.pltsSum += point.pltsKwh;
      bucket.pltsCount += 1;
    }
  }

  return Array.from(weeks.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((week) => {
      const weekEnd = week.timestamp + (6 * DAY_MS);
      const plnKwh = week.plnCount > 0 ? week.plnSum : null;
      const pltsKwh = week.pltsCount > 0 ? week.pltsSum : null;

      const start = new Date(week.timestamp);
      const date = [
        start.getFullYear(),
        String(start.getMonth() + 1).padStart(2, '0'),
        String(start.getDate()).padStart(2, '0'),
      ].join('-');

      return {
        date,
        timestamp: week.timestamp,
        dayLabel: `${formatDayMonth(week.timestamp)}–${formatDayMonth(weekEnd)}`,
        fullLabel: `${formatDayMonthYear(week.timestamp)}–${formatDayMonthYear(weekEnd)}`,
        plnKwh,
        pltsKwh,
        totalKwh: plnKwh === null && pltsKwh === null
          ? null
          : (plnKwh ?? 0) + (pltsKwh ?? 0),
        daysIncluded: week.dayCount,
      };
    });
};

/** Rounds the ceiling up so the top gridline is never clipped mid-label. */
const getKwhYAxisScale = (values: number[]): { domain: [number, number]; ticks: number[] } => {
  const maxValue = values.length > 0 ? Math.max(...values) : 0;

  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { domain: FALLBACK_DOMAIN, ticks: FALLBACK_DOMAIN };
  }

  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  const step = Math.max(magnitude / 2, Number.EPSILON);
  const ceiling = Math.ceil(maxValue / step) * step;
  const tickStep = ceiling / Y_TICK_COUNT;
  const ticks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, index) =>
    Number((tickStep * index).toFixed(2)));

  return { domain: [0, ceiling], ticks };
};

const HistoryDailyKwhChart = memo(function HistoryDailyKwhChart() {
  const { points, error, isLoading, isLive, lastUpdated, refresh } = useTotalKWhDayAll(TOTAL_KWH_DAY_ALL_API_URL);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const chartPoints = useMemo<ChartPoint[]>(
    () => (viewMode === 'weekly'
      ? aggregateByWeek(points)
      : points.map((point) => ({ ...point, fullLabel: formatDayMonthYear(point.timestamp) }))),
    [points, viewMode],
  );
  const bucketMs = viewMode === 'weekly' ? WEEK_MS : DAY_MS;
  const periodLabel = viewMode === 'weekly' ? 'Weekly' : 'Daily';

  // Bars are sparse, so the axis is padded by half a bucket on each side
  // to keep the first and last bars from being clipped by the plot edges.
  const xDomain = useMemo<[number, number]>(() => {
    if (chartPoints.length === 0) {
      return [0, bucketMs];
    }

    const first = chartPoints[0].timestamp;
    const last = chartPoints[chartPoints.length - 1].timestamp;

    return first === last
      ? [first - bucketMs, last + bucketMs]
      : [first - (bucketMs / 2), last + (bucketMs / 2)];
  }, [chartPoints, bucketMs]);

  const yScale = useMemo(() => getKwhYAxisScale(
    chartPoints.flatMap((p) => [p.plnKwh, p.pltsKwh, p.totalKwh].filter((v): v is number => v !== null)),
  ), [chartPoints]);

  const hasData = chartPoints.length > 0;
  const hasPln = chartPoints.some((p) => p.plnKwh !== null);
  const hasPlts = chartPoints.some((p) => p.pltsKwh !== null);
  const hasTotal = chartPoints.some((p) => p.totalKwh !== null);
  const updatedLabel = lastUpdated !== null ? formatClockLabel(lastUpdated) : null;
  const barSize = Math.max(8, Math.min(28, Math.floor(720 / Math.max(chartPoints.length, 1))));

  const statusDotClass = error
    ? 'bg-error-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
    : isLive
      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
      : 'bg-gray-400';

  return (
    <Card className="w-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-stroke px-5 py-4 dark:border-gray-800 md:px-6 md:py-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">
             Trend Line Charts 
          </h3>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
              <BarChart3 size={16} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{periodLabel} Energy (kWh)</span>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Energy period"
            className="inline-flex items-center rounded-lg border border-stroke bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800"
          >
            {(['daily', 'weekly'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stroke bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <span className={`size-2 shrink-0 rounded-full ${statusDotClass}`} aria-hidden="true" />
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
              updatedLabel && <span>Updated {updatedLabel}</span>
            )}
          </div>
        </div>
      </div>
      {/* One composed chart: bars compare each period's volume, the trend lines
          make movement readable, and the dashed red line carries the PLN + PLTS
          total. Weekly mode sums the daily API rows into Monday–Sunday buckets.
          ResponsiveContainer needs a definite height: this card sits in normal
          document flow, so a percentage height would resolve to 0px and the
          plot would collapse while the header and legend stayed visible. */}
      <div className="relative h-[380px] w-full px-3 pt-5 pb-3 md:px-5 md:pt-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartPoints} margin={CHART_MARGIN} barGap={2} barCategoryGap="24%">
            <defs>
              {/* Vertical fade gives the bars depth without changing their hue. */}
              <linearGradient id="daily-pln-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_PLN.fill} stopOpacity={0.95} />
                <stop offset="100%" stopColor={SERIES_PLN.fill} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="daily-plts-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_PLTS.fill} stopOpacity={0.95} />
                <stop offset="100%" stopColor={SERIES_PLTS.fill} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#94a3b8"
              strokeOpacity={0.18}
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={xDomain}
              allowDataOverflow
              tick={X_TICK}
              tickFormatter={(value: number) => {
                const hit = chartPoints.find((p) => p.timestamp === value);
                return hit ? hit.dayLabel : '';
              }}
              axisLine={X_AXIS_LINE}
              tickLine={false}
              tickMargin={12}
              minTickGap={16}
              ticks={chartPoints.map((p) => p.timestamp)}
            />
            <YAxis
              tick={Y_TICK}
              width={64}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
              domain={hasData ? yScale.domain : FALLBACK_DOMAIN}
              ticks={hasData ? yScale.ticks : FALLBACK_DOMAIN}
              tickFormatter={(value: number) => formatKWh(value)}
            />
            <Tooltip content={DAILY_TOOLTIP} cursor={BAR_CURSOR} />
            {hasPln && (
              <Bar
                name={SERIES_PLN.name}
                dataKey={SERIES_PLN.dataKey}
                fill={SERIES_PLN.gradient}
                radius={[5, 5, 0, 0]}
                maxBarSize={barSize}
                isAnimationActive={false}
              />
            )}
            {hasPlts && (
              <Bar
                name={SERIES_PLTS.name}
                dataKey={SERIES_PLTS.dataKey}
                fill={SERIES_PLTS.gradient}
                radius={[5, 5, 0, 0]}
                maxBarSize={barSize}
                isAnimationActive={false}
              />
            )}
            {/* tooltipType="none": the bars already report these series, and the
                custom tooltip mirrors those values — let the lines just draw. */}
            {hasPln && (
              <Line
                name={TREND_PLN.name}
                type="monotone"
                dataKey={TREND_PLN.dataKey}
                stroke={TREND_PLN.stroke}
                strokeOpacity={0.85}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: TREND_PLN.stroke, stroke: '#fff', strokeWidth: 2 }}
                connectNulls
                tooltipType="none"
                isAnimationActive={false}
              />
            )}
            {hasPlts && (
              <Line
                name={TREND_PLTS.name}
                type="monotone"
                dataKey={TREND_PLTS.dataKey}
                stroke={TREND_PLTS.stroke}
                strokeOpacity={0.85}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: TREND_PLTS.stroke, stroke: '#fff', strokeWidth: 2 }}
                connectNulls
                tooltipType="none"
                isAnimationActive={false}
              />
            )}
            {hasTotal && (
              <Line
                name={LINE_TOTAL.name}
                type="monotone"
                dataKey={LINE_TOTAL.dataKey}
                stroke={LINE_TOTAL.stroke}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 5, fill: LINE_TOTAL.stroke, stroke: '#fff', strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {!isLoading && !hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {error
                ? 'No energy data available'
                : HAS_DAY_ALL_API
                  ? 'Waiting for energy data'
                  : 'Energy endpoint is not configured'}
            </span>
            {error && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{error.message}</span>
            )}
          </div>
        )}
      </div>
      {hasData && (
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-t border-stroke px-5 py-4 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300 md:px-6">
          {hasPln && (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: SERIES_PLN.fill }} aria-hidden="true" />
              {SERIES_PLN.name}
            </span>
          )}
          {hasPlts && (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: SERIES_PLTS.fill }} aria-hidden="true" />
              {SERIES_PLTS.name}
            </span>
          )}
          {hasTotal && (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span
                className="w-5 border-t-2 border-dashed"
                style={{ borderColor: LINE_TOTAL.stroke }}
                aria-hidden="true"
              />
              {LINE_TOTAL.name}
            </span>
          )}
        </div>
      )}
    </Card>
  );
});

export default HistoryDailyKwhChart;
