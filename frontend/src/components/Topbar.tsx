/* الشريط العلوي: عنوان الصفحة، تبديل اللغة، حالة الخادم، الملف الشخصي */
import { Menu, Languages, Wifi, WifiOff, UserRound } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { useApp } from "../lib/store";

export default function Topbar({
  title,
  onMenu,
}: {
  title: string;
  onMenu: () => void;
}) {
  const { t, lang, setLang } = useI18n();
  const { online } = useApp();
  const profile = JSON.parse(localStorage.getItem("profile") || "{}");
  const name = profile.name || (lang === "ar" ? "المستخدم" : "User");

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-card/90 backdrop-blur border-b border-slate-200 flex items-center gap-4 px-4 sm:px-8">
      <button className="btn-ghost !px-2 lg:hidden" onClick={onMenu} aria-label="menu">
        <Menu size={22} />
      </button>
      <h1 className="text-lg sm:text-xl font-bold text-navy truncate">{title}</h1>
      <div className="ms-auto flex items-center gap-2 sm:gap-3">
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 badge ${
            online ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"
          }`}
          title={online ? "Backend OK" : t("backend_offline")}
        >
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {online ? (lang === "ar" ? "الخادم متصل" : "Server online") : (lang === "ar" ? "الخادم غير متصل" : "Offline")}
        </span>
        <button
          className="btn-outline !px-3 !py-2"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          title={t("app_language")}
        >
          <Languages size={16} />
          <span className="hidden sm:inline num">{lang === "ar" ? "EN" : "عربي"}</span>
        </button>
        <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-1.5">
          <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center">
            <UserRound size={16} />
          </div>
          <div className="hidden md:block leading-tight">
            <p className="text-[13px] font-bold text-ink max-w-[140px] truncate">{name}</p>
            <p className="text-[11px] text-muted">{t("nav_profile")}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
