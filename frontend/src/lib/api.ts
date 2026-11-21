/* عميل الاتصال بواجهة برمجة التطبيقات الخلفية */

export interface SheetMeta {
  name: string;
  rows: number;
  cols: number;
  header_row: number;
  columns: string[];
  samples?: Record<string, string[]>;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  sheets: SheetMeta[];
  uploaded_at: string;
}

export interface TemplateColumn {
  name: string;
  required: boolean;
}

export interface TemplateSheet {
  name: string;
  header_row: number;
  columns: TemplateColumn[];
}

export interface Template {
  id: string;
  name: string;
  category: string;
  sheets: TemplateSheet[];
  created_at: string;
  last_used: string | null;
}

export interface MappingPair {
  source_column: string | null;
  target_field: string;
  confidence: number;
  reason: string;
}

export interface SourceSuggestion {
  file_id: string;
  file_name: string;
  sheet: string;
  header_row: number;
  source_columns: string[];
  samples: Record<string, string[]>;
  pairs: MappingPair[];
  unmatched_sources: string[];
  missing_required: string[];
}

export interface SuggestResponse {
  target_sheet: string;
  target_columns: TemplateColumn[];
  sources: SourceSuggestion[];
  confidence_threshold: number;
  engine: string;
  errors: string[];
}

export interface ValidationIssue {
  type: string;
  field: string | null;
  count: number;
  message: string;
}

export interface Validation {
  total_rows: number;
  missing: Record<string, number>;
  duplicate_row_indices: number[];
  issues: ValidationIssue[];
  ok: boolean;
}

export interface TransformResponse {
  result_id: string;
  row_count: number;
  preview: Record<string, string>[];
  validation: Validation;
  columns: TemplateColumn[];
}

export interface Operation {
  id: string;
  kind: string;
  title: string;
  detail: string;
  status: string;
  rows_out: number;
  files_count: number;
  created_at: string;
}

export interface Stats {
  files_processed: number;
  templates_saved: number;
  successful_conversions: number;
  warning_conversions: number;
  failed_conversions: number;
  total_rows: number;
  recent_operations: Operation[];
  by_day: { day: string; count: number }[];
  by_status: Record<string, number>;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `خطأ في الخادم (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch("/api/health").then((r) => json<any>(r)),
  stats: () => fetch("/api/stats").then((r) => json<Stats>(r)),

  getSettings: () => fetch("/api/settings").then((r) => json<Record<string, any>>(r)),
  putSettings: (settings: Record<string, any>) =>
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    }).then((r) => json<Record<string, any>>(r)),

  listFiles: () => fetch("/api/files").then((r) => json<{ files: UploadedFile[] }>(r)),
  uploadFiles: (files: File[], onProgress?: (pct: number) => void) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return new Promise<{ uploaded: any[] }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/files/upload");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject(new Error(body?.detail || `خطأ في الرفع (${xhr.status})`));
        } catch {
          reject(new Error("استجابة غير صالحة من الخادم"));
        }
      };
      xhr.onerror = () => reject(new Error("تعذر الاتصال بالخادم"));
      xhr.send(fd);
    });
  },
  deleteFile: (id: string) =>
    fetch(`/api/files/${id}`, { method: "DELETE" }).then((r) => json<any>(r)),
  filePreview: (id: string, sheet?: string, rows = 8) =>
    fetch(`/api/files/${id}/preview?rows=${rows}${sheet ? `&sheet=${encodeURIComponent(sheet)}` : ""}`)
      .then((r) => json<{ rows: string[][] }>(r)),

  listTemplates: () =>
    fetch("/api/templates").then((r) => json<{ templates: Template[] }>(r)),
  createTemplate: (file: File, name: string, category: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name);
    fd.append("category", category);
    return fetch("/api/templates", { method: "POST", body: fd }).then((r) => json<Template>(r));
  },
  patchTemplate: (id: string, patch: { name?: string; category?: string }) =>
    fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Template>(r)),
  duplicateTemplate: (id: string) =>
    fetch(`/api/templates/${id}/duplicate`, { method: "POST" }).then((r) => json<Template>(r)),
  deleteTemplate: (id: string) =>
    fetch(`/api/templates/${id}`, { method: "DELETE" }).then((r) => json<any>(r)),
  templatePreview: (id: string, sheet?: string) =>
    fetch(`/api/templates/${id}/preview${sheet ? `?sheet=${encodeURIComponent(sheet)}` : ""}`)
      .then((r) => json<{ rows: string[][] }>(r)),

  suggest: (payload: {
    template_id: string;
    target_sheet?: string;
    sources: { file_id: string; sheet: string; header_row?: number }[];
  }) =>
    fetch("/api/mapping/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => json<SuggestResponse>(r)),

  saveRules: (rules: { source_column: string; target_field: string }[]) =>
    fetch("/api/mapping/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    }).then((r) => json<any>(r)),
  listRules: () =>
    fetch("/api/mapping/rules").then((r) => json<{ rules: { source_column: string; target_field: string }[] }>(r)),
  clearRules: () => fetch("/api/mapping/rules", { method: "DELETE" }).then((r) => json<any>(r)),

  transform: (payload: {
    template_id: string;
    target_sheet: string;
    sources: { file_id: string; sheet: string; header_row: number; mapping: Record<string, string | null> }[];
  }) =>
    fetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => json<TransformResponse>(r)),

  exportResult: async (
    resultId: string,
    format: "xlsx" | "csv" | "pdf",
    rows?: Record<string, string>[],
    title = "نتيجة التحويل"
  ) => {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result_id: resultId, format, rows, title }),
    });
    if (!res.ok) {
      let detail = "فشل التصدير";
      try {
        detail = (await res.json())?.detail || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    const blob = await res.blob();
    const disp = res.headers.get("Content-Disposition") || "";
    let fname = `export.${format}`;
    const m = /filename\*=UTF-8''([^;]+)/.exec(disp);
    if (m) fname = decodeURIComponent(m[1]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return fname;
  },

  listOperations: (limit = 100) =>
    fetch(`/api/operations?limit=${limit}`).then((r) => json<{ operations: Operation[] }>(r)),
  clearOperations: () =>
    fetch("/api/operations", { method: "DELETE" }).then((r) => json<any>(r)),
};
