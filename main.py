from __future__ import annotations

from backend.schemas_attachment import (
    AttachmentDiscoveryRequest,
    AttachmentDiscoveryResponse,
    DiscoveredAttachment,
)


from datetime import date
from backend.engine.job_discovery import discover_jobs
from backend.engine.attachment_discovery import discover_attachments, clear_cache
import json
from backend.engine.groq_client import chat
from backend.schemas_ai import (
    FitScoreRequest,
    FitScoreResponse,
    AtsStrengthRequest,
    AtsStrengthResponse,
    CoverLetterRequest,
    CoverLetterResponse,
    JobDiscoveryRequest,
    JobDiscoveryResponse,
    DiscoveredJob,
)
import csv
import io
from dotenv import load_dotenv

load_dotenv()
from typing import Dict, List

from docx import Document
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from PyPDF2 import PdfReader
from sqlalchemy.orm import Session

from backend.auth import create_access_token, get_current_user_payload, require_roles
from backend.db import get_db, init_db
from backend.engine.ai_advisor import (
    build_candidate_advice,
    build_candidate_job_summary,
    build_employer_candidate_summary,
    build_job_advice,
)
from backend.engine.ai_employer_advisor import (
    build_employer_candidate_review,
    build_employer_hiring_summary,
)
from backend.engine.ai_resume_advisor import build_resume_advice
from backend.engine.candidate_store import (
    get_candidate_count,
    list_candidates,
    search_best_candidates,
    upsert_candidate,
)
from backend.engine.data_loader import load_jobs
from backend.engine.faiss_index import JobFaissIndex
from backend.engine.nlp_processor import extract_skills
from backend.engine.ranker import rank_jobs_from_candidates, siamese_ready
from backend.engine.reranker_service import (
    rerank_candidates_for_job,
    rerank_jobs_for_resume,
)
from backend.engine.user_store import authenticate_user, create_user
from backend.schemas_auth import RegisterRequest, TokenResponse
from backend.schemas_db import (
    CandidateCreate,
    JobRequest,
    CompanyCreate,
    CompanyRead,
    CompanyUpdate,
    StudentCreate,
    StudentRead,
    StudentUpdate,
)
from backend.models import User, Student, Company, Attachment, Application
from backend.schemas_attachment import (
    AttachmentCreate,
    AttachmentUpdate,
    AttachmentRead,
    ApplicationCreate,
    ApplicationRead,
    ApplicationStatusUpdate,
    ApplicantRead,
)

USE_SIAMESE = False
FAISS_SHORTLIST_K = 50
RECOMMENDATION_TOP_K = 15
EMPLOYER_SHORTLIST_K = 50
EMPLOYER_TOP_K = 20

app = FastAPI(title="Global Job Recommendation API")

import os

_origins_env = os.environ.get("CORS_ORIGINS", "").strip()
ALLOWED_ORIGINS = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    if _origins_env
    else ["*"]  # local dev default
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS_DB: List[Dict] = []
JOB_INDEX: JobFaissIndex | None = None

FAIRNESS_LOGS: List[Dict] = [
    {
        "group": "female",
        "selected": 42,
        "total": 100,
        "true_positive": 30,
        "actual_positive": 60,
    },
    {
        "group": "male",
        "selected": 55,
        "total": 100,
        "true_positive": 40,
        "actual_positive": 62,
    },
    {
        "group": "non_binary",
        "selected": 18,
        "total": 40,
        "true_positive": 11,
        "actual_positive": 20,
    },
]


def initialize_system() -> None:
    global JOBS_DB, JOB_INDEX
    JOBS_DB = load_jobs()
    JOB_INDEX = JobFaissIndex()
    JOB_INDEX.load_or_build(JOBS_DB)


def safe_div(a: float, b: float) -> float:
    return round(a / b, 4) if b else 0.0


def compute_fairness_metrics() -> Dict:
    group_metrics = []

    for row in FAIRNESS_LOGS:
        selection_rate = safe_div(row["selected"], row["total"])
        true_positive_rate = safe_div(row["true_positive"], row["actual_positive"])

        group_metrics.append(
            {
                "group": row["group"],
                "selected": row["selected"],
                "total": row["total"],
                "actual_positive": row["actual_positive"],
                "selection_rate": selection_rate,
                "true_positive_rate": true_positive_rate,
            }
        )

    selection_rates = [g["selection_rate"] for g in group_metrics]
    tprs = [g["true_positive_rate"] for g in group_metrics]

    demographic_parity_difference = (
        round(max(selection_rates) - min(selection_rates), 4)
        if selection_rates
        else 0.0
    )
    equal_opportunity_difference = round(max(tprs) - min(tprs), 4) if tprs else 0.0

    fairness_alert = (
        demographic_parity_difference > 0.1 or equal_opportunity_difference > 0.1
    )

    return {
        "group_metrics": group_metrics,
        "summary": {
            "demographic_parity_difference": demographic_parity_difference,
            "equal_opportunity_difference": equal_opportunity_difference,
            "fairness_alert": fairness_alert,
            "threshold": 0.1,
        },
    }


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    initialize_system()


def sanitize_resume_text(text: str | None) -> str:
    if not text:
        return ""

    text = text.replace("\x00", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = "".join(ch for ch in text if ch == "\n" or ord(ch) >= 32)

    return text.strip()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = []

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text.append(page_text)

    return "\n".join(text)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    filename = filename.lower()

    if filename.endswith(".pdf"):
        return sanitize_resume_text(extract_text_from_pdf(file_bytes))
    if filename.endswith(".docx"):
        return sanitize_resume_text(extract_text_from_docx(file_bytes))
    if filename.endswith(".txt"):
        return sanitize_resume_text(file_bytes.decode("utf-8", errors="ignore"))

    raise HTTPException(
        status_code=400,
        detail="Unsupported file type. Use PDF, DOCX, or TXT.",
    )


@app.post("/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = create_user(
            db,
            full_name=payload.full_name,
            email=payload.email,
            password=payload.password,
            role=payload.role,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    token = create_access_token(
        {
            "sub": user.email,
            "role": user.role,
            "full_name": user.full_name,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
    }


@app.post("/auth/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        {
            "sub": user.email,
            "role": user.role,
            "full_name": user.full_name,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
    }


@app.get("/auth/me")
def auth_me(current_user: dict = Depends(get_current_user_payload)):
    return current_user


@app.get("/")
def root():
    return {
        "message": "Global Job Recommendation API is running",
        "jobs_loaded": len(JOBS_DB),
        "faiss_ready": JOB_INDEX is not None and JOB_INDEX.is_ready(),
        "siamese_requested": USE_SIAMESE,
        "siamese_ready": siamese_ready(),
    }


@app.get("/health")
def health(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin")),
):
    return {
        "status": "ok",
        "jobs_loaded": len(JOBS_DB),
        "candidates_loaded": get_candidate_count(db),
        "faiss_ready": JOB_INDEX is not None and JOB_INDEX.is_ready(),
        "siamese_requested": USE_SIAMESE,
        "siamese_ready": siamese_ready(),
    }


@app.get("/admin/status")
def admin_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin")),
):
    fairness = compute_fairness_metrics()

    return {
        "system_status": "online",
        "jobs_loaded": len(JOBS_DB),
        "candidates_loaded": get_candidate_count(db),
        "faiss_ready": JOB_INDEX is not None and JOB_INDEX.is_ready(),
        "faiss_shortlist_k": FAISS_SHORTLIST_K,
        "recommendation_top_k": RECOMMENDATION_TOP_K,
        "siamese_requested": USE_SIAMESE,
        "siamese_ready": siamese_ready(),
        "fairness_monitoring": "active_demo",
        "retraining": "manual",
        "fairness_summary": fairness["summary"],
    }


@app.get("/admin/fairness")
def admin_fairness(
    current_user: dict = Depends(require_roles("admin")),
):
    return compute_fairness_metrics()


@app.post("/admin/reload-jobs")
def admin_reload_jobs(
    current_user: dict = Depends(require_roles("admin")),
):
    global JOBS_DB, JOB_INDEX

    JOBS_DB = load_jobs()
    JOB_INDEX = JobFaissIndex()
    JOB_INDEX.load_or_build(JOBS_DB)

    return {
        "message": "Jobs reloaded successfully",
        "jobs_loaded": len(JOBS_DB),
        "faiss_ready": JOB_INDEX.is_ready(),
    }


@app.post("/admin/rebuild-index")
def admin_rebuild_index(
    current_user: dict = Depends(require_roles("admin")),
):
    global JOB_INDEX

    if not JOBS_DB:
        raise HTTPException(status_code=500, detail="Jobs database is empty.")

    JOB_INDEX = JobFaissIndex()
    JOB_INDEX.build(JOBS_DB, save=True)

    return {
        "message": "FAISS index rebuilt successfully",
        "jobs_indexed": len(JOBS_DB),
        "faiss_ready": JOB_INDEX.is_ready(),
    }


@app.get("/candidates")
def get_candidates(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "employer")),
):
    return {
        "count": min(limit, get_candidate_count(db)),
        "candidates": list_candidates(db, limit=limit),
    }


@app.post("/candidates")
def add_candidate(
    candidate: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("candidate")),
):
    cleaned_resume_text = sanitize_resume_text(candidate.resume_text)

    if not cleaned_resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")

    saved = upsert_candidate(
        db,
        full_name=sanitize_resume_text(candidate.full_name),
        email=sanitize_resume_text(candidate.email),
        phone=sanitize_resume_text(candidate.phone) if candidate.phone else None,
        summary=sanitize_resume_text(candidate.summary) if candidate.summary else None,
        resume_text=cleaned_resume_text,
        original_filename=None,
    )

    return {
        "message": "Candidate saved successfully",
        "candidate_id": saved.id,
        "full_name": saved.full_name,
        "email": saved.email,
    }


@app.post("/candidates/upload-resume")
async def upload_candidate_resume(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str | None = Form(None),
    summary: str | None = Form(None),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("candidate")),
):
    if not JOBS_DB:
        raise HTTPException(
            status_code=500, detail="Job database is empty or failed to load."
        )

    if JOB_INDEX is None or not JOB_INDEX.is_ready():
        raise HTTPException(status_code=500, detail="FAISS job index is not ready.")

    file_bytes = await resume.read()
    resume_text = extract_resume_text(resume.filename, file_bytes)

    if not resume_text.strip():
        raise HTTPException(
            status_code=400, detail="Resume text could not be extracted."
        )

    candidate = upsert_candidate(
        db,
        full_name=sanitize_resume_text(full_name),
        email=sanitize_resume_text(email),
        phone=sanitize_resume_text(phone) if phone else None,
        summary=sanitize_resume_text(summary) if summary else None,
        resume_text=resume_text,
        original_filename=(
            sanitize_resume_text(resume.filename) if resume.filename else None
        ),
    )

    skills = extract_skills(resume_text)
    scores, indices = JOB_INDEX.search(resume_text, top_k=FAISS_SHORTLIST_K)

    candidate_jobs = []
    candidate_scores = []

    for pos, job_idx in enumerate(indices):
        if 0 <= job_idx < len(JOBS_DB):
            candidate_jobs.append(JOBS_DB[job_idx])
            candidate_scores.append(scores[pos])

    ranked_jobs = rank_jobs_from_candidates(
        resume_text=resume_text,
        resume_skills=skills,
        candidate_jobs=candidate_jobs,
        semantic_scores=candidate_scores,
        top_k=FAISS_SHORTLIST_K,
        use_siamese=USE_SIAMESE,
    )

    reranked_jobs = rerank_jobs_for_resume(
        resume_text=resume_text,
        jobs=ranked_jobs,
        top_k=RECOMMENDATION_TOP_K,
    )

    for job in reranked_jobs:
        job["advice"] = build_job_advice(job)

    resume_advice = build_resume_advice(
        resume_text=resume_text,
        extracted_skills=skills,
        recommendations=reranked_jobs,
    )

    return {
        "message": "Candidate saved and matched successfully",
        "candidate_id": candidate.id,
        "filename": resume.filename,
        "extracted_skills": skills,
        "recommendations_count": len(reranked_jobs),
        "advice_summary": build_candidate_job_summary(reranked_jobs),
        "resume_advice": resume_advice,
        "recommendations": reranked_jobs,
    }


@app.post("/match-resume")
async def match_resume(
    resume: UploadFile = File(...),
    current_user: dict = Depends(require_roles("candidate")),
):
    file_bytes = await resume.read()
    resume_text = extract_resume_text(resume.filename, file_bytes)

    if not resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Resume text could not be extracted.",
        )

    skills = extract_skills(resume_text)
    search_query = _build_job_search_query(resume_text, skills)
    try:
        discovered = discover_jobs(search_query, max_results=RECOMMENDATION_TOP_K)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    reranked_jobs = _live_jobs_as_recommendations(discovered["results"])

    for job in reranked_jobs:
        job["advice"] = build_job_advice(job)

    resume_advice = build_resume_advice(
        resume_text=resume_text,
        extracted_skills=skills,
        recommendations=reranked_jobs,
    )

    return {
        "filename": resume.filename,
        "resume_text": resume_text,
        "extracted_skills": skills,
        "search_query": search_query,
        "total_jobs_considered": discovered["total_searched"],
        "filtered_out": discovered["filtered_out"],
        "recommendations_count": len(reranked_jobs),
        "advice_summary": build_candidate_job_summary(reranked_jobs),
        "resume_advice": resume_advice,
        "recommendations": reranked_jobs,
    }


@app.post("/best-candidates")
def best_candidates(
    job: JobRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    job_title = sanitize_resume_text(job.job_title)
    job_description = sanitize_resume_text(job.job_description)

    if not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")

    candidate_shortlist = search_best_candidates(
        db,
        job_description=job_description,
        top_k=EMPLOYER_SHORTLIST_K,
    )

    reranked_candidates = rerank_candidates_for_job(
        job_description=job_description,
        candidates=candidate_shortlist,
        top_k=EMPLOYER_TOP_K,
    )

    for candidate in reranked_candidates:
        candidate["advice"] = build_candidate_advice(candidate, job_title)
        candidate["employer_review"] = build_employer_candidate_review(
            candidate=candidate,
            job_title=job_title,
            job_description=job_description,
        )
        candidate.pop("resume_text_internal", None)

    return {
        "job_title": job_title,
        "candidates_count": len(reranked_candidates),
        "advice_summary": build_employer_candidate_summary(
            reranked_candidates, job_title
        ),
        "hiring_summary": build_employer_hiring_summary(reranked_candidates, job_title),
        "candidates": reranked_candidates,
    }


@app.post("/admin/upload-candidates-csv")
async def admin_upload_candidates_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin")),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="ignore")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no header row")

    def pick(row: dict, *names: str) -> str:
        normalized = {
            (k or "").strip().lower(): (v or "").strip() for k, v in row.items()
        }
        for n in names:
            if n in normalized and normalized[n]:
                return normalized[n]
        return ""

    saved = 0
    skipped = 0
    errors: List[Dict] = []

    for idx, row in enumerate(reader, start=2):
        full_name = pick(row, "full_name", "name")
        email = pick(row, "email", "email_address")
        phone = pick(row, "phone", "phone_number")
        summary = pick(row, "summary", "headline", "title")
        resume_text = pick(row, "resume_text", "resume", "cv", "bio", "description")

        if not full_name or not email or not resume_text:
            skipped += 1
            errors.append(
                {
                    "row": idx,
                    "reason": "Missing required field (full_name, email, or resume_text)",
                }
            )
            continue

        try:
            upsert_candidate(
                db,
                full_name=sanitize_resume_text(full_name),
                email=sanitize_resume_text(email),
                phone=sanitize_resume_text(phone) if phone else None,
                summary=sanitize_resume_text(summary) if summary else None,
                resume_text=sanitize_resume_text(resume_text),
                original_filename=file.filename,
            )
            saved += 1
        except Exception as e:
            errors.append({"row": idx, "reason": str(e)})

    return {
        "message": "CSV import complete",
        "filename": file.filename,
        "saved": saved,
        "skipped": skipped,
        "errors_count": len(errors),
        "errors": errors[:20],
    }


import json
from backend.schemas_ai import (
    FitScoreRequest,
    FitScoreResponse,
    AtsStrengthRequest,
    AtsStrengthResponse,
    CoverLetterRequest,
    CoverLetterResponse,
)

FIT_SCORE_SYSTEM = """You are a senior technical recruiter. Given a candidate's resume 
and a job description, return ONLY a valid JSON object with these exact keys:
- fit_score: integer 0-100
- verdict: "strong_match" | "moderate_match" | "weak_match"
- reasoning: 2-3 sentence explanation of the score
- strengths: list of 3-5 specific technical skills the candidate has that match
- gaps: list of 2-4 specific skills or experiences the candidate is missing
- recommendation: one actionable sentence for the candidate

Do not include markdown fences. Do not include any text outside the JSON."""

ATS_STRENGTH_SYSTEM = """You are an ATS (Applicant Tracking System) expert and senior resume \
reviewer. Analyze the resume and return ONLY a valid JSON object with these exact keys:

- overall_score: integer 0-100, the resume's overall ATS readiness
- sections: object with these integer keys (0-100 each):
    - impact: how well achievements are quantified and outcome-oriented
    - clarity: readability, conciseness, action verbs
    - keywords: density of ATS-relevant technical and role keywords
    - formatting: parsability (no tables/graphics, standard sections, dates)
    - achievements: presence of concrete, measurable results
- issues: list of 3-6 specific problems found (be concrete, cite the resume)
- improvements: list of 3-6 specific, actionable fixes (imperative voice)

Do not include any text outside the JSON. No markdown fences. No preamble."""

JOB_SEARCH_SYSTEM = """You are a job-search strategist. Build one concise web-search query for
finding current job postings that match the candidate's resume. Include the strongest role
titles, technical skills, seniority, and location only when clearly present. Return ONLY a JSON
object with this exact key: query (a string of 5-20 words)."""

COVER_LETTER_SYSTEM = """You are a professional cover-letter writer for technical roles. \
Given a candidate's resume and a job description, write a concise, compelling cover letter BODY.

Rules:
- Return ONLY the body paragraphs — no greeting, no "Dear Hiring Manager", no signature, no "Sincerely".
- 3 paragraphs, roughly 200-280 words total.
- Paragraph 1: hook — why this specific role and company, referencing something concrete from the job description.
- Paragraph 2: strongest evidence — 2-3 specific achievements or skills from the resume that directly match the job's needs. Use concrete details.
- Paragraph 3: close — enthusiasm + a forward-looking sentence. No "I look forward to hearing from you."
- Tone: confident, specific, human. No clichés ("passionate team player", "hit the ground running").
- Never invent experience. Only use what's in the resume.
- Output plain text. No markdown, no bullet points, no headers."""


@app.post("/ai/match", response_model=FitScoreResponse)
def ai_match(
    payload: FitScoreRequest,
    current_user: dict = Depends(require_roles("candidate", "employer", "admin")),
):
    user_prompt = f"""JOB TITLE: {payload.job_title}

JOB DESCRIPTION:
{payload.job_description}

CANDIDATE RESUME:
{payload.resume_text}
"""
    raw = chat(
        FIT_SCORE_SYSTEM, user_prompt, model="openai/gpt-oss-20b", max_tokens=800
    )
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    return FitScoreResponse(**data)


def _normalize_ats(data: dict) -> dict:
    """Map common alias keys the model may use to our schema's canonical names."""
    aliases = {
        "improvements": ["recommendations", "tips", "suggestions", "fixes", "actions"],
        "issues": ["problems", "concerns", "weaknesses", "areas_for_improvement"],
        "overall_score": ["score", "ats_score", "total_score"],
        "sections": ["breakdown", "subscores", "categories"],
    }
    for canonical, alts in aliases.items():
        if canonical not in data:
            for alt in alts:
                if alt in data:
                    data[canonical] = data.pop(alt)
                    break

    data.setdefault("overall_score", 0)
    data.setdefault("sections", {})
    data.setdefault("issues", [])
    data.setdefault("improvements", [])

    try:
        data["overall_score"] = max(
            0, min(100, int(round(float(data["overall_score"]))))
        )
    except (ValueError, TypeError):
        data["overall_score"] = 0

    for key in ("issues", "improvements"):
        value = data[key]
        if isinstance(value, str):
            data[key] = [value] if value.strip() else []
        elif isinstance(value, list):
            data[key] = [str(item) for item in value if str(item).strip()]
        else:
            data[key] = []

    # Coerce every section value to an integer in the schema's valid range.
    if isinstance(data.get("sections"), dict):
        cleaned = {}
        for k, v in data["sections"].items():
            try:
                cleaned[k] = max(0, min(100, int(round(float(v)))))
            except (ValueError, TypeError):
                continue
        data["sections"] = cleaned
    else:
        data["sections"] = {}

    return data


def _parse_model_json(raw: str) -> dict:
    """Extract the first JSON object even when the model adds a preamble or fence."""
    decoder = json.JSONDecoder()
    for index, character in enumerate(raw):
        if character != "{":
            continue
        try:
            value, _ = decoder.raw_decode(raw[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    raise json.JSONDecodeError("No JSON object found", raw, 0)


def _build_job_search_query(resume_text: str, skills: List[str]) -> str:
    prompt = f"RESUME:\n{resume_text}\n\nEXTRACTED SKILLS: {', '.join(skills[:20])}"
    try:
        raw = chat(
            JOB_SEARCH_SYSTEM,
            prompt,
            model="qwen/qwen3.8-27b",
            max_tokens=120,
            response_format={"type": "json_object"},
        )
        query = str(_parse_model_json(raw).get("query", "")).strip()
        if query:
            return query
    except Exception:
        pass

    fallback = " ".join(skills[:8]).strip()
    return f"{fallback} jobs hiring" if fallback else "technology jobs hiring"


def _live_jobs_as_recommendations(results: List[Dict]) -> List[Dict]:
    recommendations = []
    for result in results:
        title = result.get("title", "Untitled")
        recommendations.append(
            {
                "title": title,
                "job_title": title,
                "company": result.get("company", ""),
                "description": result.get("snippet", ""),
                "url": result.get("url", ""),
                "source": result.get("source", ""),
                "score": 0.5,
                "matching_skills": [],
                "required_skills": [],
            }
        )
    return recommendations


@app.post("/ai/resume-strength", response_model=AtsStrengthResponse)
def ai_resume_strength(
    payload: AtsStrengthRequest,
    current_user: dict = Depends(require_roles("candidate", "employer", "admin")),
):
    user_prompt = f"RESUME:\n{payload.resume_text}\n"
    try:
        raw = chat(
            ATS_STRENGTH_SYSTEM,
            user_prompt,
            model="qwen/qwen3.8-27b",
            max_tokens=800,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ATS service unavailable: {exc}")

    try:
        data = _parse_model_json(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail=f"Model returned invalid JSON: {raw[:200]}",
        )

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=502, detail="Model returned a JSON value instead of an object"
        )

    data = _normalize_ats(data)
    return AtsStrengthResponse(**data)


@app.post("/ai/cover-letter", response_model=CoverLetterResponse)
def ai_cover_letter(
    payload: CoverLetterRequest,
    current_user: dict = Depends(require_roles("candidate", "employer", "admin")),
):
    user_prompt = (
        f"ROLE: {payload.job_title}\n"
        f"COMPANY: {payload.company or 'the company'}\n\n"
        f"JOB DESCRIPTION:\n{payload.job_description}\n\n"
        f"CANDIDATE RESUME:\n{payload.resume_text}\n"
    )

    raw = chat(
        COVER_LETTER_SYSTEM,
        user_prompt,
        model="qwen/qwen3.8-27b",
        max_tokens=1200,
    )

    body = raw.strip()

    # Strip any accidental markdown fences
    if body.startswith("```"):
        body = body.split("```")[1]
        body = body.strip()

    if not body:
        raise HTTPException(status_code=502, detail="Model returned empty cover letter")

    return CoverLetterResponse(body=body)


@app.post("/jobs/discover", response_model=JobDiscoveryResponse)
def jobs_discover(
    payload: JobDiscoveryRequest,
    current_user: dict = Depends(require_roles("candidate", "employer", "admin")),
):
    try:
        data = discover_jobs(payload.query, max_results=payload.max_results)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return JobDiscoveryResponse(
        query=payload.query,
        results=[DiscoveredJob(**r) for r in data["results"]],
        total_searched=data["total_searched"],
        filtered_out=data["filtered_out"],
    )


# ===========================================================================
# STEP 2 — Company profile & attachment endpoints
# ===========================================================================


def _get_current_user_email(current_user: dict) -> str:
    """Extract email from current_user whether the key is 'email' or 'sub'."""
    return (current_user.get("email") or current_user.get("sub") or "").strip().lower()


def _get_user_by_email(db: Session, email: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _get_current_company(db: Session, current_user: dict) -> Company:
    user = _get_user_by_email(db, _get_current_user_email(current_user))
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company profile not found. Create one at POST /companies/me first.",
        )
    return company


def _skills_to_text(skills: List[str] | None) -> str | None:
    if not skills:
        return None
    cleaned = [s.strip() for s in skills if s and s.strip()]
    return ", ".join(cleaned) if cleaned else None


def _text_to_skills(text: str | None) -> List[str]:
    if not text:
        return []
    return [s.strip() for s in text.split(",") if s.strip()]


def _attachment_to_dict(att: Attachment) -> dict:
    return {
        "id": att.id,
        "company_id": att.company_id,
        "company_name": att.company.name if att.company else None,
        "company_location": att.company.location if att.company else None,
        "title": att.title,
        "description": att.description,
        "location": att.location,
        "duration_weeks": att.duration_weeks,
        "start_date": att.start_date,
        "deadline": att.deadline,
        "required_course": att.required_course,
        "required_skills": _text_to_skills(att.required_skills),
        "stipend": att.stipend,
        "positions_available": att.positions_available,
        "credit_offered": att.credit_offered,
        "status": att.status,
        "posted_at": att.posted_at,
        "updated_at": att.updated_at,
    }


@app.post("/companies/me", response_model=CompanyRead)
def upsert_my_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    user = _get_user_by_email(db, _get_current_user_email(current_user))
    company = db.query(Company).filter(Company.user_id == user.id).first()

    data = payload.model_dump(exclude_unset=True)

    if company:
        for k, v in data.items():
            setattr(company, k, v)
    else:
        company = Company(user_id=user.id, **data)
        db.add(company)

    db.commit()
    db.refresh(company)
    return company


@app.get("/companies/me", response_model=CompanyRead)
def read_my_company(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    return _get_current_company(db, current_user)


@app.post("/attachments", response_model=AttachmentRead)
def create_attachment(
    payload: AttachmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    company = _get_current_company(db, current_user)

    att = Attachment(
        company_id=company.id,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        duration_weeks=payload.duration_weeks,
        start_date=payload.start_date,
        deadline=payload.deadline,
        required_course=payload.required_course,
        required_skills=_skills_to_text(payload.required_skills),
        stipend=payload.stipend,
        positions_available=payload.positions_available,
        credit_offered=payload.credit_offered,
        status="open",
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return _attachment_to_dict(att)


@app.get("/my-attachments", response_model=List[AttachmentRead])
def list_my_attachments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    company = _get_current_company(db, current_user)
    rows = (
        db.query(Attachment)
        .filter(Attachment.company_id == company.id)
        .order_by(Attachment.posted_at.desc())
        .all()
    )
    return [_attachment_to_dict(a) for a in rows]


@app.get("/attachments", response_model=List[AttachmentRead])
def list_open_attachments(
    q: str | None = None,
    location: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Attachment).filter(Attachment.status == "open")

    if location:
        query = query.filter(Attachment.location.ilike(f"%{location}%"))

    if q:
        like = f"%{q}%"
        query = query.filter(
            (Attachment.title.ilike(like)) | (Attachment.description.ilike(like))
        )

    rows = query.order_by(Attachment.posted_at.desc()).limit(min(limit, 200)).all()
    return [_attachment_to_dict(a) for a in rows]


@app.get("/attachments/{attachment_id}", response_model=AttachmentRead)
def get_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return _attachment_to_dict(att)


@app.put("/attachments/{attachment_id}", response_model=AttachmentRead)
def update_attachment(
    attachment_id: int,
    payload: AttachmentUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    company = _get_current_company(db, current_user)
    att = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.company_id == company.id)
        .first()
    )
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    data = payload.model_dump(exclude_unset=True)

    if "required_skills" in data:
        data["required_skills"] = _skills_to_text(data["required_skills"])

    for k, v in data.items():
        setattr(att, k, v)

    db.commit()
    db.refresh(att)
    return _attachment_to_dict(att)


@app.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    company = _get_current_company(db, current_user)
    att = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.company_id == company.id)
        .first()
    )
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    db.delete(att)
    db.commit()
    return {"message": "Attachment deleted", "id": attachment_id}


# ===========================================================================
# STEP 3 — Student profile & application endpoints
# ===========================================================================


def _get_current_student(db: Session, current_user: dict) -> Student:
    email = _get_current_user_email(current_user)
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Create one at POST /students/me first.",
        )
    return student


def _student_to_dict(s: Student) -> dict:
    return {
        "id": s.id,
        "user_id": s.user_id,
        "full_name": s.full_name,
        "email": s.email,
        "phone": s.phone,
        "university": s.university,
        "course": s.course,
        "year_of_study": s.year_of_study,
        "expected_graduation": s.expected_graduation,
        "gpa": s.gpa,
        "preferred_duration_weeks": s.preferred_duration_weeks,
        "preferred_location": s.preferred_location,
        "summary": s.summary,
        "skills": _text_to_skills(s.skills_text),
        "original_filename": s.original_filename,
        "resume_text": s.resume_text,
        "created_at": s.created_at,
    }


def _application_to_dict(a: Application, include_attachment: bool = True) -> dict:
    d = {
        "id": a.id,
        "student_id": a.student_id,
        "attachment_id": a.attachment_id,
        "status": a.status,
        "cover_letter": a.cover_letter,
        "applied_at": a.applied_at,
        "updated_at": a.updated_at,
        "attachment_title": None,
        "company_name": None,
        "student_name": None,
        "student_email": None,
        "student_university": None,
        "company_notes": a.company_notes,
    }
    if include_attachment and a.attachment:
        d["attachment_title"] = a.attachment.title
        d["company_name"] = a.attachment.company.name if a.attachment.company else None
    if a.student:
        d["student_name"] = a.student.full_name
        d["student_email"] = a.student.email
        d["student_university"] = a.student.university
    return d


@app.post("/students/me", response_model=StudentRead)
def upsert_my_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("candidate")),
):
    email = _get_current_user_email(current_user)
    user = _get_user_by_email(db, email)

    student = db.query(Student).filter(Student.email == email).first()

    data = payload.model_dump(exclude_unset=True)
    data["email"] = data.get("email", email).lower()

    if student:
        for k, v in data.items():
            if k == "email":
                continue
            setattr(student, k, v)
    else:
        student = Student(user_id=user.id, **data)
        db.add(student)

    db.commit()
    db.refresh(student)

    skills = extract_skills(student.resume_text)
    student.skills_text = ", ".join(skills)
    db.commit()

    return _student_to_dict(student)


@app.get("/students/me", response_model=StudentRead)
def read_my_student(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("candidate")),
):
    student = _get_current_student(db, current_user)
    return _student_to_dict(student)


@app.post("/students/upload-resume", response_model=StudentRead)
async def upload_student_resume(
    full_name: str = Form(...),
    university: str | None = Form(None),
    course: str | None = Form(None),
    year_of_study: int | None = Form(None),
    expected_graduation: str | None = Form(None),
    phone: str | None = Form(None),
    preferred_location: str | None = Form(None),
    preferred_duration_weeks: int | None = Form(None),
    summary: str | None = Form(None),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("candidate")),
):
    email = _get_current_user_email(current_user)
    user = _get_user_by_email(db, email)

    file_bytes = await resume.read()
    resume_text = extract_resume_text(resume.filename, file_bytes)

    if not resume_text.strip():
        raise HTTPException(
            status_code=400, detail="Resume text could not be extracted."
        )

    grad_date = None
    if expected_graduation:
        try:
            grad_date = date.fromisoformat(expected_graduation)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="expected_graduation must be ISO format (YYYY-MM-DD)",
            )

    skills = extract_skills(resume_text)

    student = db.query(Student).filter(Student.email == email).first()

    if student:
        student.full_name = sanitize_resume_text(full_name)
        student.university = sanitize_resume_text(university) if university else None
        student.course = sanitize_resume_text(course) if course else None
        student.year_of_study = year_of_study
        student.expected_graduation = grad_date
        student.phone = sanitize_resume_text(phone) if phone else None
        student.preferred_location = (
            sanitize_resume_text(preferred_location) if preferred_location else None
        )
        student.preferred_duration_weeks = preferred_duration_weeks
        student.summary = sanitize_resume_text(summary) if summary else None
        student.resume_text = resume_text
        student.skills_text = ", ".join(skills)
        student.original_filename = (
            sanitize_resume_text(resume.filename) if resume.filename else None
        )
    else:
        student = Student(
            user_id=user.id,
            full_name=sanitize_resume_text(full_name),
            email=email,
            university=sanitize_resume_text(university) if university else None,
            course=sanitize_resume_text(course) if course else None,
            year_of_study=year_of_study,
            expected_graduation=grad_date,
            phone=sanitize_resume_text(phone) if phone else None,
            preferred_location=(
                sanitize_resume_text(preferred_location) if preferred_location else None
            ),
            preferred_duration_weeks=preferred_duration_weeks,
            summary=sanitize_resume_text(summary) if summary else None,
            resume_text=resume_text,
            skills_text=", ".join(skills),
            original_filename=(
                sanitize_resume_text(resume.filename) if resume.filename else None
            ),
        )
        db.add(student)

    db.commit()
    db.refresh(student)
    return _student_to_dict(student)


@app.post("/attachments/{attachment_id}/apply", response_model=ApplicationRead)
def apply_to_attachment(
    attachment_id: int,
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("candidate")),
):
    student = _get_current_student(db, current_user)

    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if att.status != "open":
        raise HTTPException(
            status_code=400,
            detail=f"Attachment is not open for applications (status: {att.status})",
        )

    existing = (
        db.query(Application)
        .filter(
            Application.student_id == student.id,
            Application.attachment_id == attachment_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already applied to this attachment",
        )

    app_obj = Application(
        student_id=student.id,
        attachment_id=attachment_id,
        cover_letter=payload.cover_letter,
        status="pending",
    )
    db.add(app_obj)
    db.commit()
    db.refresh(app_obj)

    return _application_to_dict(app_obj)


@app.get("/students/me/applications", response_model=List[ApplicationRead])
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("candidate")),
):
    student = _get_current_student(db, current_user)
    rows = (
        db.query(Application)
        .filter(Application.student_id == student.id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return [_application_to_dict(a) for a in rows]


@app.delete("/applications/{application_id}")
def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("candidate")),
):
    student = _get_current_student(db, current_user)
    app_obj = (
        db.query(Application)
        .filter(
            Application.id == application_id,
            Application.student_id == student.id,
        )
        .first()
    )
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")

    if app_obj.status == "accepted":
        raise HTTPException(
            status_code=400,
            detail="Cannot withdraw an accepted application. Contact the company.",
        )

    db.delete(app_obj)
    db.commit()
    return {"message": "Application withdrawn", "id": application_id}


# ===========================================================================
# STEP 4 — Company views applicants & updates their status
# ===========================================================================


@app.get(
    "/my-attachments/{attachment_id}/applicants",
    response_model=List[ApplicantRead],
)
def list_applicants(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    company = _get_current_company(db, current_user)

    att = (
        db.query(Attachment)
        .filter(
            Attachment.id == attachment_id,
            Attachment.company_id == company.id,
        )
        .first()
    )
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    rows = (
        db.query(Application)
        .filter(Application.attachment_id == attachment_id)
        .order_by(Application.applied_at.desc())
        .all()
    )

    out: List[dict] = []
    for app_obj in rows:
        student = app_obj.student
        if not student:
            continue
        out.append(
            {
                "application_id": app_obj.id,
                "status": app_obj.status,
                "applied_at": app_obj.applied_at,
                "student_id": student.id,
                "full_name": student.full_name,
                "email": student.email,
                "phone": student.phone,
                "university": student.university,
                "course": student.course,
                "year_of_study": student.year_of_study,
                "summary": student.summary,
                "skills": _text_to_skills(student.skills_text),
                "cover_letter": app_obj.cover_letter,
                "company_notes": app_obj.company_notes,
            }
        )
    return out


@app.patch("/applications/{application_id}/status", response_model=ApplicationRead)
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("employer")),
):
    company = _get_current_company(db, current_user)

    app_obj = (
        db.query(Application)
        .join(Attachment, Attachment.id == Application.attachment_id)
        .filter(
            Application.id == application_id,
            Attachment.company_id == company.id,
        )
        .first()
    )
    if not app_obj:
        raise HTTPException(
            status_code=404,
            detail="Application not found or does not belong to your company",
        )

    app_obj.status = payload.status
    if payload.company_notes is not None:
        app_obj.company_notes = payload.company_notes

    db.commit()
    db.refresh(app_obj)
    return _application_to_dict(app_obj)


# ===========================================================================
# STEP 9 — Bulk CSV import for students
# ===========================================================================


@app.post("/admin/upload-students-csv")
async def admin_upload_students_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin")),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="ignore")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no header row")

    def pick(row: dict, *names: str) -> str:
        normalized = {
            (k or "").strip().lower(): (v or "").strip() for k, v in row.items()
        }
        for n in names:
            if n in normalized and normalized[n]:
                return normalized[n]
        return ""

    saved = 0
    skipped = 0
    errors: List[Dict] = []

    for idx, row in enumerate(reader, start=2):
        full_name = pick(row, "full_name", "name")
        email = pick(row, "email", "email_address")
        resume_text = pick(row, "resume_text", "resume", "cv", "bio", "description")

        if not full_name or not email or not resume_text:
            skipped += 1
            errors.append(
                {
                    "row": idx,
                    "reason": "Missing required field (full_name, email, or resume_text)",
                }
            )
            continue

        email_l = email.strip().lower()
        student = db.query(Student).filter(Student.email == email_l).first()

        data = {
            "full_name": sanitize_resume_text(full_name),
            "email": email_l,
            "phone": pick(row, "phone", "phone_number") or None,
            "university": pick(row, "university", "school") or None,
            "course": pick(row, "course", "program", "degree") or None,
            "year_of_study": None,
            "summary": pick(row, "summary", "headline", "title") or None,
            "resume_text": sanitize_resume_text(resume_text),
            "original_filename": file.filename,
        }

        yos = pick(row, "year_of_study", "year")
        if yos:
            try:
                data["year_of_study"] = int(yos)
            except ValueError:
                pass

        pdl = pick(row, "preferred_duration_weeks", "duration_weeks")
        if pdl:
            try:
                data["preferred_duration_weeks"] = int(pdl)
            except ValueError:
                pass

        data["preferred_location"] = pick(row, "preferred_location", "location") or None
        data["skills_text"] = None  # will compute below

        try:
            if student:
                for k, v in data.items():
                    if k == "email":
                        continue
                    setattr(student, k, v)
                target = student
            else:
                target = Student(**data)
                db.add(target)

            db.flush()

            # Compute skills from resume text
            skills = extract_skills(target.resume_text)
            target.skills_text = ", ".join(skills)

            db.commit()
            saved += 1
        except Exception as e:
            db.rollback()
            errors.append({"row": idx, "reason": str(e)})

    return {
        "message": "Student CSV import complete",
        "filename": file.filename,
        "saved": saved,
        "skipped": skipped,
        "errors_count": len(errors),
        "errors": errors[:20],
    }


@app.get("/admin/students")
def admin_list_students(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin")),
):
    rows = db.query(Student).order_by(Student.created_at.desc()).limit(limit).all()
    return {
        "count": len(rows),
        "students": [_student_to_dict(s) for s in rows],
    }


# ===========================================================================
# Live web discovery of attachments
# ===========================================================================


@app.post("/attachments/discover", response_model=AttachmentDiscoveryResponse)
def discover_attachments_endpoint(
    payload: AttachmentDiscoveryRequest,
    current_user: dict = Depends(require_roles("candidate", "employer", "admin")),
):
    try:
        data = discover_attachments(
            query=payload.query,
            location=payload.location,
            max_results=payload.max_results,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return AttachmentDiscoveryResponse(
        query=data["query"],
        location=data.get("location"),
        results=[DiscoveredAttachment(**r) for r in data["results"]],
        total_searched=data["total_searched"],
        filtered_out=data["filtered_out"],
        cached=data.get("cached", False),
        cache_age_seconds=data.get("cache_age_seconds", 0),
    )


@app.post("/admin/clear-discovery-cache")
def admin_clear_discovery_cache(
    current_user: dict = Depends(require_roles("admin")),
):
    n = clear_cache()
    return {"message": f"Cleared {n} cache entries", "removed": n}
