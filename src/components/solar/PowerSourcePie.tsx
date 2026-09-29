import { memo } from 'react';
import type { CSSProperties } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Card from './Card';
import { useNodeRedWs } from '../../hooks/useNodeRedWs';

const GRID_WS_URL: string = `${import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_ON_GRID_PATH ?? ''}`;
const SOLAR_WS_URL: string = `${import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_ON_SOLAR_PATH ?? ''}`;

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

const SOLAR_COLOR = '#F59E0B'; // Amber
const GRID_COLOR = '#0EA5E9';  // Sky

// Hoisted so recharts doesn't receive new object identities on re-render.
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: '#1f2937',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
};
const TOOLTIP_ITEM_STYLE: CSSProperties = { color: '#fff' };

const PowerSourcePie = memo(function PowerSourcePie() {
  const { data: gridPayload, isConnected: gridConnected } = useNodeRedWs(GRID_WS_URL);
  const { data: solarPayload, isConnected: solarConnected } = useNodeRedWs(SOLAR_WS_URL);

  const gridKw = extractPowerKw(gridPayload);
  const solarKw = extractSolarKw(solarPayload);
  const totalKw = gridKw !== null && solarKw !== null ? gridKw + solarKw : null;

  const solarPct = totalKw !== null && totalKw > 0 ? (solarKw! / totalKw) * 100 : null;
  const gridPct = totalKw !== null && totalKw > 0 ? (gridKw! / totalKw) * 100 : null;

  const hasData = solarKw !== null && gridKw !== null;

  const pieData = [
    { name: 'Solar PV', value: solarKw ?? 0, color: SOLAR_COLOR },
    { name: 'PLN', value: gridKw ?? 0, color: GRID_COLOR },
  ];

  const formatKw = (kw: number): string => `${kw.toFixed(2)} kW`;

  return (
    <Card className="flex flex-col">
      <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Power Source{' '}
        <div className={`w-2 h-2 rounded-full ml-2 ${gridConnected || solarConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-400'}`}></div>
      </div>
      {/* Explicit height: ResponsiveContainer with height="100%" inside an
          auto-height flex parent renders at 0px first, then re-renders via
          ResizeObserver. A fixed height renders once. */}
      <div className="h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              stroke="none"
              dataKey="value"
              isAnimationActive={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={(value) => [`${Number(value).toFixed(2)} kW`]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hasData ? (
            <>
              <span className="text-xs text-amber-500 font-medium">Solar PV</span>
              <span className="text-sm text-black dark:text-gray-300">{solarPct!.toFixed(2)}%</span>
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 my-1"></div>
              <span className="text-xs text-sky-500 font-medium">PLN</span>
              <span className="text-sm text-black dark:text-gray-300">{gridPct!.toFixed(2)}%</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">Waiting for data…</span>
          )}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-stroke dark:border-gray-800 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center">
            <div className="w-3 h-1 bg-amber-500 mr-2 rounded-sm"></div>
            <span className="text-gray-600 dark:text-gray-400">Solar PV</span>
          </div>
          <span className="font-medium text-black dark:text-white">
            {solarKw !== null ? formatKw(solarKw) : '--'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center">
            <div className="w-3 h-1 bg-sky-500 mr-2 rounded-sm"></div>
            <span className="text-gray-600 dark:text-gray-400">PLN</span>
          </div>
          <span className="font-medium text-black dark:text-white">
            {gridKw !== null ? formatKw(gridKw) : '--'}
          </span>
        </div>
      </div>
    </Card>
  );
});

export default PowerSourcePie;
