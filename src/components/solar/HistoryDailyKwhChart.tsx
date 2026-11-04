import { memo, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AlertTriangle, BarChart3, CalendarRange, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
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

/**
 * Target line: PLTS production goal. Violet is used because the three existing
 * series already own blue (PLN), amber (PLTS) and red (total) — violet stays
 * readable next to all three and does not read as "more PLTS".
 */
const TARGET_PLTS = {
  name: 'Target PLTS kWh',
  dataKey: 'pltsTargetKwh',
  stroke: '#8B5CF6',
} as const;

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'mtd';
/** Daily point, optionally carrying the number of source days in a multi-day bucket. */
interface ChartPoint extends TotalKWhDayAllPoint {
  readonly daysIncluded?: number;
  /** Calendar days the bucket can hold (7 for a week, 28–31 for a month). */
  readonly periodDays?: number;
  /** Like `dayLabel` but with the year, for the tooltip heading. */
  readonly fullLabel?: string;
  /** PLTS kWh goal for this bucket (scaled by `daysIncluded` in week/month mode). */
  readonly pltsTargetKwh?: number;
  /** True when the kWh fields hold running month-to-date totals, not daily values. */
  readonly isCumulative?: boolean;
  /** False for an MTD day that carried the previous total forward (no reading). */
  readonly hasReading?: boolean;
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
/**
 * Performance ratio the plant is expected to reach, i.e. the share of the
 * theoretical 8 × 2,650 kWh that counts as on-target.
 */
const PLTS_TARGET_PERFORMANCE_RATIO = 0.65;
/** Daily PLTS target: 8 × 2,650 × 0.65 = 13,780 kWh. */
const PLTS_TARGET_DAILY_KWH =
  PLTS_EXPECTED_DAILY_KWH * PLTS_TARGET_PERFORMANCE_RATIO;

/** Target performance ratio as a display label, e.g. "65%". */
const PLTS_TARGET_PERFORMANCE_LABEL =
  `${Math.round(PLTS_TARGET_PERFORMANCE_RATIO * 100)}%`;
/** Tooltip label: makes explicit where the 13,780 kWh number comes from. */
const TARGET_PLTS_TOOLTIP_NAME = `${TARGET_PLTS.name} (${PLTS_TARGET_PERFORMANCE_LABEL})`;

const formatPerformanceRatio = (point: ChartPoint): string | null => {
  if (point.pltsKwh === null || !Number.isFinite(point.pltsKwh)) {
    return null;
  }

  // Multi-day buckets sum several days; the expected yield must scale too.
  const expectedForecastKwh = PLTS_EXPECTED_DAILY_KWH * (point.daysIncluded ?? 1);
  return `${((point.pltsKwh / expectedForecastKwh) * 100).toFixed(1)}%`;
};

/** One row per series, in this order, plus the colour used for its swatch. */
const TOOLTIP_SERIES: ReadonlyArray<{ name: string; dataKey: string; color: string }> = [
  { name: SERIES_PLN.name, dataKey: SERIES_PLN.dataKey, color: SERIES_PLN.fill },
  { name: SERIES_PLTS.name, dataKey: SERIES_PLTS.dataKey, color: SERIES_PLTS.fill },
  { name: LINE_TOTAL.name, dataKey: LINE_TOTAL.dataKey, color: LINE_TOTAL.stroke },
  { name: TARGET_PLTS_TOOLTIP_NAME, dataKey: TARGET_PLTS.dataKey, color: TARGET_PLTS.stroke },
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
    [TARGET_PLTS.dataKey, point.pltsTargetKwh ?? null],
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
          {point.isCumulative
            ? `Day ${point.daysIncluded} of ${point.periodDays ?? 30} · month to date${point.hasReading === false ? ' · no reading' : ''}`
            : `Days included: ${point.daysIncluded}/${point.periodDays ?? 7}`}
        </div>
      )}
      {visible.map((series) => {
        // Separate the combined total and the target reference from the actuals.
        const isSeparated =
          series.dataKey === LINE_TOTAL.dataKey || series.dataKey === TARGET_PLTS.dataKey;

        return (
          <div
            key={series.dataKey}
            style={{
              ...TOOLTIP_ROW_STYLE,
              marginTop: isSeparated ? '4px' : 0,
              paddingTop: isSeparated ? '6px' : 0,
              borderTop: isSeparated
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
/** Only used to pad the numeric X domain; a calendar month varies 28–31 days. */
const MONTH_MS = 30 * DAY_MS;
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

/** Local midnight on the first day of the month containing timestamp. */
const startOfMonth = (timestamp: number): number => {
  const at = new Date(timestamp);

  return new Date(at.getFullYear(), at.getMonth(), 1).getTime();
};

const formatDayMonth = (timestamp: number): string => {
  const at = new Date(timestamp);
  return `${String(at.getDate()).padStart(2, '0')} ${MONTH_LABELS[at.getMonth()]}`;
};

const formatDayMonthYear = (timestamp: number): string =>
  `${formatDayMonth(timestamp)} ${new Date(timestamp).getFullYear()}`;

const formatMonthYear = (timestamp: number): string => {
  const at = new Date(timestamp);
  return `${MONTH_LABELS[at.getMonth()]} ${at.getFullYear()}`;
};

const formatMonthLongYear = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

/** Number of calendar days in the month containing timestamp. */
const daysInMonth = (timestamp: number): number => {
  const at = new Date(timestamp);

  return new Date(at.getFullYear(), at.getMonth() + 1, 0).getDate();
};

/** How one view mode groups the daily API rows. */
interface BucketSpec {
  /** Local start timestamp of the bucket that contains `timestamp`. */
  readonly startOf: (timestamp: number) => number;
  /** Compact label for the X axis tick. */
  readonly tickLabel: (start: number) => string;
  /** Long label for the tooltip heading. */
  readonly fullLabel: (start: number) => string;
  /** Calendar days the bucket can hold; drives "days included" and the ratio. */
  readonly periodDays: (start: number) => number;
}

const WEEK_BUCKETS: BucketSpec = {
  startOf: startOfWeek,
  tickLabel: (start) => `${formatDayMonth(start)}–${formatDayMonth(start + (6 * DAY_MS))}`,
  fullLabel: (start) => `${formatDayMonthYear(start)}–${formatDayMonthYear(start + (6 * DAY_MS))}`,
  periodDays: () => 7,
};

const MONTH_BUCKETS: BucketSpec = {
  startOf: startOfMonth,
  tickLabel: formatMonthYear,
  fullLabel: formatMonthLongYear,
  periodDays: daysInMonth,
};

/**
 * Aggregates the daily kWh rows into period buckets (Monday–Sunday weeks or
 * calendar months). Each bucket sums the values it holds and scales the PLTS
 * target by the number of days actually represented, so a partial bucket — such
 * as the month still in progress — is never compared against a full-period goal.
 */
const aggregateBuckets = (points: TotalKWhDayAllPoint[], spec: BucketSpec): ChartPoint[] => {
  const buckets = new Map<number, {
    timestamp: number;
    dayCount: number;
    plnSum: number;
    plnCount: number;
    pltsSum: number;
    pltsCount: number;
  }>();

  for (const point of points) {
    const bucketStart = spec.startOf(point.timestamp);
    let bucket = buckets.get(bucketStart);

    if (!bucket) {
      bucket = {
        timestamp: bucketStart,
        dayCount: 0,
        plnSum: 0,
        plnCount: 0,
        pltsSum: 0,
        pltsCount: 0,
      };
      buckets.set(bucketStart, bucket);
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

  return Array.from(buckets.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((bucket) => {
      const plnKwh = bucket.plnCount > 0 ? bucket.plnSum : null;
      const pltsKwh = bucket.pltsCount > 0 ? bucket.pltsSum : null;

      const start = new Date(bucket.timestamp);
      const date = [
        start.getFullYear(),
        String(start.getMonth() + 1).padStart(2, '0'),
        String(start.getDate()).padStart(2, '0'),
      ].join('-');

      return {
        date,
        timestamp: bucket.timestamp,
        dayLabel: spec.tickLabel(bucket.timestamp),
        fullLabel: spec.fullLabel(bucket.timestamp),
        plnKwh,
        pltsKwh,
        totalKwh: plnKwh === null && pltsKwh === null
          ? null
          : (plnKwh ?? 0) + (pltsKwh ?? 0),
        daysIncluded: bucket.dayCount,
        periodDays: spec.periodDays(bucket.timestamp),
        pltsTargetKwh: PLTS_TARGET_DAILY_KWH * bucket.dayCount,
      };
    });
};

/** One selectable month for the MTD mode. */
interface MonthOption {
  /** Stable "YYYY-MM" key used as the <select> value. */
  readonly key: string;
  /** Display label, e.g. "October 2026". */
  readonly label: string;
  readonly year: number;
  /** Zero-based, matching Date#getMonth. */
  readonly month: number;
}

/**
 * Months present in the payload, newest first. MTD defaults to the newest month
 * with data rather than the calendar month, so the card keeps showing the last
 * period instead of going blank right after a month rollover.
 */
const buildMonthOptions = (points: TotalKWhDayAllPoint[]): MonthOption[] => {
  const byKey = new Map<string, MonthOption>();

  for (const point of points) {
    const at = new Date(point.timestamp);
    const year = at.getFullYear();
    const month = at.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!byKey.has(key)) {
      byKey.set(key, { key, label: formatMonthLongYear(point.timestamp), year, month });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => (b.year - a.year) || (b.month - a.month));
};

/**
 * Turns one month's daily rows into a running month-to-date series.
 * The kWh fields are replaced by their cumulative sum (the chart's existing
 * series then plot the running total), and the target accumulates at one daily
 * target per elapsed day, so "actual vs target to date" is read directly.
 *
 * Days before the first reading of the month are omitted rather than plotted as
 * zero: "no data yet" is not the same as "produced nothing". Gaps *between*
 * readings do carry the previous total forward — a flat segment. Both cases
 * expose the truth in the tooltip (`Day 22 of 31 · month to date · no reading`).
 */
const buildMonthToDate = (
  points: TotalKWhDayAllPoint[],
  year: number,
  month: number,
): ChartPoint[] => {
  const periodDays = new Date(year, month + 1, 0).getDate();

  const byDayOfMonth = new Map<number, TotalKWhDayAllPoint>();
  for (const point of points) {
    const at = new Date(point.timestamp);
    if (at.getFullYear() === year && at.getMonth() === month) {
      byDayOfMonth.set(at.getDate(), point);
    }
  }

  if (byDayOfMonth.size === 0) {
    return [];
  }

  const lastDay = Math.max(...byDayOfMonth.keys());
  const firstDay = Math.min(...byDayOfMonth.keys());
  const monthLabel = MONTH_LABELS[month];
  const result: ChartPoint[] = [];

  let plnCumKwh = 0;
  let pltsCumKwh = 0;

  for (let dayOfMonth = firstDay; dayOfMonth <= lastDay; dayOfMonth += 1) {
    const point = byDayOfMonth.get(dayOfMonth);
    if (point) {
      plnCumKwh += point.plnKwh ?? 0;
      pltsCumKwh += point.pltsKwh ?? 0;
    }

    const timestamp = new Date(year, month, dayOfMonth).getTime();

    result.push({
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`,
      dayLabel: point?.dayLabel ?? `${String(dayOfMonth).padStart(2, '0')} ${monthLabel}`,
      timestamp,
      plnKwh: plnCumKwh,
      pltsKwh: pltsCumKwh,
      totalKwh: plnCumKwh + pltsCumKwh,
      fullLabel: formatMonthLongYear(timestamp),
      daysIncluded: dayOfMonth,
      periodDays,
      pltsTargetKwh: PLTS_TARGET_DAILY_KWH * dayOfMonth,
      isCumulative: true,
      hasReading: point !== undefined,
    });
  }

  return result;
};

/** Period options for the card's segmented control, in display order. */
const VIEW_MODES: readonly ViewMode[] = ['daily', 'weekly', 'monthly', 'mtd'];

/** Per-mode header label, toggle label and X-axis bucket span (padding only). */
const VIEW_CONFIG: Record<ViewMode, { label: string; buttonLabel: string; bucketMs: number }> = {
  daily: { label: 'Daily', buttonLabel: 'Daily', bucketMs: DAY_MS },
  weekly: { label: 'Weekly', buttonLabel: 'Weekly', bucketMs: WEEK_MS },
  monthly: { label: 'Monthly', buttonLabel: 'Monthly', bucketMs: MONTH_MS },
  mtd: { label: 'MTD', buttonLabel: 'MTD', bucketMs: DAY_MS },
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
  // null means "follow the newest month in the data" (see buildMonthOptions).
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  const monthOptions = useMemo(() => buildMonthOptions(points), [points]);
  const activeMonth = useMemo(
    () => monthOptions.find((option) => option.key === selectedMonthKey) ?? monthOptions[0] ?? null,
    [monthOptions, selectedMonthKey],
  );

  const chartPoints = useMemo<ChartPoint[]>(() => {
    switch (viewMode) {
      case 'daily':
        return points.map((point) => ({
          ...point,
          fullLabel: formatDayMonthYear(point.timestamp),
          pltsTargetKwh: PLTS_TARGET_DAILY_KWH,
        }));
      case 'weekly':
        return aggregateBuckets(points, WEEK_BUCKETS);
      case 'monthly':
        return aggregateBuckets(points, MONTH_BUCKETS);
      case 'mtd':
        return activeMonth
          ? buildMonthToDate(points, activeMonth.year, activeMonth.month)
          : [];
    }
  }, [points, viewMode, activeMonth]);
  const { bucketMs, label: periodLabel } = VIEW_CONFIG[viewMode];
  // Cumulative MTD lines must not be drawn as bars: stacked-looking bars imply
  // per-period volume, which is the opposite of a running total.
  const showBars = viewMode !== 'mtd';
  const showMonthPicker = viewMode === 'mtd' && monthOptions.length > 0;

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
    chartPoints.flatMap((p) => [p.plnKwh, p.pltsKwh, p.totalKwh, p.pltsTargetKwh ?? null]
      .filter((v): v is number => v !== null)),
  ), [chartPoints]);

  const hasData = chartPoints.length > 0;
  const hasPln = chartPoints.some((p) => p.plnKwh !== null);
  const hasPlts = chartPoints.some((p) => p.pltsKwh !== null);
  const hasTotal = chartPoints.some((p) => p.totalKwh !== null);
  const hasTarget = hasPlts && chartPoints.some((p) => p.pltsTargetKwh !== undefined);
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
          {showMonthPicker && (
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-stroke bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <CalendarRange size={13} className="text-gray-400 dark:text-gray-500" aria-hidden="true" />
              <select
                value={activeMonth?.key ?? ''}
                onChange={(event) => setSelectedMonthKey(event.target.value)}
                aria-label="Month to date period"
                className="cursor-pointer appearance-none bg-transparent py-0.5 text-xs font-semibold text-gray-700 outline-none dark:text-gray-200"
              >
                {monthOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </label>
          )}
          <div
            role="group"
            aria-label="Energy period"
            className="inline-flex items-center rounded-lg border border-stroke bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800"
          >
            {VIEW_MODES.map((mode) => (
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
                {VIEW_CONFIG[mode].buttonLabel}
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
          total. Weekly and monthly modes sum the daily API rows into Monday–Sunday
          or calendar-month buckets respectively; MTD mode replaces every series
          with its running month-to-date total and drops the bars.
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
            {showBars && hasPln && (
              <Bar
                name={SERIES_PLN.name}
                dataKey={SERIES_PLN.dataKey}
                fill={SERIES_PLN.gradient}
                radius={[5, 5, 0, 0]}
                maxBarSize={barSize}
                isAnimationActive={false}
              />
            )}
            {showBars && hasPlts && (
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
            {hasTarget && (
              <Line
                name={TARGET_PLTS.name}
                type="monotone"
                dataKey={TARGET_PLTS.dataKey}
                stroke={TARGET_PLTS.stroke}
                strokeWidth={2}
                strokeDasharray="2 5"
                dot={false}
                activeDot={{ r: 4, fill: TARGET_PLTS.stroke, stroke: '#fff', strokeWidth: 2 }}
                connectNulls
                tooltipType="none"
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
              {showBars ? (
                <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: SERIES_PLN.fill }} aria-hidden="true" />
              ) : (
                <span className="w-5 border-t-2" style={{ borderColor: SERIES_PLN.fill }} aria-hidden="true" />
              )}
              {SERIES_PLN.name}
            </span>
          )}
          {hasPlts && (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              {showBars ? (
                <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: SERIES_PLTS.fill }} aria-hidden="true" />
              ) : (
                <span className="w-5 border-t-2" style={{ borderColor: SERIES_PLTS.fill }} aria-hidden="true" />
              )}
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
          {hasTarget && (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span
                className="w-5 border-t-2 border-dotted"
                style={{ borderColor: TARGET_PLTS.stroke }}
                aria-hidden="true"
              />
              {TARGET_PLTS.name}
              <span className="font-normal text-gray-400 dark:text-gray-500">
                {formatKWh(PLTS_TARGET_DAILY_KWH)} kWh/day
              </span>
            </span>
          )}
        </div>
      )}
    </Card>
  );
});

export default HistoryDailyKwhChart;
