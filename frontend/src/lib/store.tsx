/* الحالة العامة للتطبيق: البيانات، خطوات التحويل، الإشعارات */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  api,
  Stats,
  Template,
  UploadedFile,
  SuggestResponse,
  TransformResponse,
  Operation,
} from "./api";

export interface SelectedSource {
  file_id: string;
  file_name: string;
  sheet: string;
  header_row: number;
  columns: string[];
  rows: number;
}

export interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

interface AppState {
  online: boolean;
  files: UploadedFile[];
  templates: Template[];
  stats: Stats | null;
  operations: Operation[];
  rules: { source_column: string; target_field: string }[];
  refreshAll: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshOperations: () => Promise<void>;
  refreshRules: () => Promise<void>;
  // wizard
  step: number;
  setStep: (s: number) => void;
  sources: SelectedSource[];
  setSources: React.Dispatch<React.SetStateAction<SelectedSource[]>>;
  templateId: string | null;
  setTemplateId: (id: string | null) => void;
  targetSheet: string | null;
  setTargetSheet: (s: string | null) => void;
  suggestion: SuggestResponse | null;
  setSuggestion: (s: SuggestResponse | null) => void;
  mappings: Record<string, Record<string, string | null>>; // key `${file_id}::${sheet}`
  setMappings: React.Dispatch<React.SetStateAction<Record<string, Record<string, string | null>>>>;
  result: (TransformResponse & { template_name?: string }) | null;
  setResult: (r: (TransformResponse & { template_name?: string }) | null) => void;
  editedRows: Record<string, string>[] | null;
  setEditedRows: (r: Record<string, string>[] | null) => void;
  resetWizard: () => void;
  // toasts
  toasts: Toast[];
  toast: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppState>(null as unknown as AppState);

let toastId = 0;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [rules, setRules] = useState<{ source_column: string; target_field: string }[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [step, setStep] = useState(1);
  const [sources, setSources] = useState<SelectedSource[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [targetSheet, setTargetSheet] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);
  const [mappings, setMappings] = useState<Record<string, Record<string, string | null>>>({});
  const [result, setResult] = useState<(TransformResponse & { template_name?: string }) | null>(null);
  const [editedRows, setEditedRows] = useState<Record<string, string>[] | null>(null);

  const toast = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback(
    (id: number) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  const guard = useCallback(
    async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        const v = await fn();
        setOnline(true);
        return v;
      } catch (e: any) {
        if (String(e?.message || "").includes("Failed to fetch") || e instanceof TypeError) {
          setOnline(false);
        }
        return fallback;
      }
    },
    []
  );

  const refreshFiles = useCallback(
    () => guard(() => api.listFiles(), { files: [] }).then((r) => setFiles(r.files)),
    [guard]
  );
  const refreshTemplates = useCallback(
    () => guard(() => api.listTemplates(), { templates: [] }).then((r) => setTemplates(r.templates)),
    [guard]
  );
  const refreshStats = useCallback(
    () =>
      guard(() => api.stats(), null).then((r) => {
        if (r) setStats(r);
      }),
    [guard]
  );
  const refreshOperations = useCallback(
    () => guard(() => api.listOperations(100), { operations: [] }).then((r) => setOperations(r.operations)),
    [guard]
  );
  const refreshRules = useCallback(
    () => guard(() => api.listRules(), { rules: [] }).then((r) => setRules(r.rules)),
    [guard]
  );
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshFiles(), refreshTemplates(), refreshStats(), refreshOperations(), refreshRules()]);
  }, [refreshFiles, refreshTemplates, refreshStats, refreshOperations, refreshRules]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const resetWizard = useCallback(() => {
    setStep(1);
    setSources([]);
    setTemplateId(null);
    setTargetSheet(null);
    setSuggestion(null);
    setMappings({});
    setResult(null);
    setEditedRows(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        online,
        files,
        templates,
        stats,
        operations,
        rules,
        refreshAll,
        refreshFiles,
        refreshTemplates,
        refreshStats,
        refreshOperations,
        refreshRules,
        step,
        setStep,
        sources,
        setSources,
        templateId,
        setTemplateId,
        targetSheet,
        setTargetSheet,
        suggestion,
        setSuggestion,
        mappings,
        setMappings,
        result,
        setResult,
        editedRows,
        setEditedRows,
        resetWizard,
        toasts,
        toast,
        dismissToast,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
