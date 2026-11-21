/* صفحة رفع وإدارة ملفات Excel */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Trash2, Table2, ArrowLeft } from "lucide-react";
import Uploader from "../components/Uploader";
import { ConfirmDialog, EmptyState } from "../components/ui";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { fmtBytes, fmtDateTime, fmtNum } from "../lib/format";
import { api } from "../lib/api";

export default function FilesPage() {
  const { t, lang } = useI18n();
  const { files, refreshFiles, refreshStats, toast } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const handleUpload = async (list: File[]) => {
    setBusy(true);
    setProgress(0);
    try {
      const res = await api.uploadFiles(list, setProgress);
      let ok = 0;
      for (const u of res.uploaded) {
        if (u.error) toast("error", `${u.name}: ${u.error}`);
        else ok++;
      }
      if (ok) toast("success", `${t("uploaded_files")}: ${ok}`);
      await Promise.all([refreshFiles(), refreshStats()]);
    } catch (e: any) {
      toast("error", e.message || t("error_occurred"));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.deleteFile(toDelete);
      await Promise.all([refreshFiles(), refreshStats()]);
      toast("success", t("delete") + " ✓");
    } catch (e: any) {
      toast("error", e.message);
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-lg font-bold text-navy mb-1">{t("files_title")}</h2>
        <p className="text-sm text-muted mb-5">{t("files_subtitle")}</p>
        <Uploader onFiles={handleUpload} busy={busy} progress={progress} />
      </section>

      <section className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-navy">
            {t("uploaded_files")}{" "}
            <span className="badge bg-surface text-muted ms-1 num">{files.length}</span>
          </h3>
        </div>
        {files.length === 0 ? (
          <EmptyState icon={<FileSpreadsheet size={28} />} title={t("no_files_yet")} hint={t("files_subtitle")} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {files.map((f) => (
              <li key={f.id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-teal/10 text-teal flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-bold text-ink truncate">{f.name}</p>
                      <span className="text-xs text-muted num">{fmtBytes(f.size)}</span>
                      <span className="text-xs text-muted num">{fmtDateTime(f.uploaded_at, lang)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {f.sheets.map((s) => (
                        <span
                          key={s.name}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-surface border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-ink"
                          title={`${t("rows_count", { n: s.rows })} · ${t("cols_count", { n: s.cols })}`}
                        >
                          <Table2 size={12} className="text-teal" />
                          {s.name}
                          <span className="text-muted num">
                            {fmtNum(s.rows, lang)} × {fmtNum(s.cols, lang)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="btn-outline !py-2 !px-3 text-xs"
                      onClick={() => navigate("/convert")}
                      title={t("use_in_conversion")}
                    >
                      {t("use_in_conversion")}
                      <ArrowLeft size={13} className="ltr:rotate-180" />
                    </button>
                    <button
                      className="btn-danger !py-2 !px-2.5"
                      onClick={() => setToDelete(f.id)}
                      title={t("delete")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={t("delete")}
        message={t("confirm_delete_file")}
      />
    </div>
  );
}
