/* أدوات تنسيق الأرقام والتواريخ والملفات */

export function fmtBytes(n: number): string {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function fmtDate(iso: string | null | undefined, lang = "ar"): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export function fmtDateTime(iso: string | null | undefined, lang = "ar"): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export function fmtNum(n: number, lang = "ar"): string {
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US").format(n);
  } catch {
    return String(n);
  }
}

export function fmtPct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
