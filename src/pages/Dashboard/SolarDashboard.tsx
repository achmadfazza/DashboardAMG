import { memo, useEffect, useRef, useState } from 'react';
import Card from '../../components/solar/Card';
import KPICard from '../../components/solar/KPICard';
import PowerFlowPanel from '../../components/solar/PowerFlowPanel';
import PowerSourcePie from '../../components/solar/PowerSourcePie';
import PowerTrendChart from '../../components/solar/PowerTrendChart';
import { useNodeRedWs } from '../../hooks/useNodeRedWs';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

const TOTAL_YIELD_WS_URL: string = `${import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_ON_TOTAL_YIELD_SOLAR_PATH ?? ''}`;
const TOTAL_SOLAR_DEVICE_WS_URL: string = `${import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? ''}${import.meta.env.VITE_NODE_RED_ON_TOTAL_SOLAR_DEVICE ?? ''}`;

const FALLBACK_TOTAL_YIELD = '---';
const FALLBACK_TOTAL_SOLAR_DEVICE = '---';

// Extract tot_kwh_Acc_plts from the WS payload
const extractTotalYield = (payload: unknown): number | null => {
  if (payload !== null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const value = record['tot_kwh_Acc_plts'];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) {
        return n;
      }
    }
  }
  return null;
};

// Extract device count from the WS payload (totalsolardevice or similar)
const extractTotalSolarDevice = (payload: unknown): number | null => {
  // Handle raw number payloads (e.g. Node-RED sends just `17`)
  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return payload;
  }
  // Handle string payloads — try plain number, "key: value" format, then JSON
  if (typeof payload === 'string' && payload.trim() !== '') {
    const trimmed = payload.trim();
    // Try parsing as a plain number first
    const directNumber = Number(trimmed);
    if (Number.isFinite(directNumber)) {
      return directNumber;
    }
    // Try parsing "key: value" format (e.g. "totalsolardevice: 17")
    const keyValueMatch = trimmed.match(/^(\w+)\s*:\s*(-?\d+(?:\.\d+)?)$/);
    if (keyValueMatch) {
      const n = Number(keyValueMatch[2]);
      if (Number.isFinite(n)) {
        return n;
      }
    }
    // Try parsing as JSON string
    try {
      return extractTotalSolarDevice(JSON.parse(trimmed));
    } catch {
      // Not valid JSON — fall through
    }
  }
  // Handle object payloads with known keys
  if (payload !== null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['totalsolardevice', 'tot_device_plts', 'total_devices', 'device_count', 'total_device', 'value']) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value);
        if (Number.isFinite(n)) {
          return n;
        }
      }
    }
  }
  return null;
};

// --- MAIN DASHBOARD COMPONENT ---
// Layout only: heavy sections (flow diagram, charts) live in memoized
// components under src/components/solar/ so re-renders (e.g. theme
// toggle) don't rebuild them.
const SolarDashboard = memo(function SolarDashboard() {
  const { data: totalYieldPayload } = useNodeRedWs(TOTAL_YIELD_WS_URL);
  const { data: totalSolarDevicePayload } = useNodeRedWs(TOTAL_SOLAR_DEVICE_WS_URL);

  const totalYieldKwh = extractTotalYield(totalYieldPayload);
  const totalSolarDevice = extractTotalSolarDevice(totalSolarDevicePayload);

  // Smoothly animate displayed values toward their targets
  const animatedTotalYield = useAnimatedNumber(totalYieldKwh, 800);
  const animatedTotalSolarDevice = useAnimatedNumber(totalSolarDevice, 800);

  const totalYieldDisplay = animatedTotalYield !== null ? animatedTotalYield.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : FALLBACK_TOTAL_YIELD;
  const totalSolarDeviceDisplay = animatedTotalSolarDevice !== null ? Math.round(animatedTotalSolarDevice).toString() : FALLBACK_TOTAL_SOLAR_DEVICE;

  // Blip the Total Yield card every time a new reading arrives
  const [totalYieldBlip, setTotalYieldBlip] = useState(false);
  const prevTotalYieldKwh = useRef<number | null>(null);
  useEffect(() => {
    if (totalYieldKwh === null || totalYieldKwh === prevTotalYieldKwh.current) {
      return;
    }
    prevTotalYieldKwh.current = totalYieldKwh;
    setTotalYieldBlip(true);
    const t = setTimeout(() => setTotalYieldBlip(false), 650);
    return () => clearTimeout(t);
  }, [totalYieldKwh]);

  // Blip the Total On-Grid card every time a new reading arrives
  const [totalSolarDeviceBlip, setTotalSolarDeviceBlip] = useState(false);
  const prevTotalSolarDevice = useRef<number | null>(null);
  useEffect(() => {
    if (totalSolarDevice === null || totalSolarDevice === prevTotalSolarDevice.current) {
      return;
    }
    prevTotalSolarDevice.current = totalSolarDevice;
    setTotalSolarDeviceBlip(true);
    const t = setTimeout(() => setTotalSolarDeviceBlip(false), 650);
    return () => clearTimeout(t);
  }, [totalSolarDevice]);

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
              <div className={`text-4xl font-bold text-white ${totalSolarDeviceBlip ? 'animate-blip' : ''}`}>{totalSolarDeviceDisplay}</div>
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
              <div className={`text-xl font-bold text-black dark:text-white ${totalYieldBlip ? 'animate-blip' : ''}`}>{totalYieldDisplay}</div>
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
});

export default SolarDashboard;
