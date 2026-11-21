/* الإعدادات — اللغة، الذكاء الاصطناعي، المعالجة */
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Languages, Sparkles, SlidersHorizontal, ShieldCheck, Save } from "lucide-react";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { Spinner } from "../components/ui";

export default function SettingsPage() {
  const { t } = useI18n();
  const { lang, setLang } = useI18n();
  const { toast } = useApp();
  const [s, setS] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(setS).catch(() => setS(null));
  }, []);

  if (!s) {
    return (
      <div className="card py-20 flex justify-center text-muted">
        <Spinner size={28} />
      </div>
    );
  }

  const upd = (k: string, v: any) => setS((prev) => ({ ...prev!, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        ai_enabled: s.ai_enabled,
        ai_base_url: s.ai_base_url,
        ai_model: s.ai_model,
        confidence_threshold: String(s.confidence_threshold),
        max_preview_rows: String(s.max_preview_rows),
        app_language: lang,
      };
      // send the key only if the user typed a new one (not the masked value)
      if (s.ai_api_key && !s.ai_api_key.includes("•")) payload.ai_api_key = s.ai_api_key;
      const updated = await api.putSettings(payload);
      setS(updated);
      toast("success", t("settings_saved"));
    } catch (e: any) {
      toast("error", e.message || t("error_occurred"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-navy flex items-center gap-2">
          <SettingsIcon size={20} className="text-teal" />
          {t("settings_title")}
        </h2>
        <p className="text-sm text-muted">{t("settings_subtitle")}</p>
      </div>

      {/* اللغة */}
      <section className="card p-6">
        <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
          <Languages size={17} className="text-teal" />
          {t("language_section")}
        </h3>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {(["ar", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                upd("app_language", l);
              }}
              className={`rounded-xl border-2 px-4 py-3.5 text-sm font-bold transition-colors ${
                lang === l ? "border-teal bg-teal/5 text-teal" : "border-slate-200 text-ink hover:border-teal/40"
              }`}
            >
              {l === "ar" ? "العربية (RTL)" : "English (LTR)"}
            </button>
          ))}
        </div>
      </section>

      {/* الذكاء الاصطناعي */}
      <section className="card p-6">
        <h3 className="font-bold text-navy mb-1 flex items-center gap-2">
          <Sparkles size={17} className="text-teal" />
          {t("ai_section")}
        </h3>
        <p className="text-xs text-muted mb-5 leading-6">{t("ai_enable_hint")}</p>

        <label className="flex items-center justify-between rounded-xl bg-surface px-4 py-3.5 mb-5 cursor-pointer">
          <span className="text-sm font-bold text-ink">{t("ai_enable")}</span>
          <input
            type="checkbox"
            checked={s.ai_enabled === "true"}
            onChange={(e) => upd("ai_enabled", e.target.checked ? "true" : "false")}
            className="w-5 h-5 accent-[#0F766E]"
          />
        </label>

        <div className="space-y-4">
          <div>
            <label className="label">{t("ai_api_key")}</label>
            <input
              type="password"
              className="input num"
              dir="ltr"
              value={s.ai_api_key || ""}
              onChange={(e) => upd("ai_api_key", e.target.value)}
              placeholder="sk-..."
              autoComplete="new-password"
            />
            <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1">
              <ShieldCheck size={12} className="text-ok" />
              {t("keys_secure")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t("ai_base_url")}</label>
              <input
                className="input num"
                dir="ltr"
                value={s.ai_base_url || ""}
                onChange={(e) => upd("ai_base_url", e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("ai_model")}</label>
              <input
                className="input num"
                dir="ltr"
                value={s.ai_model || ""}
                onChange={(e) => upd("ai_model", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">
              {t("confidence_threshold")}: <span className="num text-teal">{Math.round((parseFloat(s.confidence_threshold) || 0.65) * 100)}%</span>
            </label>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.05}
              value={parseFloat(s.confidence_threshold) || 0.65}
              onChange={(e) => upd("confidence_threshold", e.target.value)}
              className="w-full accent-[#0F766E]"
            />
          </div>
        </div>
      </section>

      {/* المعالجة */}
      <section className="card p-6">
        <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
          <SlidersHorizontal size={17} className="text-teal" />
          {t("processing_section")}
        </h3>
        <div className="max-w-xs">
          <label className="label">{t("max_preview_rows")}</label>
          <input
            type="number"
            min={10}
            max={5000}
            className="input num"
            value={s.max_preview_rows || 100}
            onChange={(e) => upd("max_preview_rows", e.target.value)}
          />
        </div>
      </section>

      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? <Spinner /> : <Save size={16} />}
        {t("save_settings")}
      </button>
    </div>
  );
}
