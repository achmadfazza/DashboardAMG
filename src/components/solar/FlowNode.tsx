import React from 'react';
import { FlowNodeProps } from '../../types/solar';

const FlowNode: React.FC<FlowNodeProps> = ({ icon: Icon, title, value, colorClass, shadowClass = '', top, left }) => {
  const iconColorClass = colorClass.split(' ')[0]?.replace('border-', 'text-') || 'text-black dark:text-white';

  return (
    <div
      className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ top, left }}
    >
      <div className="text-gray-700 dark:text-gray-300 font-medium mb-3 whitespace-nowrap text-lg bg-white dark:bg-boxdark px-2 rounded shadow-sm border border-stroke dark:border-strokedark">
        {value}
      </div>
      <div className={`w-28 h-28 rounded-full border-[6px] flex items-center justify-center bg-white dark:bg-boxdark ${colorClass} ${shadowClass}`}>
        <Icon size={48} className={iconColorClass} />
      </div>
      <div className="text-gray-600 dark:text-gray-400 mt-3 font-medium text-lg bg-white dark:bg-boxdark px-2 rounded shadow-sm border border-stroke dark:border-strokedark">
        {title}
      </div>
    </div>
  );
};

export default FlowNode;
