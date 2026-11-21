/* صفحة المطابقة الذكية — تعرض المحرر إن وُجد اقتراح، وإلا قواعد المحفوظة */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Shuffle, Trash2, Save, Sparkles } from "lucide-react";
import MappingEditor from "../components/MappingEditor";
import { EmptyState, ConfirmDialog } from "../components/ui";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";

export default function MappingPage() {
  const { t } = useI18n();
  const { suggestion, mappings, setMappings, rules, refreshRules, toast } = useApp();
  const [toClear, setToClear] = useState(false);

  const clearRules = async () => {
    try {
      await api.clearRules();
      await refreshRules();
      toast("success", t("clear_rules") + " ✓");
    } catch (e: any) {
      toast("error", e.message);
    }
  };

  return (
    <div className="space-y-6">
      {suggestion ? (
        <div className="card p-5 sm:p-7">
          <MappingEditor
            suggestion={suggestion}
            mappings={mappings}
            onChange={(k, m) => setMappings((prev) => ({ ...prev, [k]: m }))}
          />
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Shuffle size={28} />}
            title={t("mapping_title")}
            hint={t("start_conversion_for_mapping")}
            action={
              <Link to="/convert" className="btn-primary">
                <Sparkles size={16} />
                {t("start_new")}
              </Link>
            }
          />
        </div>
      )}

      {/* قواعد المطابقة المحفوظة */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-navy flex items-center gap-2">
            <Save size={17} className="text-teal" />
            {t("saved_rules")}
            <span className="badge bg-surface text-muted num">{rules.length}</span>
          </h3>
          {rules.length > 0 && (
            <button className="btn-danger text-xs" onClick={() => setToClear(true)}>
              <Trash2 size={14} />
              {t("clear_rules")}
            </button>
          )}
        </div>
        <p className="text-xs text-muted mb-5">{t("saved_rules_hint")}</p>
        {rules.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">{t("no_rules")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {rules.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-surface/50 px-3.5 py-2.5 text-[13px]"
              >
                <span className="font-bold text-ink truncate">{r.source_column}</span>
                <span className="text-slate-300">←</span>
                <span className="font-bold text-teal truncate">{r.target_field}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toClear}
        onClose={() => setToClear(false)}
        onConfirm={clearRules}
        title={t("clear_rules")}
        message={t("saved_rules_hint")}
      />
    </div>
  );
}
