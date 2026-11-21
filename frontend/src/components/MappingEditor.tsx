/* شاشة المطابقة الذكية للأعمدة */
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  EyeOff,
  Save,
  Sparkles,
  AlertTriangle,
  Table2,
  Shuffle,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import { SourceSuggestion, SuggestResponse } from "../lib/api";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { ConfidenceBadge } from "./ui";
import { api } from "../lib/api";

export function sourceKey(fileId: string, sheet: string) {
  return `${fileId}::${sheet}`;
}

export default function MappingEditor({
  suggestion,
  mappings,
  onChange,
}: {
  suggestion: SuggestResponse;
  mappings: Record<string, Record<string, string | null>>;
  onChange: (key: string, mapping: Record<string, string | null>) => void;
}) {
  const { t } = useI18n();
  const { toast } = useApp();
  const [activeTab, setActiveTab] = useState(0);
  const [savingRules, setSavingRules] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [ignoreMode, setIgnoreMode] = useState(false);
  const [ignored, setIgnored] = useState<Record<string, string[]>>({});

  const src: SourceSuggestion | undefined = suggestion.sources[activeTab];
  const key = src ? sourceKey(src.file_id, src.sheet) : "";
  const mapping = (src && mappings[key]) || {};
  const ignoredCols = (src && ignored[key]) || [];

  // source columns already chosen in this sheet (to avoid duplicates in selects)
  const usedSources = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean) as string[]),
    [mapping]
  );

  if (!src) return null;

  const setTarget = (target: string, value: string | null) => {
    const next = { ...mapping };
    // remove previous assignment of the same source column
    for (const [k, v] of Object.entries(next)) if (v === value && value) delete next[k];
    if (value) next[target] = value;
    else delete next[target];
    onChange(key, next);
  };

  const approveAll = () => {
    const next: Record<string, string | null> = {};
    for (const p of src.pairs) {
      if (p.source_column && !ignoredCols.includes(p.source_column)) {
        next[p.target_field] = p.source_column;
      }
    }
    onChange(key, next);
    setEditMode(false);
    toast("success", t("approve_mapping") + " ✓");
  };

  const ignoreColumn = (col: string) => {
    // unmap any target currently using this column, then mark ignored
    const next = { ...mapping };
    for (const [k, v] of Object.entries(next)) if (v === col) delete next[k];
    onChange(key, next);
    setIgnored((prev) => ({ ...prev, [key]: [...(prev[key] || []), col] }));
  };

  const restoreColumn = (col: string) => {
    setIgnored((prev) => ({ ...prev, [key]: (prev[key] || []).filter((c) => c !== col) }));
  };

  const saveRules = async () => {
    const rules = Object.entries(mapping)
      .filter(([, v]) => v)
      .map(([target_field, source_column]) => ({ source_column: source_column!, target_field }));
    if (!rules.length) {
      toast("error", t("no_rules"));
      return;
    }
    setSavingRules(true);
    try {
      await api.saveRules(rules);
      toast("success", t("rules_saved"));
    } catch (e: any) {
      toast("error", e.message);
    } finally {
      setSavingRules(false);
    }
  };

  const missingRequired = suggestion.target_columns.filter((c) => c.required && !mapping[c.name]);
  const availableSources = src.source_columns.filter((c) => !ignoredCols.includes(c));
  const unmatchedVisible = src.unmatched_sources.filter(
    (c) => !usedSources.has(c) && !ignoredCols.includes(c)
  );

  return (
    <div className="space-y-5">
      {/* الرأس */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-navy text-accent flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-navy text-lg leading-6">{t("mapping_title")}</h3>
            <p className="text-xs text-muted">
              {t("engine_used")}: <span className="font-bold text-teal">{suggestion.engine}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline text-xs" onClick={approveAll}>
            <Check size={14} /> {t("approve_mapping")}
          </button>
          <button
            className={`text-xs ${editMode ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              setEditMode(!editMode);
              setIgnoreMode(false);
            }}
          >
            <Pencil size={14} /> {t("edit_mapping")}
          </button>
          <button
            className={`text-xs ${ignoreMode ? "btn bg-warn text-white hover:bg-warn/90" : "btn-outline"}`}
            onClick={() => {
              setIgnoreMode(!ignoreMode);
              if (!ignoreMode) setEditMode(true);
            }}
          >
            <EyeOff size={14} /> {t("ignore_column")}
          </button>
          <button className="btn-outline text-xs" onClick={saveRules} disabled={savingRules}>
            <Save size={14} /> {t("save_rules")}
          </button>
        </div>
      </div>

      <p className="text-sm text-muted leading-6">
        {editMode ? t("mapping_subtitle") : t("edit_mode_off")}
      </p>
      {ignoreMode && (
        <p className="text-[12px] font-bold text-warn bg-warn/10 border border-warn/30 rounded-xl px-4 py-2.5">
          {t("ignore_column")}: {t("unmatched_fields")} ↓
        </p>
      )}

      {/* تبويبات المصادر */}
      {suggestion.sources.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestion.sources.map((s, i) => (
            <button
              key={sourceKey(s.file_id, s.sheet)}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold border transition-colors ${
                i === activeTab
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-ink border-slate-200 hover:border-teal"
              }`}
            >
              <Table2 size={13} className="inline me-1.5 -mt-0.5" />
              {s.file_name} — {s.sheet}
            </button>
          ))}
        </div>
      )}

      {/* تنبيهات */}
      {missingRequired.length > 0 ? (
        <div className="rounded-xl bg-warn/10 border border-warn/30 px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={17} className="text-warn shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-warn mb-0.5">{t("missing_required")}</p>
            <p className="text-ink/80">{missingRequired.map((c) => c.name).join("، ")}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-ok/10 border border-ok/30 px-4 py-3 flex items-center gap-3">
          <Check size={17} className="text-ok shrink-0" />
          <p className="text-sm font-bold text-ok">{t("all_requirements_met")}</p>
        </div>
      )}

      {/* جدول المطابقة */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-surface border-b border-slate-200 text-[12px] font-bold text-muted">
          <div className="col-span-5">{t("target_fields")}</div>
          <div className="col-span-1 text-center">
            <Shuffle size={14} className="inline" />
          </div>
          <div className="col-span-4">{t("source_columns")}</div>
          <div className="col-span-2 text-center">{t("confidence")}</div>
        </div>
        <ul className="divide-y divide-slate-100">
          {suggestion.target_columns.map((col) => {
            const pair = src.pairs.find((p) => p.target_field === col.name);
            const current = mapping[col.name] ?? null;
            const suggested = pair?.source_column ?? null;
            const samples = current ? src.samples[current] || [] : [];
            const isSuggestedAccepted = current && current === suggested;
            return (
              <li
                key={col.name}
                className="px-5 py-3.5 grid grid-cols-12 gap-2 items-center hover:bg-surface/50"
              >
                <div className="col-span-5 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">
                    {col.name}
                    {col.required && <span className="text-bad ms-1">*</span>}
                  </p>
                  <p className="text-[11px] text-muted">
                    {col.required ? t("required_field") : t("optional_field")}
                  </p>
                </div>
                <div className="col-span-1 text-center text-slate-300">
                  <ArrowLeft size={16} className="inline rtl:rotate-180" />
                </div>
                <div className="col-span-4 min-w-0 flex items-center gap-1.5">
                  <select
                    className="input !py-2 text-[13px] disabled:bg-surface disabled:text-muted"
                    value={current ?? ""}
                    disabled={!editMode}
                    onChange={(e) => setTarget(col.name, e.target.value || null)}
                  >
                    <option value="">— {t("select_source_column")} —</option>
                    {availableSources.map((sc) => (
                      <option key={sc} value={sc} disabled={usedSources.has(sc) && sc !== current}>
                        {sc}
                        {sc === suggested ? " ★" : ""}
                      </option>
                    ))}
                    {current && ignoredCols.includes(current) && (
                      <option value={current}>{current} ★</option>
                    )}
                  </select>
                  {editMode && current && (
                    <button
                      className="text-muted hover:text-bad shrink-0 p-1"
                      title={t("ignore_column")}
                      onClick={() => setTarget(col.name, null)}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="col-span-2 flex flex-col items-center gap-1">
                  {isSuggestedAccepted ? (
                    <ConfidenceBadge value={pair?.confidence ?? 0} />
                  ) : current ? (
                    <span className="badge bg-navy/10 text-navy">{t("edit_mapping")}</span>
                  ) : (
                    <ConfidenceBadge value={0} />
                  )}
                  {samples.length > 0 && (
                    <span
                      className="text-[10px] text-muted max-w-[130px] truncate text-center"
                      title={samples.join(" | ")}
                    >
                      <span className="num">{samples[0]}</span>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* الأعمدة غير المطابقة + المتجاهلة */}
      {(unmatchedVisible.length > 0 || ignoredCols.length > 0) && (
        <div className="card p-5 space-y-4">
          {unmatchedVisible.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-navy mb-3 flex items-center gap-2">
                <EyeOff size={15} className="text-muted" />
                {t("unmatched_fields")}
                <span className="badge bg-surface text-muted num">{unmatchedVisible.length}</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {unmatchedVisible.map((c) => (
                  <span
                    key={c}
                    className={`badge border bg-slate-100 text-muted border-slate-200 ${
                      ignoreMode ? "cursor-pointer hover:border-warn hover:text-warn" : ""
                    }`}
                    onClick={() => ignoreMode && ignoreColumn(c)}
                    title={ignoreMode ? t("ignore_column") : undefined}
                  >
                    {c}
                    {ignoreMode ? (
                      <X size={11} className="text-warn" />
                    ) : (
                      <span className="text-[10px]">— {t("ignore")}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          {ignoredCols.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-warn mb-3 flex items-center gap-2">
                <EyeOff size={15} />
                {t("ignored_columns")}
                <span className="badge bg-warn/10 text-warn num">{ignoredCols.length}</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {ignoredCols.map((c) => (
                  <span key={c} className="badge bg-warn/10 text-warn border border-warn/30 line-through">
                    {c}
                    <button
                      onClick={() => restoreColumn(c)}
                      className="no-underline hover:text-ink"
                      title={t("restore")}
                    >
                      <RotateCcw size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
