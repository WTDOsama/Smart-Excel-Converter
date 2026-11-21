/* معاينة النتيجة النهائية — جدول قابل للتعديل مع التحقق والتصدير */
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  FileText,
  FileSpreadsheet,
  Table2,
  ShieldCheck,
} from "lucide-react";
import { TransformResponse } from "../lib/api";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { fmtNum } from "../lib/format";

export default function ResultPreview({
  result,
  rowsOverride,
  onRowsChange,
}: {
  result: TransformResponse;
  rowsOverride?: Record<string, string>[] | null;
  onRowsChange?: (rows: Record<string, string>[]) => void;
}) {
  const { t, lang } = useI18n();
  const { toast, refreshStats, refreshOperations } = useApp();
  const [rows, setRows] = useState<Record<string, string>[]>(rowsOverride || result.preview);
  const [approved, setApproved] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ r: number; c: string } | null>(null);

  useEffect(() => {
    setRows(rowsOverride || result.preview);
    setApproved(false);
  }, [result.result_id, rowsOverride]);

  const cols = result.columns.map((c) => c.name);
  const dupSet = useMemo(
    () => new Set(result.validation.duplicate_row_indices),
    [result.validation]
  );

  const updateCell = (r: number, c: string, v: string) => {
    const next = rows.map((row, i) => (i === r ? { ...row, [c]: v } : row));
    setRows(next);
    setApproved(false);
    onRowsChange?.(next);
  };

  const doExport = async (format: "xlsx" | "csv" | "pdf") => {
    setExporting(format);
    try {
      const fname = await api.exportResult(result.result_id, format, rows);
      toast("success", `${t("kind_export")}: ${fname}`);
      await Promise.all([refreshStats(), refreshOperations()]);
    } catch (e: any) {
      toast("error", e.message || t("error_occurred"));
    } finally {
      setExporting(null);
    }
  };

  const issues = result.validation.issues;

  return (
    <div className="space-y-5">
      {/* ملخص التحقق */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center">
            <Table2 size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-navy num">{fmtNum(rows.length, lang)}</p>
            <p className="text-[11px] text-muted font-bold">{t("rows_label")}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              dupSet.size ? "bg-warn/10 text-warn" : "bg-ok/10 text-ok"
            }`}
          >
            <Copy size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-navy num">{fmtNum(dupSet.size, lang)}</p>
            <p className="text-[11px] text-muted font-bold">{t("duplicates_found")}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              issues.some((i) => i.type === "missing_required") ? "bg-bad/10 text-bad" : "bg-ok/10 text-ok"
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-navy num">{fmtNum(issues.length, lang)}</p>
            <p className="text-[11px] text-muted font-bold">{t("data_validation")}</p>
          </div>
        </div>
      </div>

      {/* نتائج التحقق التفصيلية */}
      {issues.length === 0 ? (
        <div className="rounded-xl bg-ok/10 border border-ok/30 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={17} className="text-ok" />
          <p className="text-sm font-bold text-ok">{t("validation_ok")}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-warn/5 border border-warn/30 px-4 py-3">
          <p className="text-sm font-bold text-warn mb-2 flex items-center gap-2">
            <AlertTriangle size={15} />
            {t("data_validation")}
          </p>
          <ul className="space-y-1">
            {issues.map((i, idx) => (
              <li
                key={idx}
                className={`text-[13px] ${
                  i.type === "missing_required" ? "text-bad font-bold" : "text-ink/80"
                }`}
              >
                • {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* شريط الإجراءات */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <button
          className={`btn ${approved ? "bg-ok text-white" : "btn-navy"}`}
          onClick={() => {
            setApproved(!approved);
            if (!approved) toast("success", t("approved"));
          }}
        >
          <ShieldCheck size={16} />
          {approved ? t("approved") : t("approve")}
        </button>
        <div className="ms-auto flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!!exporting} onClick={() => doExport("xlsx")}>
            {exporting === "xlsx" ? t("exporting") : (<><Download size={16} /> {t("download_excel")}</>)}
          </button>
          <button className="btn-outline" disabled={!!exporting} onClick={() => doExport("pdf")}>
            {exporting === "pdf" ? t("exporting") : (<><FileText size={16} /> {t("export_pdf")}</>)}
          </button>
          <button className="btn-outline" disabled={!!exporting} onClick={() => doExport("csv")}>
            {exporting === "csv" ? t("exporting") : (<><FileSpreadsheet size={16} /> {t("export_csv")}</>)}
          </button>
        </div>
      </div>

      {/* الجدول */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h4 className="font-bold text-navy text-sm">{t("preview_title")}</h4>
          <p className="text-[11px] text-muted">{t("edit_hint")}</p>
        </div>
        <div className="overflow-auto max-h-[520px]" dir="rtl">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead className="sticky top-0 z-10">
              <tr className="bg-navy text-white">
                <th className="px-3 py-2.5 text-[12px] font-bold border border-navy-700 w-12">{t("row_num")}</th>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-[12px] font-bold border border-navy-700 whitespace-nowrap">
                    {c}
                    {result.columns.find((x) => x.name === c)?.required && (
                      <span className="text-accent ms-0.5">*</span>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-[12px] font-bold border border-navy-700 whitespace-nowrap">
                  {t("source_label")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className={dupSet.has(r) ? "bg-warn/5" : r % 2 ? "bg-surface/50" : "bg-white"}>
                  <td className="px-3 py-1.5 border border-slate-200 text-center text-[11px] text-muted num">
                    {r + 1}
                    {dupSet.has(r) && <Copy size={11} className="inline ms-1 text-warn" />}
                  </td>
                  {cols.map((c) => (
                    <td
                      key={c}
                      className={`px-3 py-1.5 border border-slate-200 max-w-[220px] ${
                        row[c] === "" || row[c] == null ? "bg-bad/5" : ""
                      }`}
                      onDoubleClick={() => setEditing({ r, c })}
                    >
                      {editing && editing.r === r && editing.c === c ? (
                        <input
                          autoFocus
                          className="w-full bg-white outline-none ring-2 ring-teal/40 rounded px-1 py-0.5 text-[13px]"
                          defaultValue={row[c] || ""}
                          onBlur={(e) => {
                            updateCell(r, c, e.target.value);
                            setEditing(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                      ) : (
                        <span
                          className="block truncate text-[13px] cursor-text min-h-[20px]"
                          onClick={() => setEditing({ r, c })}
                          title={row[c]}
                        >
                          {row[c] || <span className="text-bad/50">—</span>}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 border border-slate-200 text-[11px] text-muted whitespace-nowrap">
                    {row._source}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 2} className="text-center py-10 text-muted text-sm">
                    {t("no_result_yet")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {result.row_count > rows.length && (
          <p className="px-5 py-2.5 text-[11px] text-muted border-t border-slate-100 num" dir="rtl">
            {t("max_preview_rows")}: {fmtNum(rows.length, lang)} / {fmtNum(result.row_count, lang)}
          </p>
        )}
      </div>
    </div>
  );
}
