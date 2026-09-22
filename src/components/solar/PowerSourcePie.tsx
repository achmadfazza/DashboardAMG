import { memo } from 'react';
import type { CSSProperties } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Card from './Card';

const pieData = [
  { name: 'Solar PV', value: 9, color: '#F59E0B' }, // Amber
  { name: 'PLN', value: 91, color: '#0EA5E9' },     // Sky
];

// Hoisted so recharts doesn't receive new object identities on re-render.
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: '#1f2937',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
};
const TOOLTIP_ITEM_STYLE: CSSProperties = { color: '#fff' };

const PowerSourcePie = memo(function PowerSourcePie() {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Power Source <div className="w-2 h-2 rounded-full bg-emerald-500 ml-2 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
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
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-amber-500 font-medium">Solar PV</span>
          <span className="text-sm text-black dark:text-gray-300">9%</span>
          <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 my-1"></div>
          <span className="text-xs text-sky-500 font-medium">PLN</span>
          <span className="text-sm text-black dark:text-gray-300">91%</span>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-stroke dark:border-gray-800 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center">
            <div className="w-3 h-1 bg-amber-500 mr-2 rounded-sm"></div>
            <span className="text-gray-600 dark:text-gray-400">Solar PV</span>
          </div>
          <span className="font-medium text-black dark:text-white">181 kW</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center">
            <div className="w-3 h-1 bg-sky-500 mr-2 rounded-sm"></div>
            <span className="text-gray-600 dark:text-gray-400">PLN</span>
          </div>
          <span className="font-medium text-black dark:text-white">1.90 MW</span>
        </div>
      </div>
    </Card>
  );
});

export default PowerSourcePie;
