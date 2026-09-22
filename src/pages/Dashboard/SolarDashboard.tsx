import Card from '../../components/solar/Card';
import KPICard from '../../components/solar/KPICard';
import PowerFlowPanel from '../../components/solar/PowerFlowPanel';
import PowerSourcePie from '../../components/solar/PowerSourcePie';
import PowerTrendChart from '../../components/solar/PowerTrendChart';

// --- MAIN DASHBOARD COMPONENT ---
// Layout only: heavy sections (flow diagram, charts) live in memoized
// components under src/components/solar/ so re-renders (e.g. theme
// toggle) don't rebuild them.
const SolarDashboard: React.FC = () => {
  return (
    <div className="w-full">
      <div className="flex flex-col xl:flex-row gap-6 h-full">

        {/* Left Panel - Power Flow Diagram */}
        <PowerFlowPanel />

        {/* Right Panel - Stats & Charts */}
        <div className="w-full xl:w-[55%] flex flex-col gap-4">

          {/* Top Row KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="!bg-emerald-600 flex flex-col items-center justify-center col-span-1 py-6 border-none">
              <div className="text-white/90 text-sm font-medium mb-1">Total On-Grid:</div>
              <div className="text-4xl font-bold text-white">8</div>
            </Card>
            <KPICard title="Total Off-Grid:" value="0" />
            <KPICard title="Dev Connected" value="10" />
            <KPICard title="Dev. Fault:" value="0" />
            <Card className="flex flex-col items-center justify-center col-span-2 lg:col-span-1 lg:col-start-5 py-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-1 text-center">Annual Yield (kWh):</div>
              <div className="text-2xl font-bold text-black dark:text-white text-center mt-2">58332.9</div>
            </Card>
          </div>

          {/* Middle Row Yields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="flex items-center justify-center py-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm mr-2">Daily Yield (kWh):</div>
              <div className="text-xl font-bold text-black dark:text-white">5591.1</div>
            </Card>
            <Card className="flex items-center justify-center py-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm mr-2">Total Yield (kWh):</div>
              <div className="text-xl font-bold text-black dark:text-white">58332.9</div>
            </Card>
            <Card className="flex items-center justify-center py-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm mr-2">Monthly Yield (kWh):</div>
              <div className="text-xl font-bold text-black dark:text-white">58332.9</div>
            </Card>
          </div>

          {/* Bottom Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow min-h-[350px]">
            <PowerSourcePie />
            <PowerTrendChart />
          </div>

        </div>
      </div>

    </div>
  );
};

export default SolarDashboard;
