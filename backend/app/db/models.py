from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Case(Base):
    __tablename__ = 'cases'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default='active', nullable=False)
    current_stage: Mapped[str] = mapped_column(String(50), default='D2', nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default='normal', nullable=False)
    d1_status: Mapped[str] = mapped_column(String(20), default='missing', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Message(Base):
    __tablename__ = 'messages'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey('cases.id'), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FactSnapshot(Base):
    __tablename__ = 'fact_snapshots'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey('cases.id'), nullable=False)
    facts_json: Mapped[str] = mapped_column(Text, nullable=False, default='[]')
    gaps_json: Mapped[str] = mapped_column(Text, nullable=False, default='[]')
    assumptions_json: Mapped[str] = mapped_column(Text, nullable=False, default='[]')
    risk_flags_json: Mapped[str] = mapped_column(Text, nullable=False, default='[]')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Draft(Base):
    __tablename__ = 'drafts'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey('cases.id'), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    draft_type: Mapped[str] = mapped_column(String(50), default='phase0', nullable=False)
    content_json: Mapped[str] = mapped_column(Text, nullable=False, default='{}')
    rendered_markdown: Mapped[str] = mapped_column(Text, nullable=False, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StageState(Base):
    __tablename__ = 'stage_states'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey('cases.id'), nullable=False)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    confirmed: Mapped[str] = mapped_column(String(10), nullable=False, default='false')
    content: Mapped[str] = mapped_column(Text, nullable=False, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CaseStage(Base):
    __tablename__ = 'case_stages'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey('cases.id'), nullable=False)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    working_content: Mapped[str] = mapped_column(Text, nullable=False, default='')
    confirmed_content: Mapped[str] = mapped_column(Text, nullable=False, default='')
    locked: Mapped[str] = mapped_column(String(10), nullable=False, default='false')
    impacted: Mapped[str] = mapped_column(String(10), nullable=False, default='false')
    impact_summary: Mapped[str] = mapped_column(Text, nullable=False, default='')
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
