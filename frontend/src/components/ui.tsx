/* مكونات واجهة مشتركة */
import React, { useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2 } from "lucide-react";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-5 start-5 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-pop animate-[slidein_.2s_ease] ${
            t.kind === "success" ? "bg-ok" : t.kind === "error" ? "bg-bad" : "bg-navy"
          }`}
        >
          {t.kind === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : t.kind === "error" ? (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          ) : (
            <Info size={18} className="shrink-0 mt-0.5" />
          )}
          <span className="leading-6">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="ms-auto opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative bg-card rounded-2xl shadow-pop w-full ${wide ? "max-w-4xl" : "max-w-lg"} max-h-[88vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-navy">{title}</h3>
          <button onClick={onClose} className="btn-ghost !px-2 !py-1.5 rounded-lg" aria-label="close">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
    success: { cls: "bg-ok/10 text-ok", label: t("status_success"), icon: <CheckCircle2 size={13} /> },
    warning: { cls: "bg-warn/10 text-warn", label: t("status_warning"), icon: <AlertTriangle size={13} /> },
    failed: { cls: "bg-bad/10 text-bad", label: t("status_failed"), icon: <AlertCircle size={13} /> },
  };
  const s = map[status] || map.success;
  return <span className={`badge ${s.cls}`}>{s.icon}{s.label}</span>;
}

export function ConfidenceBadge({ value }: { value: number }) {
  const { t } = useI18n();
  if (!value) {
    return <span className="badge bg-slate-100 text-muted">{t("no_match")}</span>;
  }
  const pct = Math.round(value * 100);
  const cls =
    value >= 0.85 ? "bg-ok/10 text-ok" : value >= 0.6 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad";
  return (
    <span className={`badge ${cls}`} title={t("confidence")}>
      <span className="num">{pct}%</span>
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center text-muted mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-ink mb-1">{title}</h3>
      {hint && <p className="text-sm text-muted max-w-md mb-5 leading-6">{hint}</p>}
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted leading-7 mb-6">{message}</p>
      <div className="flex justify-start gap-3">
        <button
          className="btn bg-bad text-white hover:bg-bad/90"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {t("yes_delete")}
        </button>
        <button className="btn-outline" onClick={onClose}>
          {t("cancel")}
        </button>
      </div>
    </Modal>
  );
}
