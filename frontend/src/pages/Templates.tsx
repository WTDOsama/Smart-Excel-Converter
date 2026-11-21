/* مكتبة الفورمات المحفوظة */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Library,
  Plus,
  Search,
  Eye,
  Pencil,
  Copy,
  Trash2,
  UploadCloud,
  Table2,
  Play,
} from "lucide-react";
import { Modal, ConfirmDialog, EmptyState, Spinner } from "../components/ui";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { api, Template } from "../lib/api";
import { fmtDate, fmtDateTime } from "../lib/format";

export default function TemplatesPage() {
  const { t, lang } = useI18n();
  const {
    templates,
    refreshTemplates,
    refreshStats,
    toast,
    setTemplateId,
    setTargetSheet,
    setStep,
  } = useApp();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("عام");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [renameTarget, setRenameTarget] = useState<Template | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewTarget, setPreviewTarget] = useState<Template | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null);
  const [previewSheet, setPreviewSheet] = useState<string>("");
  const [toDelete, setToDelete] = useState<Template | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(templates.map((x) => x.category || "عام"))),
    [templates]
  );

  const filtered = templates.filter(
    (x) =>
      (cat === "all" || (x.category || "عام") === cat) &&
      (!query || x.name.includes(query) || x.category?.includes(query))
  );

  const createTemplate = async () => {
    if (!pickedFile) {
      toast("error", t("upload_new_template"));
      return;
    }
    setUploading(true);
    try {
      const tpl = await api.createTemplate(pickedFile, newName, newCat);
      await Promise.all([refreshTemplates(), refreshStats()]);
      setAddOpen(false);
      setNewName("");
      setPickedFile(null);
      toast("success", `${t("add_template")}: ${tpl.name}`);
    } catch (e: any) {
      toast("error", e.message || t("error_occurred"));
    } finally {
      setUploading(false);
    }
  };

  const openPreview = async (tpl: Template, sheet?: string) => {
    setPreviewTarget(tpl);
    const sh = sheet || tpl.sheets[0]?.name || "";
    setPreviewSheet(sh);
    setPreviewRows(null);
    try {
      const res = await api.templatePreview(tpl.id, sh);
      setPreviewRows(res.rows);
    } catch (e: any) {
      toast("error", e.message);
    }
  };

  const rename = async () => {
    if (!renameTarget) return;
    try {
      await api.patchTemplate(renameTarget.id, { name: renameValue });
      await refreshTemplates();
      toast("success", t("rename") + " ✓");
      setRenameTarget(null);
    } catch (e: any) {
      toast("error", e.message);
    }
  };

  const duplicate = async (tpl: Template) => {
    try {
      await api.duplicateTemplate(tpl.id);
      await Promise.all([refreshTemplates(), refreshStats()]);
      toast("success", t("duplicate") + " ✓");
    } catch (e: any) {
      toast("error", e.message);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.deleteTemplate(toDelete.id);
      await Promise.all([refreshTemplates(), refreshStats()]);
      toast("success", t("delete") + " ✓");
    } catch (e: any) {
      toast("error", e.message);
    }
    setToDelete(null);
  };

  const useTemplate = (tpl: Template) => {
    setTemplateId(tpl.id);
    setTargetSheet(tpl.sheets[0]?.name ?? null);
    setStep(2);
    navigate("/convert");
  };

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">{t("templates_title")}</h2>
          <p className="text-sm text-muted">{t("templates_subtitle")}</p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          {t("add_template")}
        </button>
      </div>

      {/* البحث والتصفية */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-muted" />
          <input
            className="input ps-10"
            placeholder={t("search_templates")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input max-w-[200px]" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">{t("all_categories")}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* الشبكة */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Library size={28} />}
            title={t("no_templates")}
            action={
              <button className="btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={16} /> {t("add_template")}
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
            <div key={tpl.id} className="card p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-navy text-accent flex items-center justify-center shrink-0">
                  <Library size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink truncate">{tpl.name}</p>
                  <span className="badge bg-surface text-muted mt-1">{tpl.category || "عام"}</span>
                </div>
              </div>

              <dl className="text-[12px] space-y-1.5 mb-4 flex-1">
                <div className="flex justify-between">
                  <dt className="text-muted">{t("date_added")}</dt>
                  <dd className="font-bold text-ink num">{fmtDate(tpl.created_at, lang)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">{t("sheets_num")}</dt>
                  <dd className="font-bold text-ink num">{tpl.sheets.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">{t("last_used")}</dt>
                  <dd className="font-bold text-ink num">
                    {tpl.last_used ? fmtDateTime(tpl.last_used, lang) : t("never_used")}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {tpl.sheets.slice(0, 3).map((s) => (
                    <span key={s.name} className="badge bg-teal/5 text-teal border border-teal/20">
                      <Table2 size={11} />
                      {s.name}
                      <span className="num">({s.columns.length})</span>
                    </span>
                  ))}
                </div>
              </dl>

              <button className="btn-primary mb-3" onClick={() => useTemplate(tpl)}>
                <Play size={15} />
                {t("use_this_template")}
              </button>
              <div className="flex gap-1.5 border-t border-slate-100 pt-3">
                <button className="btn-ghost !px-2.5 !py-1.5 text-xs flex-1" onClick={() => openPreview(tpl)}>
                  <Eye size={14} /> {t("preview")}
                </button>
                <button
                  className="btn-ghost !px-2.5 !py-1.5 text-xs flex-1"
                  onClick={() => {
                    setRenameTarget(tpl);
                    setRenameValue(tpl.name);
                  }}
                >
                  <Pencil size={14} /> {t("rename")}
                </button>
                <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => duplicate(tpl)} title={t("duplicate")}>
                  <Copy size={14} />
                </button>
                <button className="btn-ghost !px-2.5 !py-1.5 text-xs text-bad hover:!bg-bad/10" onClick={() => setToDelete(tpl)} title={t("delete")}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة الإضافة */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t("add_template")}>
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm,.xls"
            className="hidden"
            onChange={(e) => setPickedFile(e.target.files?.[0] || null)}
          />
          <button
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-surface/60 hover:border-teal/60 py-8 flex flex-col items-center gap-2 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud size={26} className="text-navy" />
            <span className="text-sm font-bold text-ink">{pickedFile ? pickedFile.name : t("or_browse")}</span>
            <span className="text-[11px] text-muted">{t("supported")}</span>
          </button>
          <div>
            <label className="label">{t("template_name")}</label>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={pickedFile ? pickedFile.name.replace(/\.[^.]+$/, "") : ""}
            />
          </div>
          <div>
            <label className="label">{t("template_category")}</label>
            <input className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)} list="cats" />
            <datalist id="cats">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="flex gap-3 pt-1">
            <button className="btn-primary flex-1" onClick={createTemplate} disabled={uploading || !pickedFile}>
              {uploading ? <Spinner /> : <Plus size={16} />}
              {t("save")}
            </button>
            <button className="btn-outline" onClick={() => setAddOpen(false)}>{t("cancel")}</button>
          </div>
        </div>
      </Modal>

      {/* نافذة إعادة التسمية */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title={t("rename")}>
        <div className="space-y-4">
          <div>
            <label className="label">{t("template_name")}</label>
            <input className="input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={rename}>{t("save")}</button>
            <button className="btn-outline" onClick={() => setRenameTarget(null)}>{t("cancel")}</button>
          </div>
        </div>
      </Modal>

      {/* نافذة المعاينة */}
      <Modal
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        title={`${t("template_preview_title")} — ${previewTarget?.name || ""}`}
        wide
      >
        {previewTarget && (
          <div className="space-y-4">
            {previewTarget.sheets.length > 1 && (
              <select
                className="input max-w-xs"
                value={previewSheet}
                onChange={(e) => openPreview(previewTarget, e.target.value)}
              >
                {previewTarget.sheets.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            )}
            {previewRows === null ? (
              <div className="py-10 flex justify-center text-muted"><Spinner size={26} /></div>
            ) : (
              <div className="overflow-auto max-h-[50vh] rounded-xl border border-slate-200" dir="rtl">
                <table className="w-full text-[13px] border-collapse min-w-max">
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className={i === 0 ? "bg-navy text-white" : i % 2 ? "bg-surface/60" : "bg-white"}>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`px-3 py-2 border whitespace-nowrap ${
                              i === 0 ? "border-navy-700 font-bold" : "border-slate-200"
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(previewTarget.sheets.find((s) => s.name === previewSheet) || previewTarget.sheets[0])?.columns.map((c) => (
                <span key={c.name} className={`badge border ${c.required ? "bg-bad/5 border-bad/30 text-bad" : "bg-surface border-slate-200 text-ink"}`}>
                  {c.name}{c.required ? " *" : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t("delete")}
        message={t("confirm_delete_template")}
      />
    </div>
  );
}
