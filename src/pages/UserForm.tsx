import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Eye, EyeOff, Save, ShieldCheck } from "lucide-react";
import AlertModal from "../components/common/AlertModal";
import { apiFetch } from "../utils/api";
import type { Department } from "../types/auth";

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  nik: string;
  role: "admin" | "manager" | "user";
  created_at: string;
  department_id?: string | null;
}

const API = import.meta.env.VITE_API_BASE_URL;

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  nik: "",
  password: "",
  role: "user" as UserRow["role"],
  department_id: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
const labelClass =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

export default function UserForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{
    open: boolean;
    variant: "confirm" | "loading" | "success" | "error";
    title: string;
    message?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    open: false,
    variant: "success",
    title: "",
    message: undefined,
    confirmText: "OK",
    cancelText: "Batal",
    onConfirm: undefined,
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/api/departments`);
      const json = await res.json();
      if (res.ok) setDepartments(json.data ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const fetchUser = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await apiFetch(`${API}/api/users/${id}`);
      const json = await res.json();
      if (res.ok) {
        const u = json.data;
        setForm({
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          nik: u.nik,
          password: "",
          role: u.role,
          // department_id can arrive as a number (integer/bigint columns) while
          // <option value> is always a string; normalise so the select matches.
          department_id: u.department_id != null ? String(u.department_id) : "",
        });
      } else {
        setError(json.message || "Gagal memuat data user.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Reset form state whenever the target user id changes
  // (prevents stale state when switching between /new and /:id/edit)
  useEffect(() => {
    setForm(emptyForm);
    setError("");
  }, [id]);

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.nik) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (!isEdit && !form.password) {
      setError("Password wajib diisi untuk user baru.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = isEdit ? `${API}/api/users/${id}` : `${API}/api/users`;
      const body: Record<string, string> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        nik: form.nik,
        role: form.role,
        department_id: form.department_id,
      };
      if (form.password) body.password = form.password;
      const res = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        setModal({
          open: true,
          variant: "success",
          title: "Berhasil!",
          message: isEdit ? "User berhasil diperbarui." : "User berhasil dibuat.",
          confirmText: "OK",
          onConfirm: () => {
            setModal((prev) => ({ ...prev, open: false }));
            navigate("/user-management");
          },
        });
      } else {
        setError(json.message || "Gagal menyimpan user.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/user-management")}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800 md:text-3xl dark:text-white/90">
            {isEdit ? "Edit User" : "Tambah User Baru"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEdit
              ? "Perbarui informasi user yang sudah ada."
              : "Lengkapi data untuk user baru."}
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
          <div className="rounded-xl bg-brand-50 p-2.5 dark:bg-brand-900/30">
            <ShieldCheck className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Informasi User
          </h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className={labelClass}>NIK (Nomor Induk Karyawan)</label>
            <input
              type="text"
              value={form.nik}
              onChange={(e) => setForm({ ...form, nik: e.target.value })}
              className={inputClass}
              placeholder="Contoh: 3201234567890001"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                className={inputClass}
                placeholder="Nama depan"
              />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
                className={inputClass}
                placeholder="Nama belakang"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label className={labelClass}>
              Password{" "}
              {isEdit && (
                <span className="font-normal text-gray-400">
                  (kosongkan jika tidak diubah)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className={`${inputClass} pr-10`}
                placeholder={isEdit ? "Kosongkan jika tidak diubah" : "••••••••"}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Role</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as UserRow["role"] })
              }
              className={inputClass}
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Departemen</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className={inputClass}
            >
              <option value="">Tidak Ada Departemen</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.department_name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
          <button
            type="button"
            onClick={() => navigate("/user-management")}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Simpan
              </>
            )}
          </button>
        </div>
      </div>

      <AlertModal
        open={modal.open}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
}
