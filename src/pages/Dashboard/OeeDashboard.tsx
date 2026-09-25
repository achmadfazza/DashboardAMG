import { useState } from 'react';
import { Calendar } from 'lucide-react';
import SummaryCard from '../../components/oee/SummaryCard';
import ShiftRow from '../../components/oee/ShiftRow';
import type { OeeDataPoint, SummaryCardItem } from '../../types/oee';

// Mock data designed to roughly resemble the dashboard image
const generatePantsData = (shiftMultiplier: number): OeeDataPoint[] => [
  { name: 'M3', oee: 89.1 * shiftMultiplier, actual: 162 * shiftMultiplier, target: 81.0 },
  { name: 'M4', oee: 85.5 * shiftMultiplier, actual: 172 * shiftMultiplier, target: 81.0 },
  { name: 'M5', oee: 86.1 * shiftMultiplier, actual: 186 * shiftMultiplier, target: 81.0 },
  { name: 'M7', oee: 71.3 * shiftMultiplier, actual: 171 * shiftMultiplier, target: 81.0 },
  { name: 'M8', oee: 73.9 * shiftMultiplier, actual: 177 * shiftMultiplier, target: 81.0 },
  { name: 'M9', oee: 92.0 * shiftMultiplier, actual: 205 * shiftMultiplier, target: 81.0 },
  { name: 'M10', oee: 70.3 * shiftMultiplier, actual: 130 * shiftMultiplier, target: 81.0 },
];

const generateNapkinData = (shiftMultiplier: number): OeeDataPoint[] => [
  { name: 'M1', oee: 26.7 * shiftMultiplier, actual: 102 * shiftMultiplier, target: 72.0 },
  { name: 'M6', oee: 80.0 * shiftMultiplier, actual: 288 * shiftMultiplier, target: 72.0 },
  { name: 'M11', oee: 50.5 * (shiftMultiplier > 1 ? shiftMultiplier * 0.8 : shiftMultiplier), actual: 157 * shiftMultiplier, target: 72.0 },
];

const dataShift1 = { pants: generatePantsData(1), napkin: generateNapkinData(1) };
const dataShift2 = { pants: generatePantsData(1.05), napkin: generateNapkinData(1.2) };
const dataShift3 = { pants: generatePantsData(0.95), napkin: generateNapkinData(1.1) };
const dataFullDay = {
  pants: dataShift1.pants.map((d, i) => ({
    name: d.name,
    target: 81.0,
    oee: (dataShift1.pants[i].oee + dataShift2.pants[i].oee + dataShift3.pants[i].oee) / 3,
    actual: dataShift1.pants[i].actual + dataShift2.pants[i].actual + dataShift3.pants[i].actual
  })),
  napkin: dataShift1.napkin.map((d, i) => ({
    name: d.name,
    target: 72.0,
    oee: (dataShift1.napkin[i].oee + dataShift2.napkin[i].oee + dataShift3.napkin[i].oee) / 3,
    actual: dataShift1.napkin[i].actual + dataShift2.napkin[i].actual + dataShift3.napkin[i].actual
  }))
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SUMMARY_CARDS: SummaryCardItem[] = [
  {
    title: "SHIFT 1",
    accentColor: "bg-blue-500",
    data: {
      oeePants: "80,95", oeePantsColor: "text-red-600",
      oeeNapkin: "36,98", oeeNapkinColor: "text-red-600",
      outPants: "1.204.460", outNapkin: "390.480"
    }
  },
  {
    title: "SHIFT 2",
    accentColor: "bg-teal-500",
    data: {
      oeePants: "80,27", oeePantsColor: "text-red-600",
      oeeNapkin: "62,95", oeeNapkinColor: "text-red-600",
      outPants: "1.194.268", outNapkin: "664.800"
    }
  },
  {
    title: "SHIFT 3",
    accentColor: "bg-purple-500",
    data: {
      oeePants: "82,78", oeePantsColor: "text-emerald-600",
      oeeNapkin: "78,16", oeeNapkinColor: "text-emerald-600",
      outPants: "1.231.660", outNapkin: "825.360"
    }
  },
  {
    title: "FULL DAY",
    accentColor: "bg-orange-400",
    data: {
      oeePants: "81,33", oeePantsColor: "text-emerald-600",
      oeeNapkin: "59,36", oeeNapkinColor: "text-red-600",
      outPants: "3.630.388", outNapkin: "1.880.640"
    }
  }
];

export default function OeeDashboard() {
  const [selectedMonth, setSelectedMonth] = useState('September');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b-2 border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white/90 tracking-wide">
            Dashboard Performance Produksi
          </h1>
        </div>

        {/* Month Dropdown Selector */}
        <div className="mt-4 md:mt-0 relative flex items-center gap-2 bg-white dark:bg-white/[0.03] px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <Calendar size={20} className="text-brand-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-gray-800 dark:text-white/90 font-bold text-lg uppercase tracking-wide appearance-none pr-4 dark:[&>option]:bg-gray-900"
          >
            {MONTHS.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <div className="pointer-events-none absolute right-3 text-gray-500 dark:text-gray-400">
             <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-10">
        {SUMMARY_CARDS.map((card) => (
          <SummaryCard key={card.title} {...card} month={selectedMonth} />
        ))}
      </div>

      {/* Chart Rows */}
      <div className="space-y-12">
        <ShiftRow
          title="Shift 1"
          dataPants={dataShift1.pants}
          dataNapkin={dataShift1.napkin}
        />
        <ShiftRow
          title="Shift 2"
          dataPants={dataShift2.pants}
          dataNapkin={dataShift2.napkin}
        />
        <ShiftRow
          title="Shift 3"
          dataPants={dataShift3.pants}
          dataNapkin={dataShift3.napkin}
        />
        <ShiftRow
          title="Full Day"
          dataPants={dataFullDay.pants}
          dataNapkin={dataFullDay.napkin}
        />
      </div>
    </div>
  );
}
