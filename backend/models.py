from __future__ import annotations

from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db import Base


# ---------------------------------------------------------------------------
# Users (unchanged)
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ---------------------------------------------------------------------------
# Students (was: Candidate)
# ---------------------------------------------------------------------------
class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Identity
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Academic profile
    university: Mapped[str | None] = mapped_column(String(255), nullable=True)
    course: Mapped[str | None] = mapped_column(String(255), nullable=True)
    year_of_study: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_graduation: Mapped[date | None] = mapped_column(Date, nullable=True)
    gpa: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Preferences
    preferred_duration_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    preferred_location: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Resume content
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_text: Mapped[str] = mapped_column(Text, nullable=False)
    skills_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Embedding for semantic matching
    embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    applications: Mapped[list["Application"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Companies (was: Employer)
# ---------------------------------------------------------------------------
class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[str | None] = mapped_column(String(200), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Attachments (was: Job)
# ---------------------------------------------------------------------------
class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)

    required_course: Mapped[str | None] = mapped_column(String(255), nullable=True)
    required_skills: Mapped[str | None] = mapped_column(Text, nullable=True)

    stipend: Mapped[str | None] = mapped_column(String(100), nullable=True)
    positions_available: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    credit_offered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Open / closed / filled
    status: Mapped[str] = mapped_column(
        String(50), default="open", nullable=False, index=True
    )

    embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)

    posted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    company: Mapped["Company"] = relationship(back_populates="attachments")
    applications: Mapped[list["Application"]] = relationship(
        back_populates="attachment", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attachment_id: Mapped[int] = mapped_column(
        ForeignKey("attachments.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # pending | shortlisted | accepted | rejected
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False, index=True
    )

    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    student: Mapped["Student"] = relationship(back_populates="applications")
    attachment: Mapped["Attachment"] = relationship(back_populates="applications")


# ---------------------------------------------------------------------------
# Backwards-compatibility alias (temporary — removed in Step 2)
# Existing code imports `Candidate` and `upsert_candidate`. Keep the alias so
# nothing breaks while we migrate the endpoints one by one.
# ---------------------------------------------------------------------------
Candidate = Student
