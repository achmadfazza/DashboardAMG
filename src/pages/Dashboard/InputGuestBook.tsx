import { useState, useCallback } from "react";
import {
  User,
  Building,
  UserCheck,
  Briefcase,
  FileText,
  Calendar,
  CheckCircle,
  Save,
  ShieldCheck,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import CameraCapture from "./GuestBook/CameraCapture";
import KtpScan from "./GuestBook/KtpScan";
import type { ParsedKtp } from "./GuestBook/ktpOcr";

const MAX_GUESTS = 7;

const nowDateTime = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}T${hh}:${min}`;
};

interface Guest {
  nik: string;
  nama: string;
  fotoKtp: File | null;
  fotoTamu: File | null;
}

const emptyGuest = (): Guest => ({
  nik: "",
  nama: "",
  fotoKtp: null,
  fotoTamu: null,
});

const initialFormData = {
  tanggal: nowDateTime(),
  vendor: "",
  pic: "",
  department: "",
  keperluan: "",
  guests: [emptyGuest()] as Guest[],
};

function SectionCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-8">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-6 dark:border-gray-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
          {step}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function GuestBookApp() {
  const [formData, setFormData] = useState(initialFormData);

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
      guestIndex?: number
    ) => {
      const { name, value, files } = e.target as HTMLInputElement;
      if (guestIndex !== undefined) {
        setFormData((prev) => ({
          ...prev,
          guests: prev.guests.map((g, i) =>
            i === guestIndex ? { ...g, [name]: files ? files[0] : value } : g
          ),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: files ? files[0] : value,
        }));
      }
    },
    []
  );

  const handleAddGuest = useCallback(() => {
    setFormData((prev) => {
      if (prev.guests.length >= MAX_GUESTS) return prev;
      return { ...prev, guests: [...prev.guests, emptyGuest()] };
    });
  }, []);

  const handleRemoveGuest = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      guests: prev.guests.filter((_, i) => i !== index),
    }));
  }, []);

  const handleTamuCapture = useCallback(
    (file: File, guestIndex: number) => {
      setFormData((prev) => ({
        ...prev,
        guests: prev.guests.map((g, i) =>
          i === guestIndex ? { ...g, fotoTamu: file } : g
        ),
      }));
    },
    []
  );

  const handleKtpScanResult = useCallback(
    (file: File, parsed: ParsedKtp, guestIndex: number) => {
      setFormData((prev) => ({
        ...prev,
        guests: prev.guests.map((g, i) =>
          i === guestIndex
            ? {
                ...g,
                fotoKtp: file,
                nik: parsed.nik || g.nik,
                nama: parsed.nama || g.nama,
              }
            : g
        ),
      }));
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form Data Submitted:", formData);
    alert("Data tamu berhasil disimpan!");
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-base dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
  const labelClass =
    "block text-base font-medium text-gray-700 mb-2 dark:text-gray-300";

  return (
    <div className="mx-auto max-w-4xl">
      {/* Page header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 p-8 text-white shadow-lg shadow-brand-500/20">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Registrasi Tamu Baru
            </h1>
            <p className="mt-1 text-sm text-brand-100 md:text-base">
              Lengkapi formulir di bawah ini untuk mencatat kunjungan tamu.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-6 pb-8"
      >
        {/* 1. Detail Kunjungan */}
        <SectionCard
          step={1}
          title="Detail Kunjungan"
          description="Tujuan dan pihak yang akan ditemui"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="guest-tanggal" className={labelClass}>
                Tanggal Masuk <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="datetime-local"
                  id="guest-tanggal"
                  name="tanggal"
                  value={formData.tanggal}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Status Kartu</label>
              <div className="flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 py-2.5 pl-3 pr-4 text-emerald-700 select-none dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-base font-semibold">Check In</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="guest-pic" className={labelClass}>
                PIC Penerima <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="guest-pic"
                  name="pic"
                  value={formData.pic}
                  onChange={handleChange}
                  placeholder="Karyawan yang dituju"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="guest-department" className={labelClass}>
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <select
                  id="guest-department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`${inputClass} cursor-pointer appearance-none`}
                  required
                >
                  <option value="" disabled>
                    Pilih Department
                  </option>
                  <option value="IT">IT & Technology</option>
                  <option value="HR">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="Operation">Operation</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="guest-keperluan" className={labelClass}>
              Keperluan <span className="text-red-500">*</span>
            </label>
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                "Interview",
                "Audit",
                "Delivery Barang",
                "Meeting",
                "Maintenance",
                "Inspeksi",
                "Kunjungan Tamu",
                "Training",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, keperluan: suggestion }))
                  }
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                id="guest-keperluan"
                name="keperluan"
                value={formData.keperluan}
                onChange={handleChange}
                rows={3}
                placeholder="Jelaskan tujuan kedatangan secara singkat..."
                className={`${inputClass} resize-y`}
                required
              />
            </div>
          </div>
        </SectionCard>

        {/* 2. Informasi Tamu */}
        <SectionCard
          step={2}
          title="Informasi Tamu"
          description="Data pribadi dan asal instansi tamu"
        >
          {/* Shared vendor field */}
          <div className="mb-6">
            <label htmlFor="guest-vendor" className={labelClass}>
              Vendor / Instansi <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="guest-vendor"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                placeholder="Nama perusahaan"
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Guest list */}
          <div className="space-y-6">
            {formData.guests.map((guest, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    Tamu #{index + 1}
                    {index === 0 && (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                        Primary
                      </span>
                    )}
                  </h3>
                  {formData.guests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGuest(index)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  )}
                </div>

                {/* Nama Lengkap — additional guests only */}
                {index !== 0 && (
                  <div>
                    <label
                      htmlFor={`guest-nama-${index}`}
                      className={labelClass}
                    >
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        id={`guest-nama-${index}`}
                        name="nama"
                        value={guest.nama}
                        onChange={(e) => handleChange(e, index)}
                        placeholder="Contoh: Budi Santoso"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Dokumentasi — primary guest only */}
                {index === 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4 pb-6 dark:border-gray-800">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Dokumentasi
                    </h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 items-stretch">
                      <KtpScan
                        onResult={(file, parsed) =>
                          handleKtpScanResult(file, parsed, index)
                        }
                      />
                      <CameraCapture
                        label="Foto Wajah Tamu"
                        onCapture={(file) => handleTamuCapture(file, index)}
                        capturedName={guest.fotoTamu?.name ?? null}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add guest button */}
          {formData.guests.length < MAX_GUESTS && (
            <button
              type="button"
              onClick={handleAddGuest}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-base font-medium text-gray-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <Plus className="h-4 w-4" />
              Tambah Tamu ({formData.guests.length}/{MAX_GUESTS})
            </button>
          )}
        </SectionCard>

        {/* Sticky actions */}
        <div className="sticky bottom-4 z-40 rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-lg shadow-gray-900/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() =>
                setFormData({ ...initialFormData, tanggal: nowDateTime() })
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <XCircle className="h-5 w-5" />
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-medium text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              Simpan Data Tamu
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
