import { memo, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Sun, Plug, Zap, Wifi, WifiOff } from 'lucide-react';
import FlowNode from './FlowNode';
import { useNodeRedWs } from '../../hooks/useNodeRedWs';
import type { FlowNodeProps } from '../../types/solar';

const GRID_WS_URL: string = `${import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_ON_GRID_PATH ?? ''}`;
const SOLAR_WS_URL: string = `${import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_ON_SOLAR_PATH ?? ''}`;

const FALLBACK_GRID_VALUE = '--.-- kW';
const FALLBACK_SOLAR_VALUE = '--.-- kW';
const FALLBACK_LOAD_VALUE = '--.-- kW';

const GRID_FLOW_COLOR = '#38bdf8';
const SOLAR_FLOW_COLOR = '#fbbf24';
/** Ignore sensor noise around zero so the flow does not stutter on/off. */
const FLOW_THRESHOLD_KW = 0.5;
/** Dash speed bounds: strong flows travel quickly, faint flows drift. */
const MIN_FLOW_DURATION_S = 0.8;
const MAX_FLOW_DURATION_S = 2.4;
/** Readings at or above this reference run at the fastest rate. */
const FLOW_REFERENCE_KW = 2000;

const flowDurationSeconds = (powerKw: number | null): number => {
  const magnitude = Math.abs(powerKw ?? 0);
  const ratio = Math.min(magnitude / FLOW_REFERENCE_KW, 1);
  return MAX_FLOW_DURATION_S - ratio * (MAX_FLOW_DURATION_S - MIN_FLOW_DURATION_S);
};

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
    iconColorClass: 'text-amber-500 dark:text-amber-300',
    shadowClass: 'shadow-[0_0_20px_rgba(251,191,36,0.3)] dark:shadow-[0_0_30px_rgba(251,191,36,0.3)]',
    top: '30%',
    left: '50%',
  },
  {
    title: 'Load',
    value: '2085.12 kW',
    icon: Plug,
    colorClass: 'border-red-500',
    iconColorClass: 'text-red-500 dark:text-red-400',
    shadowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.3)] dark:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    top: '70%',
    left: '25%',
  },
  {
    title: 'Grid',
    value: '1903.86 kW',
    icon: Zap,
    colorClass: 'border-sky-500',
    iconColorClass: 'text-sky-500 dark:text-sky-400',
    shadowClass: 'shadow-[0_0_20px_rgba(14,165,233,0.3)] dark:shadow-[0_0_30px_rgba(14,165,233,0.3)]',
    top: '70%',
    left: '75%',
  },
];

interface EnergyFlowLineProps {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  color: string;
  active: boolean;
  durationSeconds: number;
}

/**
 * Three stacked strokes: a soft channel, a thin idle rail, and the moving dash
 * layer. The dash layer is never unmounted — it only fades and pauses — so the
 * flow eases in/out instead of snapping and keeps its dash phase across toggles.
 */
const EnergyFlowLine = ({ x1, y1, x2, y2, color, active, durationSeconds }: EnergyFlowLineProps) => {
  // Shared by both dash layers so the halo and the core stay in phase.
  const dashStyle: CSSProperties = {
    transition: 'opacity 600ms ease',
    animationDuration: `${durationSeconds}s`,
    animationPlayState: active ? 'running' : 'paused',
  };

  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={10} strokeOpacity={0.1} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeOpacity={0.28} strokeLinecap="round" />
      {/* Wide translucent dashes fake a glow; an SVG filter would not render on
          a zero-height (horizontal) or zero-width (vertical) line. */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={9} strokeLinecap="round" strokeDasharray="14 14"
        className="animate-dash"
        style={{ ...dashStyle, opacity: active ? 0.22 : 0 }}
      />
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray="14 14"
        className="animate-dash"
        style={{ ...dashStyle, opacity: active ? 0.95 : 0 }}
      />
    </>
  );
};

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

  // A line only flows while its source is actually delivering power.
  const gridActive = gridKw !== null && Math.abs(gridKw) > FLOW_THRESHOLD_KW;
  const solarActive = solarKw !== null && solarKw > FLOW_THRESHOLD_KW;
  const gridFlowSeconds = flowDurationSeconds(gridKw);
  const solarFlowSeconds = flowDurationSeconds(solarKw);
  const junctionColor = solarActive ? SOLAR_FLOW_COLOR : GRID_FLOW_COLOR;

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
    <div className="w-full lg:w-[40%] xl:w-[40%] 2xl:w-[40%] flex-shrink-0 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark shadow-default rounded-sm relative min-h-[400px] sm:min-h-[450px] md:min-h-[500px] lg:min-h-0 overflow-hidden">
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
        {/* Flow Grid -> Load: dashes travel from the line start (Grid) to its end (Load). */}
        <EnergyFlowLine
          x1="75%" y1="70%" x2="25%" y2="70%"
          color={GRID_FLOW_COLOR}
          active={gridActive}
          durationSeconds={gridFlowSeconds}
        />
        {/* Flow Solar -> junction: only moves while the panels produce power. */}
        <EnergyFlowLine
          x1="50%" y1="30%" x2="50%" y2="70%"
          color={SOLAR_FLOW_COLOR}
          active={solarActive}
          durationSeconds={solarFlowSeconds}
        />
        {/* Central Junction Dot, with a halo that pulses while energy flows. */}
        <circle
          cx="50%" cy="70%" r="8"
          fill={junctionColor}
          filter="url(#glow)"
          style={{ transition: 'fill 600ms ease' }}
        />
        {gridActive || solarActive ? (
          <circle
            cx="50%" cy="70%" r="8"
            fill="none"
            stroke={junctionColor}
            strokeWidth={2}
            className="animate-flow-pulse"
            style={{ transformBox: 'fill-box', transformOrigin: 'center', transition: 'stroke 600ms ease' }}
          />
        ) : null}
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
