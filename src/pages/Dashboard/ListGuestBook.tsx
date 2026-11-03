import { useState } from "react";
import {
  Users,
  LogIn,
  LogOut,
  Plus,
  FileSpreadsheet,
  Search,
  FileSearch,
  CalendarDays,
} from "lucide-react";
import { Link } from "react-router";

interface GuestRow {
  nomorKartu: string;
  tanggalMasuk: string; // ISO datetime string
  waktuKeluar: string | null; // ISO datetime string, null jika belum checkout
  nik: string;
  nama: string;
  vendor: string;
  kontak: string;
  department: string;
  keperluan: string;
  status: "Masuk" | "Keluar";
}

function calculateDuration(masuk: string, keluar: string): string {
  const ms = new Date(keluar).getTime() - new Date(masuk).getTime();
  if (ms < 0) return "-";
  const totalMinutes = Math.floor(ms / 60000);
  const jam = Math.floor(totalMinutes / 60);
  const menit = totalMinutes % 60;
  if (jam === 0) return `${menit} menit`;
  return `${jam} jam ${menit} menit`;
}

// Placeholder until the backend list endpoint is wired up
const guests: GuestRow[] = [];

const monthOptions = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];


const columns = [
  "No. Kartu",
  "Tanggal Masuk",
  "Nama",
  "Vendor / Instansi",
  "Kontak",
  "Department",
  "Keperluan",
  "Durasi Kunjungan",
  "Status",
  "Aksi",
];

export default function ListGuestBook() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth())
  );

  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      !searchQuery ||
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.nik.includes(searchQuery);
    const matchesMonth = (() => {
      if (!selectedMonth) return true;
      const d = new Date(g.tanggalMasuk);
      return (
        d.getMonth() === Number(selectedMonth) &&
        d.getFullYear() === new Date().getFullYear()
      );
    })();
    return matchesSearch && matchesMonth;
  });

  const total = guests.length;
  const masuk = guests.filter((g) => g.status === "Masuk").length;
  const keluar = guests.filter((g) => g.status === "Keluar").length;
  const guestStats = [
    {
      label: "Total Tamu",
      value: total,
      caption: "Semua tamu tercatat",
      icon: <Users className="w-6 h-6 text-brand-500" />,
      tile: "bg-brand-50 dark:bg-brand-900/20",
    },
    {
      label: "Tamu Masuk",
      value: masuk,
      caption: "Status Masuk",
      icon: <LogIn className="w-6 h-6 text-emerald-500" />,
      tile: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Tamu Keluar",
      value: keluar,
      caption: "Status Keluar",
      icon: <LogOut className="w-6 h-6 text-red-500" />,
      tile: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800 dark:text-white/90">
            Daftar Tamu AMG
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pantau seluruh tamu yang masuk dan keluar melalui gerbang PT AMG.
          </p>
        </div>
        <Link
          to="/guest-book"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          Tambah Tamu
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {guestStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-xl p-3 ${stat.tile}`}>{stat.icon}</div>
              <span className="text-3xl font-bold text-gray-800 dark:text-white/90">
                {stat.value}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-800 dark:text-white/90">
              {stat.label}
            </p>
            <p className="text-xs text-gray-400">{stat.caption}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Riwayat Kunjungan
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Semua Bulan</option>
                {monthOptions.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama / NIK..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:w-64"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left dark:bg-gray-800/50">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-5 py-3 font-semibold text-gray-600 dark:text-gray-300"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-16">
                    <div className="flex flex-col items-center text-center">
                      <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
                        <FileSearch className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="mt-4 font-medium text-gray-600 dark:text-gray-300">
                        {searchQuery || selectedMonth
                          ? "Tidak ada tamu untuk filter ini"
                          : "Belum ada data tamu tercatat"}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        {searchQuery || selectedMonth
                          ? "Coba ubah bulan atau kata kunci pencarian."
                          : "Data tamu yang diinput akan muncul di sini."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => (
                  <tr
                    key={g.nik}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">
                      {g.nomorKartu}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {new Date(g.tanggalMasuk).toLocaleString("id-ID")}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {g.nama}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {g.vendor}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {g.kontak}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {g.department}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {g.keperluan}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {g.waktuKeluar
                        ? calculateDuration(g.tanggalMasuk, g.waktuKeluar)
                        : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          g.status === "Masuk"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {g.status === "Masuk" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Checkout Tamu
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Sudah Checkout
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
