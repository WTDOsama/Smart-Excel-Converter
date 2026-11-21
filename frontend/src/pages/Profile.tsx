/* الملف الشخصي */
import { useEffect, useState } from "react";
import { UserRound, Save, FileSpreadsheet, Library, CheckCircle2, Rows3 } from "lucide-react";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { fmtNum } from "../lib/format";

export default function ProfilePage() {
  const { t, lang } = useI18n();
  const { stats, toast } = useApp();
  const [form, setForm] = useState({ name: "", email: "", role: "", org: "" });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("profile") || "{}");
    setForm({
      name: saved.name || "",
      email: saved.email || "",
      role: saved.role || "",
      org: saved.org || "",
    });
  }, []);

  const save = () => {
    localStorage.setItem("profile", JSON.stringify(form));
    toast("success", t("profile_saved"));
  };

  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-5xl">
      {/* البطاقة الشخصية */}
      <section className="card p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-navy text-accent flex items-center justify-center mx-auto mb-4">
          <UserRound size={34} />
        </div>
        <h2 className="text-lg font-bold text-navy">{form.name || t("nav_profile")}</h2>
        <p className="text-sm text-muted mb-1">{form.role || "—"}</p>
        <p className="text-xs text-muted num" dir="ltr">{form.email || "—"}</p>
        <div className="border-t border-slate-100 mt-6 pt-5">
          <h3 className="text-sm font-bold text-navy mb-4">{t("usage_summary")}</h3>
          <dl className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-muted flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-teal" />
                {t("stat_files")}
              </dt>
              <dd className="font-bold text-ink num">{fmtNum(stats?.files_processed ?? 0, lang)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted flex items-center gap-2">
                <Library size={14} className="text-navy" />
                {t("stat_templates")}
              </dt>
              <dd className="font-bold text-ink num">{fmtNum(stats?.templates_saved ?? 0, lang)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted flex items-center gap-2">
                <CheckCircle2 size={14} className="text-ok" />
                {t("stat_success")}
              </dt>
              <dd className="font-bold text-ink num">{fmtNum(stats?.successful_conversions ?? 0, lang)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted flex items-center gap-2">
                <Rows3 size={14} className="text-warn" />
                {t("total_rows")}
              </dt>
              <dd className="font-bold text-ink num">{fmtNum(stats?.total_rows ?? 0, lang)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* نموذج البيانات */}
      <section className="card p-6 xl:col-span-2">
        <h3 className="font-bold text-navy mb-5">{t("profile_title")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">{t("full_name")}</label>
            <input className="input" value={form.name} onChange={(e) => upd("name", e.target.value)} />
          </div>
          <div>
            <label className="label">{t("email")}</label>
            <input className="input num" dir="ltr" type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} />
          </div>
          <div>
            <label className="label">{t("role")}</label>
            <input className="input" value={form.role} onChange={(e) => upd("role", e.target.value)} />
          </div>
          <div>
            <label className="label">{t("organization")}</label>
            <input className="input" value={form.org} onChange={(e) => upd("org", e.target.value)} />
          </div>
        </div>
        <button className="btn-primary mt-6" onClick={save}>
          <Save size={16} />
          {t("save_profile")}
        </button>
      </section>
    </div>
  );
}
