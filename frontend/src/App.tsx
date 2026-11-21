/* التطبيق الرئيسي: التخطيط العام والتوجيه */
import { useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { Toasts } from "./components/ui";
import { useI18n } from "./lib/i18n";
import { useApp } from "./lib/store";
import Dashboard from "./pages/Dashboard";
import FilesPage from "./pages/Files";
import ConvertWizard from "./pages/Convert";
import TemplatesPage from "./pages/Templates";
import MappingPage from "./pages/Mapping";
import PreviewPage from "./pages/Preview";
import LogsPage from "./pages/Logs";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import ProfilePage from "./pages/Profile";

const titles: Record<string, string> = {
  "/": "nav_home",
  "/convert": "nav_new_conversion",
  "/files": "nav_upload",
  "/templates": "nav_templates",
  "/mapping": "nav_mapping",
  "/preview": "nav_preview",
  "/logs": "nav_logs",
  "/reports": "nav_reports",
  "/settings": "nav_settings",
  "/profile": "nav_profile",
};

export default function App() {
  const { t } = useI18n();
  const { online } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();
  const titleKey = titles[loc.pathname] || "app_name";

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:ms-[264px] min-h-screen flex flex-col">
        <Topbar title={t(titleKey)} onMenu={() => setMenuOpen(true)} />
        {!online && (
          <div className="bg-bad text-white text-center text-sm font-bold py-2 px-4">
            {t("backend_offline")}
          </div>
        )}
        <main className="flex-1 p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/convert" element={<ConvertWizard />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/mapping" element={<MappingPage />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
      <Toasts />
    </div>
  );
}
