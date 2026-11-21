"""محرك المطابقة الذكية للأعمدة.

Smart column-mapping engine:
1) Normalization (diacritics, case, punctuation, Alef/Yaa/Taa-marbuta variants)
2) A bilingual Arabic/English synonym dictionary of business-data concepts
3) Fuzzy string similarity + token overlap scoring
4) User-saved mapping rules (learned over time)
5) OPTIONAL LLM enhancement (OpenAI-compatible API, key kept on the backend).
   Falls back gracefully to the deterministic engine when no key is configured.
"""
import json
import re
import unicodedata
import urllib.request
from difflib import SequenceMatcher

# ---------------------------------------------------------------- normalize
ARABIC_DIACRITICS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")


def normalize(s: str) -> str:
    if s is None:
        return ""
    s = unicodedata.normalize("NFKC", str(s)).strip()
    s = ARABIC_DIACRITICS.sub("", s)
    s = s.lower()
    # unify Arabic letter variants
    s = (
        s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ٱ", "ا")
        .replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
        .replace("ـ", "")
    )
    s = re.sub(r"[^\w\u0600-\u06FF\s]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


# ------------------------------------------------------- synonym dictionary
# canonical concept -> aliases (Arabic + English), all stored normalized
SYNONYMS = {
    "full_name": ["الاسم", "الاسم الكامل", "اسم العميل", "اسم الموظف", "الاسم الرباعي", "اسم الشخص",
                  "name", "full name", "client name", "customer name", "employee name", "person name"],
    "first_name": ["الاسم الاول", "first name", "given name"],
    "last_name": ["اسم العائله", "الاسم الاخير", "last name", "family name", "surname"],
    "phone": ["الهاتف", "رقم الهاتف", "الجوال", "رقم الجوال", "الموبايل", "رقم الموبايل", "التليفون",
              "phone", "phone number", "mobile", "mobile number", "tel", "telephone", "cell"],
    "email": ["البريد الالكتروني", "البريد", "الايميل", "email", "e-mail", "mail", "email address"],
    "national_id": ["رقم الهويه", "الهويه", "السجل المدني", "رقم السجل المدني", "الرقم القومي",
                    "national id", "id number", "national number", "civil id"],
    "id": ["الرقم", "رقم", "المعرف", "الكود", "الترتيب", "id", "no", "number", "code", "ref", "reference", "index"],
    "address": ["العنوان", "عنوان", "الموقع", "العنوان التفصيلي", "الشارع",
                "address", "street", "location", "street address"],
    "city": ["المدينه", "مدينة", "city", "town"],
    "district": ["الحي", "district", "neighborhood"],
    "country": ["الدوله", "البلد", "country", "nation"],
    "date": ["التاريخ", "تاريخ", "الميلاد", "تاريخ الميلاد", "date", "birth date", "dob"],
    "created_at": ["تاريخ الانشاء", "تاريخ الاضافه", "created at", "creation date", "date added"],
    "amount": ["المبلغ", "مبلغ", "القيم", "الاجمالي", "مجموع", "amount", "value", "total", "sum"],
    "price": ["السعر", "سعر", "سعر الوحده", "price", "unit price", "cost"],
    "quantity": ["الكميه", "كميه", "العدد", "quantity", "qty", "count"],
    "company": ["الشركه", "المؤسسه", "جهه العمل", "company", "organization", "employer", "entity"],
    "department": ["القسم", "الاداره", "department", "dept", "division"],
    "job_title": ["المسمي الوظيفي", "الوظيفه", "job title", "position", "role"],
    "notes": ["ملاحظات", "ملاحظه", "تعليق", "notes", "note", "remarks", "comments"],
    "status": ["الحاله", "الوضع", "status", "state"],
    "product": ["المنتج", "اسم المنتج", "product", "item", "item name", "service"],
    "invoice_no": ["رقم الفاتوره", "فاتوره", "invoice", "invoice number", "bill number"],
    "gender": ["الجنس", "النوع", "gender", "sex"],
    "salary": ["الراتب", "salary", "wage", "pay"],
    "discount": ["الخصم", "التخفيض", "discount"],
    "tax": ["الضريبه", "ضريبه القيمه المضافه", "tax", "vat"],
    "website": ["الموقع الالكتروني", "website", "url", "web"],
    "iban": ["الايبان", "رقم الحساب", "iban", "account number", "bank account"],
}

# build reverse lookup: normalized alias -> concept
_ALIAS_TO_CONCEPT = {}
for concept, aliases in SYNONYMS.items():
    for a in aliases:
        _ALIAS_TO_CONCEPT[normalize(a)] = concept
    _ALIAS_TO_CONCEPT[normalize(concept.replace("_", " "))] = concept

_TOKENS = {c: {normalize(a) for a in al} for c, al in SYNONYMS.items()}


def _concept_of(col: str):
    n = normalize(col)
    if not n:
        return None
    if n in _ALIAS_TO_CONCEPT:
        return _ALIAS_TO_CONCEPT[n]
    # token-level: any token of the column that is a known alias
    for tok in n.split():
        if tok in _ALIAS_TO_CONCEPT:
            return _ALIAS_TO_CONCEPT[tok]
    return None


def _tokens(s: str):
    return set(normalize(s).split()) - {"", "ال", "في", "من", "the", "a", "an", "of"}


def similarity(a: str, b: str) -> float:
    """Combined similarity between two column names."""
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    seq = SequenceMatcher(None, na, nb).ratio()
    ta, tb = _tokens(a), _tokens(b)
    jac = len(ta & tb) / len(ta | tb) if (ta or tb) else 0.0
    return max(seq, jac, 0.5 * seq + 0.5 * jac)


def _score_pair(src, tgt, rule_map, source_samples):
    """Score a single (source column, target field) candidate pair."""
    # 1) learned user rules
    if rule_map.get(normalize(src)) == tgt:
        return 0.99, "قاعدة محفوظة"
    # 2) bilingual synonym dictionary
    src_c, tgt_c = _concept_of(src), _concept_of(tgt)
    score, why = 0.0, "تشابه نصي"
    if src_c and tgt_c and src_c == tgt_c:
        score, why = (0.96 if normalize(src) == normalize(tgt) else 0.9), "قاموس المرادفات"
    else:
        # 3) fuzzy similarity (only accept reasonably similar names)
        sim = similarity(src, tgt)
        if sim >= 0.5:
            score = min(sim, 0.89)
    if score > 0 and source_samples and score < 0.98:
        sv = source_samples.get(src, [])
        if sv:
            if _looks_like(sv, tgt):
                score = min(0.99, score + 0.03)
            else:
                score *= 0.5  # values don't look plausible for this target
    return score, why


def suggest_mapping(source_columns, target_columns, saved_rules=None,
                    source_samples=None):
    """Global-greedy matcher: score every candidate pair, then assign the
    best scores first so exact/strong matches are never stolen by weak ones."""
    saved_rules = saved_rules or []
    rule_map = {normalize(r["source_column"]): r["target_field"] for r in saved_rules}

    candidates = []
    for tgt in target_columns:
        for src in source_columns:
            score, why = _score_pair(src, tgt, rule_map, source_samples or {})
            if score >= 0.45:
                candidates.append((score, tgt, src, why))
    candidates.sort(key=lambda x: -x[0])

    used_sources, assigned = set(), {}
    for score, tgt, src, why in candidates:
        if tgt in assigned or src in used_sources:
            continue
        assigned[tgt] = (src, score, why)
        used_sources.add(src)

    pairs = []
    for tgt in target_columns:
        if tgt in assigned:
            src, score, why = assigned[tgt]
            pairs.append({"source_column": src, "target_field": tgt,
                          "confidence": round(score, 2), "reason": why})
        else:
            pairs.append({"source_column": None, "target_field": tgt,
                          "confidence": 0.0, "reason": "لا توجد مطابقة"})
    unmatched_sources = [c for c in source_columns if c not in used_sources]
    return pairs, unmatched_sources


def _looks_like(sample_values, target_name) -> bool:
    """Cheap heuristic: do sample values look plausible for this target?"""
    vals = [str(v) for v in sample_values if v not in (None, "")][:5]
    if not vals:
        return False
    concept = _concept_of(target_name)
    if concept in ("phone", "national_id", "iban", "id", "invoice_no"):
        return all(re.fullmatch(r"[\d\s+\-().]{6,}", v) for v in vals)
    if concept == "email":
        return all("@" in v for v in vals)
    if concept in ("amount", "price", "quantity", "salary", "discount", "tax"):
        return all(re.fullmatch(r"-?[\d.,]+\s*[\w%]*", v) for v in vals)
    if concept == "date":
        return all(re.search(r"\d{1,4}[-/.]\d{1,2}", v) for v in vals)
    return True


# ------------------------------------------------------------- LLM (optional)
def llm_suggest(source_columns, target_columns, settings):
    """Optional AI enhancement. Returns list of {source_column, target_field,
    confidence} or None when unavailable. The API key never leaves the backend."""
    if settings.get("ai_enabled") != "true":
        return None
    api_key = (settings.get("ai_api_key") or "").strip()
    if not api_key or api_key.startswith("sk-•") or "•" in api_key:
        return None
    base_url = settings.get("ai_base_url") or "https://api.openai.com/v1"
    model = settings.get("ai_model") or "gpt-4o-mini"
    prompt = (
        "You are a data-mapping assistant. Map source spreadsheet columns to "
        "destination template fields. Respond ONLY with JSON: "
        '[{"source_column": "...", "target_field": "...", "confidence": 0.0-1.0}]. '
        f"Source columns: {json.dumps(source_columns, ensure_ascii=False)}. "
        f"Target fields: {json.dumps(target_columns, ensure_ascii=False)}. "
        "Each target may take at most one source. Use null source_column when "
        "there is no reasonable match."
    )
    try:
        req = urllib.request.Request(
            base_url.rstrip("/") + "/chat/completions",
            data=json.dumps({
                "model": model,
                "temperature": 0,
                "messages": [{"role": "user", "content": prompt}],
            }).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode())
        content = data["choices"][0]["message"]["content"]
        m = re.search(r"\[.*\]", content, re.S)
        if not m:
            return None
        result = json.loads(m.group(0))
        valid_targets = set(target_columns)
        valid_sources = set(source_columns)
        clean = []
        seen_t, seen_s = set(), set()
        for item in result:
            t, s = item.get("target_field"), item.get("source_column")
            if t in valid_targets and t not in seen_t and (s is None or (s in valid_sources and s not in seen_s)):
                conf = float(item.get("confidence", 0.8) or 0.8)
                clean.append({"source_column": s, "target_field": t,
                              "confidence": round(max(0.0, min(1.0, conf)), 2),
                              "reason": "الذكاء الاصطناعي"})
                seen_t.add(t)
                if s:
                    seen_s.add(s)
        return clean or None
    except Exception:
        return None


def merge_llm(base_pairs, llm_pairs, threshold=0.5):
    """Prefer LLM suggestions above threshold; keep deterministic ones otherwise."""
    llm_by_target = {p["target_field"]: p for p in llm_pairs if p["confidence"] >= threshold}
    used_sources = {p["source_column"] for p in llm_by_target.values() if p["source_column"]}
    merged = []
    for p in base_pairs:
        lp = llm_by_target.get(p["target_field"])
        if lp and (lp["source_column"] is None or p["source_column"] == lp["source_column"]
                   or p["source_column"] not in used_sources or lp["confidence"] > p["confidence"]):
            merged.append(lp)
        else:
            merged.append(p)
    return merged
