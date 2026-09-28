from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Students
# ---------------------------------------------------------------------------
class StudentCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    phone: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = Field(default=None, ge=1, le=10)
    expected_graduation: Optional[date] = None
    gpa: Optional[str] = None
    preferred_duration_weeks: Optional[int] = Field(default=None, ge=1, le=104)
    preferred_location: Optional[str] = None
    summary: Optional[str] = None
    resume_text: str = Field(..., min_length=20)


class StudentRead(BaseModel):
    id: int
    user_id: Optional[int] = None
    full_name: str
    email: str
    phone: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = None
    expected_graduation: Optional[date] = None
    gpa: Optional[str] = None
    preferred_duration_weeks: Optional[int] = None
    preferred_location: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    original_filename: Optional[str] = None
    resume_text: Optional[str] = None
    created_at: Optional[datetime] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = Field(default=None, ge=1, le=10)
    expected_graduation: Optional[date] = None
    gpa: Optional[str] = None
    preferred_duration_weeks: Optional[int] = Field(default=None, ge=1, le=104)
    preferred_location: Optional[str] = None
    summary: Optional[str] = None


# ---------------------------------------------------------------------------
# Companies
# ---------------------------------------------------------------------------
class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    industry: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None


class CompanyRead(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    verified: bool = False
    created_at: Optional[datetime] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Legacy compatibility — will be removed in Step 2
# ---------------------------------------------------------------------------
CandidateCreate = StudentCreate
CandidateRead = StudentRead


class JobRequest(BaseModel):
    job_title: str
    job_description: str
