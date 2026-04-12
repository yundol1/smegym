# SME GYM

SME GYM은 소규모 운동 모임을 위한 출석 관리 웹앱입니다. 매일 운동 인증 사진을 업로드하고, 관리자가 승인/반려하며, 벌금과 면제 신청, 챌린지, 랭킹 등을 관리할 수 있습니다.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **UI**: React 19, Framer Motion, Lucide React
- **백엔드/DB**: Supabase (PostgreSQL, Auth, Storage)
- **상태관리**: Zustand
- **배포**: Vercel
- **E2E 테스트**: Playwright

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local.example`을 복사하여 `.env.local` 파일을 생성합니다.

```bash
cp .env.local.example .env.local
```

필수 환경 변수:

| 변수명 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명(anon) 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (비밀번호 재설정 등 서버 측 관리 작업에 사용) |
| `OPENAI_API_KEY` | OpenAI API 키 (AI 코치 기능) |

### 3. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 확인합니다.

## Supabase 설정

### Migration 적용 순서

Supabase CLI를 사용하여 마이그레이션을 순서대로 적용합니다.

```bash
supabase db push
```

마이그레이션 파일은 `supabase/migrations/` 디렉토리에 번호 순서로 정리되어 있습니다:

1. `001_initial_schema.sql` - 초기 스키마 (users, weeks, check_ins 등)
2. `002_security_fixes.sql` ~ `011_security_fixes_round10.sql` - 보안 패치

### Storage 버킷

- `workout-photos` 버킷이 필요합니다. Supabase 대시보드에서 생성하세요.

## Vercel 배포

### 필수 환경변수

Vercel 프로젝트 설정 > Environment Variables에 다음을 추가합니다:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

### 배포

Vercel에 GitHub 저장소를 연결하면 `main` 브랜치 push 시 자동 배포됩니다.

## E2E 테스트 실행 방법

### 로컬 테스트

```bash
# 개발 서버를 실행한 상태에서
npm run test:e2e

# UI 모드로 실행
npm run test:e2e:ui
```

### 프로덕션 대상 테스트

```bash
npm run test:e2e:prod
```

테스트 파일은 `e2e/tests/` 디렉토리에 있으며, `e2e/pages/`에 Page Object가 정의되어 있습니다.

## 주요 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run test:e2e` | E2E 테스트 실행 |
| `npm run test:e2e:ui` | E2E 테스트 (UI 모드) |
| `npm run test:e2e:prod` | 프로덕션 대상 E2E 테스트 |
