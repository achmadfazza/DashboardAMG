import { useCallback, useEffect, useRef, useState } from 'react';
import { formatClockLabel } from './usePowerMeterHistory';

/**
 * Polls the Node-RED `GET /api/total-kwh-day-all` endpoint: daily energy
 * totals per source, newest day first, two rows per day ("PLN Tot" and
 * "PLTS Tot"). Each row is `{ tanggal: "YYYY-MM-DD", desct: "PLN Tot",
 * total_kwh: "39104.00" }`.
 *
 * Unlike the intraday kW history this is a once-a-day feed, so it parses into
 * one point per calendar day and polls far less often.
 */

/** Source label used by Node-RED for the grid (PLN) daily total. */
const PLN_SOURCE_LABEL = 'pln';
/** Source label used by Node-RED for the solar (PLTS) daily total. */
const PLTS_SOURCE_LABEL = 'plts';

/** Postgres `numeric` columns come back as JSON strings, so kWh is a string. */
export interface TotalKWhDayAllRow {
  /** Local calendar day, e.g. "2026-11-01". */
  tanggal: string;
  /** Source label: "PLN Tot" or "PLTS Tot". */
  desct: string;
  /** Energy for the day in kWh as a numeric string, e.g. "39104.00". */
  total_kwh: string | number;
}

export interface TotalKWhDayAllPoint {
  /** Calendar day key "YYYY-MM-DD"; also the chart's category axis value. */
  date: string;
  /** Day label for the axis, e.g. "01 Nov". */
  dayLabel: string;
  /** Epoch milliseconds at local midnight — the natural sort order. */
  timestamp: number;
  /** PLN (grid) energy for the day in kWh, or null when absent. */
  plnKwh: number | null;
  /** PLTS (solar) energy for the day in kWh, or null when absent. */
  pltsKwh: number | null;
  /** PLN + PLTS energy for the day in kWh, or null when neither is present. */
  totalKwh: number | null;
}

export interface TotalKWhDayAllResult {
  /** One point per day, ascending — the natural order for a time axis. */
  points: TotalKWhDayAllPoint[];
  error: Error | null;
  /** True only until the first attempt settles; later polls keep the chart up. */
  isLoading: boolean;
  /** True once a fetch has succeeded and none has failed since. */
  isLive: boolean;
  /** Epoch ms of the last successful fetch, or null. */
  lastUpdated: number | null;
  /** Trigger an out-of-band refetch, e.g. from a "Retry" button. */
  refresh: () => void;
}

/** Daily totals change once a day; polling every 15 min is already generous. */
const DEFAULT_POLL_INTERVAL_MS = 15 * 60_000;
/** Fail fast instead of leaving the chart spinning on a hung socket. */
const REQUEST_TIMEOUT_MS = 10_000;
const DATE_PART_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const asError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' && error.trim() ? error : fallbackMessage);
};

/**
 * Parses "YYYY-MM-DD" by hand rather than via `Date.parse`: the space-free
 * date form is treated as UTC by the spec, which shifts the day and its label
 * for anyone east of Greenwich.
 */
const parseDay = (value: unknown): { date: string; timestamp: number; dayLabel: string } | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const match = DATE_PART_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = new Date(year, month - 1, day).getTime();

  if (!Number.isFinite(timestamp) || new Date(timestamp).getDate() !== day) {
    return null;
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    timestamp,
    // Same reason as formatClockLabel: the host locale is en-ID, where Intl
    // would render "01 Nov" differently. A chart axis needs a fixed shape.
    dayLabel: `${String(day).padStart(2, '0')} ${MONTH_LABELS[month - 1]}`,
  };
};

const toKwh = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

/** Maps the free-text `desct` label onto the PLN / PLTS series. */
const classifySource = (desct: unknown): 'pln' | 'plts' | null => {
  if (typeof desct !== 'string') {
    return null;
  }

  const label = desct.toLowerCase();

  // Check PLTS first: "PLTS Tot" contains no "PLN", but "PLN + PLTS" style
  // labels should still resolve to the solar series' sibling if present.
  if (label.includes(PLTS_SOURCE_LABEL)) {
    return 'plts';
  }

  if (label.includes(PLN_SOURCE_LABEL)) {
    return 'pln';
  }

  return null;
};

/**
 * Turns the raw daily payload into chart-ready points: the two source rows per
 * day are pivoted into PLN / PLTS columns, unusable rows are dropped, and days
 * are sorted oldest-first (a left-to-right time axis needs ascending order,
 * and the API returns DESC).
 */
export const normalizeTotalKWhDayAllRows = (payload: unknown): TotalKWhDayAllPoint[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const dayMap = new Map<string, TotalKWhDayAllPoint>();

  for (const row of payload as TotalKWhDayAllRow[]) {
    if (row === null || typeof row !== 'object') {
      continue;
    }

    const day = parseDay(row.tanggal);
    const source = classifySource(row.desct);
    const kwh = toKwh(row.total_kwh);

    // Skip rather than plot a hole: a bad row should not create a 0 kWh dip.
    if (!day || !source || kwh === null) {
      continue;
    }

    let entry = dayMap.get(day.date);
    if (!entry) {
      entry = {
        date: day.date,
        dayLabel: day.dayLabel,
        timestamp: day.timestamp,
        plnKwh: null,
        pltsKwh: null,
        totalKwh: null,
      };
      dayMap.set(day.date, entry);
    }

    if (source === 'pln') {
      entry.plnKwh = kwh;
    } else {
      entry.pltsKwh = kwh;
    }
  }

  const points = Array.from(dayMap.values());

  for (const point of points) {
    point.totalKwh = point.plnKwh === null && point.pltsKwh === null
      ? null
      : (point.plnKwh ?? 0) + (point.pltsKwh ?? 0);
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
};

export const fetchTotalKWhDayAll = async (url: string, signal: AbortSignal): Promise<TotalKWhDayAllPoint[]> => {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Total kWh per day request failed (HTTP ${response.status}).`);
  }

  return normalizeTotalKWhDayAllRows(await response.json());
};

/**
 * Reuses the previous array when the series is unchanged so that a poll which
 * returns identical data does not hand recharts a new prop identity.
 */
const isSameSeries = (a: TotalKWhDayAllPoint[], b: TotalKWhDayAllPoint[]): boolean =>
  a.length === b.length && a.every((point, index) =>
    point.date === b[index].date
    && point.plnKwh === b[index].plnKwh
    && point.pltsKwh === b[index].pltsKwh);

export const useTotalKWhDayAll = (
  url: string,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): TotalKWhDayAllResult => {
  const [points, setPoints] = useState<TotalKWhDayAllPoint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const hasSettledRef = useRef(false);

  useEffect(() => {
    if (!url) {
      setError(new Error('Total kWh per day URL is not configured.'));
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: AbortController | null = null;

    hasSettledRef.current = false;

    async function poll() {
      const controller = new AbortController();
      inFlight = controller;
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const next = await fetchTotalKWhDayAll(url, controller.signal);

        if (cancelled) {
          return;
        }

        setPoints((previous) => (isSameSeries(previous, next) ? previous : next));
        setError(null);
        setLastUpdated(Date.now());
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        // Keep the last good points on screen; a transient failure should not
        // blank out a chart the operator is reading.
        setError(
          timedOut
            ? new Error(`Total kWh per day request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`)
            : asError(fetchError, 'Unable to load total kWh per day.'),
        );
      } finally {
        clearTimeout(timeoutId);

        if (!cancelled && !hasSettledRef.current) {
          hasSettledRef.current = true;
          setIsLoading(false);
        }
      }

      // Chained timeout rather than setInterval: a slow response can never
      // stack up overlapping requests.
      if (!cancelled) {
        timer = setTimeout(poll, pollIntervalMs);
      }
    }

    void poll();

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        clearTimeout(timer);
      }

      inFlight?.abort();
    };
  }, [url, pollIntervalMs, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { points, error, isLoading, isLive: error === null && lastUpdated !== null, lastUpdated, refresh };
};

/** Formats a kWh value for the axis/tooltip, or "--" when missing. */
export const formatKWh = (value: unknown): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-GB', { maximumFractionDigits: 1 })
    : '--';

/** Re-exported so chart components can label "updated" stamps without a second import. */
export { formatClockLabel };
