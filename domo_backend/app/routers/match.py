from fastapi import APIRouter, Depends, HTTPException, Query, Cookie
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime, timedelta
import secrets

from app.database import get_db
from app.models.user import User
from app.models.session import UserSession
from app.models.workspace import Workspace, WorkspaceMember
from app.models.invitation import Invitation
from app.models.match import (
    Recruitment, Application, Seminar, TechStack, PositionSlot,
    RecruitmentTechStack, RecruitmentStatus, ApplicationStatus,
    RecruitmentCategory, JeonbukRegion, RecruitmentPosition
)
from app.schemas import (
    RecruitmentCreate, RecruitmentUpdate, RecruitmentResponse, RecruitmentStatusUpdate,
    ApplicationCreate, ApplicationResponse, ApplicationStatusUpdate,
    SeminarCreate, SeminarResponse, TechStackResponse, PositionSlotResponse, UserBrief
)

router = APIRouter(prefix="/match", tags=["Match"])


# ============================================
# 인증 의존성 함수
# ============================================

def get_current_user_id(session_id: str = Cookie(None), db: Session = Depends(get_db)):
    if not session_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    session = db.get(UserSession, session_id)
    if not session or session.expires_at < datetime.now():
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다.")

    user = db.get(User, session.user_id)
    if user:
        user.last_active_at = datetime.now()
        db.add(user)
        db.commit()

    return session.user_id


# ============================================
# 헬퍼 함수
# ============================================

def recruitment_to_response(recruitment: Recruitment, db: Session) -> dict:
    """Recruitment 모델을 응답 형식으로 변환"""
    user = db.get(User, recruitment.user_id)
    return {
        "id": recruitment.id,
        "user_id": recruitment.user_id,
        "title": recruitment.title,
        "description": recruitment.description,
        "category": recruitment.category,
        "region": recruitment.region,
        "status": recruitment.status,
        "tech_stacks": [{"id": ts.id, "name": ts.name, "color": ts.color} for ts in recruitment.tech_stacks],
        "position_slots": [{"position": ps.position, "total": ps.total, "filled": ps.filled} for ps in recruitment.position_slots],
        "start_date": recruitment.start_date,
        "end_date": recruitment.end_date,
        "deadline": recruitment.deadline,
        "contact_info": recruitment.contact_info,
        "reference_url": recruitment.reference_url,
        "view_count": recruitment.view_count,
        "created_at": recruitment.created_at,
        "updated_at": recruitment.updated_at,
        "user_name": user.name if user else None,
        "workspace_id": recruitment.workspace_id
    }


def application_to_response(application: Application, db: Session) -> dict:
    """Application 모델을 응답 형식으로 변환"""
    user = db.get(User, application.user_id)
    return {
        "id": application.id,
        "recruitment_id": application.recruitment_id,
        "user_id": application.user_id,
        "position": application.position,
        "status": application.status,
        "introduction": application.introduction,
        "portfolio_url": application.portfolio_url,
        "created_at": application.created_at,
        "updated_at": application.updated_at,
        "user_name": user.name if user else None,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "profile_image": user.profile_image
        } if user else None
    }


# ============================================
# 모집 공고 API
# ============================================

@router.get("/recruitments", response_model=List[RecruitmentResponse])
def get_recruitments(
    region: Optional[str] = None,
    category: Optional[str] = None,
    position: Optional[str] = None,
    status: Optional[str] = None,
    tech_stack: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """모집 공고 목록 조회"""
    query = select(Recruitment)

    # 필터링
    if region and region != "all":
        query = query.where(Recruitment.region == region)
    if category:
        query = query.where(Recruitment.category == category)
    if status:
        query = query.where(Recruitment.status == status)
    if search:
        query = query.where(
            (Recruitment.title.ilike(f"%{search}%")) |
            (Recruitment.description.ilike(f"%{search}%"))
        )

    # 정렬 (최신순)
    query = query.order_by(Recruitment.created_at.desc())

    # 페이징
    offset = (page - 1) * limit
    recruitments = db.exec(query.offset(offset).limit(limit)).all()

    return [recruitment_to_response(r, db) for r in recruitments]


@router.get("/recruitments/me", response_model=List[RecruitmentResponse])
def get_my_recruitments(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """내 모집 공고 목록 조회"""
    recruitments = db.exec(
        select(Recruitment)
        .where(Recruitment.user_id == user_id)
        .order_by(Recruitment.created_at.desc())
    ).all()

    return [recruitment_to_response(r, db) for r in recruitments]


@router.get("/recruitments/{recruitment_id}", response_model=RecruitmentResponse)
def get_recruitment(
    recruitment_id: int,
    db: Session = Depends(get_db)
):
    """모집 공고 상세 조회"""
    recruitment = db.get(Recruitment, recruitment_id)

    if not recruitment:
        raise HTTPException(status_code=404, detail="모집글을 찾을 수 없습니다.")

    # 조회수 증가
    recruitment.view_count += 1
    db.add(recruitment)
    db.commit()
    db.refresh(recruitment)

    return recruitment_to_response(recruitment, db)


@router.post("/recruitments", response_model=RecruitmentResponse)
def create_recruitment(
    data: RecruitmentCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """모집 공고 생성"""
    # 기술 스택 처리 (없으면 생성)
    tech_stacks = []
    for stack_name in data.tech_stacks:
        stack = db.exec(select(TechStack).where(TechStack.name == stack_name)).first()
        if not stack:
            stack = TechStack(name=stack_name)
            db.add(stack)
            db.flush()
        tech_stacks.append(stack)

    # 모집 공고 생성
    recruitment = Recruitment(
        user_id=user_id,
        title=data.title,
        description=data.description,
        category=data.category,
        region=data.region,
        start_date=data.start_date,
        end_date=data.end_date,
        deadline=data.deadline,
        contact_info=data.contact_info,
        reference_url=data.reference_url,
        status=RecruitmentStatus.recruiting
    )
    recruitment.tech_stacks = tech_stacks
    db.add(recruitment)
    db.flush()

    # 포지션 슬롯 생성
    for slot_data in data.position_slots:
        slot = PositionSlot(
            recruitment_id=recruitment.id,
            position=slot_data.position,
            total=slot_data.total,
            filled=0
        )
        db.add(slot)

    db.commit()
    db.refresh(recruitment)

    return recruitment_to_response(recruitment, db)


@router.put("/recruitments/{recruitment_id}", response_model=RecruitmentResponse)
def update_recruitment(
    recruitment_id: int,
    data: RecruitmentUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """모집 공고 수정"""
    recruitment = db.get(Recruitment, recruitment_id)

    if not recruitment:
        raise HTTPException(status_code=404, detail="모집글을 찾을 수 없습니다.")

    if recruitment.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    # 업데이트
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field not in ["tech_stacks", "position_slots"]:
            setattr(recruitment, field, value)

    recruitment.updated_at = datetime.now()
    db.add(recruitment)
    db.commit()
    db.refresh(recruitment)

    return recruitment_to_response(recruitment, db)


@router.delete("/recruitments/{recruitment_id}", status_code=204)
def delete_recruitment(
    recruitment_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """모집 공고 삭제"""
    recruitment = db.get(Recruitment, recruitment_id)

    if not recruitment:
        raise HTTPException(status_code=404, detail="모집글을 찾을 수 없습니다.")

    if recruitment.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    db.delete(recruitment)
    db.commit()


@router.patch("/recruitments/{recruitment_id}/status", response_model=RecruitmentResponse)
def update_recruitment_status(
    recruitment_id: int,
    data: RecruitmentStatusUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """모집 상태 변경"""
    recruitment = db.get(Recruitment, recruitment_id)

    if not recruitment:
        raise HTTPException(status_code=404, detail="모집글을 찾을 수 없습니다.")

    if recruitment.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    recruitment.status = data.status
    recruitment.updated_at = datetime.now()
    db.add(recruitment)
    db.commit()
    db.refresh(recruitment)

    return recruitment_to_response(recruitment, db)


@router.post("/recruitments/{recruitment_id}/create-workspace")
def create_workspace_from_recruitment(
    recruitment_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """워크스페이스 생성 및 연동"""
    recruitment = db.get(Recruitment, recruitment_id)

    if not recruitment:
        raise HTTPException(status_code=404, detail="모집글을 찾을 수 없습니다.")

    if recruitment.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    if recruitment.status != RecruitmentStatus.closed:
        raise HTTPException(status_code=400, detail="모집이 완료된 후에만 워크스페이스를 생성할 수 있습니다.")

    if recruitment.workspace_id:
        raise HTTPException(status_code=400, detail="이미 워크스페이스가 생성되었습니다.")

    # 워크스페이스 생성
    workspace = Workspace(
        name=recruitment.title,
        description=recruitment.description,
        owner_id=user_id
    )
    db.add(workspace)
    db.flush()

    # 모집 공고에 워크스페이스 연결
    recruitment.workspace_id = workspace.id

    # 생성자를 관리자로 추가
    owner_member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user_id,
        role="admin"
    )
    db.add(owner_member)

    # 수락된 지원자들 초대
    accepted_applications = db.exec(
        select(Application)
        .where(Application.recruitment_id == recruitment_id)
        .where(Application.status == ApplicationStatus.accepted)
    ).all()

    for app in accepted_applications:
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=app.user_id,
            role="member"
        )
        db.add(member)

    # 초대 링크 생성
    invite_token = secrets.token_urlsafe(32)
    invitation = Invitation(
        token=invite_token,
        workspace_id=workspace.id,
        inviter_id=user_id,
        role="member",
        expires_at=datetime.now() + timedelta(days=7)
    )
    db.add(invitation)

    db.commit()

    import os
    base_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    invite_link = f"{base_url}/invite/{invite_token}"

    return {
        "workspace_id": workspace.id,
        "invite_link": invite_link
    }


# ============================================
# 지원 API
# ============================================

@router.get("/recruitments/{recruitment_id}/applications", response_model=List[ApplicationResponse])
def get_applications(
    recruitment_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """모집 공고의 지원자 목록 조회"""
    recruitment = db.get(Recruitment, recruitment_id)

    if not recruitment:
        raise HTTPException(status_code=404, detail="모집글을 찾을 수 없습니다.")

    if recruitment.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    applications = db.exec(
        select(Application)
        .where(Application.recruitment_id == recruitment_id)
        .order_by(Application.created_at.desc())
    ).all()

    return [application_to_response(app, db) for app in applications]


@router.post("/recruitments/{recruitment_id}/apply", response_model=ApplicationResponse)
def create_application(
    recruitment_id: int,
    data: ApplicationCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """지원하기"""
    recruitment = db.get(Recruitment, recruitment_id)

    if not recruitment:
        raise HTTPException(status_code=404, detail="모집글을 찾을 수 없습니다.")

    if recruitment.status == RecruitmentStatus.closed:
        raise HTTPException(status_code=400, detail="모집이 마감되었습니다.")

    # 본인 모집글에 지원 불가
    if recruitment.user_id == user_id:
        raise HTTPException(status_code=400, detail="본인의 모집글에는 지원할 수 없습니다.")

    # 중복 지원 체크
    existing = db.exec(
        select(Application)
        .where(Application.recruitment_id == recruitment_id)
        .where(Application.user_id == user_id)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="이미 지원한 모집글입니다.")

    # 해당 포지션 빈자리 확인
    slot = None
    for s in recruitment.position_slots:
        if s.position == data.position and s.filled < s.total:
            slot = s
            break

    if not slot:
        raise HTTPException(status_code=400, detail="해당 포지션은 모집이 마감되었습니다.")

    # 지원서 생성
    application = Application(
        recruitment_id=recruitment_id,
        user_id=user_id,
        position=data.position,
        introduction=data.introduction,
        portfolio_url=data.portfolio_url,
        status=ApplicationStatus.pending
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return application_to_response(application, db)


@router.get("/applications/me", response_model=List[ApplicationResponse])
def get_my_applications(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """내 지원 목록 조회"""
    applications = db.exec(
        select(Application)
        .where(Application.user_id == user_id)
        .order_by(Application.created_at.desc())
    ).all()

    return [application_to_response(app, db) for app in applications]


@router.patch("/applications/{application_id}", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """지원 상태 변경 (수락/거절)"""
    application = db.get(Application, application_id)

    if not application:
        raise HTTPException(status_code=404, detail="지원서를 찾을 수 없습니다.")

    # 모집글 작성자만 상태 변경 가능
    recruitment = db.get(Recruitment, application.recruitment_id)
    if recruitment.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    old_status = application.status
    application.status = data.status
    application.updated_at = datetime.now()

    # 수락 시 filled 증가
    if data.status == ApplicationStatus.accepted and old_status == ApplicationStatus.pending:
        for slot in recruitment.position_slots:
            if slot.position == application.position:
                slot.filled += 1
                db.add(slot)
                break

        # 모든 슬롯이 다 채워졌는지 확인
        all_filled = all(s.filled >= s.total for s in recruitment.position_slots)
        if all_filled:
            recruitment.status = RecruitmentStatus.closed
            db.add(recruitment)

    db.add(application)
    db.commit()
    db.refresh(application)

    return application_to_response(application, db)


@router.delete("/applications/{application_id}", status_code=204)
def cancel_application(
    application_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """지원 취소"""
    application = db.get(Application, application_id)

    if not application:
        raise HTTPException(status_code=404, detail="지원서를 찾을 수 없습니다.")

    if application.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    if application.status != ApplicationStatus.pending:
        raise HTTPException(status_code=400, detail="대기 중인 지원만 취소할 수 있습니다.")

    db.delete(application)
    db.commit()


# ============================================
# 세미나 API
# ============================================

@router.get("/seminars", response_model=List[SeminarResponse])
def get_seminars(
    region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """세미나 목록 조회"""
    query = select(Seminar)

    if region and region != "all":
        query = query.where(Seminar.region == region)

    seminars = db.exec(query.order_by(Seminar.date.asc())).all()

    result = []
    for seminar in seminars:
        user = db.get(User, seminar.user_id)
        result.append({
            "id": seminar.id,
            "user_id": seminar.user_id,
            "title": seminar.title,
            "description": seminar.description,
            "region": seminar.region,
            "date": seminar.date,
            "time": seminar.time,
            "location": seminar.location,
            "max_participants": seminar.max_participants,
            "current_participants": seminar.current_participants,
            "tech_stacks": seminar.tech_stacks_json,
            "created_at": seminar.created_at,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "profile_image": user.profile_image
            } if user else None
        })

    return result


@router.get("/seminars/{seminar_id}", response_model=SeminarResponse)
def get_seminar(
    seminar_id: int,
    db: Session = Depends(get_db)
):
    """세미나 상세 조회"""
    seminar = db.get(Seminar, seminar_id)

    if not seminar:
        raise HTTPException(status_code=404, detail="세미나를 찾을 수 없습니다.")

    user = db.get(User, seminar.user_id)
    return {
        "id": seminar.id,
        "user_id": seminar.user_id,
        "title": seminar.title,
        "description": seminar.description,
        "region": seminar.region,
        "date": seminar.date,
        "time": seminar.time,
        "location": seminar.location,
        "max_participants": seminar.max_participants,
        "current_participants": seminar.current_participants,
        "tech_stacks": seminar.tech_stacks_json,
        "created_at": seminar.created_at,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "profile_image": user.profile_image
        } if user else None
    }


@router.post("/seminars", response_model=SeminarResponse)
def create_seminar(
    data: SeminarCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """세미나 생성"""
    seminar = Seminar(
        user_id=user_id,
        title=data.title,
        description=data.description,
        region=data.region,
        date=data.date,
        time=data.time,
        location=data.location,
        max_participants=data.max_participants,
        tech_stacks_json=data.tech_stacks
    )
    db.add(seminar)
    db.commit()
    db.refresh(seminar)

    user = db.get(User, user_id)
    return {
        "id": seminar.id,
        "user_id": seminar.user_id,
        "title": seminar.title,
        "description": seminar.description,
        "region": seminar.region,
        "date": seminar.date,
        "time": seminar.time,
        "location": seminar.location,
        "max_participants": seminar.max_participants,
        "current_participants": seminar.current_participants,
        "tech_stacks": seminar.tech_stacks_json,
        "created_at": seminar.created_at,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "profile_image": user.profile_image
        } if user else None
    }


@router.post("/seminars/{seminar_id}/join", status_code=200)
def join_seminar(
    seminar_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """세미나 참가 신청"""
    seminar = db.get(Seminar, seminar_id)

    if not seminar:
        raise HTTPException(status_code=404, detail="세미나를 찾을 수 없습니다.")

    if seminar.current_participants >= seminar.max_participants:
        raise HTTPException(status_code=400, detail="참가 인원이 마감되었습니다.")

    seminar.current_participants += 1
    db.add(seminar)
    db.commit()

    return {"message": "참가 신청이 완료되었습니다."}
