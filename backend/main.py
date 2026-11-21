"""محول Excel الذكي — واجهة برمجة التطبيقات (FastAPI).

Backend API: real Excel parsing/transformation/export, template library,
smart column mapping (deterministic engine + optional LLM), operation logs.
All secrets (AI API keys) are stored and used server-side only.
"""
import json
import shutil
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

import db
import excel_service as xs
import mapping_engine as me

BASE = Path(__file__).parent / "storage"
UPLOADS = BASE / "uploads"
TEMPLATES = BASE / "templates"
RESULTS = BASE / "results"
EXPORTS = BASE / "exports"
for d in (UPLOADS, TEMPLATES, RESULTS, EXPORTS):
    d.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="محول Excel الذكي API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EXCEL_EXT = {".xlsx", ".xlsm", ".xls"}


@app.on_event("startup")
def startup():
    db.init_db()


# ------------------------------------------------------------- health/stats
@app.get("/api/health")
def health():
    return {"status": "ok", "app": "محول Excel الذكي"}


@app.get("/api/stats")
def stats():
    ops = db.list_operations(limit=1000)
    conversions = [o for o in ops if o["kind"] == "conversion"]
    return {
        "files_processed": len(db.list_files()),
        "templates_saved": len(db.list_templates()),
        "successful_conversions": len([o for o in conversions if o["status"] in ("success", "warning")]),
        "warning_conversions": len([o for o in conversions if o["status"] == "warning"]),
        "failed_conversions": len([o for o in conversions if o["status"] == "failed"]),
        "total_rows": sum(o.get("rows_out") or 0 for o in conversions),
        "recent_operations": ops[:6],
        "by_day": _by_day(conversions),
        "by_status": {
            "success": len([o for o in ops if o["status"] == "success"]),
            "warning": len([o for o in ops if o["status"] == "warning"]),
            "failed": len([o for o in ops if o["status"] == "failed"]),
        },
    }


def _by_day(conversions):
    days = {}
    for o in conversions:
        d = (o["created_at"] or "")[:10]
        if d:
            days[d] = days.get(d, 0) + 1
    return [{"day": k, "count": v} for k, v in sorted(days.items())][-14:]


# ---------------------------------------------------------------- settings
class SettingsIn(BaseModel):
    settings: dict


@app.get("/api/settings")
def get_settings():
    return db.get_settings()


@app.put("/api/settings")
def put_settings(payload: SettingsIn):
    allowed = {"app_language", "ai_enabled", "ai_api_key", "ai_base_url", "ai_model",
               "confidence_threshold", "max_preview_rows"}
    for k, v in payload.settings.items():
        if k not in allowed:
            continue
        # a masked key means "unchanged"
        if k == "ai_api_key" and ("•" in str(v) or str(v) == ""):
            continue
        db.set_setting(k, v)
    db.log_operation("settings", "تحديث الإعدادات", "تم تعديل إعدادات التطبيق", "success")
    return db.get_settings()


# ------------------------------------------------------------------ files
@app.post("/api/files/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    results = []
    for f in files:
        name = Path(f.filename or "ملف.xlsx").name
        if Path(name).suffix.lower() not in EXCEL_EXT:
            results.append({"name": name, "error": "صيغة غير مدعومة — يُقبل xlsx / xlsm / xls فقط"})
            continue
        file_id = db.new_id()
        path = UPLOADS / f"{file_id}_{name}"
        with path.open("wb") as out:
            shutil.copyfileobj(f.file, out)
        try:
            sheets = xs.parse_workbook(str(path))
        except Exception as e:
            path.unlink(missing_ok=True)
            results.append({"name": name, "error": f"تعذر قراءة الملف: {e}"})
            continue
        if not sheets:
            path.unlink(missing_ok=True)
            results.append({"name": name, "error": "الملف لا يحتوي على أوراق عمل ببيانات"})
            continue
        db.insert_file(file_id, name, str(path), path.stat().st_size, sheets)
        db.log_operation("upload", "رفع ملف بيانات", name, "success",
                         files_count=1)
        results.append({"id": file_id, "name": name, "size": path.stat().st_size,
                        "sheets": sheets})
    return {"uploaded": results}


@app.get("/api/files")
def list_files():
    return {"files": db.list_files()}


@app.get("/api/files/{file_id}/preview")
def file_preview(file_id: str, sheet: str = None, rows: int = 8):
    f = db.get_file(file_id)
    if not f:
        raise HTTPException(404, "الملف غير موجود")
    sheet_name = sheet or f["sheets"][0]["name"]
    try:
        data = xs.sheet_raw_preview(f["path"], sheet_name, rows=rows)
    except Exception as e:
        raise HTTPException(400, f"تعذر قراءة الورقة: {e}")
    return {"file_id": file_id, "sheet": sheet_name, "rows": data}


@app.delete("/api/files/{file_id}")
def delete_file(file_id: str):
    ok = db.delete_file(file_id)
    if ok:
        db.log_operation("upload", "حذف ملف بيانات", file_id, "success")
    return {"deleted": ok}


# -------------------------------------------------------------- templates
@app.post("/api/templates")
async def create_template(file: UploadFile = File(...),
                          name: str = Form(""),
                          category: str = Form("عام")):
    fname = Path(file.filename or "template.xlsx").name
    if Path(fname).suffix.lower() not in EXCEL_EXT:
        raise HTTPException(400, "صيغة غير مدعومة — يُقبل xlsx / xlsm / xls فقط")
    tid = db.new_id()
    path = TEMPLATES / f"{tid}_{fname}"
    with path.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    try:
        schema = xs.template_schema(str(path))
    except Exception as e:
        path.unlink(missing_ok=True)
        raise HTTPException(400, f"تعذر قراءة الفورمة: {e}")
    if not schema:
        path.unlink(missing_ok=True)
        raise HTTPException(400, "لم يتم العثور على رؤوس أعمدة في الفورمة")
    tname = (name or "").strip() or Path(fname).stem
    db.insert_template(tid, tname, category or "عام", str(path), schema)
    db.log_operation("template", "إضافة فورمة جديدة", tname, "success")
    return {"id": tid, "name": tname, "sheets": schema}


@app.get("/api/templates")
def list_templates():
    return {"templates": db.list_templates()}


class TemplatePatch(BaseModel):
    name: str = None
    category: str = None


@app.patch("/api/templates/{tid}")
def patch_template(tid: str, payload: TemplatePatch):
    t = db.get_template(tid)
    if not t:
        raise HTTPException(404, "الفورمة غير موجودة")
    fields = {}
    if payload.name is not None:
        fields["name"] = payload.name
    if payload.category is not None:
        fields["category"] = payload.category
    db.update_template(tid, **fields)
    db.log_operation("template", "تعديل فورمة", payload.name or tid, "success")
    return db.get_template(tid)


@app.post("/api/templates/{tid}/duplicate")
def duplicate_template(tid: str):
    t = db.get_template(tid)
    if not t:
        raise HTTPException(404, "الفورمة غير موجودة")
    new_id = db.new_id()
    src = Path(t["path"])
    dst = TEMPLATES / f"{new_id}_{src.name.split('_', 1)[-1]}"
    shutil.copyfile(src, dst)
    db.insert_template(new_id, f"{t['name']} (نسخة)", t.get("category", "عام"),
                       str(dst), t["sheets"])
    db.log_operation("template", "نسخ فورمة", t["name"], "success")
    return db.get_template(new_id)


@app.get("/api/templates/{tid}/preview")
def template_preview(tid: str, sheet: str = None, rows: int = 8):
    t = db.get_template(tid)
    if not t:
        raise HTTPException(404, "الفورمة غير موجودة")
    sheet_name = sheet or t["sheets"][0]["name"]
    data = xs.sheet_raw_preview(t["path"], sheet_name, rows=rows)
    return {"template_id": tid, "sheet": sheet_name, "rows": data}


@app.delete("/api/templates/{tid}")
def delete_template(tid: str):
    t = db.get_template(tid)
    ok = db.delete_template(tid)
    if ok:
        db.log_operation("template", "حذف فورمة", t["name"], "success")
    return {"deleted": ok}


# ---------------------------------------------------------------- mapping
class SuggestIn(BaseModel):
    template_id: str
    target_sheet: str = None
    sources: list[dict]  # [{file_id, sheet, header_row}]


@app.post("/api/mapping/suggest")
def mapping_suggest(payload: SuggestIn):
    t = db.get_template(payload.template_id)
    if not t:
        raise HTTPException(404, "الفورمة غير موجودة")
    tsheet = next((s for s in t["sheets"] if s["name"] == payload.target_sheet), t["sheets"][0])
    target_cols = [c["name"] for c in tsheet["columns"]]
    settings = db.get_settings()
    try:
        threshold = float(settings.get("confidence_threshold", 0.65) or 0.65)
    except ValueError:
        threshold = 0.65
    rules = db.list_mapping_rules()

    per_source, errors = [], []
    any_llm = False
    for src in payload.sources:
        f = db.get_file(src.get("file_id", ""))
        if not f:
            errors.append(f"ملف غير موجود: {src.get('file_id')}")
            continue
        sheet_meta = next((s for s in f["sheets"] if s["name"] == src.get("sheet")), None)
        if not sheet_meta:
            errors.append(f"ورقة غير موجودة في {f['name']}: {src.get('sheet')}")
            continue
        source_cols = sheet_meta["columns"]
        samples = sheet_meta.get("samples", {})
        base_pairs, unmatched = me.suggest_mapping(
            source_cols, target_cols, saved_rules=rules, source_samples=samples)
        llm_pairs = me.llm_suggest(source_cols, target_cols, settings)
        if llm_pairs:
            any_llm = True
            base_pairs = me.merge_llm(base_pairs, llm_pairs, threshold)
        missing_required = [c["name"] for c in tsheet["columns"]
                            if c["required"] and not any(
                                p["target_field"] == c["name"] and p["source_column"]
                                for p in base_pairs)]
        per_source.append({
            "file_id": f["id"],
            "file_name": f["name"],
            "sheet": sheet_meta["name"],
            "header_row": sheet_meta["header_row"],
            "source_columns": source_cols,
            "samples": {k: v[:3] for k, v in samples.items()},
            "pairs": base_pairs,
            "unmatched_sources": unmatched,
            "missing_required": missing_required,
        })

    if not per_source:
        raise HTTPException(400, "لا توجد أعمدة مصدر محددة")

    return {
        "target_sheet": tsheet["name"],
        "target_columns": tsheet["columns"],
        "sources": per_source,
        "confidence_threshold": threshold,
        "engine": "الذكاء الاصطناعي + المحرك المدمج" if any_llm else "المحرك الذكي المدمج",
        "errors": errors,
    }


class RulesIn(BaseModel):
    rules: list[dict]  # [{source_column, target_field}]


@app.post("/api/mapping/rules")
def save_rules(payload: RulesIn):
    pairs = [(r["source_column"], r["target_field"]) for r in payload.rules
             if r.get("source_column") and r.get("target_field")]
    db.save_mapping_rules(pairs)
    db.log_operation("template", "حفظ قواعد المطابقة", f"{len(pairs)} قاعدة", "success")
    return {"saved": len(pairs)}


@app.get("/api/mapping/rules")
def get_rules():
    return {"rules": db.list_mapping_rules()}


@app.delete("/api/mapping/rules")
def clear_rules():
    db.clear_mapping_rules()
    return {"cleared": True}


# -------------------------------------------------------------- transform
class TransformIn(BaseModel):
    template_id: str
    target_sheet: str = None
    sources: list[dict]           # [{file_id, sheet, header_row, mapping}]
    mapping: dict = None          # fallback global mapping {target: source|null}


@app.post("/api/transform")
def transform(payload: TransformIn):
    t = db.get_template(payload.template_id)
    if not t:
        raise HTTPException(404, "الفورمة غير موجودة")
    tsheet = next((s for s in t["sheets"] if s["name"] == payload.target_sheet), t["sheets"][0])

    frames = []
    for src in payload.sources:
        f = db.get_file(src["file_id"])
        if not f:
            raise HTTPException(404, f"ملف غير موجود: {src['file_id']}")
        header_row = int(src.get("header_row") or
                         next((s["header_row"] for s in f["sheets"] if s["name"] == src["sheet"]), 1))
        try:
            df = xs.read_sheet(f["path"], src["sheet"], header_row)
        except Exception as e:
            raise HTTPException(400, f"خطأ في قراءة {f['name']} / {src['sheet']}: {e}")
        mapping = src.get("mapping") or payload.mapping or {}
        frames.append((df, f"{f['name']} — {src['sheet']}", mapping))

    if not frames:
        raise HTTPException(400, "لم يتم تحديد أي مصدر بيانات")

    rows = xs.transform(frames, tsheet["columns"])
    validation = xs.validate(rows, tsheet["columns"])

    result_id = db.new_id()
    result = {
        "id": result_id,
        "template_id": payload.template_id,
        "template_name": t["name"],
        "target_sheet": tsheet["name"],
        "header_row": tsheet["header_row"],
        "columns": tsheet["columns"],
        "rows": rows,
        "validation": validation,
        "created_at": db.now_iso(),
    }
    (RESULTS / f"{result_id}.json").write_text(
        json.dumps(result, ensure_ascii=False), encoding="utf-8")

    status = "success" if validation["ok"] and not validation["issues"] else (
        "success" if validation["ok"] else "warning")
    db.log_operation(
        "conversion", "تحويل بيانات إلى فورمة",
        f"{t['name']} — {len(frames)} مصدر", status,
        rows_out=len(rows), files_count=len(frames))
    db.update_template(payload.template_id, last_used=db.now_iso())

    return {
        "result_id": result_id,
        "row_count": len(rows),
        "preview": rows[:100],
        "validation": validation,
        "columns": tsheet["columns"],
    }


def _load_result(result_id: str):
    p = RESULTS / f"{result_id}.json"
    if not p.exists():
        raise HTTPException(404, "النتيجة غير موجودة أو انتهت صلاحيتها")
    return json.loads(p.read_text(encoding="utf-8"))


@app.get("/api/results/{result_id}")
def get_result(result_id: str):
    r = _load_result(result_id)
    return {**r, "preview": r["rows"][:200], "row_count": len(r["rows"])}


# ----------------------------------------------------------------- export
class ExportIn(BaseModel):
    result_id: str
    format: str                  # xlsx | csv | pdf
    rows: list[dict] = None      # edited rows (optional)
    title: str = "نتيجة التحويل"


@app.post("/api/export")
def export(payload: ExportIn):
    r = _load_result(payload.result_id)
    rows = payload.rows if payload.rows is not None else r["rows"]
    # persist edits back into the stored result
    if payload.rows is not None:
        r["rows"] = rows
        r["validation"] = xs.validate(rows, r["columns"])
        (RESULTS / f"{r['id']}.json").write_text(
            json.dumps(r, ensure_ascii=False), encoding="utf-8")

    t = db.get_template(r["template_id"])
    if not t:
        raise HTTPException(404, "لم يتم العثور على الفورمة الأصلية للتصدير")

    fmt = payload.format.lower()
    base_name = f"{r['template_name']}-{r['id']}"
    if fmt == "xlsx":
        buf = xs.export_xlsx(t["path"], r["target_sheet"], r["header_row"], r["columns"], rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fname = f"{base_name}.xlsx"
    elif fmt == "csv":
        buf = xs.export_csv(r["columns"], rows)
        media = "text/csv; charset=utf-8"
        fname = f"{base_name}.csv"
    elif fmt == "pdf":
        buf = xs.export_pdf(r["columns"], rows, title=payload.title or "نتيجة التحويل")
        media = "application/pdf"
        fname = f"{base_name}.pdf"
    else:
        raise HTTPException(400, "صيغة تصدير غير مدعومة")

    db.log_operation("export", f"تصدير نتيجة ({fmt.upper()})",
                     f"{r['template_name']} — {len(rows)} صف", "success", rows_out=len(rows))
    data = buf.getvalue()
    from urllib.parse import quote
    return Response(
        content=data, media_type=media,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"},
    )


# -------------------------------------------------------------- operations
@app.get("/api/operations")
def operations(limit: int = 100):
    return {"operations": db.list_operations(limit=limit)}


@app.delete("/api/operations")
def clear_operations():
    db.clear_operations()
    return {"cleared": True}
