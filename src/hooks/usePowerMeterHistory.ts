import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Polls the Node-RED `GET /api/power-meter` endpoint, which serves the last
 * 12 hours of meter power from Postgres:
 *
 *   SELECT TO_CHAR(tgljam AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
 *          total_active_pwr
 *   FROM t_total_power
 *   WHERE tgljam >= NOW() - INTERVAL '12 hours'
 *   ORDER BY tgljam DESC;
 *
 * The window and ordering are fixed server-side, so the client only renders
 * what it is given. Rows arrive newest-first at ~10 minute intervals.
 */

/** Postgres `numeric` columns come back as JSON strings, so power is a string. */
export interface PowerMeterRow {
  /** ISO-8601 UTC instant, e.g. "2026-09-26T18:40:02Z". */
  tgljam: string;
  /** Active power in kW as a numeric string, e.g. "1452.73". */
  total_active_pwr: string;
}

export interface PowerTrendPoint {
  /** Epoch milliseconds, ascending — the natural order for a time axis. */
  timestamp: number;
  /** Local "HH:mm" label, since the raw stamps are UTC. */
  time: string;
  /** Active power in kW. */
  meter: number;
}

export interface PowerMeterHistoryResult {
  points: PowerTrendPoint[];
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

/** Fresh readings land every ~10 min, so poll faster than that to stay current. */
const DEFAULT_POLL_INTERVAL_MS = 60_000;
/** Fail fast instead of leaving the chart spinning on a hung socket. */
const REQUEST_TIMEOUT_MS = 10_000;
/** Number of horizontal gridlines between 0 and the domain ceiling. */
const Y_TICK_COUNT = 5;

const asError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' && error.trim() ? error : fallbackMessage);
};

/**
 * Axis labels are formatted by hand rather than via Intl: the host locale here
 * is en-ID, where Intl renders 01:40 as "01.40". A chart axis needs a fixed
 * HH:mm shape, not a locale-dependent one.
 */
export const formatClockLabel = (timestamp: number): string => {
  const at = new Date(timestamp);
  const hours = String(at.getHours()).padStart(2, '0');
  const minutes = String(at.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

/**
 * Turns the raw payload into chart-ready points: numbers parsed, unusable rows
 * dropped, and timestamps sorted oldest-first (a left-to-right time axis needs
 * ascending order, and the API returns DESC).
 */
export const normalizePowerMeterRows = (payload: unknown): PowerTrendPoint[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const points: PowerTrendPoint[] = [];

  for (const row of payload as PowerMeterRow[]) {
    if (row === null || typeof row !== 'object') {
      continue;
    }

    const timestamp = Date.parse(row.tgljam ?? '');
    const rawPower = row.total_active_pwr;
    const meter =
      typeof rawPower === 'number'
        ? rawPower
        : typeof rawPower === 'string' && rawPower.trim() !== ''
          ? Number(rawPower)
          : Number.NaN;

    // Skip rather than plot a hole: a bad row should not create a 0 kW dip.
    if (!Number.isFinite(timestamp) || !Number.isFinite(meter)) {
      continue;
    }

    points.push({ timestamp, time: formatClockLabel(timestamp), meter });
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
};

export const fetchPowerMeterHistory = async (url: string, signal: AbortSignal): Promise<PowerTrendPoint[]> => {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Power meter history request failed (HTTP ${response.status}).`);
  }

  return normalizePowerMeterRows(await response.json());
};

/**
 * Reuses the previous array when the series is unchanged so that a poll which
 * returns identical data does not hand recharts a new prop identity.
 */
const isSameSeries = (a: PowerTrendPoint[], b: PowerTrendPoint[]): boolean =>
  a.length === b.length && a.every((point, index) => point.timestamp === b[index].timestamp && point.meter === b[index].meter);

export const usePowerMeterHistory = (
  url: string,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): PowerMeterHistoryResult => {
  const [points, setPoints] = useState<PowerTrendPoint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const hasSettledRef = useRef(false);

  useEffect(() => {
    if (!url) {
      setError(new Error('Power meter history URL is not configured.'));
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

      // Fail fast instead of leaving the chart spinning on a hung socket.
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const next = await fetchPowerMeterHistory(url, controller.signal);

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
            ? new Error(`Power meter history request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`)
            : asError(fetchError, 'Unable to load power meter history.'),
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

/**
 * Rounds the axis ceiling up to a readable step so the top gridline is never
 * clipped mid-label. Returns the domain and its ticks together to keep the
 * chart's Y axis internally consistent.
 */
export const getPowerYAxisScale = (
  values: number[],
  tickCount: number = Y_TICK_COUNT,
): { domain: [number, number]; ticks: number[] } => {
  const maxValue = values.length > 0 ? Math.max(...values) : 0;

  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { domain: [0, 1], ticks: [0, 1] };
  }

  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  const step = Math.max(magnitude / 2, Number.EPSILON);
  const ceiling = Math.ceil(maxValue / step) * step;
  const tickStep = ceiling / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => Number((tickStep * index).toFixed(2)));

  return { domain: [0, ceiling], ticks };
};
