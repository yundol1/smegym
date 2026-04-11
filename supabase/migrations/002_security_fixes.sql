-- =============================================
-- Migration 002: Security Fixes (Codex Review)
-- =============================================

-- P1-1: users 테이블 - role 자가변경 차단
-- =============================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 본인 프로필 업데이트: role 변경 불가 (WITH CHECK으로 role 고정)
CREATE POLICY "Users can update own profile (no role)" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
  );

-- P1-2: security_answer 공개 노출 차단
-- =============================================

-- 기존 전체 공개 SELECT 정책 삭제
DROP POLICY IF EXISTS "Users can view all members" ON public.users;

-- 본인만 전체 컬럼 (security_answer 포함) 조회 가능
CREATE POLICY "Users can view own full profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 관리자는 전체 유저 조회 가능
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- 다른 회원의 공개 정보만 볼 수 있는 뷰 생성 (security 컬럼 제외)
CREATE OR REPLACE VIEW public.users_public AS
  SELECT id, nickname, role, profile_image_url, joined_at, last_login_at, menu_order, created_at
  FROM public.users;

-- P1-3: check_ins - 본인이 status/reviewed_by 직접 변경 불가
-- =============================================

DROP POLICY IF EXISTS "Users can update own check-ins" ON public.check_ins;

-- 본인은 이미지/공개여부/글만 수정 가능 (status 변경 차단)
CREATE POLICY "Users can update own check-ins (limited)" ON public.check_ins
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = (SELECT ci.status FROM public.check_ins ci WHERE ci.id = check_ins.id)
  );
