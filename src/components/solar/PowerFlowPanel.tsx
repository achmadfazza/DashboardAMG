import { memo, useEffect, useRef, useState } from 'react';
import { Sun, Plug, Zap, Wifi, WifiOff } from 'lucide-react';
import FlowNode from './FlowNode';
import { useNodeRedWs } from '../../hooks/useNodeRedWs';
import type { FlowNodeProps } from '../../types/solar';

const WS_URL: string = import.meta.env.VITE_NODE_RED_WS_URL ?? '';

const FALLBACK_GRID_VALUE = '--.-- kW';

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
// own hook state (live Grid value) — which is exactly what we want.
const PowerFlowPanel = memo(function PowerFlowPanel() {
  const { data: gridPayload, error: wsError, isConnected } = useNodeRedWs(WS_URL);
  const gridKw = extractPowerKw(gridPayload);
  const gridValue = gridKw !== null ? `${gridKw.toFixed(2)} kW` : FALLBACK_GRID_VALUE;

  // Blip the Grid badge every time a new reading arrives: toggling the
  // class retriggers the CSS animation (cleared after it finishes).
  const [blip, setBlip] = useState(false);
  const prevGridKw = useRef<number | null>(null);
  useEffect(() => {
    if (gridKw === null || gridKw === prevGridKw.current) {
      return;
    }
    prevGridKw.current = gridKw;
    setBlip(true);
    const t = setTimeout(() => setBlip(false), 650);
    return () => clearTimeout(t);
  }, [gridKw]);

  const connectionLabel = isConnected ? 'WebSocket connected' : 'WebSocket disconnected';
  const connectionDescription = wsError?.message ?? connectionLabel;

  return (
    <div className="w-full xl:w-[45%] flex-shrink-0 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark shadow-default rounded-sm relative min-h-[500px] xl:min-h-0 overflow-hidden">
      <div
        className="absolute top-4 right-4 z-20 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-theme-xs font-medium shadow-theme-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-dark/95"
        role="status"
        aria-live="polite"
        title={connectionDescription}
      >
        {isConnected ? (
          <Wifi className="size-4 text-success-600 dark:text-success-400" aria-hidden="true" />
        ) : (
          <WifiOff className="size-4 text-error-600 dark:text-error-400" aria-hidden="true" />
        )}
        <span className={isConnected ? 'text-success-700 dark:text-success-400' : 'text-error-700 dark:text-error-400'}>
          {isConnected ? 'Connected' : 'Disconnected'}
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

      {/* Nodes (Grid value is live from Node-RED, others are mock) */}
      {NODES.map((node) => (
        <FlowNode
          key={node.title}
          {...node}
          value={node.title === 'Grid' ? gridValue : node.value}
          pulse={node.title === 'Grid' && blip}
        />
      ))}
    </div>
  );
});

export default PowerFlowPanel;
