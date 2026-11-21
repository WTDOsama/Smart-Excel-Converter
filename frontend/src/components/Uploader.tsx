/* منطقة رفع الملفات بالسحب والإفلات */
import React, { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, X } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function Uploader({
  onFiles,
  busy,
  progress,
  compact,
}: {
  onFiles: (files: File[]) => void;
  busy?: boolean;
  progress?: number;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed transition-colors cursor-pointer ${
        drag ? "border-teal bg-teal/5" : "border-slate-300 bg-surface/60 hover:border-teal/60"
      } ${compact ? "py-8 px-4" : "py-14 px-6"} ${busy ? "pointer-events-none opacity-70" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".xlsx,.xlsm,.xls"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      <div
        className={`rounded-2xl bg-navy text-accent flex items-center justify-center mb-4 ${
          compact ? "w-12 h-12" : "w-16 h-16"
        }`}
      >
        <UploadCloud size={compact ? 22 : 28} />
      </div>
      {busy ? (
        <>
          <p className="font-bold text-navy mb-2">{t("uploading")}</p>
          <div className="w-56 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-teal transition-all"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2 num">{progress ?? 0}%</p>
        </>
      ) : (
        <>
          <p className="font-bold text-navy text-base mb-1">{t("drop_files")}</p>
          <p className="text-sm text-teal font-bold mb-2">{t("or_browse")}</p>
          <p className="text-xs text-muted flex items-center gap-1.5">
            <FileSpreadsheet size={13} />
            {t("supported")}
          </p>
        </>
      )}
    </div>
  );
}

export function FileChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-surface border border-slate-200 px-3 py-1.5 text-xs font-bold text-ink">
      <FileSpreadsheet size={13} className="text-teal" />
      {name}
      {onRemove && (
        <button onClick={onRemove} className="text-muted hover:text-bad">
          <X size={13} />
        </button>
      )}
    </span>
  );
}
