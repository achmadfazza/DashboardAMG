import React from 'react';
import { KPICardProps } from '../../types/solar';
import Card from './Card';

const KPICard: React.FC<KPICardProps> = ({ title, value, unit, className = '', blip = false }) => (
  <Card className={`flex flex-col justify-center items-center ${className}`}>
    <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">{title}</div>
    <div className={`text-3xl font-bold text-black dark:text-white ${blip ? 'animate-blip' : ''}`}>
      {value} {unit && <span className="text-lg font-normal">{unit}</span>}
    </div>
  </Card>
);

export default KPICard;
