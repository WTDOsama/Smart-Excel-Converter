/* سجل العمليات */
import { useState } from "react";
import { History, Trash2, UploadCloud, FileSpreadsheet, Library, Download, Settings as SettingsIcon } from "lucide-react";
import { EmptyState, StatusBadge, ConfirmDialog } from "../components/ui";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { api, Operation } from "../lib/api";
import { fmtDateTime, fmtNum } from "../lib/format";

const KIND_META: Record<string, { icon: any; key: string; tint: string }> = {
  upload: { icon: UploadCloud, key: "kind_upload", tint: "bg-navy/10 text-navy" },
  conversion: { icon: FileSpreadsheet, key: "kind_conversion", tint: "bg-teal/10 text-teal" },
  template: { icon: Library, key: "kind_template", tint: "bg-warn/10 text-warn" },
  export: { icon: Download, key: "kind_export", tint: "bg-ok/10 text-ok" },
  settings: { icon: SettingsIcon, key: "kind_settings", tint: "bg-slate-100 text-muted" },
};

export default function LogsPage() {
  const { t, lang } = useI18n();
  const { operations, refreshOperations, refreshStats, toast } = useApp();
  const [filter, setFilter] = useState("all");
  const [toClear, setToClear] = useState(false);

  const filtered = filter === "all" ? operations : operations.filter((o) => o.kind === filter);

  const clear = async () => {
    try {
      await api.clearOperations();
      await Promise.all([refreshOperations(), refreshStats()]);
      toast("success", t("clear_log") + " ✓");
    } catch (e: any) {
      toast("error", e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">{t("logs_title")}</h2>
          <p className="text-sm text-muted">{t("logs_subtitle")}</p>
        </div>
        {operations.length > 0 && (
          <button className="btn-danger text-xs" onClick={() => setToClear(true)}>
            <Trash2 size={14} />
            {t("clear_log")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "conversion", "upload", "template", "export"].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-xl px-4 py-2 text-xs font-bold border transition-colors ${
              filter === k
                ? "bg-navy text-white border-navy"
                : "bg-white text-ink border-slate-200 hover:border-teal"
            }`}
          >
            {k === "all" ? t("view_all") : t(KIND_META[k]?.key || k)}
            <span className="num ms-1.5 opacity-70">
              {k === "all" ? operations.length : operations.filter((o) => o.kind === k).length}
            </span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<History size={28} />} title={t("no_logs")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-surface text-muted text-[12px]">
                  <th className="text-start px-5 py-3 font-bold">{t("kind")}</th>
                  <th className="text-start px-5 py-3 font-bold">{t("operation")}</th>
                  <th className="text-start px-5 py-3 font-bold">{t("status")}</th>
                  <th className="text-start px-5 py-3 font-bold">{t("rows_header")}</th>
                  <th className="text-start px-5 py-3 font-bold">{t("date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((op: Operation) => {
                  const meta = KIND_META[op.kind] || KIND_META.settings;
                  const Icon = meta.icon;
                  return (
                    <tr key={op.id} className="hover:bg-surface/50">
                      <td className="px-5 py-3">
                        <span className={`badge ${meta.tint}`}>
                          <Icon size={12} />
                          {t(meta.key)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-bold text-ink">{op.title}</p>
                        {op.detail && <p className="text-[11px] text-muted truncate max-w-[320px]">{op.detail}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={op.status} />
                      </td>
                      <td className="px-5 py-3 text-muted num">{op.rows_out ? fmtNum(op.rows_out, lang) : "—"}</td>
                      <td className="px-5 py-3 text-muted num text-[12px]">{fmtDateTime(op.created_at, lang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toClear}
        onClose={() => setToClear(false)}
        onConfirm={clear}
        title={t("clear_log")}
        message={t("logs_subtitle")}
      />
    </div>
  );
}
