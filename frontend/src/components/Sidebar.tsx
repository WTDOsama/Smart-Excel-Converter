/* الشريط الجانبي — على الجهة اليمنى في وضع RTL */
import { NavLink } from "react-router-dom";
import {
  Home,
  FileSpreadsheet,
  UploadCloud,
  Library,
  Shuffle,
  Eye,
  History,
  BarChart3,
  Settings as SettingsIcon,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "../lib/i18n";

type LinkDef = { to: string; key: string; icon: LucideIcon };

const mainLinks: LinkDef[] = [
  { to: "/", key: "nav_home", icon: Home },
  { to: "/convert", key: "nav_new_conversion", icon: FileSpreadsheet },
];
const dataLinks: LinkDef[] = [
  { to: "/files", key: "nav_upload", icon: UploadCloud },
  { to: "/templates", key: "nav_templates", icon: Library },
  { to: "/mapping", key: "nav_mapping", icon: Shuffle },
  { to: "/preview", key: "nav_preview", icon: Eye },
  { to: "/logs", key: "nav_logs", icon: History },
  { to: "/reports", key: "nav_reports", icon: BarChart3 },
];
const accountLinks: LinkDef[] = [
  { to: "/settings", key: "nav_settings", icon: SettingsIcon },
  { to: "/profile", key: "nav_profile", icon: UserRound },
];

function Section({ title, links }: { title: string; links: LinkDef[] }) {
  const { t } = useI18n();
  return (
    <div className="mb-6">
      <p className="px-6 mb-2 text-[11px] font-bold text-slate-500">{title}</p>
      <nav className="flex flex-col gap-1 px-3">
        {links.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${
                isActive
                  ? "bg-teal text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <>
      {open && <div className="fixed inset-0 bg-navy/60 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 bottom-0 z-50 w-[264px] bg-navy flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "translate-x-full ltr:-translate-x-full"
        }`}
        style={{ insetInlineStart: 0 }}
      >
        <div className="flex items-center gap-3 px-5 h-[72px] border-b border-white/10">
          <img src="/logo.svg" alt="" className="w-10 h-10 rounded-xl" />
          <div className="leading-tight">
            <p className="text-white font-bold text-[15px]">{t("app_name")}</p>
            <p className="text-slate-400 text-[11px] num" dir="ltr">
              Excel AI Converter
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-5">
          <Section title={t("nav_section_main")} links={mainLinks} />
          <Section title={t("nav_section_data")} links={dataLinks} />
          <Section title={t("nav_section_account")} links={accountLinks} />
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-[11px] text-slate-400 leading-5">
              {t("app_name")} — <span className="num">v1.0</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
