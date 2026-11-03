import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Search,
  Download,
  Filter,
  Pencil,
  Trash2,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import AlertModal from "../components/common/AlertModal";
import { apiFetch } from "../utils/api";

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  nik: string;
  role: "admin" | "manager" | "user";
  created_at: string;
  department_name?: string;
}

type AlertModalVariant = "confirm" | "loading" | "success" | "error";

interface AlertModalState {
  open: boolean;
  variant: AlertModalVariant;
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

const API = import.meta.env.VITE_API_BASE_URL;

const roleConfig: Record<
  string,
  { label: string; colors: string; icon: React.ReactNode }
> = {
  admin: {
    label: "Admin",
    colors: "bg-error-50 text-error-600 ring-error-100 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/20",
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  manager: {
    label: "Manager",
    colors: "bg-brand-50 text-brand-600 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20",
    icon: <UserCog className="w-3 h-3" />,
  },
  user: {
    label: "User",
    colors: "bg-success-50 text-success-600 ring-success-100 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20",
    icon: <Users className="w-3 h-3" />,
  },
};

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [sortField, setSortField] = useState<keyof UserRow>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<AlertModalState>({
    open: false,
    variant: "confirm",
    title: "",
    message: undefined,
    confirmText: "Ya, Hapus",
    cancelText: "Batal",
    onConfirm: undefined,
  });

  const fetchUsers = useCallback(async (search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const queryString = params.toString();
      const res = await apiFetch(`${API}/api/users${queryString ? `?${queryString}` : ""}`);
      const json = await res.json();
      if (res.ok) setUsers(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(searchQuery);
  }, [fetchUsers, searchQuery]);

  const handleDelete = (user: UserRow) => {
    setModal({
      open: true,
      variant: "confirm",
      title: "Hapus User?",
      message: (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Anda akan menghapus user{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            "{user.first_name} {user.last_name}"
          </span>
          . Tindakan ini tidak dapat dibatalkan.
        </p>
      ),
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      onConfirm: () => {
        setModal((prev) => ({ ...prev, open: false }));
        executeDelete(user.id);
      },
    });
  };

  const executeDelete = async (id: string) => {
    setModal({
      open: true,
      variant: "loading",
      title: "Menghapus...",
      message: "Mohon tunggu, sedang menghapus user.",
      confirmText: "Memproses...",
    });

    try {
      const res = await apiFetch(`${API}/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (res.ok) {
        setModal({
          open: true,
          variant: "success",
          title: "Berhasil!",
          message: "User berhasil dihapus.",
          confirmText: "OK",
          onConfirm: () => {
            setModal((prev) => ({ ...prev, open: false }));
            fetchUsers();
          },
        });
      } else {
        setModal({
          open: true,
          variant: "error",
          title: "Gagal!",
          message: json.message || "Gagal menghapus user.",
          confirmText: "OK",
          onConfirm: () => setModal((prev) => ({ ...prev, open: false })),
        });
      }
    } catch {
      setModal({
        open: true,
        variant: "error",
        title: "Error!",
        message: "Tidak dapat terhubung ke server.",
        confirmText: "OK",
        onConfirm: () => setModal((prev) => ({ ...prev, open: false })),
      });
    }
  };

  const toggleSort = (field: keyof UserRow) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = users
    .filter((u) => !roleFilter || u.role === roleFilter)
    .sort((a, b) => {
      const aVal = String(a[sortField]);
      const bVal = String(b[sortField]);
      const cmp = aVal.localeCompare(bVal, "id");
      return sortDir === "asc" ? cmp : -cmp;
    });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id));

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90">
          Manajemen User
        </h1>
        <nav className="flex items-center gap-1.5 text-sm text-gray-400">
          <span className="hover:text-brand-500 transition">Home</span>
          <span>›</span>
          <span className="text-gray-600 dark:text-gray-300">Manajemen User</span>
        </nav>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Card header */}
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              User List
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Kelola seluruh user yang terdaftar di sistem.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => navigate("/user-management/new")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" />
              Tambah User
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={`${inputClass} pl-9 sm:w-80`}
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilter(!showFilter)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Filter className="w-4 h-4" />
              Filter
              {roleFilter && (
                <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                  {roleFilter}
                </span>
              )}
            </button>
            {showFilter && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilter(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRoleFilter("");
                      setShowFilter(false);
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Semua Role
                  </button>
                  {["admin", "manager", "user"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setRoleFilter(role);
                        setShowFilter(false);
                      }}
                      className="flex w-full items-center px-4 py-2.5 text-sm capitalize text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left dark:bg-gray-800/50">
                <th className="w-12 px-5 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(
                        allSelected
                          ? new Set()
                          : new Set(filtered.map((u) => u.id))
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 accent-brand-600"
                  />
                </th>
                {(
                  [
                    { key: "first_name", label: "Nama" },
                    { key: "email", label: "Email" },
                    { key: "nik", label: "NIK" },
                    { key: "role", label: "Role" },
                    { key: "created_at", label: "Terdaftar" },
                    { key: "department_name", label: "Departemen" },
                  ] as { key: keyof UserRow; label: string }[]
                ).map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-5 py-3.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {col.label}
                      <span className="text-[10px]">
                        {sortField === col.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="w-16 px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      <p className="mt-3 text-sm text-gray-400">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16">
                    <div className="flex flex-col items-center text-center">
                      <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="mt-4 font-medium text-gray-600 dark:text-gray-300">
                        {searchQuery || roleFilter
                          ? "Tidak ada user untuk filter ini"
                          : "Belum ada user terdaftar"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-50 transition last:border-0 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-brand-600"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-xs font-bold text-white">
                          {u.first_name.charAt(0).toUpperCase()}
                          {u.last_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {u.first_name} {u.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">
                      {u.email}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">
                      {u.nik}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${roleConfig[u.role]?.colors}`}
                      >
                        {roleConfig[u.role]?.icon}
                        {roleConfig[u.role]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {new Date(u.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">
                      {u.department_name || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/user-management/${u.id}/edit`)
                          }
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-error-600 transition hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <AlertModal
        open={modal.open}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        loading={modal.variant === "loading"}
        maxWidth="max-w-lg"
        onConfirm={modal.onConfirm}
        onCancel={
          modal.variant === "confirm"
            ? () => setModal((prev) => ({ ...prev, open: false }))
            : undefined
        }
      />
    </div>
  );
}
