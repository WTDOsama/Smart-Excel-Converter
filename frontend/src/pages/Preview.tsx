/* صفحة معاينة النتائج */
import { Link } from "react-router-dom";
import { Eye, Sparkles } from "lucide-react";
import ResultPreview from "../components/ResultPreview";
import { EmptyState } from "../components/ui";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";

export default function PreviewPage() {
  const { t } = useI18n();
  const { result, editedRows, setEditedRows } = useApp();

  if (!result) {
    return (
      <div className="card">
        <EmptyState
          icon={<Eye size={28} />}
          title={t("no_result_yet")}
          hint={t("run_conversion_first")}
          action={
            <Link to="/convert" className="btn-primary">
              <Sparkles size={16} />
              {t("start_new")}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-navy">{t("preview_title")}</h2>
        <p className="text-sm text-muted">{t("preview_subtitle")}</p>
      </div>
      <ResultPreview result={result} rowsOverride={editedRows} onRowsChange={setEditedRows} />
    </div>
  );
}
