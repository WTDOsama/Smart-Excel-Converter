/* التقارير — ملخص أداء التحويلات */
import { useMemo } from "react";
import { BarChart3, CheckCircle2, Rows3, AlertTriangle, Percent } from "lucide-react";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { fmtNum } from "../lib/format";
import { EmptyState } from "../components/ui";

export default function ReportsPage() {
  const { t, lang } = useI18n();
  const { stats, operations } = useApp();

  const conversions = useMemo(
    () => operations.filter((o) => o.kind === "conversion"),
    [operations]
  );
  const byStatus = stats?.by_status || { success: 0, warning: 0, failed: 0 };
  const totalOps = Math.max(1, byStatus.success + byStatus.warning + byStatus.failed);
  const successRate = Math.round(((byStatus.success + byStatus.warning) / totalOps) * 100);
  const avgRows = conversions.length
    ? Math.round(conversions.reduce((a, o) => a + (o.rows_out || 0), 0) / conversions.length)
    : 0;

  // أكثر الفورمات استخداماً (من تفاصيل العمليات)
  const topTemplates = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of conversions) {
      const name = (c.detail || "").split(" — ")[0];
      if (name) counts[name] = (counts[name] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [conversions]);
  const maxTpl = Math.max(1, ...topTemplates.map((x) => x[1]));

  const maxDay = Math.max(1, ...(stats?.by_day || []).map((d) => d.count));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-navy flex items-center gap-2">
          <BarChart3 size={20} className="text-teal" />
          {t("reports_title")}
        </h2>
        <p className="text-sm text-muted">{t("reports_subtitle")}</p>
      </div>

      {/* مؤشرات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-ok/10 text-ok flex items-center justify-center">
              <Percent size={18} />
            </div>
            <p className="text-[12px] font-bold text-muted">{t("success_rate")}</p>
          </div>
          <p className="text-3xl font-bold text-navy num">{conversions.length ? `${successRate}%` : "—"}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center">
              <Rows3 size={18} />
            </div>
            <p className="text-[12px] font-bold text-muted">{t("avg_rows")}</p>
          </div>
          <p className="text-3xl font-bold text-navy num">{fmtNum(avgRows, lang)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-[12px] font-bold text-muted">{t("status_success")}</p>
          </div>
          <p className="text-3xl font-bold text-navy num">{fmtNum(byStatus.success + byStatus.warning, lang)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-warn/10 text-warn flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <p className="text-[12px] font-bold text-muted">{t("status_warning")}</p>
          </div>
          <p className="text-3xl font-bold text-navy num">{fmtNum(byStatus.warning, lang)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* التحويلات حسب الحالة */}
        <section className="card p-6">
          <h3 className="font-bold text-navy mb-6">{t("conversions_by_status")}</h3>
          {[
            { label: t("status_success"), value: byStatus.success, color: "bg-ok" },
            { label: t("status_warning"), value: byStatus.warning, color: "bg-warn" },
            { label: t("status_failed"), value: byStatus.failed, color: "bg-bad" },
          ].map((row) => (
            <div key={row.label} className="mb-5">
              <div className="flex justify-between text-[13px] font-bold mb-1.5">
                <span className="text-ink">{row.label}</span>
                <span className="text-muted num">{fmtNum(row.value, lang)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-surface overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${(row.value / Math.max(1, totalOps)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </section>

        {/* الأكثر استخداماً */}
        <section className="card p-6">
          <h3 className="font-bold text-navy mb-6">{t("top_templates")}</h3>
          {topTemplates.length === 0 ? (
            <EmptyState icon={<BarChart3 size={26} />} title={t("no_activity")} />
          ) : (
            topTemplates.map(([name, count]) => (
              <div key={name} className="mb-4">
                <div className="flex justify-between text-[13px] font-bold mb-1.5">
                  <span className="text-ink truncate me-3">{name}</span>
                  <span className="text-muted num shrink-0">{fmtNum(count, lang)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${(count / maxTpl) * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {/* نشاط يومي */}
      <section className="card p-6">
        <h3 className="font-bold text-navy mb-6">{t("conversion_activity")}</h3>
        {stats?.by_day?.length ? (
          <div className="flex items-end gap-2 h-44" dir="ltr">
            {stats.by_day.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group">
                <span className="text-[11px] font-bold text-teal num">{d.count}</span>
                <div
                  className="w-full max-w-[46px] rounded-t-lg bg-teal/80 group-hover:bg-accent transition-colors"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                />
                <span className="text-[10px] text-muted num">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<BarChart3 size={26} />} title={t("no_activity")} />
        )}
      </section>
    </div>
  );
}
