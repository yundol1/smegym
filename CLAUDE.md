@AGENTS.md

## 프로젝트 운영 가이드

### 로컬 실행

```bash
npm install
cp .env.local.example .env.local  # 환경 변수 설정 후
npm run dev
# http://localhost:3000 에서 확인
```

### Supabase migration 적용

```bash
# Supabase CLI 로그인
supabase login

# 로컬 DB에 마이그레이션 적용
supabase db push

# 마이그레이션 파일 위치: supabase/migrations/
# 001 ~ 012 순서로 적용됨
```

### 테스트 실행

```bash
# E2E 테스트 (개발 서버 실행 상태에서)
cp .env.test.example .env.test  # 테스트 계정 설정 후
npm run test:e2e

# UI 모드
npm run test:e2e:ui

# 프로덕션 대상
npm run test:e2e:prod

# 린트 검사
npm run lint
```

### 배포 체크리스트

1. `npm run lint` 통과 확인
2. `npm run build` 성공 확인
3. Vercel 환경 변수 설정 확인 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
4. Supabase 마이그레이션이 프로덕션 DB에 적용되었는지 확인
5. main 브랜치에 push하면 Vercel 자동 배포
