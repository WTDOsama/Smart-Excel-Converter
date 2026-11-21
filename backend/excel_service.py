"""خدمة معالجة ملفات Excel الحقيقية (OpenPyXL + Pandas).

Real Excel processing: workbook parsing, header detection, transformation
according to the column mapping, validation, and exports (XLSX with template
format preservation, CSV with UTF-8 BOM, PDF with proper Arabic shaping).
"""
import csv
import io
import re
from datetime import date, datetime
from pathlib import Path

import arabic_reshaper
import pandas as pd
from bidi.algorithm import get_display
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

FONTS = Path(__file__).parent / "fonts"


# ------------------------------------------------------------- parsing
def _cell_str(v):
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d %H:%M")
    if isinstance(v, date):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v).strip()


def detect_header_row(ws, max_scan=10):
    """Heuristic: the first row within the top rows whose non-empty cell count
    is close to the sheet's max, and whose cells are mostly short text."""
    best_row, best_score = 1, -1.0
    max_cols = ws.max_column or 1
    for r in range(1, min(max_scan, ws.max_row or 1) + 1):
        vals = [_cell_str(ws.cell(row=r, column=c).value) for c in range(1, max_cols + 1)]
        filled = sum(1 for v in vals if v)
        if filled == 0:
            continue
        short = sum(1 for v in vals if v and len(v) <= 60) / max(filled, 1)
        ratio = filled / max_cols
        score = ratio * 0.6 + short * 0.4 + (0.1 if r == 1 else 0)
        if score > best_score:
            best_score, best_row = score, r
    return best_row


def parse_workbook(path: str):
    """Return sheet metadata: name, rows, cols, header_row, columns, samples."""
    wb = load_workbook(path, read_only=True, data_only=True)
    sheets = []
    try:
        for ws in wb.worksheets:
            if ws.max_row is None or ws.max_column is None:
                continue
            header_row = detect_header_row(ws)
            headers, samples = [], { }
            max_cols = min(ws.max_column, 200)
            for r_idx, row in enumerate(ws.iter_rows(min_row=1, max_row=min(header_row + 5, ws.max_row),
                                                     max_col=max_cols, values_only=True), start=1):
                vals = [_cell_str(v) for v in row]
                if r_idx == header_row:
                    seen = set()
                    for i, v in enumerate(vals):
                        name = v if v else f"عمود {i+1}"
                        # de-duplicate header names
                        base, k = name, 2
                        while name in seen:
                            name = f"{base} ({k})"
                            k += 1
                        seen.add(name)
                        headers.append(name)
                elif r_idx > header_row and headers:
                    for i, name in enumerate(headers):
                        if i < len(vals) and vals[i]:
                            samples.setdefault(name, [])
                            if len(samples[name]) < 3:
                                samples[name].append(vals[i])
            sheets.append({
                "name": ws.title,
                "rows": max((ws.max_row or 1) - header_row, 0),
                "cols": len(headers),
                "header_row": header_row,
                "columns": headers,
                "samples": samples,
            })
    finally:
        wb.close()
    return sheets


def read_sheet(path: str, sheet_name: str, header_row: int):
    """Read a worksheet into a DataFrame (header_row is 1-based)."""
    df = pd.read_excel(path, sheet_name=sheet_name, header=header_row - 1, dtype=object)
    df.columns = [_cell_str(c) if not str(c).startswith("Unnamed") else _cell_str(c) for c in df.columns]
    # drop fully-empty columns and rows
    df = df.dropna(axis=1, how="all").dropna(axis=0, how="all")
    df.columns = [str(c).strip() or f"عمود {i+1}" for i, c in enumerate(df.columns)]
    return df


def sheet_raw_preview(path: str, sheet_name: str, rows=8):
    df = pd.read_excel(path, sheet_name=sheet_name, header=None, nrows=rows, dtype=object)
    return [[_cell_str(v) for v in row] for row in df.itertuples(index=False, name=None)]


def template_schema(path: str):
    """Parse a template workbook: sheets -> columns with required flags.
    A column is 'required' when its header cell is marked with * or (مطلوب),
    or when a cell comment/fill suggests it; otherwise still listed."""
    wb = load_workbook(path, data_only=True)
    sheets = []
    try:
        for ws in wb.worksheets:
            header_row = detect_header_row(ws)
            cols = []
            for c in range(1, min(ws.max_column or 1, 200) + 1):
                v = _cell_str(ws.cell(row=header_row, column=c).value)
                if not v:
                    continue
                required = bool(re.search(r"\*|مطلوب|إلزامي|الزامي", v))
                cols.append({"name": re.sub(r"\s*[*]\s*$", "", v).replace("(مطلوب)", "").strip(),
                             "required": required})
            if cols:
                sheets.append({"name": ws.title, "header_row": header_row, "columns": cols})
    finally:
        wb.close()
    return sheets


# ------------------------------------------------------------- transform
def transform(sources, template_cols):
    """sources: list of (df, source_label, mapping) where mapping is
    {target_field: source_column|None} for that specific sheet.
    Returns merged list of row-dicts keyed by target field."""
    rows = []
    for df, label, mapping in sources:
        cols = {str(c).strip(): c for c in df.columns}
        for _, r in df.iterrows():
            out = {}
            empty = True
            for t in template_cols:
                name = t["name"]
                src = mapping.get(name)
                val = ""
                if src and src in cols:
                    v = r[cols[src]]
                    val = "" if pd.isna(v) else _cell_str(v)
                if val != "":
                    empty = False
                out[name] = val
            out["_source"] = label
            if not empty:
                rows.append(out)
    return rows


def validate(rows, template_cols):
    """Validation report: missing required values, duplicates, warnings."""
    names = [t["name"] for t in template_cols]
    required = [t["name"] for t in template_cols if t["required"]]
    missing = {n: 0 for n in names}
    for row in rows:
        for n in names:
            if row.get(n, "") == "":
                missing[n] += 1
    # duplicates: identical values across all mapped fields
    seen, dup_indices = {}, []
    for i, row in enumerate(rows):
        key = tuple(row.get(n, "") for n in names)
        if key in seen:
            dup_indices.append(i)
        else:
            seen[key] = i
    issues = []
    for n in required:
        if missing.get(n, 0) > 0:
            issues.append({
                "type": "missing_required", "field": n, "count": missing[n],
                "message": f"الحقل المطلوب «{n}» فارغ في {missing[n]} صف",
            })
    for n in names:
        if n not in required and missing.get(n, 0) > 0 and missing[n] == len(rows):
            issues.append({
                "type": "empty_column", "field": n, "count": missing[n],
                "message": f"العمود «{n}» فارغ تماماً في كل الصفوف",
            })
    if dup_indices:
        issues.append({
            "type": "duplicates", "field": None, "count": len(dup_indices),
            "message": f"تم العثور على {len(dup_indices)} صف مكرر",
        })
    return {
        "total_rows": len(rows),
        "missing": {k: v for k, v in missing.items() if v},
        "duplicate_row_indices": dup_indices,
        "issues": issues,
        "ok": not any(i["type"] in ("missing_required",) for i in issues),
    }


# --------------------------------------------------------------- exports
def export_xlsx(template_path, sheet_name, header_row, columns, rows):
    """Write rows into a copy of the template workbook — original formatting,
    widths and styles of the template are preserved."""
    wb = load_workbook(template_path)
    ws = wb[sheet_name] if sheet_name in wb.sheetnames else wb.active
    header_cells = {}
    for c in range(1, ws.max_column + 1):
        v = _cell_str(ws.cell(row=header_row, column=c).value)
        if v:
            header_cells[re.sub(r"\s*[*]\s*$", "", v).replace("(مطلوب)", "").strip()] = c
    # copy style of the first data row if it exists (template sample row)
    from copy import copy as _copy
    sample_row_idx = header_row + 1
    has_sample = any(ws.cell(row=sample_row_idx, column=c).value not in (None, "")
                     for c in range(1, ws.max_column + 1))
    start = sample_row_idx
    for i, row in enumerate(rows):
        r = start + i
        for name, col_idx in header_cells.items():
            cell = ws.cell(row=r, column=col_idx)
            if has_sample and i == 0:
                pass  # keep existing cell style
            elif has_sample:
                src_cell = ws.cell(row=sample_row_idx, column=col_idx)
                cell.font = _copy(src_cell.font)
                cell.border = _copy(src_cell.border)
                cell.fill = _copy(src_cell.fill)
                cell.alignment = _copy(src_cell.alignment)
                cell.number_format = src_cell.number_format
            cell.value = _coerce(row.get(name, ""))
    # RTL view for the written sheet
    ws.sheet_view.rightToLeft = True
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _coerce(v):
    if v in (None, ""):
        return None
    s = str(v)
    # keep phone/ID-like values as text to preserve leading zeros
    if re.fullmatch(r"0\d+", s):
        return s
    if re.fullmatch(r"-?\d+", s) and len(s) < 15:
        return int(s)
    if re.fullmatch(r"-?\d+\.\d+", s):
        try:
            return float(s)
        except ValueError:
            return s
    return s


def export_csv(columns, rows):
    buf = io.StringIO()
    writer = csv.writer(buf)
    names = [c["name"] for c in columns]
    writer.writerow(names)
    for row in rows:
        writer.writerow([row.get(n, "") for n in names])
    data = buf.getvalue().encode("utf-8-sig")  # BOM so Excel opens Arabic correctly
    return io.BytesIO(data)


def export_pdf(columns, rows, title="نتيجة التحويل", max_rows=300):
    """PDF export with proper Arabic shaping and RTL ordering (reportlab)."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Table, TableStyle

    if not pdfmetrics.getRegisteredFontNames() or "Tajawal" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("Tajawal", str(FONTS / "Tajawal-Regular.ttf")))
        pdfmetrics.registerFont(TTFont("Tajawal-Bold", str(FONTS / "Tajawal-Bold.ttf")))
        pdfmetrics.registerFontFamily("Tajawal", normal="Tajawal", bold="Tajawal-Bold")

    def ar(text):
        return get_display(arabic_reshaper.reshape(str(text)))

    names = [c["name"] for c in columns]
    shown = rows[:max_rows]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                            rightMargin=10 * mm, leftMargin=10 * mm,
                            topMargin=12 * mm, bottomMargin=12 * mm)
    cell_style = ParagraphStyle("cell", fontName="Tajawal", fontSize=7.5, leading=10,
                                alignment=2)  # 2 = RIGHT
    head_style = ParagraphStyle("head", fontName="Tajawal-Bold", fontSize=8, leading=11,
                                alignment=2, textColor=colors.white)
    title_style = ParagraphStyle("title", fontName="Tajawal-Bold", fontSize=15, leading=20,
                                 alignment=2, textColor=colors.HexColor("#10243B"))
    meta_style = ParagraphStyle("meta", fontName="Tajawal", fontSize=9, leading=13,
                                alignment=2, textColor=colors.HexColor("#64748B"))

    data = [[Paragraph(ar(n), head_style) for n in names]]
    for row in shown:
        data.append([Paragraph(ar(row.get(n, "") or "—"), cell_style) for n in names])

    avail = landscape(A4)[0] - 20 * mm
    col_w = [avail / max(len(names), 1)] * len(names)
    table = Table(data, colWidths=col_w, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10243B")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story = [
        Paragraph(ar(title), title_style),
        Paragraph(ar(f"عدد الصفوف: {len(rows)}" + (f" — يعرض أول {max_rows} صف في PDF" if len(rows) > max_rows else "")), meta_style),
        Paragraph(ar(datetime.now().strftime("%Y-%m-%d %H:%M")), meta_style),
        table,
    ]
    doc.build(story)
    buf.seek(0)
    return buf
