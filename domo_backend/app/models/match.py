from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship, Column, Enum as SQLEnum
from sqlalchemy import JSON
import enum

if TYPE_CHECKING:
    from .user import User
    from .workspace import Workspace


# ============================================
# Enum 정의
# ============================================

class JeonbukRegion(str, enum.Enum):
    all = "all"
    jeonju = "jeonju"
    iksan = "iksan"
    gunsan = "gunsan"
    wanju = "wanju"
    jeongeup = "jeongeup"
    namwon = "namwon"
    gimje = "gimje"
    online = "online"


class RecruitmentCategory(str, enum.Enum):
    side_project = "side_project"
    hackathon = "hackathon"
    study = "study"
    mentoring = "mentoring"


class RecruitmentStatus(str, enum.Enum):
    recruiting = "recruiting"
    closing_soon = "closing_soon"
    closed = "closed"


class RecruitmentPosition(str, enum.Enum):
    frontend = "frontend"
    backend = "backend"
    fullstack = "fullstack"
    designer = "designer"
    planner = "planner"
    pm = "pm"
    mobile = "mobile"
    devops = "devops"
    ai_ml = "ai_ml"
    other = "other"


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


# ============================================
# Association Tables (Many-to-Many)
# ============================================

class RecruitmentTechStack(SQLModel, table=True):
    """모집 공고 - 기술 스택 연결 테이블"""
    __tablename__ = "recruitment_tech_stacks"

    recruitment_id: int = Field(foreign_key="recruitments.id", primary_key=True, ondelete="CASCADE")
    tech_stack_id: int = Field(foreign_key="tech_stacks.id", primary_key=True, ondelete="CASCADE")


# ============================================
# Models
# ============================================

class TechStack(SQLModel, table=True):
    """기술 스택 테이블"""
    __tablename__ = "tech_stacks"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, index=True)
    color: Optional[str] = Field(default=None, max_length=20)  # hex color code

    # Relationships
    recruitments: List["Recruitment"] = Relationship(
        back_populates="tech_stacks",
        link_model=RecruitmentTechStack
    )


class PositionSlot(SQLModel, table=True):
    """모집 포지션 슬롯 테이블"""
    __tablename__ = "position_slots"

    id: Optional[int] = Field(default=None, primary_key=True)
    recruitment_id: int = Field(foreign_key="recruitments.id", ondelete="CASCADE")
    position: RecruitmentPosition = Field(sa_column=Column(SQLEnum(RecruitmentPosition), nullable=False))
    total: int = Field(default=1)
    filled: int = Field(default=0)

    # Relationships
    recruitment: Optional["Recruitment"] = Relationship(back_populates="position_slots")


class Recruitment(SQLModel, table=True):
    """모집 공고 테이블"""
    __tablename__ = "recruitments"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    title: str = Field(max_length=200)
    description: str
    category: RecruitmentCategory = Field(sa_column=Column(SQLEnum(RecruitmentCategory), nullable=False, index=True))
    region: JeonbukRegion = Field(sa_column=Column(SQLEnum(JeonbukRegion), nullable=False, index=True))
    status: RecruitmentStatus = Field(
        sa_column=Column(SQLEnum(RecruitmentStatus), nullable=False, index=True, default=RecruitmentStatus.recruiting)
    )

    # 일정
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    deadline: Optional[datetime] = Field(default=None, index=True)

    # 연락처 / 참고 링크
    contact_info: Optional[str] = Field(default=None, max_length=255)
    reference_url: Optional[str] = Field(default=None, max_length=500)

    # 메타
    view_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # 워크스페이스 연동
    workspace_id: Optional[int] = Field(default=None, foreign_key="workspaces.id")

    # Relationships
    user: Optional["User"] = Relationship(back_populates="recruitments")
    tech_stacks: List["TechStack"] = Relationship(
        back_populates="recruitments",
        link_model=RecruitmentTechStack
    )
    position_slots: List["PositionSlot"] = Relationship(
        back_populates="recruitment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    applications: List["Application"] = Relationship(
        back_populates="recruitment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    workspace: Optional["Workspace"] = Relationship()


class Application(SQLModel, table=True):
    """지원서 테이블"""
    __tablename__ = "applications"

    id: Optional[int] = Field(default=None, primary_key=True)
    recruitment_id: int = Field(foreign_key="recruitments.id", ondelete="CASCADE")
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    position: RecruitmentPosition = Field(sa_column=Column(SQLEnum(RecruitmentPosition), nullable=False))
    status: ApplicationStatus = Field(
        sa_column=Column(SQLEnum(ApplicationStatus), nullable=False, index=True, default=ApplicationStatus.pending)
    )

    # 지원 정보
    introduction: str
    portfolio_url: Optional[str] = Field(default=None, max_length=500)

    # 메타
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    recruitment: Optional["Recruitment"] = Relationship(back_populates="applications")
    user: Optional["User"] = Relationship(back_populates="applications")


class Seminar(SQLModel, table=True):
    """세미나/원데이 클래스 테이블"""
    __tablename__ = "seminars"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    title: str = Field(max_length=200)
    description: str
    region: JeonbukRegion = Field(sa_column=Column(SQLEnum(JeonbukRegion), nullable=False, index=True))
    date: datetime
    time: str = Field(max_length=20)  # "14:00 - 16:00"
    location: Optional[str] = Field(default=None, max_length=255)
    max_participants: int = Field(default=20)
    current_participants: int = Field(default=0)
    tech_stacks_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="seminars")
