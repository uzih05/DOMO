# DOMO 프로젝트 Docker 배포 가이드

## 프로젝트 개요

DOMO는 전북 지역 대학생 협업 플랫폼이다. FastAPI 백엔드 + Next.js 프론트엔드로 구성되며, Domo-Match(팀 빌딩/프로젝트 매칭) 기능이 포함되어 있다. 카카오 클라우드에 Docker Compose로 배포한다.

---

## 최종 디렉토리 구조

```
domo-deploy/
├── docker-compose.yml
├── .env                          # 환경변수 (git에 포함하지 않음)
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .dockerignore
│   └── app/
│       ├── __init__.py
│       ├── main.py               # ← 수정 필요 (create_db_and_tables 호출 확인됨, 정상)
│       ├── database.py           # ← 수정 필요 (DATABASE_URL 환경변수화)
│       ├── schemas.py
│       ├── schemas_match.py      # ← 신규 (Domo-Match)
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── workspace.py
│       │   ├── board.py
│       │   ├── post.py
│       │   ├── community.py
│       │   ├── activity.py
│       │   ├── chat.py
│       │   ├── file.py
│       │   ├── invitation.py
│       │   ├── schedule.py
│       │   ├── session.py
│       │   ├── verification.py
│       │   └── match.py          # ← 신규 (Domo-Match)
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── auth.py           # ← 수정 필요 (이메일 인증 스킵, 도메인 제한 제거)
│       │   ├── workspace.py
│       │   ├── board.py
│       │   ├── post.py
│       │   ├── community.py
│       │   ├── activity.py
│       │   ├── chat.py
│       │   ├── file.py
│       │   ├── schedule.py
│       │   ├── user.py
│       │   ├── voice.py
│       │   └── match.py          # ← 신규 (Domo-Match)
│       ├── services/
│       │   ├── __init__.py
│       │   └── auth_service.py
│       └── utils/
│           ├── __init__.py
│           ├── connection_manager.py
│           ├── email.py
│           └── logger.py
│
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── postcss.config.mjs
    ├── .env.local                # ← 빌드 시 주입 (NEXT_PUBLIC_API_URL)
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   └── globals.css
        ├── containers/
        │   ├── hooks/
        │   └── screens/
        │       └── BoardScreen.tsx   # ← 수정됨 (Match 메뉴 추가)
        ├── models/
        │   ├── api/
        │   │   ├── config.ts
        │   │   ├── index.ts          # ← 수정됨 (match export 추가)
        │   │   ├── auth.ts
        │   │   ├── workspace.ts
        │   │   ├── board.ts
        │   │   ├── post.ts
        │   │   └── match.ts          # ← 신규 (Domo-Match)
        │   ├── types/
        │   │   └── index.ts          # ← 수정됨 (Match 타입 추가)
        │   └── constants/
        ├── views/
        │   ├── board/
        │   ├── calendar/
        │   ├── community/
        │   ├── common/
        │   ├── dock/
        │   ├── match/                # ← 신규 디렉토리 (Domo-Match UI)
        │   │   ├── index.ts
        │   │   ├── MatchBoard.tsx
        │   │   ├── MatchListView.tsx
        │   │   ├── MatchDetailView.tsx
        │   │   ├── MatchCreateModal.tsx
        │   │   ├── MatchApplyModal.tsx
        │   │   └── MatchApplicationsView.tsx
        │   ├── profile/
        │   ├── task/
        │   ├── timeline/
        │   └── voice/
        └── lib/
            └── contexts/
                └── UserContext.tsx
```

---

## 작업 순서

### 1단계: 루트 구조 생성

`domo-deploy/` 디렉토리를 생성하고, 기존 백엔드 소스를 `backend/app/`에, 프론트엔드 소스를 `frontend/`에 배치한다.

### 2단계: 백엔드 수정 사항 (3개 파일)

#### 2-1. `backend/app/database.py` 수정

DATABASE_URL을 환경변수에서 읽도록 변경한다.

**현재 코드:**
```python
DATABASE_URL = "postgresql://user:password@db:5432/project_db"
```

**변경할 코드:**
```python
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/project_db")
```

나머지(`engine`, `get_db`, `create_db_and_tables`)는 그대로 유지한다.

#### 2-2. `backend/app/routers/auth.py` 수정

signup 함수에서 이메일 인증 로직을 제거하고, 도메인 제한을 해제한다.

**변경 포인트 3곳:**

(A) `@jj.ac.kr` 도메인 체크 제거:
```python
# 삭제할 부분 (약 98~100행):
if not user_data.email.endswith("@jj.ac.kr"):
    raise HTTPException(status_code=400, detail="전주대학교 이메일(@jj.ac.kr)만 사용 가능합니다.")
```

(B) `is_student_verified=False`를 `True`로 변경 (약 108행):
```python
# 변경 전
is_student_verified=False

# 변경 후
is_student_verified=True
```

(C) 인증 코드 생성/저장/이메일 발송 로직 제거 (약 114~121행):
```python
# 삭제할 부분:
code = generate_code()
verification = EmailVerification(email=user_data.email, code=code)
db.merge(verification)
db.commit()
background_tasks.add_task(send_verification_email, user_data.email, code)
```

(D) login 함수의 인증 체크 제거 (약 158~159행):
```python
# 삭제할 부분:
if not user.is_student_verified:
    raise HTTPException(status_code=403, detail="이메일 인증이 완료되지 않았습니다. 메일을 확인해주세요.")
```

#### 2-3. `backend/app/main.py` 확인

이미 Domo-Match router가 등록되어 있으므로 추가 수정 불필요. 다음 두 줄이 존재하는지 확인만 한다:

```python
from app.routers import auth, workspace, board, schedule, file, activity, user, voice, chat, post, community, match
```

```python
app.include_router(match.router, prefix="/api")
```

`lifespan` 함수 내에서 `create_db_and_tables()`가 호출되므로, 서버 시작 시 Match 테이블 4개(`match_projects`, `match_positions`, `match_applications`, `match_project_tech_tags`)가 자동 생성된다.

### 3단계: 백엔드 신규 파일 배치 (3개 파일)

아래 3개 파일은 이미 제공된 zip(`domo-match-backend.zip`)에 포함되어 있다. `backend/app/` 아래에 배치한다.

- `backend/app/models/match.py` — MatchProject, MatchPosition, MatchApplication, MatchProjectTechTag 모델
- `backend/app/schemas_match.py` — Match 전용 Pydantic schemas
- `backend/app/routers/match.py` — 12개 API endpoint

### 4단계: 백엔드 Docker 파일 생성

#### 4-1. `backend/requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlmodel==0.0.22
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-multipart==0.0.9
fastapi-mail==1.4.1
pydantic[email]==2.9.2
aiofiles==24.1.0
```

> vectorwave는 선택적 의존성이다. Weaviate 없이 배포할 경우 설치하지 않아도 서버는 정상 기동한다. main.py에서 `try/except ImportError`로 처리되어 있다.

#### 4-2. `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# 시스템 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# 파이썬 의존성
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 복사
COPY app/ /app/app/

# 업로드 디렉토리 생성
RUN mkdir -p /app/uploads

# 포트
EXPOSE 8000

# 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 4-3. `backend/.dockerignore`

```
__pycache__
*.pyc
.git
.env
__MACOSX
.DS_Store
```

### 5단계: 프론트엔드 수정 사항

#### 5-1. `.env.local` 확인

```env
# 카카오 클라우드 배포 시 백엔드 주소로 변경
# /api를 포함하지 않는다. next.config.ts의 rewrite에서 /api를 추가한다.
NEXT_PUBLIC_API_URL=https://api.61.109.214.163.nip.io
```

> 카카오 클라우드 배포용 백엔드 주소가 설정되어 있다.

#### 5-2. `next.config.ts` 확인

현재 설정이 정상이다. 수정 불필요:

```typescript
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.61.109.214.163.nip.io';

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${API_URL}/api/:path*`,
            },
        ];
    },
};
```

> 주의: `.env.local`의 `NEXT_PUBLIC_API_URL`에 `/api`를 포함하면 `/api/api/...`로 중복된다. base URL만 설정할 것.

#### 5-3. 프론트엔드 신규/수정 파일 배치

이미 제공된 zip(`domo-match-frontend.zip`)의 파일들을 `frontend/` 아래에 배치한다:

**신규 파일 (7개):**
- `src/models/api/match.ts`
- `src/views/match/index.ts`
- `src/views/match/MatchBoard.tsx`
- `src/views/match/MatchListView.tsx`
- `src/views/match/MatchDetailView.tsx`
- `src/views/match/MatchCreateModal.tsx`
- `src/views/match/MatchApplyModal.tsx`
- `src/views/match/MatchApplicationsView.tsx`

**수정 파일 (3개):**
- `src/models/types/index.ts` — ViewMode에 `'match'` 추가, Match 타입 정의 추가
- `src/models/api/index.ts` — match API re-export 추가
- `src/containers/screens/BoardScreen.tsx` — MatchBoard import, sidebar 메뉴, 렌더링 분기 추가

### 6단계: 프론트엔드 Docker 파일 생성

#### 6-1. `frontend/Dockerfile`

```dockerfile
FROM node:22-alpine AS base

# --- 의존성 설치 ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- 빌드 ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시 환경변수 주입
ARG NEXT_PUBLIC_API_URL=https://api.61.109.214.163.nip.io
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# --- 프로덕션 ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# public 폴더가 있는 경우에만 복사 (없으면 빈 폴더 생성)
RUN mkdir -p ./public
COPY --from=builder /app/public* ./public/
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### 6-2. `next.config.ts`에 standalone output 추가

프론트엔드 Docker 빌드를 위해 `next.config.ts`에 `output: 'standalone'`을 추가해야 한다:

```typescript
const nextConfig: NextConfig = {
    output: 'standalone',       // ← 이 줄 추가
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${API_URL}/api/:path*`,
            },
        ];
    },
};
```

#### 6-3. `frontend/.dockerignore`

```
node_modules
.next
.git
.DS_Store
__MACOSX
```

### 7단계: Docker Compose 생성

#### `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: ${DB_NAME:-project_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-user} -d ${DB_NAME:-project_db}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${DB_USER:-user}:${DB_PASSWORD:-password}@db:5432/${DB_NAME:-project_db}
    ports:
      - "9000:8000"
    volumes:
      - uploads_data:/app/uploads

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: https://api.61.109.214.163.nip.io
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "3000:3000"
    environment:
      API_URL: https://api.61.109.214.163.nip.io

volumes:
  postgres_data:
  uploads_data:
```

#### `.env` (루트)

```env
DB_USER=user
DB_PASSWORD=password
DB_NAME=project_db
```

> 카카오 클라우드 배포 시 실제 DB 비밀번호로 변경할 것.

### 8단계: 빌드 및 실행

```bash
cd domo-deploy

# 빌드
docker compose build

# 실행
docker compose up -d

# 로그 확인
docker compose logs -f backend
docker compose logs -f frontend
```

정상 기동 시:
- 프론트엔드: `https://61.109.214.226.nip.io`
- 백엔드 API: `https://api.61.109.214.163.nip.io/api/...`
- 백엔드 헬스: `https://api.61.109.214.163.nip.io/` → `{"status": "Healthy"}`

### 9단계: 검증 체크리스트

```bash
# 1. DB 테이블 생성 확인
docker compose exec db psql -U user -d project_db -c "\dt"
# match_projects, match_positions, match_applications, match_project_tech_tags 테이블 존재 확인

# 2. 백엔드 API 확인
curl https://api.61.109.214.163.nip.io/api/match/projects
# [] 빈 배열 반환 확인

# 3. 회원가입 테스트 (이메일 인증 스킵 확인)
curl -X POST https://api.61.109.214.163.nip.io/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"1234","name":"테스트"}'
# is_student_verified: true 확인

# 4. 프론트엔드 접속
# https://61.109.214.226.nip.io 접속 후 좌측 사이드바에 Match 메뉴 확인
```

---

## 주의사항

1. **`/api` 중복 금지**: `.env.local`의 `NEXT_PUBLIC_API_URL`에 `/api`를 포함하지 않는다. `next.config.ts`의 rewrite에서 자동 추가된다.

2. **vectorwave 없이 배포 가능**: `main.py`에서 `try/except ImportError`로 처리되어 있으므로, Weaviate 컨테이너 없이도 서버가 정상 기동한다. AI 검색 기능만 비활성화된다.

3. **CORS**: `main.py`의 CORS 설정을 프론트엔드 도메인만 허용하도록 변경해야 한다:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://61.109.214.226.nip.io",
        "http://localhost:3000",  # 로컬 개발용
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

4. **세션 쿠키**: 백엔드가 cookie-based session을 사용한다. 프론트엔드와 백엔드의 도메인이 다르면 `SameSite`, `Secure` 설정을 확인해야 한다. 같은 도메인 아래에서 Nginx reverse proxy를 구성하는 것을 권장한다.

5. **파일 업로드**: `backend/app/main.py`에서 `/app/uploads` 디렉토리를 static mount한다. Docker volume(`uploads_data`)으로 영속화되어 있다.

6. **Match 테이블 자동 생성**: `main.py`의 `lifespan` 함수에서 `create_db_and_tables()`를 호출하므로, 서버 최초 기동 시 모든 SQLModel 테이블이 자동 생성된다. Alembic migration은 사용하지 않는다.

---

## 카카오 클라우드 배포 정보

| 구분 | 역할 | 접속 주소 (Domain) | 내부 포트 |
|------|------|-------------------|----------|
| 백엔드 (API) | 데이터 및 로직 | https://api.61.109.214.163.nip.io | 9000 |
| 프론트엔드 (Web) | 사용자 화면 | https://61.109.214.226.nip.io | 3000 |