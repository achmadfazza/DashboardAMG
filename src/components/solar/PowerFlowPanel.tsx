import { memo } from 'react';
import { Sun, Plug, Zap } from 'lucide-react';
import FlowNode from './FlowNode';
import type { FlowNodeProps } from '../../types/solar';

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

// Static panel: memoized so theme toggles and parent re-renders don't
// rebuild the SVG + nodes.
const PowerFlowPanel = memo(function PowerFlowPanel() {
  return (
    <div className="w-full xl:w-[45%] flex-shrink-0 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark shadow-default rounded-sm relative min-h-[500px] xl:min-h-0 overflow-hidden">
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

      {/* Nodes */}
      {NODES.map((node) => (
        <FlowNode key={node.title} {...node} />
      ))}
    </div>
  );
});

export default PowerFlowPanel;
