# PRD: SME 운동관리 앱 마이그레이션

> **프로젝트명**: SME Gym App Migration
> **버전**: v1.0
> **작성일**: 2026-04-09
> **상태**: Draft
> **작성자**: Project Supervisor (Claude)

---

## 1. 프로젝트 개요

### 1.1 배경
SME(심심해서 만든 운동방)는 30명 규모의 운동 커뮤니티로, 기존에 Google Apps Script(GAS) + Google Sheets + Google Drive 기반의 웹앱으로 운영되어 왔다. GAS 백엔드 코드가 소실되어 서비스 복구 및 현대화가 필요한 상황이다.

### 1.2 목표
- 기존 GAS 앱의 **모든 기능을 손실 없이** Next.js + Supabase 스택으로 마이그레이션
- 기존 Google Sheets 데이터를 Supabase PostgreSQL로 이전
- 운영 안정성 및 유지보수성 향상

### 1.3 기술 스택
| 구분 | 기존 (AS-IS) | 신규 (TO-BE) |
|------|-------------|-------------|
| Frontend | GAS HtmlService (HTML/CSS/JS) | Next.js 16 + TypeScript + Framer Motion |
| Backend | Google Apps Script | Next.js API Routes (App Router) |
| Database | Google Sheets | Supabase PostgreSQL |
| Auth | 자체 구현 (SHA-256) | Supabase Auth |
| File Storage | Google Drive | Supabase Storage (사진) |
| Hosting | GAS Web App | Vercel |
| AI | OpenAI API (GAS에서 호출) | OpenAI API (API Route에서 호출) |

### 1.4 제약 사항
- Supabase Free Tier 범위 내 운영 (DB 500MB, Storage 1GB, 50K MAU)
- 사진 저장소 용량 관리 필요 (1GB 한도)
- 기존 사용자 30명의 데이터 무손실 마이그레이션 필수

---

## 2. 사용자 역할

| 역할 | 설명 | 권한 |
|------|------|------|
| **일반 회원** | 운동 인증, 갤러리, 벌금 조회 등 기본 기능 사용 | 읽기/쓰기 (본인 데이터) |
| **관리자** | 사진 검토, 면제 승인, 벌금 관리, 멤버 관리, 주간 집계 | 전체 관리 권한 |
| **테스트** | 일반 회원과 동일하나 멤버 목록에서 제외 | 일반 회원 + 목록 제외 |
| **대기** | 가입 승인 대기 상태, 로그인 불가 | 없음 |
| **탈퇴** | 탈퇴 처리된 회원, 로그인 불가 | 없음 |

---

## 3. 기능 명세

### 3.1 인증 (Authentication)

#### F-AUTH-01: 로그인
- 닉네임 + 비밀번호로 로그인
- Supabase Auth 활용 (email 대신 닉네임 기반 커스텀 인증)
- 자동 로그인 지원 (세션 유지)
- 로그인 시 최종 로그인 시간 기록

#### F-AUTH-02: 회원가입
- 닉네임, 비밀번호, 보안 질답, 프로필 사진(선택) 입력
- 닉네임 중복 확인
- 가입 후 "대기" 상태 → 관리자 승인 필요
- 프로필 사진은 Supabase Storage에 저장

#### F-AUTH-03: 비밀번호 찾기
- 닉네임 + 보안 질답 검증
- 검증 성공 시 새 비밀번호 설정

#### F-AUTH-04: 프로필 수정
- 비밀번호 변경
- 보안 질답 변경
- 프로필 사진 변경
- 부분 업데이트 지원 (변경 항목만)

---

### 3.2 운동 인증 (Workout Check-in)

#### F-WORKOUT-01: 사진 업로드
- 요일별(월~일) 운동 인증 사진 업로드
- SME 전용 타임스탬프 자동 적용
- 갤러리 공유 여부 선택 (ON/OFF)
- 인증과 함께 글 작성 (선택)
- 업로드 시 상태: "대기(△)" → 관리자 검토 필요

#### F-WORKOUT-02: 주간 현황 조회
- 현재 주 요일별 인증 상태 표시
  - O: 승인됨
  - △: 대기 중
  - X: 반려됨
  - ☆: 면제
  - (빈칸): 미인증
- 주간 운동 횟수 (O + ☆ 합산)
- 예상 벌금 표시

#### F-WORKOUT-03: 지난주/다음주 조회
- 지난주 인증 기록 열람
- 다음주 면제 현황 미리보기

---

### 3.3 벌금 관리 (Fine Management)

#### F-FINE-01: 벌금 계산 로직
- 주 3회 미만 운동 시 벌금 부과
- 회당 2,000원 (최대 6,000원)
- 계산 기준: 승인(O) + 면제(☆) 횟수
  - 0회: 6,000원
  - 1회: 4,000원
  - 2회: 2,000원
  - 3회 이상: 0원

#### F-FINE-02: 벌금 조회
- 금주 예상 벌금
- 지난주 벌금 납부 여부
- 누적 벌금 현황
- 벌금 납부 이력

#### F-FINE-03: 벌금 통계
- 내 벌금 vs 전체 평균
- 최대/최소 벌금자
- 백분위 표시

---

### 3.4 면제 관리 (Exemption)

#### F-EXEMPT-01: 면제 신청
- 특정 날짜 선택 + 사유 작성
- 신청 이력 조회 (역순 정렬)

#### F-EXEMPT-02: 면제 승인/반려 알림
- 관리자 처리 후 알림 표시
- 승인 시 해당 날짜 자동 ☆ 마킹 (현재주/다음주)

---

### 3.5 갤러리 & 리액션 (Gallery & Reactions)

#### F-GALLERY-01: 갤러리 조회
- 갤러리 공유 선택한 인증 사진 목록
- 작성자, 요일, 글 내용 표시

#### F-GALLERY-02: 리액션
- 3종 이모지 리액션: 🔥(불꽃), 💪(근육), 🌶️(고추)
- 리액션 카운트 표시
- 리액션 로그 기록 (누가, 언제, 어떤 이모지)

---

### 3.6 챌린지 (Challenge)

#### F-CHALLENGE-01: 챌린지 조회
- 상태별 구분: 진행 중 / 예정 / 종료
- 챌린지 상세: 제목, 기간, 목표, 보상, 설명, 배너 사진

#### F-CHALLENGE-02: 챌린지 참여 현황
- 챌린지 기간 내 참여자별 운동 횟수 집계
- 목표 달성 여부 표시

---

### 3.7 랭킹 & 통계 (Ranking & Stats)

#### F-RANK-01: 운동 랭킹
- 2026년 1월 1일부터 누적 운동 횟수 기준
- 전체 순위 + 내 순위 + 상위 몇 % 표시

#### F-RANK-02: 개인 통계
- 최근 12주 운동 횟수 그래프
- 일별 운동 횟수 추이
- 벌금 변화 차트
- 면제 현황

#### F-RANK-03: 스트릭 (Streak)
- 현재 연속 운동일
- 최대 연속 운동일
- 현재/최대 연속 미운동일

---

### 3.8 AI 코치 (AI Coach)

#### F-AI-01: 운동 질답
- ChatGPT(OpenAI API) 기반 운동 관련 질답
- SME 공식 규칙 DB 기반 컨텍스트 제공
- 대화 이력 유지
- 질답 로그 저장

#### F-AI-02: 오늘의 한마디
- 개인화된 운동/건강 메시지 제공

---

### 3.9 공지사항 (Notice)

#### F-NOTICE-01: 공지 조회
- 최신 공지 배너 표시
- 작성자, 내용, 작성일시

---

### 3.10 메뉴 관리 (Menu)

#### F-MENU-01: 메뉴 커스터마이징
- 드래그 앤 드롭으로 메뉴 순서 변경
- 메뉴별 ON/OFF 활성화 관리

---

### 3.11 반기 결산 (Semi-Annual Report)

#### F-REPORT-01: 반기 리포트
- 종합 통계 대시보드
  - 요일별 운동 횟수
  - 스트릭 (현재/최대)
  - 받은/보낸 리액션
  - 갤러리 공유 횟수
  - 납부 벌금 총액
  - 인증 글 작성 수
  - AI 코치 사용 횟수
- 사진 갤러리 포함

---

## 4. 관리자 기능

### 4.1 사진 검토 (Admin: Photo Review)

#### F-ADMIN-PHOTO-01: 대기 사진 목록
- △ 상태의 인증 사진 목록 표시
- 작성자 프로필, 요일, 사진 미리보기

#### F-ADMIN-PHOTO-02: 승인/반려 처리
- 승인(O): 관리자명 + 시간 기록
- 반려(X): 사유 기재 + 관리자명 + 시간 기록
- 반려 시 리액션 로그 초기화
- 처리 후 운동 횟수/벌금 자동 재계산

---

### 4.2 면제 관리 (Admin: Exemption)

#### F-ADMIN-EXEMPT-01: 대기 면제 목록
- 대기 중인 면제 신청 표시
- 신청 기간, 사유, 신청일시

#### F-ADMIN-EXEMPT-02: 승인/반려 처리
- 승인 시 해당 날짜 ☆ 자동 마킹
- 알림 발송 플래그 설정

---

### 4.3 벌금 관리 (Admin: Fine)

#### F-ADMIN-FINE-01: 미납 목록
- 지난주 벌금 미납자 목록 (탈퇴자 제외)
- 운동 횟수, 벌금액 표시

#### F-ADMIN-FINE-02: 납부 확인
- 납부 처리 시 거래내역 자동 기록
- 수입/잔액 자동 계산

---

### 4.4 멤버 관리 (Admin: Members)

#### F-ADMIN-MEMBER-01: 가입 승인
- 대기 상태 회원 목록
- 승인 / 거절 처리

#### F-ADMIN-MEMBER-02: 멤버 관리
- 현재 멤버 목록 조회
- 강제 추방 (탈퇴 처리)
- 탈퇴 멤버 복구

---

### 4.5 공지 작성 (Admin: Notice)

#### F-ADMIN-NOTICE-01: 공지 작성
- 내용 입력 → 공지 시트에 저장
- 작성자명, 작성일시 자동 기록

---

### 4.6 챌린지 관리 (Admin: Challenge)

#### F-ADMIN-CHALLENGE-01: 챌린지 등록
- 제목, 기간, 목표 횟수, 보상, 설명, 배너 사진

#### F-ADMIN-CHALLENGE-02: 챌린지 삭제

---

### 4.7 주간 집계 (Admin: Weekly Aggregation)

#### F-ADMIN-AGG-01: 주간 집계 실행
이 기능은 매주 1회 실행하며 다음을 처리:
1. 현재주 데이터 → 운동기록 시트 (벌금 저장)
2. 현재주 데이터 → 최종기록 시트 (운동 횟수 + O/X 패턴)
3. 반기리포트 업데이트 (스트릭, 통계 누적)
4. 다음주 데이터 → 현재주로 이월
5. 통계 초기화 (횟수 0, 벌금 6000)
6. 주차 제목 자동 업데이트

#### F-ADMIN-AGG-02: 집계 상태 확인
- 마지막 집계 시간 및 집계자 표시

---

## 5. 데이터베이스 설계 (Supabase PostgreSQL)

### 5.1 테이블 구조

#### `users`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | Supabase Auth UID |
| nickname | text (UNIQUE) | 닉네임 |
| role | text | 역할: member, admin, test, pending, withdrawn |
| profile_image_url | text | 프로필 사진 URL |
| security_question | text | 보안 질문 |
| security_answer | text | 보안 답변 (해시) |
| joined_at | timestamptz | 가입일시 |
| last_login_at | timestamptz | 최종 로그인 |
| menu_order | jsonb | 메뉴 순서/활성화 설정 |
| created_at | timestamptz | 레코드 생성일 |

#### `weeks`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| title | text | 주차명 (예: "2026년 4월 2주차") |
| start_date | date | 주 시작일 (월요일) |
| end_date | date | 주 종료일 (일요일) |
| is_current | boolean | 현재 주 여부 |
| aggregated_at | timestamptz | 집계 일시 |
| aggregated_by | uuid (FK→users) | 집계 관리자 |

#### `check_ins`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK→users) | 사용자 |
| week_id | uuid (FK→weeks) | 주차 |
| day_of_week | int | 요일 (1=월 ~ 7=일) |
| status | text | O, △, X, ☆, null |
| image_url | text | 인증 사진 URL |
| is_public | boolean | 갤러리 공유 여부 |
| post_content | text | 인증 글 |
| reviewed_by | uuid (FK→users) | 검토 관리자 |
| reviewed_at | timestamptz | 검토 일시 |
| reject_reason | text | 반려 사유 |
| created_at | timestamptz | 업로드 일시 |

#### `fines`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK→users) | 사용자 |
| week_id | uuid (FK→weeks) | 주차 |
| workout_count | int | 운동 횟수 |
| fine_amount | int | 벌금액 |
| is_paid | boolean | 납부 여부 |
| paid_at | timestamptz | 납부 일시 |
| confirmed_by | uuid (FK→users) | 확인 관리자 |

#### `transactions`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| description | text | 내용 |
| income | int | 수입 |
| expense | int | 지출 |
| balance | int | 잔액 |
| transacted_by | text | 거래자 |
| note | text | 비고 |
| created_at | timestamptz | 거래 일시 |

#### `exemptions`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK→users) | 신청자 |
| dates | text | 면제 신청 기간 |
| reason | text | 사유 |
| status | text | pending, approved, rejected |
| notified | boolean | 알림 발송 여부 |
| processed_by | uuid (FK→users) | 처리 관리자 |
| created_at | timestamptz | 신청 일시 |

#### `reactions`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| check_in_id | uuid (FK→check_ins) | 대상 체크인 |
| emoji_type | text | fire, muscle, chili |
| reactor_id | uuid (FK→users) | 리액션 누른 사용자 |
| created_at | timestamptz | |

#### `challenges`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| title | text | 챌린지명 |
| start_date | date | 시작일 |
| end_date | date | 종료일 |
| target_count | int | 목표 횟수 |
| reward | text | 보상 |
| description | text | 설명 |
| banner_image_url | text | 배너 사진 |
| created_at | timestamptz | |

#### `notices`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| author_id | uuid (FK→users) | 작성자 |
| content | text | 내용 |
| created_at | timestamptz | 작성 일시 |

#### `ai_logs`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK→users) | 질문자 |
| question | text | 질문 |
| answer | text | 답변 |
| created_at | timestamptz | |

#### `semi_annual_reports`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK→users) | 사용자 |
| period | text | 기간 (예: "2026-상반기") |
| mon_count ~ sun_count | int | 요일별 운동 횟수 |
| current_streak | int | 현재 연속 운동일 |
| max_streak | int | 최대 연속 운동일 |
| current_miss_streak | int | 현재 연속 미운동일 |
| max_miss_streak | int | 최대 연속 미운동일 |
| total_exemptions | int | 총 면제 횟수 |
| reactions_received | int | 받은 리액션 |
| reactions_sent | int | 보낸 리액션 |
| gallery_shares | int | 갤러리 공유 수 |
| total_fines_paid | int | 납부 벌금 총액 |
| posts_written | int | 인증 글 작성 수 |
| ai_coach_uses | int | AI 코치 사용 횟수 |

---

## 6. Supabase Storage 구조

```
buckets/
├── workout-photos/        # 운동 인증 사진
│   └── {user_id}/{week_id}_{day}.jpg
├── profile-photos/        # 프로필 사진
│   └── {user_id}/profile.jpg
└── challenge-banners/     # 챌린지 배너
    └── {challenge_id}.jpg
```

**RLS (Row Level Security) 정책:**
- workout-photos: 본인 업로드, 전체 읽기 (공개 사진)
- profile-photos: 본인 업로드/수정, 전체 읽기
- challenge-banners: 관리자만 업로드, 전체 읽기

---

## 7. 데이터 마이그레이션 계획

### 7.1 마이그레이션 대상
| 기존 (Google Sheets) | 신규 (Supabase) | 비고 |
|---------------------|----------------|------|
| Main 시트 | users + check_ins (현재주) | 유저 정보 + 인증 기록 분리 |
| 운동기록 시트 | fines | 주간별 벌금 |
| 최종기록 시트 | check_ins (과거 집계) | O/X 패턴 보존 |
| 거래내역 시트 | transactions | 그대로 이전 |
| 면제신청 시트 | exemptions | 그대로 이전 |
| 리액션 시트 | reactions | check_in_id로 관계 변환 |
| 챌린지 시트 | challenges | 그대로 이전 |
| 반기리포트 시트 | semi_annual_reports | 그대로 이전 |
| 공지 시트 | notices | 그대로 이전 |
| ai 시트 | ai_logs | 그대로 이전 |

### 7.2 마이그레이션 순서
1. Supabase 프로젝트 생성 및 테이블 스키마 적용
2. Google Sheets → CSV 내보내기
3. CSV → Supabase 데이터 임포트 스크립트 작성
4. Google Drive 사진 → Supabase Storage 이전 (또는 URL 유지)
5. 데이터 검증 (행 수, 무결성 체크)

---

## 8. 마이그레이션 단계별 계획

### Phase 1: 기반 구축
- [ ] Supabase 프로젝트 생성
- [ ] DB 스키마 적용 (테이블, RLS 정책)
- [ ] Supabase Auth 설정
- [ ] Next.js 프로젝트 구조 재설계 (App Router)
- [ ] Supabase 클라이언트 설정

### Phase 2: 핵심 기능 구현
- [ ] 인증 (로그인, 회원가입, 프로필 수정)
- [ ] 운동 인증 (사진 업로드, 주간 현황)
- [ ] 벌금 계산 및 조회
- [ ] 면제 신청/조회

### Phase 3: 커뮤니티 기능
- [ ] 갤러리 및 리액션
- [ ] 챌린지
- [ ] 랭킹 및 통계
- [ ] 공지사항

### Phase 4: 관리자 기능
- [ ] 사진 검토 (승인/반려)
- [ ] 면제 관리
- [ ] 벌금/멤버 관리
- [ ] 주간 집계

### Phase 5: 부가 기능 및 마무리
- [ ] AI 코치
- [ ] 반기 결산
- [ ] 메뉴 커스터마이징
- [ ] 데이터 마이그레이션 실행
- [ ] QA 테스트 및 배포

---

## 9. 비기능 요구사항

### 9.1 성능
- 페이지 로드: 3초 이내
- 사진 업로드: 5초 이내
- API 응답: 1초 이내

### 9.2 보안
- Supabase RLS 적용 (모든 테이블)
- 비밀번호 해싱 (Supabase Auth 기본 제공)
- 파일 업로드 제한 (이미지만, 최대 10MB)

### 9.3 가용성
- Vercel + Supabase Free Tier 기반 운영
- 30명 동시 접속 지원

### 9.4 UX
- 모바일 우선 반응형 디자인 (기존 UI 톤 유지)
- 다크 모드 (기존 Glassmorphism + 그래디언트 유지)
- 주요 액션에 애니메이션 (Framer Motion)

---

## 10. 성공 기준

- [ ] 기존 GAS 앱의 모든 기능이 동작
- [ ] 기존 30명의 데이터가 무손실 이전
- [ ] 기존 사용자가 혼란 없이 전환 가능
- [ ] Supabase Free Tier 내 안정적 운영
