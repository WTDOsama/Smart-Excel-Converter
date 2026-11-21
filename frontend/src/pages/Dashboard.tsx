/* الصفحة الرئيسية — لوحة المعلومات */
import { Link } from "react-router-dom";
import {
  FileSpreadsheet,
  Library,
  CheckCircle2,
  History,
  ArrowLeft,
  Rows3,
  Sparkles,
} from "lucide-react";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { fmtDateTime, fmtNum } from "../lib/format";
import { StatusBadge, EmptyState } from "../components/ui";

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-navy num leading-8">{value}</p>
        <p className="text-[13px] text-muted font-bold truncate">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { stats, operations } = useApp();

  const maxDay = Math.max(1, ...(stats?.by_day || []).map((d) => d.count));
  const recent = (stats?.recent_operations || operations.slice(0, 6)).slice(0, 6);

  return (
    <div className="space-y-8">
      {/* الترويسة الترحيبية */}
      <section className="card overflow-hidden relative">
        <div className="bg-navy text-white px-6 sm:px-10 py-8 sm:py-10 relative">
          <div className="absolute inset-y-0 end-0 w-1/3 opacity-[0.07] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="160" cy="40" r="90" fill="white" />
              <circle cx="60" cy="170" r="60" fill="white" />
            </svg>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-accent mb-4">
            <Sparkles size={14} />
            AI Excel Transformation
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold leading-snug mb-3 max-w-2xl">
            {t("dash_welcome")}
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-7 max-w-2xl mb-7">
            {t("dash_subtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/convert" className="btn bg-accent text-navy hover:bg-teal-light hover:text-white">
              {t("start_new")}
              <ArrowLeft size={16} className="ltr:rotate-180" />
            </Link>
            <Link to="/templates" className="btn bg-white/10 text-white hover:bg-white/20">
              <Library size={16} />
              {t("manage_templates")}
            </Link>
          </div>
        </div>
      </section>

      {/* بطاقات الإحصاءات */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<FileSpreadsheet size={22} className="text-teal" />}
          tint="bg-teal/10"
          label={t("stat_files")}
          value={fmtNum(stats?.files_processed ?? 0, lang)}
        />
        <StatCard
          icon={<Library size={22} className="text-navy" />}
          tint="bg-navy/10"
          label={t("stat_templates")}
          value={fmtNum(stats?.templates_saved ?? 0, lang)}
        />
        <StatCard
          icon={<CheckCircle2 size={22} className="text-ok" />}
          tint="bg-ok/10"
          label={t("stat_success")}
          value={fmtNum(stats?.successful_conversions ?? 0, lang)}
        />
        <Link to="/logs">
          <StatCard
            icon={<History size={22} className="text-warn" />}
            tint="bg-warn/10"
            label={t("stat_recent")}
            value={fmtNum(
              (stats?.by_status?.success ?? 0) +
                (stats?.by_status?.warning ?? 0) +
                (stats?.by_status?.failed ?? 0),
              lang
            )}
          />
        </Link>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* نشاط التحويل */}
        <section className="card p-6 xl:col-span-2">
          <h3 className="font-bold text-navy mb-1">{t("conversion_activity")}</h3>
          <p className="text-xs text-muted mb-6">{t("stat_success")} · {t("reports_title")}</p>
          {stats?.by_day?.length ? (
            <div className="flex items-end gap-1.5 h-40" dir="ltr">
              {stats.by_day.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-bold text-teal opacity-0 group-hover:opacity-100 num">
                    {d.count}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-teal/80 group-hover:bg-accent transition-colors"
                    style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }}
                    title={`${d.day}: ${d.count}`}
                  />
                  <span className="text-[9px] text-muted num">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<History size={28} />} title={t("no_activity")} />
          )}
        </section>

        {/* العمليات الأخيرة */}
        <section className="card p-6 xl:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-navy flex items-center gap-2">
              <History size={18} className="text-teal" />
              {t("stat_recent")}
            </h3>
            <Link to="/logs" className="text-xs font-bold text-teal hover:underline">
              {t("view_all")}
            </Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-slate-100">
              {recent.map((op) => (
                <li key={op.id} className="py-3 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      op.kind === "conversion"
                        ? "bg-teal/10 text-teal"
                        : op.kind === "upload"
                        ? "bg-navy/10 text-navy"
                        : op.kind === "export"
                        ? "bg-warn/10 text-warn"
                        : "bg-slate-100 text-muted"
                    }`}
                  >
                    {op.kind === "conversion" ? (
                      <FileSpreadsheet size={16} />
                    ) : op.kind === "export" ? (
                      <Rows3 size={16} />
                    ) : (
                      <History size={16} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink truncate">{op.title}</p>
                    <p className="text-xs text-muted truncate">
                      {op.detail} · <span className="num">{fmtDateTime(op.created_at, lang)}</span>
                    </p>
                  </div>
                  <StatusBadge status={op.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<History size={28} />}
              title={t("no_logs")}
              hint={t("dash_subtitle")}
              action={
                <Link to="/convert" className="btn-primary">
                  {t("start_new")}
                </Link>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
