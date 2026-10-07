import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface CardProps {
   children: ReactNode;
   className?: string;
}

export interface KPICardProps {
   title: string;
   value: string | number;
   unit?: string;
   className?: string;
   blip?: boolean;
}

export interface FlowNodeProps {
   icon: LucideIcon;
   title: string;
   value: string | number;
   colorClass: string;
   iconColorClass: string;
   shadowClass?: string;
   top: string | number;
   left: string | number;
   pulse?: boolean;
}