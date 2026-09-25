import { Target, Factory } from 'lucide-react';
import type { SummaryCardProps } from '../../types/oee';

const SummaryCard = ({ title, accentColor, data, month }: SummaryCardProps) => (
  <div className={`bg-white dark:bg-white/[0.03] rounded-md shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative flex flex-col`}>
    {/* Top Accent Line */}
    <div className={`h-1.5 w-full ${accentColor}`}></div>

    <div className="p-4 flex-1">
      <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
        <h3 className="font-bold text-gray-800 dark:text-white/90 tracking-wide">{title}</h3>
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">{month}</span>
      </div>

      <div className="space-y-4">
        {/* OEE Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-orange-500" />
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">OEE</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Pants</p>
              <p className={`text-2xl font-bold ${data.oeePantsColor}`}>{data.oeePants}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Napkin</p>
              <p className={`text-2xl font-bold ${data.oeeNapkinColor}`}>{data.oeeNapkin}%</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center w-full">Target Pants 81,00% - Napkin 72,00%</p>
        </div>

        {/* Output Section */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Factory size={16} className="text-amber-700 dark:text-amber-500" />
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">OUTPUT</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Pants</p>
              <p className="text-xl font-black text-gray-800 dark:text-white/90">{data.outPants}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Napkin</p>
              <p className="text-xl font-black text-gray-800 dark:text-white/90">{data.outNapkin}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default SummaryCard;
