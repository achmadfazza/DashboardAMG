import React from 'react';
import { CardProps } from '../../types/solar';

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-sm shadow-default p-4 ${className}`}>
    {children}
  </div>
);

export default Card;
