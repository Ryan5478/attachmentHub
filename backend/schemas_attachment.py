from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Attachments (posted by companies)
# ---------------------------------------------------------------------------
class AttachmentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=20)
    location: Optional[str] = None
    duration_weeks: Optional[int] = Field(default=None, ge=1, le=104)
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    required_course: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    stipend: Optional[str] = None
    positions_available: int = Field(default=1, ge=1, le=500)
    credit_offered: bool = False


class AttachmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    duration_weeks: Optional[int] = Field(default=None, ge=1, le=104)
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    required_course: Optional[str] = None
    required_skills: Optional[List[str]] = None
    stipend: Optional[str] = None
    positions_available: Optional[int] = Field(default=None, ge=1, le=500)
    credit_offered: Optional[bool] = None
    status: Optional[str] = None  # open | closed | filled


class AttachmentRead(BaseModel):
    id: int
    company_id: int
    company_name: Optional[str] = None
    company_location: Optional[str] = None
    title: str
    description: str
    location: Optional[str] = None
    duration_weeks: Optional[int] = None
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    required_course: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    stipend: Optional[str] = None
    positions_available: int = 1
    credit_offered: bool = False
    status: str = "open"
    posted_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|shortlisted|accepted|rejected)$")
    company_notes: Optional[str] = None


class ApplicationRead(BaseModel):
    id: int
    student_id: int
    attachment_id: int
    status: str
    cover_letter: Optional[str] = None
    applied_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Denormalized for convenience
    attachment_title: Optional[str] = None
    company_name: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_university: Optional[str] = None


class ApplicantRead(BaseModel):
    """A student who applied, enriched with their profile for company view."""

    application_id: int
    status: str
    applied_at: Optional[datetime] = None
    student_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = None
    summary: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    cover_letter: Optional[str] = None
    company_notes: Optional[str] = None
