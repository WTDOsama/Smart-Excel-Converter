/* نظام الترجمة — العربية هي اللغة الأساسية مع دعم اختياري للإنجليزية */
import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "ar" | "en";

const dict: Record<string, { ar: string; en: string }> = {
  app_name: { ar: "محول Excel الذكي", en: "Smart Excel Converter" },
  // nav
  nav_home: { ar: "الرئيسية", en: "Home" },
  nav_new_conversion: { ar: "تحويل ملف جديد", en: "New Conversion" },
  nav_upload: { ar: "رفع ملفات Excel", en: "Upload Excel Files" },
  nav_templates: { ar: "مكتبة الفورمات", en: "Template Library" },
  nav_mapping: { ar: "المطابقة الذكية", en: "Smart Mapping" },
  nav_preview: { ar: "معاينة النتائج", en: "Results Preview" },
  nav_logs: { ar: "سجل العمليات", en: "Operations Log" },
  nav_reports: { ar: "التقارير", en: "Reports" },
  nav_settings: { ar: "الإعدادات", en: "Settings" },
  nav_profile: { ar: "الملف الشخصي", en: "Profile" },
  nav_section_main: { ar: "القائمة الرئيسية", en: "Main Menu" },
  nav_section_data: { ar: "البيانات والتحويل", en: "Data & Conversion" },
  nav_section_account: { ar: "الحساب", en: "Account" },
  // dashboard
  dash_welcome: { ar: "مرحباً بك في محول Excel الذكي", en: "Welcome to Smart Excel Converter" },
  dash_subtitle: {
    ar: "حوّل بيانات Excel إلى الفورمة المطلوبة بسهولة ودقة باستخدام الذكاء الاصطناعي.",
    en: "Transform Excel data into the required format easily and accurately using AI.",
  },
  stat_files: { ar: "إجمالي الملفات المعالجة", en: "Total Files Processed" },
  stat_templates: { ar: "الفورمات المحفوظة", en: "Saved Templates" },
  stat_success: { ar: "عمليات التحويل الناجحة", en: "Successful Conversions" },
  stat_recent: { ar: "العمليات الأخيرة", en: "Recent Operations" },
  start_new: { ar: "ابدأ تحويل جديد", en: "Start New Conversion" },
  manage_templates: { ar: "إدارة الفورمات", en: "Manage Templates" },
  total_rows: { ar: "إجمالي الصفوف المحولة", en: "Total Rows Converted" },
  conversion_activity: { ar: "نشاط التحويل (آخر ١٤ يوم)", en: "Conversion Activity (Last 14 Days)" },
  no_activity: { ar: "لا يوجد نشاط بعد", en: "No activity yet" },
  view_all: { ar: "عرض الكل", en: "View All" },
  quick_actions: { ar: "إجراءات سريعة", en: "Quick Actions" },
  // wizard
  step1: { ar: "رفع ملفات البيانات", en: "Upload Data Files" },
  step2: { ar: "اختيار الفورمة المطلوبة", en: "Choose Template" },
  step3: { ar: "المطابقة والمعالجة الذكية", en: "Smart Mapping & Processing" },
  step4: { ar: "معاينة وتصدير النتيجة", en: "Preview & Export Result" },
  step_of: { ar: "الخطوة {a} من {b}", en: "Step {a} of {b}" },
  next: { ar: "التالي", en: "Next" },
  prev: { ar: "السابق", en: "Previous" },
  // step 1
  drop_files: { ar: "اسحب ملفات Excel وأفلتها هنا", en: "Drag & drop Excel files here" },
  or_browse: { ar: "أو انقر للاختيار من جهازك", en: "or click to browse your device" },
  supported: { ar: "الصيغ المدعومة: XLSX, XLSM, XLS — يمكن رفع أكثر من ملف", en: "Supported: XLSX, XLSM, XLS — multiple files allowed" },
  uploaded_files: { ar: "الملفات المرفوعة", en: "Uploaded Files" },
  select_sheets: { ar: "اختر أوراق العمل المراد تحويلها", en: "Select the worksheets to convert" },
  sheets: { ar: "أوراق العمل", en: "Worksheets" },
  rows_count: { ar: "{n} صف", en: "{n} rows" },
  cols_count: { ar: "{n} عمود", en: "{n} columns" },
  header_row_label: { ar: "صف العناوين", en: "Header row" },
  selected_sources: { ar: "المصادر المحددة", en: "Selected sources" },
  no_files_yet: { ar: "لا توجد ملفات مرفوعة بعد", en: "No files uploaded yet" },
  uploading: { ar: "جارٍ الرفع...", en: "Uploading..." },
  // step 2
  choose_existing: { ar: "اختيار فورمة محفوظة", en: "Choose a saved template" },
  upload_new_template: { ar: "رفع فورمة جديدة", en: "Upload a new template" },
  template_name: { ar: "اسم الفورمة", en: "Template name" },
  template_category: { ar: "التصنيف", en: "Category" },
  target_sheet: { ar: "ورقة العمل المستهدفة", en: "Target worksheet" },
  template_fields: { ar: "خانات الفورمة", en: "Template fields" },
  required_field: { ar: "مطلوب", en: "Required" },
  optional_field: { ar: "اختياري", en: "Optional" },
  use_this_template: { ar: "استخدام هذه الفورمة", en: "Use this template" },
  no_templates: { ar: "لا توجد فورمات محفوظة — ارفع فورمة جديدة للبدء", en: "No saved templates — upload one to start" },
  // step 3
  mapping_title: { ar: "المطابقة الذكية للأعمدة", en: "Smart Column Mapping" },
  mapping_subtitle: {
    ar: "راجع المطابقات المقترحة من الذكاء الاصطناعي بين أعمدة ملفك وخانات الفورمة المطلوبة.",
    en: "Review the AI-suggested matches between your file columns and the template fields.",
  },
  source_columns: { ar: "أعمدة الملف الأصلي", en: "Source File Columns" },
  target_fields: { ar: "خانات الفورمة المطلوبة", en: "Required Template Fields" },
  ai_suggestions: { ar: "المطابقات المقترحة", en: "AI Suggestions" },
  confidence: { ar: "درجة الثقة", en: "Confidence" },
  unmatched_fields: { ar: "الحقول غير المطابقة", en: "Unmatched Fields" },
  missing_required: { ar: "الحقول المطلوبة الناقصة", en: "Missing Required Fields" },
  approve_mapping: { ar: "اعتماد المطابقة", en: "Approve Mapping" },
  edit_mapping: { ar: "تعديل المطابقة", en: "Edit Mapping" },
  ignore_column: { ar: "تجاهل العمود", en: "Ignore Column" },
  save_rules: { ar: "حفظ قواعد المطابقة", en: "Save Mapping Rules" },
  run_processing: { ar: "تشغيل المعالجة والتحويل", en: "Run Processing & Conversion" },
  sample_values: { ar: "قيم نموذجية", en: "Sample values" },
  no_match: { ar: "لا توجد مطابقة", en: "No match" },
  select_source_column: { ar: "اختر عمود المصدر…", en: "Select source column…" },
  ignore: { ar: "تجاهل", en: "Ignore" },
  engine_used: { ar: "المحرك المستخدم", en: "Engine used" },
  all_requirements_met: { ar: "جميع الحقول المطلوبة تمت مطابقتها", en: "All required fields are mapped" },
  rules_saved: { ar: "تم حفظ قواعد المطابقة — ستُستخدم تلقائياً في التحويلات القادمة", en: "Mapping rules saved — they will be used automatically next time" },
  processing: { ar: "جارٍ المعالجة…", en: "Processing…" },
  // step 4
  preview_title: { ar: "معاينة النتيجة النهائية", en: "Final Result Preview" },
  preview_subtitle: {
    ar: "تحقق من البيانات المحولة، وعدّل أي خانة يدوياً، ثم اعتمد النتيجة وصدّرها.",
    en: "Review the converted data, edit any cell manually, then approve and export.",
  },
  download_excel: { ar: "تحميل ملف Excel", en: "Download Excel" },
  export_pdf: { ar: "تصدير PDF", en: "Export PDF" },
  export_csv: { ar: "تصدير CSV", en: "Export CSV" },
  final_approval: { ar: "الاعتماد النهائي", en: "Final Approval" },
  approved: { ar: "تم اعتماد النتيجة", en: "Result approved" },
  approve: { ar: "اعتماد النتيجة", en: "Approve Result" },
  data_validation: { ar: "التحقق من البيانات", en: "Data Validation" },
  validation_ok: { ar: "البيانات سليمة — لا توجد أخطاء تمنع التصدير", en: "Data is valid — no blocking errors" },
  duplicates_found: { ar: "صفوف مكررة", en: "Duplicate rows" },
  missing_data: { ar: "بيانات ناقصة", en: "Missing data" },
  edit_hint: { ar: "انقر على أي خلية لتعديلها مباشرة", en: "Click any cell to edit it directly" },
  source_label: { ar: "المصدر", en: "Source" },
  row_num: { ar: "#", en: "#" },
  exporting: { ar: "جارٍ التصدير…", en: "Exporting…" },
  no_result_yet: { ar: "لا توجد نتيجة لعرضها بعد", en: "No result to display yet" },
  run_conversion_first: { ar: "قم بإجراء تحويل كامل أولاً لعرض النتائج هنا.", en: "Run a full conversion first to see results here." },
  // templates page
  templates_title: { ar: "مكتبة الفورمات المحفوظة", en: "Saved Template Library" },
  templates_subtitle: {
    ar: "أضف ونظّم الفورمات التي تستخدمها لتحويل البيانات إليها.",
    en: "Add and organize the templates you convert data into.",
  },
  add_template: { ar: "إضافة فورمة جديدة", en: "Add New Template" },
  date_added: { ar: "تاريخ الإضافة", en: "Date Added" },
  sheets_num: { ar: "عدد أوراق العمل", en: "Worksheets" },
  last_used: { ar: "آخر استخدام", en: "Last Used" },
  never_used: { ar: "لم تُستخدم بعد", en: "Never used" },
  preview: { ar: "معاينة", en: "Preview" },
  rename: { ar: "إعادة تسمية", en: "Rename" },
  duplicate: { ar: "نسخ", en: "Duplicate" },
  delete: { ar: "حذف", en: "Delete" },
  confirm_delete_template: { ar: "هل أنت متأكد من حذف هذه الفورمة؟", en: "Are you sure you want to delete this template?" },
  template_preview_title: { ar: "معاينة الفورمة", en: "Template Preview" },
  all_categories: { ar: "كل التصنيفات", en: "All categories" },
  search_templates: { ar: "ابحث باسم الفورمة…", en: "Search by template name…" },
  // mapping page
  saved_rules: { ar: "قواعد المطابقة المحفوظة", en: "Saved Mapping Rules" },
  saved_rules_hint: {
    ar: "القواعد التي حفظتها تُطبَّق تلقائياً في كل تحويل قادم.",
    en: "Rules you saved are applied automatically in every future conversion.",
  },
  clear_rules: { ar: "مسح كل القواعد", en: "Clear all rules" },
  no_rules: { ar: "لا توجد قواعد محفوظة بعد", en: "No saved rules yet" },
  start_conversion_for_mapping: {
    ar: "ابدأ تحويل جديد للوصول إلى شاشة المطابقة الذكية.",
    en: "Start a new conversion to access the smart mapping screen.",
  },
  // logs
  logs_title: { ar: "سجل العمليات", en: "Operations Log" },
  logs_subtitle: { ar: "كل عمليات الرفع والتحويل والتصدير في مكان واحد.", en: "All upload, conversion and export operations in one place." },
  operation: { ar: "العملية", en: "Operation" },
  kind: { ar: "النوع", en: "Type" },
  status: { ar: "الحالة", en: "Status" },
  date: { ar: "التاريخ", en: "Date" },
  clear_log: { ar: "مسح السجل", en: "Clear log" },
  kind_upload: { ar: "رفع", en: "Upload" },
  kind_conversion: { ar: "تحويل", en: "Conversion" },
  kind_template: { ar: "فورمة", en: "Template" },
  kind_export: { ar: "تصدير", en: "Export" },
  kind_settings: { ar: "إعدادات", en: "Settings" },
  status_success: { ar: "نجحت", en: "Success" },
  status_warning: { ar: "تحذير", en: "Warning" },
  status_failed: { ar: "فشلت", en: "Failed" },
  no_logs: { ar: "لا توجد عمليات مسجلة بعد", en: "No operations logged yet" },
  // reports
  reports_title: { ar: "التقارير", en: "Reports" },
  reports_subtitle: { ar: "ملخص أداء عمليات التحويل والاستخدام.", en: "Summary of conversion performance and usage." },
  conversions_by_status: { ar: "التحويلات حسب الحالة", en: "Conversions by Status" },
  top_templates: { ar: "الفورمات الأكثر استخداماً", en: "Most Used Templates" },
  avg_rows: { ar: "متوسط الصفوف لكل عملية", en: "Average Rows per Operation" },
  success_rate: { ar: "نسبة النجاح", en: "Success Rate" },
  // settings
  settings_title: { ar: "الإعدادات", en: "Settings" },
  settings_subtitle: { ar: "تخصيص اللغة والذكاء الاصطناعي وسلوك التطبيق.", en: "Customize language, AI and app behavior." },
  language_section: { ar: "اللغة والاتجاه", en: "Language & Direction" },
  app_language: { ar: "لغة الواجهة", en: "Interface language" },
  arabic: { ar: "العربية", en: "Arabic" },
  english: { ar: "الإنجليزية", en: "English" },
  ai_section: { ar: "الذكاء الاصطناعي", en: "Artificial Intelligence" },
  ai_enable: { ar: "تفعيل المطابقة بالذكاء الاصطناعي", en: "Enable AI-powered mapping" },
  ai_enable_hint: {
    ar: "عند التفعيل يُستخدم نموذج ذكاء اصطناعي لتحسين مطابقة الأعمدة. المفتاح يُحفظ على الخادم فقط ولا يغادره أبداً.",
    en: "When enabled, an AI model enhances column mapping. The key is stored on the server only and never leaves it.",
  },
  ai_api_key: { ar: "مفتاح واجهة برمجة التطبيقات", en: "API Key" },
  ai_base_url: { ar: "عنوان الخادم (Base URL)", en: "Base URL" },
  ai_model: { ar: "اسم النموذج", en: "Model name" },
  confidence_threshold: { ar: "حد الثقة الأدنى للمطابقة التلقائية", en: "Minimum auto-match confidence" },
  processing_section: { ar: "المعالجة", en: "Processing" },
  max_preview_rows: { ar: "أقصى عدد صفوف في المعاينة", en: "Max preview rows" },
  save_settings: { ar: "حفظ الإعدادات", en: "Save Settings" },
  settings_saved: { ar: "تم حفظ الإعدادات بنجاح", en: "Settings saved successfully" },
  keys_secure: { ar: "كل المفاتيح الحساسة محفوظة على الخادم الخلفي ولا تظهر في المتصفح.", en: "All sensitive keys are kept on the backend and never exposed to the browser." },
  // profile
  profile_title: { ar: "الملف الشخصي", en: "Profile" },
  full_name: { ar: "الاسم الكامل", en: "Full Name" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  role: { ar: "المسمى الوظيفي", en: "Job Title" },
  organization: { ar: "الجهة", en: "Organization" },
  save_profile: { ar: "حفظ الملف الشخصي", en: "Save Profile" },
  profile_saved: { ar: "تم حفظ الملف الشخصي", en: "Profile saved" },
  usage_summary: { ar: "ملخص الاستخدام", en: "Usage Summary" },
  // common
  close: { ar: "إغلاق", en: "Close" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  save: { ar: "حفظ", en: "Save" },
  confirm: { ar: "تأكيد", en: "Confirm" },
  yes_delete: { ar: "نعم، احذف", en: "Yes, delete" },
  loading: { ar: "جارٍ التحميل…", en: "Loading…" },
  error_occurred: { ar: "حدث خطأ", en: "An error occurred" },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  file_size: { ar: "الحجم", en: "Size" },
  actions: { ar: "إجراءات", en: "Actions" },
  backend_offline: { ar: "تعذر الاتصال بالخادم الخلفي — تأكد من تشغيل خدمة المعالجة.", en: "Cannot reach the backend server — make sure the processing service is running." },
  use_in_conversion: { ar: "استخدام في تحويل", en: "Use in conversion" },
  confirm_delete_file: { ar: "هل أنت متأكد من حذف هذا الملف؟", en: "Are you sure you want to delete this file?" },
  files_title: { ar: "رفع ملفات Excel", en: "Upload Excel Files" },
  files_subtitle: { ar: "ارفع ملفات البيانات التي تريد تحويلها، ثم اختر أوراق العمل المطلوبة.", en: "Upload the data files you want to convert, then pick the required worksheets." },
  fields_count: { ar: "{n} خانة", en: "{n} fields" },
  of_which_required: { ar: "منها {n} مطلوبة", en: "{n} required" },
  rows_label: { ar: "إجمالي الصفوف", en: "Total rows" },
  rows_header: { ar: "الصفوف", en: "Rows" },
  operations_count: { ar: "عدد العمليات", en: "Operations" },
  edit_mode_on: { ar: "وضع التعديل مفعّل — غيّر أي مطابقة من القوائم", en: "Edit mode on — change any match from the dropdowns" },
  edit_mode_off: { ar: "وضع العرض — اضغط «تعديل المطابقة» للتغيير", en: "View mode — press Edit Mapping to change" },
  ignored_columns: { ar: "أعمدة تم تجاهلها", en: "Ignored columns" },
  restore: { ar: "استعادة", en: "Restore" },
};

interface I18nCtx {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18nCtx>({
  lang: "ar",
  dir: "rtl",
  t: (k) => k,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem("app_lang") as Lang) || "ar"
  );

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("app_lang", lang);
  }, [lang]);

  const t = (key: string, vars?: Record<string, string | number>) => {
    const entry = dict[key];
    let s = entry ? entry[lang] : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    }
    return s;
  };

  return (
    <Ctx.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", t, setLang: setLangState }}>
      {children}
    </Ctx.Provider>
  );
}

export const useI18n = () => useContext(Ctx);
