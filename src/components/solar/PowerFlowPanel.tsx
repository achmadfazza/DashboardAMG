import { memo, useEffect, useRef, useState } from 'react';
import { Sun, Plug, Zap, Wifi, WifiOff } from 'lucide-react';
import FlowNode from './FlowNode';
import { useNodeRedWs } from '../../hooks/useNodeRedWs';
import type { FlowNodeProps } from '../../types/solar';

const GRID_WS_URL: string = `${import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_ON_GRID_PATH ?? ''}`;
const SOLAR_WS_URL: string = `${import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_ON_SOLAR_PATH ?? ''}`;

const FALLBACK_GRID_VALUE = '--.-- kW';
const FALLBACK_SOLAR_VALUE = '--.-- kW';
const FALLBACK_LOAD_VALUE = '--.-- kW';

// Node-RED may send a bare number, a numeric string, or an object like
// { value: 1903.86 }. Extract kW from any of those shapes.
const extractPowerKw = (payload: unknown): number | null => {
  if (typeof payload === 'number') {
    return Number.isFinite(payload) ? payload : null;
  }
  if (typeof payload === 'string') {
    const n = Number(payload);
    return payload.trim() !== '' && Number.isFinite(n) ? n : null;
  }
  if (payload !== null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['total_power', 'value', 'power', 'total', 'totalgridpwr']) {
      const extracted = extractPowerKw(record[key]);
      if (extracted !== null) {
        return extracted;
      }
    }
  }
  return null;
};

// Solar payload is JSON with a tot_pwr_plts field.
const extractSolarKw = (payload: unknown): number | null => {
  if (payload !== null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    return extractPowerKw(record['tot_pwr_plts']);
  }
  return null;
};

const NODES: FlowNodeProps[] = [
  {
    title: 'Solar',
    value: '181.26 kW',
    icon: Sun,
    colorClass: 'border-amber-400',
    shadowClass: 'shadow-[0_0_20px_rgba(251,191,36,0.3)] dark:shadow-[0_0_30px_rgba(251,191,36,0.3)]',
    top: '30%',
    left: '50%',
  },
  {
    title: 'Load',
    value: '2085.12 kW',
    icon: Plug,
    colorClass: 'border-red-500',
    shadowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.3)] dark:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    top: '70%',
    left: '25%',
  },
  {
    title: 'Grid',
    value: '1903.86 kW',
    icon: Zap,
    colorClass: 'border-sky-500',
    shadowClass: 'shadow-[0_0_20px_rgba(14,165,233,0.3)] dark:shadow-[0_0_30px_rgba(14,165,233,0.3)]',
    top: '70%',
    left: '75%',
  },
];

// Panel is memoized against parent re-renders, but still re-renders on its
// own hook state (live Grid and Solar values) — which is exactly what we want.
const PowerFlowPanel = memo(function PowerFlowPanel() {
  const { data: gridPayload, error: gridError, isConnected: gridConnected } = useNodeRedWs(GRID_WS_URL);
  const { data: solarPayload, error: solarError, isConnected: solarConnected } = useNodeRedWs(SOLAR_WS_URL);
  const gridKw = extractPowerKw(gridPayload);
  const solarKw = extractSolarKw(solarPayload);
  const loadKw = gridKw !== null && solarKw !== null ? gridKw + solarKw : null;
  const gridValue = gridKw !== null ? `${gridKw.toFixed(2)} kW` : FALLBACK_GRID_VALUE;
  const solarValue = solarKw !== null ? `${solarKw.toFixed(2)} kW` : FALLBACK_SOLAR_VALUE;
  const loadValue = loadKw !== null ? `${loadKw.toFixed(2)} kW` : FALLBACK_LOAD_VALUE;

  // Blip the Grid badge every time a new reading arrives: toggling the
  // class retriggers the CSS animation (cleared after it finishes).
  const [gridBlip, setGridBlip] = useState(false);
  const prevGridKw = useRef<number | null>(null);
  useEffect(() => {
    if (gridKw === null || gridKw === prevGridKw.current) {
      return;
    }
    prevGridKw.current = gridKw;
    setGridBlip(true);
    const t = setTimeout(() => setGridBlip(false), 650);
    return () => clearTimeout(t);
  }, [gridKw]);

  // Blip the Solar badge every time a new reading arrives.
  const [solarBlip, setSolarBlip] = useState(false);
  const prevSolarKw = useRef<number | null>(null);
  useEffect(() => {
    if (solarKw === null || solarKw === prevSolarKw.current) {
      return;
    }
    prevSolarKw.current = solarKw;
    setSolarBlip(true);
    const t = setTimeout(() => setSolarBlip(false), 650);
    return () => clearTimeout(t);
  }, [solarKw]);

  // Blip the Load badge every time the calculated load changes.
  const [loadBlip, setLoadBlip] = useState(false);
  const prevLoadKw = useRef<number | null>(null);
  useEffect(() => {
    if (loadKw === null || loadKw === prevLoadKw.current) {
      return;
    }
    prevLoadKw.current = loadKw;
    setLoadBlip(true);
    const t = setTimeout(() => setLoadBlip(false), 650);
    return () => clearTimeout(t);
  }, [loadKw]);

  const connectionLabel = gridConnected || solarConnected ? 'WebSocket connected' : 'WebSocket disconnected';
  const connectionDescription = gridError?.message ?? solarError?.message ?? connectionLabel;

  return (
    <div className="w-full xl:w-[40%] flex-shrink-0 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark shadow-default rounded-sm relative min-h-[500px] xl:min-h-0 overflow-hidden">
      <div
        className="absolute top-4 right-4 z-20 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-theme-xs font-medium shadow-theme-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-dark/95"
        role="status"
        aria-live="polite"
        title={connectionDescription}
      >
        {gridConnected || solarConnected ? (
          <Wifi className="size-4 text-success-600 dark:text-success-400" aria-hidden="true" />
        ) : (
          <WifiOff className="size-4 text-error-600 dark:text-error-400" aria-hidden="true" />
        )}
        <span className={gridConnected || solarConnected ? 'text-success-700 dark:text-success-400' : 'text-error-700 dark:text-error-400'}>
          {gridConnected || solarConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Animated Connecting Lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Flow Grid -> Load: dashes animate from the line start (x1) toward its end (x2) */}
        <line
          x1="75%" y1="70%" x2="25%" y2="70%"
          stroke="#38bdf8" strokeWidth="6"
          strokeDasharray="12 12" className="opacity-70 animate-dash"
        />
        {/* Flow Solar -> junction: top (Solar) toward bottom (junction) */}
        <line
          x1="50%" y1="30%" x2="50%" y2="70%"
          stroke="#38bdf8" strokeWidth="6"
          strokeDasharray="12 17" className="opacity-70 animate-dash"
        />
        {/* Central Junction Dot */}
        <circle cx="50%" cy="70%" r="8" fill="#38bdf8" filter="url(#glow)" />
      </svg>

      {/* Nodes (Grid, Solar, and Load values are live from Node-RED) */}
      {NODES.map((node) => (
        <FlowNode
          key={node.title}
          {...node}
          value={node.title === 'Grid' ? gridValue : node.title === 'Solar' ? solarValue : node.title === 'Load' ? loadValue : node.value}
          pulse={(node.title === 'Grid' && gridBlip) || (node.title === 'Solar' && solarBlip) || (node.title === 'Load' && loadBlip)}
        />
      ))}
    </div>
  );
});

export default PowerFlowPanel;
