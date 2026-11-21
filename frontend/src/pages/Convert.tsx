/* معالج التحويل — الخطوات الأربع */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Library,
  Sparkles,
  Eye,
  Check,
  Table2,
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  RotateCcw,
} from "lucide-react";
import Uploader from "../components/Uploader";
import MappingEditor, { sourceKey } from "../components/MappingEditor";
import ResultPreview from "../components/ResultPreview";
import { EmptyState, Modal, Spinner } from "../components/ui";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { api, Template } from "../lib/api";
import { fmtBytes, fmtNum } from "../lib/format";

const STEPS = ["step1", "step2", "step3", "step4"];
const STEP_ICONS = [UploadCloud, Library, Sparkles, Eye];

function Stepper() {
  const { t } = useI18n();
  const { step } = useApp();
  return (
    <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
      {STEPS.map((key, i) => {
        const n = i + 1;
        const Icon = STEP_ICONS[i];
        const state = n < step ? "done" : n === step ? "active" : "todo";
        return (
          <li key={key} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div
              className={`flex items-center gap-2.5 rounded-xl px-3 sm:px-4 py-2.5 border transition-colors ${
                state === "active"
                  ? "bg-navy border-navy text-white"
                  : state === "done"
                  ? "bg-teal/10 border-teal/30 text-teal"
                  : "bg-white border-slate-200 text-muted"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold num ${
                  state === "active"
                    ? "bg-accent text-navy"
                    : state === "done"
                    ? "bg-teal text-white"
                    : "bg-surface text-muted"
                }`}
              >
                {state === "done" ? <Check size={14} /> : n}
              </span>
              <span className="hidden md:flex flex-col leading-tight">
                <span className="text-[10px] opacity-70">{t("step_of", { a: n, b: 4 })}</span>
                <span className="text-[13px] font-bold whitespace-nowrap">{t(key)}</span>
              </span>
              <Icon size={16} className="md:hidden" />
            </div>
            {i < 3 && <span className="w-4 sm:w-8 h-px bg-slate-300 shrink-0" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------- الخطوة 1 */
function Step1() {
  const { t, lang } = useI18n();
  const { files, sources, setSources, refreshFiles, refreshStats, toast, setStep } = useApp();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const selectedKeys = useMemo(
    () => new Set(sources.map((s) => sourceKey(s.file_id, s.sheet))),
    [sources]
  );

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

  const toggleSheet = (f: (typeof files)[0], sheetName: string) => {
    const sheet = f.sheets.find((s) => s.name === sheetName)!;
    const k = sourceKey(f.id, sheetName);
    if (selectedKeys.has(k)) {
      setSources((prev) => prev.filter((s) => sourceKey(s.file_id, s.sheet) !== k));
    } else {
      setSources((prev) => [
        ...prev,
        {
          file_id: f.id,
          file_name: f.name,
          sheet: sheetName,
          header_row: sheet.header_row,
          columns: sheet.columns,
          rows: sheet.rows,
        },
      ]);
    }
  };

  const updateHeaderRow = (k: string, hr: number) => {
    setSources((prev) =>
      prev.map((s) => (sourceKey(s.file_id, s.sheet) === k ? { ...s, header_row: hr } : s))
    );
  };

  return (
    <div className="space-y-6">
      <Uploader onFiles={handleUpload} busy={busy} progress={progress} />

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-navy">{t("select_sheets")}</h3>
          <span className="badge bg-teal/10 text-teal num">
            {t("selected_sources")}: {sources.length}
          </span>
        </div>
        {files.length === 0 ? (
          <EmptyState icon={<UploadCloud size={28} />} title={t("no_files_yet")} hint={t("supported")} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {files.map((f) => (
              <li key={f.id} className="px-6 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
                    <FileSpreadsheet size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{f.name}</p>
                    <p className="text-[11px] text-muted num">
                      {fmtBytes(f.size)} · {t("sheets")}: {f.sheets.length}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {f.sheets.map((s) => {
                    const k = sourceKey(f.id, s.name);
                    const checked = selectedKeys.has(k);
                    return (
                      <label
                        key={s.name}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                          checked ? "border-teal bg-teal/5" : "border-slate-200 bg-white hover:border-teal/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSheet(f, s.name)}
                          className="w-4 h-4 accent-[#0F766E]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[13px] font-bold text-ink truncate">
                            <Table2 size={13} className="text-teal shrink-0" />
                            {s.name}
                          </span>
                          <span className="text-[11px] text-muted num">
                            {fmtNum(s.rows, lang)} {lang === "ar" ? "صف" : "rows"} · {fmtNum(s.cols, lang)}{" "}
                            {lang === "ar" ? "عمود" : "cols"}
                          </span>
                        </span>
                        {checked && (
                          <span className="flex items-center gap-1.5 text-[11px] text-muted shrink-0" onClick={(e) => e.preventDefault()}>
                            {t("header_row_label")}
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={s.header_row}
                              onChange={(e) =>
                                updateHeaderRow(k, Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-14 input !py-1 !px-2 text-center num text-[12px]"
                            />
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-start">
        <button
          className="btn-primary"
          disabled={sources.length === 0}
          onClick={() => setStep(2)}
        >
          {t("next")}
          <ArrowLeft size={16} className="ltr:rotate-180" />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- الخطوة 2 */
function Step2() {
  const { t, lang } = useI18n();
  const {
    templates,
    templateId,
    setTemplateId,
    targetSheet,
    setTargetSheet,
    refreshTemplates,
    refreshStats,
    toast,
    setStep,
  } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("عام");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);

  const selected: Template | undefined = templates.find((x) => x.id === templateId);

  useEffect(() => {
    if (selected && !targetSheet) setTargetSheet(selected.sheets[0]?.name ?? null);
  }, [selected, targetSheet, setTargetSheet]);

  const createTemplate = async () => {
    if (!pickedFile) {
      toast("error", t("upload_new_template"));
      return;
    }
    setUploading(true);
    try {
      const tpl = await api.createTemplate(pickedFile, newName, newCat);
      await Promise.all([refreshTemplates(), refreshStats()]);
      setTemplateId(tpl.id);
      setTargetSheet(tpl.sheets[0]?.name ?? null);
      setModalOpen(false);
      setNewName("");
      setPickedFile(null);
      toast("success", `${t("add_template")}: ${tpl.name}`);
    } catch (e: any) {
      toast("error", e.message || t("error_occurred"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-navy text-lg">{t("choose_existing")}</h3>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          {t("add_template")}
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Library size={28} />}
            title={t("no_templates")}
            action={
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                <Plus size={16} /> {t("add_template")}
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const active = tpl.id === templateId;
            return (
              <button
                key={tpl.id}
                onClick={() => {
                  setTemplateId(tpl.id);
                  setTargetSheet(tpl.sheets[0]?.name ?? null);
                }}
                className={`card text-start p-5 transition-all border-2 ${
                  active ? "border-teal ring-2 ring-teal/20" : "border-transparent hover:border-teal/40"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      active ? "bg-teal text-white" : "bg-navy/10 text-navy"
                    }`}
                  >
                    <Library size={18} />
                  </div>
                  {active && <span className="badge bg-teal/10 text-teal"><Check size={12} /> ✓</span>}
                </div>
                <p className="font-bold text-ink mb-1 truncate">{tpl.name}</p>
                <p className="text-[11px] text-muted mb-3">{tpl.category}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge bg-surface text-muted num">
                    {t("sheets_num")}: {tpl.sheets.length}
                  </span>
                  <span className="badge bg-surface text-muted num">
                    {t("fields_count", { n: tpl.sheets.reduce((a, s) => a + s.columns.length, 0) })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="card p-6">
          <h4 className="font-bold text-navy mb-4">{t("template_fields")}</h4>
          {selected.sheets.length > 1 && (
            <div className="mb-4">
              <label className="label">{t("target_sheet")}</label>
              <select
                className="input max-w-xs"
                value={targetSheet || ""}
                onChange={(e) => setTargetSheet(e.target.value)}
              >
                {selected.sheets.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(selected.sheets.find((s) => s.name === targetSheet) || selected.sheets[0])?.columns.map((c) => (
              <span
                key={c.name}
                className={`badge border ${
                  c.required
                    ? "bg-bad/5 border-bad/30 text-bad"
                    : "bg-surface border-slate-200 text-ink"
                }`}
              >
                {c.name}
                {c.required ? " *" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button className="btn-outline" onClick={() => setStep(1)}>
          <ArrowRight size={16} className="ltr:rotate-180" />
          {t("prev")}
        </button>
        <button className="btn-primary" disabled={!templateId} onClick={() => setStep(3)}>
          {t("next")}
          <ArrowLeft size={16} className="ltr:rotate-180" />
        </button>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("add_template")}>
        <div className="space-y-4">
          <div>
            <label className="label">{t("upload_new_template")}</label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              className="hidden"
              onChange={(e) => setPickedFile(e.target.files?.[0] || null)}
            />
            <button className="btn-outline w-full justify-center" onClick={() => fileRef.current?.click()}>
              <UploadCloud size={16} />
              {pickedFile ? pickedFile.name : t("or_browse")}
            </button>
          </div>
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
            <input className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary flex-1" onClick={createTemplate} disabled={uploading}>
              {uploading ? <Spinner /> : <Plus size={16} />}
              {t("save")}
            </button>
            <button className="btn-outline" onClick={() => setModalOpen(false)}>
              {t("cancel")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------- الخطوة 3 */
function Step3() {
  const { t } = useI18n();
  const {
    sources,
    templateId,
    targetSheet,
    suggestion,
    setSuggestion,
    mappings,
    setMappings,
    setStep,
    toast,
    setResult,
    setEditedRows,
  } = useApp();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedFor = useRef<string>("");

  const sig = useMemo(
    () =>
      JSON.stringify({
        templateId,
        targetSheet,
        srcs: sources.map((s) => [s.file_id, s.sheet, s.header_row]),
      }),
    [templateId, targetSheet, sources]
  );

  useEffect(() => {
    if (!templateId || !sources.length) return;
    if (loadedFor.current === sig && suggestion) return;
    loadedFor.current = sig;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.suggest({
          template_id: templateId,
          target_sheet: targetSheet || undefined,
          sources: sources.map((s) => ({
            file_id: s.file_id,
            sheet: s.sheet,
            header_row: s.header_row,
          })),
        });
        setSuggestion(res);
        if (res.errors?.length) toast("error", res.errors.join(" · "));
        // seed mappings from suggestions
        setMappings((prev) => {
          const next = { ...prev };
          for (const s of res.sources) {
            const k = sourceKey(s.file_id, s.sheet);
            if (!next[k]) {
              const m: Record<string, string | null> = {};
              for (const p of s.pairs) if (p.source_column) m[p.target_field] = p.source_column;
              next[k] = m;
            }
          }
          return next;
        });
      } catch (e: any) {
        setError(e.message || t("error_occurred"));
      } finally {
        setLoading(false);
      }
    })();
  }, [sig]);

  const runTransform = async () => {
    if (!suggestion || !templateId) return;
    setRunning(true);
    try {
      const res = await api.transform({
        template_id: templateId,
        target_sheet: suggestion.target_sheet,
        sources: suggestion.sources.map((s) => ({
          file_id: s.file_id,
          sheet: s.sheet,
          header_row: s.header_row,
          mapping: mappings[sourceKey(s.file_id, s.sheet)] || {},
        })),
      });
      setResult(res);
      setEditedRows(null);
      setStep(4);
    } catch (e: any) {
      toast("error", e.message || t("error_occurred"));
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="card py-20 flex flex-col items-center gap-4 text-muted">
        <Loader2 size={34} className="animate-spin text-teal" />
        <p className="font-bold">{t("ai_suggestions")}…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <EmptyState
          icon={<FileSpreadsheet size={28} />}
          title={t("error_occurred")}
          hint={error}
          action={
            <button className="btn-primary" onClick={() => { loadedFor.current = ""; setSuggestion(null); }}>
              <RotateCcw size={16} /> {t("retry")}
            </button>
          }
        />
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="card">
        <EmptyState
          icon={<Sparkles size={28} />}
          title={t("start_conversion_for_mapping")}
          action={<Link to="/convert" className="btn-primary">{t("start_new")}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MappingEditor
        suggestion={suggestion}
        mappings={mappings}
        onChange={(k, m) => setMappings((prev) => ({ ...prev, [k]: m }))}
      />
      <div className="flex justify-between">
        <button className="btn-outline" onClick={() => setStep(2)}>
          <ArrowRight size={16} className="ltr:rotate-180" />
          {t("prev")}
        </button>
        <button className="btn-primary" onClick={runTransform} disabled={running}>
          {running ? <Spinner /> : <Sparkles size={16} />}
          {running ? t("processing") : t("run_processing")}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- الخطوة 4 */
function Step4() {
  const { t } = useI18n();
  const { result, editedRows, setEditedRows, setStep } = useApp();

  if (!result) {
    return (
      <div className="card">
        <EmptyState
          icon={<Eye size={28} />}
          title={t("no_result_yet")}
          hint={t("run_conversion_first")}
          action={
            <button className="btn-primary" onClick={() => setStep(3)}>
              {t("prev")}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResultPreview result={result} rowsOverride={editedRows} onRowsChange={setEditedRows} />
      <div className="flex justify-between">
        <button className="btn-outline" onClick={() => setStep(3)}>
          <ArrowRight size={16} className="ltr:rotate-180" />
          {t("prev")}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ المعالج كاملاً */
export default function ConvertWizard() {
  const { t } = useI18n();
  const { step, resetWizard } = useApp();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Stepper />
        <button className="btn-ghost text-xs" onClick={resetWizard}>
          <RotateCcw size={14} />
          {t("start_new")}
        </button>
      </div>
      <div className="card p-5 sm:p-7">
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}
      </div>
    </div>
  );
}
