import { memo } from 'react';
import OeeChartCard from './OeeChartCard';
import type { ShiftRowProps } from '../../types/oee';

// Memoized with module-stable data props, so changing the month filter
// re-renders only the header + summary cards, not the charts.
const ShiftRow = memo(function ShiftRow({ title, dataPants, dataNapkin }: ShiftRowProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-end border-b-2 border-gray-200 dark:border-gray-800 pb-2 mb-4">
        <h2 className="text-xl font-black text-gray-800 dark:text-white/90 tracking-wider uppercase">{title}</h2>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">OEE % vs Output Pads</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OeeChartCard title="Pants" tags="M3,4,5,7,8,9,10" data={dataPants} />
        <OeeChartCard title="Napkin" tags="M1,6,11" data={dataNapkin} />
      </div>
    </div>
  );
});

export default ShiftRow;
