import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";

export type AlertModalVariant = "confirm" | "loading" | "success" | "error" | "info";

interface AlertModalProps {
  open: boolean;
  variant?: AlertModalVariant;
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  maxWidth?: string;
}

const buttonBase =
  "inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-50";

export default function AlertModal({
  open,
  variant = "info",
  title,
  message,
  confirmText = "OK",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  loading = false,
  maxWidth = "max-w-md",
}: AlertModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const isConfirm = variant === "confirm";
  const isLoading = variant === "loading" || loading;
  const Icon =
    variant === "confirm"
      ? AlertTriangle
      : variant === "success"
        ? CheckCircle2
        : variant === "error"
          ? XCircle
          : variant === "loading"
            ? Loader2
            : Info;

  const iconClass =
    variant === "confirm"
      ? "bg-amber-50 text-amber-500"
      : variant === "success"
        ? "bg-success-50 text-success-600"
        : variant === "error"
          ? "bg-error-50 text-error-600"
          : "bg-brand-50 text-brand-600";

  const confirmButtonClass =
    variant === "confirm" || variant === "error"
      ? "bg-error-600 hover:bg-error-700"
      : "bg-brand-600 hover:bg-brand-700";

  const handleCancel = () => {
    if (isLoading) return;
    onCancel?.();
  };

  const handleConfirm = () => {
    if (isLoading) return;
    onConfirm?.();
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div
        className={`relative w-full ${maxWidth} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}
          >
            <Icon className={`h-6 w-6 ${isLoading ? "animate-spin" : ""}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
              {title}
            </h3>
            {message ? (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {message}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {isConfirm && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`${buttonBase} ${confirmButtonClass}`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Memproses..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
