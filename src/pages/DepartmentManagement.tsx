import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "../utils/api";
import type { Department } from "../types/auth";

const API = import.meta.env.VITE_API_BASE_URL;

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [departmentName, setDepartementName] = useState("");

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API}/api/departments`);
      const json = await res.json();
      if (res.ok) setDepartments(json.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openCreate = () => {
    setEditingId(null);
    setDepartementName("");
    setError("");
    setFormOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditingId(department.id);
    setDepartementName(department.department_name);
    setError("");
    setFormOpen(true);
  };

  const saveDepartment = async () => {
    if (!departmentName.trim()) {
      setError("Nama departemen wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `${API}/api/departments/${editingId}` : `${API}/api/departments`;
      const res = await apiFetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ department_name: departmentName.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setFormOpen(false);
        setDepartementName("");
        setEditingId(null);
        fetchDepartments();
      } else {
        setError(json.message || "Gagal menyimpan departemen.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus departemen ini?")) return;
    try {
      const res = await apiFetch(`${API}/api/departments/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        fetchDepartments();
      } else {
        setError(json.message || "Gagal menghapus departemen.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90">
          Manajemen Departemen
        </h1>
        <nav className="flex items-center gap-1.5 text-sm text-gray-400">
          <span className="hover:text-brand-500 transition">Home</span>
          <span>›</span>
          <span className="text-gray-600 dark:text-gray-300">Manajemen Departemen</span>
        </nav>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Departemen List
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Kelola seluruh departemen yang terdaftar di sistem.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
            Tambah Departemen
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left dark:bg-gray-800/50">
                <th className="w-12 px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">Departemen</th>
                <th className="px-5 py-3.5">Dibuat</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Belum ada departemen.
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr key={department.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{department.id}</td>
                    <td className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">{department.department_name}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(department.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(department)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(department.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-lg dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {editingId ? "Edit Departemen" : "Tambah Departemen"}
            </h2>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nama Departemen
              </label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartementName(e.target.value)}
                placeholder="Contoh: Produksi"
                className={inputClass}
              />
            </div>
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveDepartment}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
