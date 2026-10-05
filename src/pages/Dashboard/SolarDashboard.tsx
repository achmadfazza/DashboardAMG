import { memo, useEffect, useRef, useState } from 'react';
import Card from '../../components/solar/Card';
import KPICard from '../../components/solar/KPICard';
import PowerFlowPanel from '../../components/solar/PowerFlowPanel';
import PowerSourcePie from '../../components/solar/PowerSourcePie';
import PowerTrendChart from '../../components/solar/PowerTrendChart';
import { useNodeRedWs } from '../../hooks/useNodeRedWs';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

const WS_BASE = import.meta.env.VITE_NODE_RED_WS_BASE_URL ?? '';
const TOTAL_YIELD_WS_URL = `${WS_BASE}${import.meta.env.VITE_NODE_RED_ON_TOTAL_YIELD_KWH_SOLAR ?? ''}`;
const DAILY_YIELD_WS_URL = `${WS_BASE}${import.meta.env.VITE_NODE_RED_ON_DAILY_YIELD_KWH_SOLAR ?? ''}`;
const MONTHLY_YIELD_WS_URL = `${WS_BASE}${import.meta.env.VITE_NODE_RED_ON_MONTHLY_YIELD_KWH_SOLAR ?? ''}`;
const TOTAL_SOLAR_DEVICE_WS_URL = `${WS_BASE}${import.meta.env.VITE_NODE_RED_ON_TOTAL_SOLAR_DEVICE ?? ''}`;
const TOTAL_SOLAR_DEVICE_CONNECTED_WS_URL = `${WS_BASE}${import.meta.env.VITE_NODE_RED_ON_TOTAL_SOLAR_DEVICE_CONNECTED ?? ''}`;
const SOLAR_DEVICE_FAULT_WS_URL = `${WS_BASE}${import.meta.env.VITE_NODE_RED_ON_SOLAR_DEVICE_FAULT ?? ''}`;
const SOLAR_DEVICE_OFF_WS_URL = `${WS_BASE}${import.meta.env.VITE_NODE_RED_ON_SOLAR_DEVICE_OFF ?? ''}`;

const FALLBACK = '---';

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

// Extract tot_kwh_Acc_plts from the WS payload
const extractTotalYield = (payload: unknown): number | null => {
  if (payload !== null && typeof payload === 'object') {
    return toFiniteNumber((payload as Record<string, unknown>)['tot_kwh_Acc_plts']);
  }
  return null;
};

// Extract tot_kwh_Day_plts from the WS payload
const extractDailyYield = (payload: unknown): number | null => {
  if (payload !== null && typeof payload === 'object') {
    return toFiniteNumber((payload as Record<string, unknown>)['tot_kwh_Day_plts']);
  }
  return null;
};

// Extract tot_kwh_Month_plts from the WS payload
const extractMonthlyYield = (payload: unknown): number | null => {
  if (payload !== null && typeof payload === 'object') {
    return toFiniteNumber((payload as Record<string, unknown>)['tot_kwh_Month_plts']);
  }
  return null;
};

// Generic extractor for count payloads: raw number, "key: value" string,
// JSON string, or an object with one of the known keys.
const extractCount = (payload: unknown, keys: string[]): number | null => {
  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return payload;
  }
  if (typeof payload === 'string' && payload.trim() !== '') {
    const trimmed = payload.trim();
    const direct = toFiniteNumber(trimmed);
    if (direct !== null) return direct;
    const keyValueMatch = trimmed.match(/^(\w+)\s*:\s*(-?\d+(?:\.\d+)?)$/);
    if (keyValueMatch) {
      const n = Number(keyValueMatch[2]);
      if (Number.isFinite(n)) return n;
    }
    try {
      return extractCount(JSON.parse(trimmed), keys);
    } catch {
      return null;
    }
  }
  if (payload !== null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of keys) {
      const n = toFiniteNumber(record[key]);
      if (n !== null) return n;
    }
  }
  return null;
};

const extractTotalSolarDevice = (payload: unknown) =>
  extractCount(payload, ['totalsolardevice', 'tot_device_plts', 'total_devices', 'device_count', 'total_device', 'value']);

const extractTotalGridConnected = (payload: unknown) =>
  extractCount(payload, ['totalgridconnected', 'total_grid_connected', 'total_connected', 'device_connected', 'value']);

const extractTotalFault = (payload: unknown) =>
  extractCount(payload, ['totalgridfault', 'total_grid_fault', 'total_fault', 'fault', 'value']);

const extractTotalOffGrid = (payload: unknown) =>
  extractCount(payload, ['totalgridOFF', 'totalgridoff', 'total_grid_off', 'total_off_grid', 'offgrid', 'value']);

// Blips true for ~650ms every time the value changes
const useValueBlip = (value: number | null): boolean => {
  const [blip, setBlip] = useState(false);
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (value === null || value === prev.current) return;
    prev.current = value;
    setBlip(true);
    const t = setTimeout(() => setBlip(false), 650);
    return () => clearTimeout(t);
  }, [value]);
  return blip;
};

// --- MAIN DASHBOARD COMPONENT ---
// Layout only: heavy sections (flow diagram, charts) live in memoized
// components under src/components/solar/ so re-renders (e.g. theme
// toggle) don't rebuild them.
const SolarDashboard = memo(function SolarDashboard() {
  const { data: totalYieldPayload } = useNodeRedWs(TOTAL_YIELD_WS_URL);
  const { data: dailyYieldPayload } = useNodeRedWs(DAILY_YIELD_WS_URL);
  const { data: monthlyYieldPayload } = useNodeRedWs(MONTHLY_YIELD_WS_URL);
  const { data: totalSolarDevicePayload } = useNodeRedWs(TOTAL_SOLAR_DEVICE_WS_URL);
  const { data: totalSolarDeviceConnectedPayload } = useNodeRedWs(TOTAL_SOLAR_DEVICE_CONNECTED_WS_URL);
  const { data: solarDeviceFaultPayload } = useNodeRedWs(SOLAR_DEVICE_FAULT_WS_URL);
  const { data: solarDeviceOffPayload } = useNodeRedWs(SOLAR_DEVICE_OFF_WS_URL);

  const extractedTotalYield = extractTotalYield(totalYieldPayload);
  // The WS endpoint interleaves tot_kwh_Acc_plts with other payloads
  // (tot_kwh_Day_plts, ...), which extract to null. Keep the last valid
  // value so the display doesn't blink back to the fallback.
  const lastTotalYieldRef = useRef<number | null>(null);
  if (extractedTotalYield !== null) {
    lastTotalYieldRef.current = extractedTotalYield;
  }
  const totalYieldKwh = lastTotalYieldRef.current;
  const dailyYieldKwh = extractDailyYield(dailyYieldPayload);
  const monthlyYieldKwh = extractMonthlyYield(monthlyYieldPayload);
  const totalSolarDevice = extractTotalSolarDevice(totalSolarDevicePayload);
  const totalGridConnected = extractTotalGridConnected(totalSolarDeviceConnectedPayload);
  const totalFault = extractTotalFault(solarDeviceFaultPayload);
  const totalOffGrid = extractTotalOffGrid(solarDeviceOffPayload);

  // Smoothly animate displayed values toward their targets
  const animatedTotalYield = useAnimatedNumber(totalYieldKwh, 800);
  const animatedDailyYield = useAnimatedNumber(dailyYieldKwh, 800);
  const animatedMonthlyYield = useAnimatedNumber(monthlyYieldKwh, 800);
  const animatedTotalSolarDevice = useAnimatedNumber(totalSolarDevice, 800);
  const animatedTotalGridConnected = useAnimatedNumber(totalGridConnected, 800);
  const animatedTotalFault = useAnimatedNumber(totalFault, 800);
  const animatedTotalOffGrid = useAnimatedNumber(totalOffGrid, 800);

  const totalYieldDisplay = animatedTotalYield !== null ? animatedTotalYield.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : FALLBACK;
  const dailyYieldDisplay = animatedDailyYield !== null ? animatedDailyYield.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : FALLBACK;
  const monthlyYieldDisplay = animatedMonthlyYield !== null ? animatedMonthlyYield.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : FALLBACK;
  const totalSolarDeviceDisplay = animatedTotalSolarDevice !== null ? Math.round(animatedTotalSolarDevice).toString() : FALLBACK;
  const totalGridConnectedDisplay = animatedTotalGridConnected !== null ? Math.round(animatedTotalGridConnected).toString() : FALLBACK;
  const totalFaultDisplay = animatedTotalFault !== null ? Math.round(animatedTotalFault).toString() : FALLBACK;
  const totalOffGridDisplay = animatedTotalOffGrid !== null ? Math.round(animatedTotalOffGrid).toString() : FALLBACK;
  const totalOffGridBlip = useValueBlip(totalOffGrid);
  const totalFaultBlip = useValueBlip(totalFault);

  const totalYieldBlip = useValueBlip(totalYieldKwh);
  const dailyYieldBlip = useValueBlip(dailyYieldKwh);
  const monthlyYieldBlip = useValueBlip(monthlyYieldKwh);
  const totalSolarDeviceBlip = useValueBlip(totalSolarDevice);

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
            <KPICard title="Total Off-Grid:" value={totalOffGridDisplay} blip={totalOffGridBlip} />
            <KPICard title="Dev Connected" value={totalGridConnectedDisplay} />
            <KPICard title="Dev. Fault:" value={totalFaultDisplay} blip={totalFaultBlip} />
            <Card className="flex flex-col items-center justify-center col-span-2 lg:col-span-1 lg:col-start-5 py-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-1 text-center">Annual Yield (kWh):</div>
              <div className="text-2xl font-bold text-black dark:text-white text-center mt-2">58332.9</div>
            </Card>
          </div>

          {/* Middle Row Yields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="flex items-center justify-center py-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm mr-2">Daily Yield (kWh):</div>
              <div className={`text-xl font-bold text-black dark:text-white ${dailyYieldBlip ? 'animate-blip' : ''}`}>{dailyYieldDisplay}</div>
            </Card>
            <Card className="flex items-center justify-center py-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm mr-2">Total Yield (kWh):</div>
              <div className={`text-xl font-bold text-black dark:text-white ${totalYieldBlip ? 'animate-blip' : ''}`}>{totalYieldDisplay}</div>
            </Card>
            <Card className="flex items-center justify-center py-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm mr-2">Monthly Yield (kWh):</div>
              <div className={`text-xl font-bold text-black dark:text-white ${monthlyYieldBlip ? 'animate-blip' : ''}`}>{monthlyYieldDisplay}</div>
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
