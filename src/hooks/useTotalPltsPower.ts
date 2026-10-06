import { useCallback, useEffect, useRef, useState } from 'react';
import { formatClockLabel } from './usePowerMeterHistory';

export interface TotalPltsPowerRow {
  id: number;
  total_kwh_plts: number;
  tgljam: string;
}

export interface TotalPltsPowerPoint {
  timestamp: number;
  time: string;
  totalKwh: number;
}

export interface TotalPltsPowerResult {
  points: TotalPltsPowerPoint[];
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

export const normalizeTotalPltsPowerRows = (payload: unknown): TotalPltsPowerPoint[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const points: TotalPltsPowerPoint[] = [];

  for (const row of payload as TotalPltsPowerRow[]) {
    if (row === null || typeof row !== 'object') {
      continue;
    }

    const timestamp = Date.parse(row.tgljam ?? '');
    const rawKwh: unknown = row.total_kwh_plts;
    const totalKwh =
      typeof rawKwh === 'number'
        ? rawKwh
        : typeof rawKwh === 'string' && rawKwh.trim() !== ''
          ? Number(rawKwh)
          : Number.NaN;

    if (!Number.isFinite(timestamp) || !Number.isFinite(totalKwh)) {
      continue;
    }

    points.push({ timestamp, time: formatClockLabel(timestamp), totalKwh });
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
};

export const fetchTotalPltsPower = async (url: string, signal: AbortSignal): Promise<TotalPltsPowerPoint[]> => {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Total PLTS power request failed (HTTP ${response.status}).`);
  }

  return normalizeTotalPltsPowerRows(await response.json());
};

const isSameSeries = (a: TotalPltsPowerPoint[], b: TotalPltsPowerPoint[]): boolean =>
  a.length === b.length && a.every((point, index) => point.timestamp === b[index].timestamp && point.totalKwh === b[index].totalKwh);

export const useTotalPltsPower = (
  url: string,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): TotalPltsPowerResult => {
  const [points, setPoints] = useState<TotalPltsPowerPoint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const hasSettledRef = useRef(false);

  useEffect(() => {
    if (!url) {
      setError(new Error('Total PLTS power URL is not configured.'));
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
        const next = await fetchTotalPltsPower(url, controller.signal);

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
            ? new Error(`Total PLTS power request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`)
            : asError(fetchError, 'Unable to load total PLTS power.'),
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
