import { useCallback, useEffect, useRef, useState } from 'react';
import { formatClockLabel } from './usePowerMeterHistory';

/**
 * Polls the Node-RED `GET /api/total-pln-kwh` endpoint. Rows arrive
 * newest-first at ~10 minute intervals.
 */
export interface TotalPlnKwRow {
  datetime: string;
  total_kw_pln: string | number;
}

export interface TotalPlnKwPoint {
  timestamp: number;
  time: string;
  totalKw: number;
}

export interface TotalPlnKwResult {
  points: TotalPlnKwPoint[];
  error: Error | null;
  isLoading: boolean;
  isLive: boolean;
  lastUpdated: number | null;
  refresh: () => void;
}

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

const asError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === 'string' && error.trim() ? error : fallbackMessage);
};

export const normalizeTotalPlnKwRows = (payload: unknown): TotalPlnKwPoint[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const points: TotalPlnKwPoint[] = [];

  for (const row of payload as TotalPlnKwRow[]) {
    if (row === null || typeof row !== 'object') {
      continue;
    }

    // Node-RED returns a local, timezone-less "YYYY-MM-DD HH:mm:ss" value.
    // Convert its separator to ISO syntax so browsers consistently parse it
    // as local time; timezone-aware ISO values remain unchanged.
    const timestamp = Date.parse((row.datetime ?? '').replace(' ', 'T'));
    const rawKwh: unknown = row.total_kw_pln;
    const totalKw =
      typeof rawKwh === 'number'
        ? rawKwh
        : typeof rawKwh === 'string' && rawKwh.trim() !== ''
          ? Number(rawKwh)
          : Number.NaN;

    if (!Number.isFinite(timestamp) || !Number.isFinite(totalKw)) {
      continue;
    }

    points.push({ timestamp, time: formatClockLabel(timestamp), totalKw });
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
};

export const fetchTotalPlnKw = async (url: string, signal: AbortSignal): Promise<TotalPlnKwPoint[]> => {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Total PLN kW request failed (HTTP ${response.status}).`);
  }

  return normalizeTotalPlnKwRows(await response.json());
};

const isSameSeries = (a: TotalPlnKwPoint[], b: TotalPlnKwPoint[]): boolean =>
  a.length === b.length && a.every((point, index) => point.timestamp === b[index].timestamp && point.totalKw === b[index].totalKw);

export const useTotalPlnKw = (
  url: string,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): TotalPlnKwResult => {
  const [points, setPoints] = useState<TotalPlnKwPoint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const hasSettledRef = useRef(false);

  useEffect(() => {
    if (!url) {
      setError(new Error('Total PLN kW URL is not configured.'));
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
        const next = await fetchTotalPlnKw(url, controller.signal);

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

        setError(
          timedOut
            ? new Error(`Total PLN kW request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`)
            : asError(fetchError, 'Unable to load total PLN kWh.'),
        );
      } finally {
        clearTimeout(timeoutId);

        if (!cancelled && !hasSettledRef.current) {
          hasSettledRef.current = true;
          setIsLoading(false);
        }
      }

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
