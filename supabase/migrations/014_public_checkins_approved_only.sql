-- =============================================
-- Migration 014: Public check-ins must be approved
-- =============================================

-- 공개 체크인 조회 시 승인(O)된 것만 표시
DROP POLICY IF EXISTS "Anyone can view public check-ins" ON public.check_ins;

CREATE POLICY "Anyone can view approved public check-ins" ON public.check_ins
  FOR SELECT USING (is_public = true AND status = 'O');
