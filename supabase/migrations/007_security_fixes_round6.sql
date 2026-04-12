-- =============================================
-- Migration 007: Security Fixes Round 6 (Codex Review)
-- =============================================

-- P1-1: 면제 INSERT를 pending 상태로 강제
DROP POLICY IF EXISTS "Users can insert own exemptions" ON public.exemptions;

CREATE POLICY "Users can insert own exemptions (pending only)" ON public.exemptions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND processed_by IS NULL
    AND notified = false
  );

-- P1-2: 체크인 업데이트 시 승인 후 변경 불가 필드 고정
DROP POLICY IF EXISTS "Users can update own check-ins (limited)" ON public.check_ins;

CREATE POLICY "Users can update own check-ins (limited)" ON public.check_ins
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = (SELECT ci.status FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND week_id = (SELECT ci.week_id FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND day_of_week = (SELECT ci.day_of_week FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND reviewed_by IS NOT DISTINCT FROM (SELECT ci.reviewed_by FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND reviewed_at IS NOT DISTINCT FROM (SELECT ci.reviewed_at FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND reject_reason IS NOT DISTINCT FROM (SELECT ci.reject_reason FROM public.check_ins ci WHERE ci.id = check_ins.id)
  );
