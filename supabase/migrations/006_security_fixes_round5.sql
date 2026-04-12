-- =============================================
-- Migration 006: Security Fixes Round 5 (Codex Review)
-- =============================================

-- Fix: 면제 알림 업데이트를 notified 필드만 허용
-- 기존 정책은 status만 고정하고 다른 필드 변경 허용했음
DROP POLICY IF EXISTS "Users can update own exemption notifications" ON public.exemptions;

CREATE POLICY "Users can update own exemption notifications" ON public.exemptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = (SELECT e.status FROM public.exemptions e WHERE e.id = exemptions.id)
    AND dates = (SELECT e.dates FROM public.exemptions e WHERE e.id = exemptions.id)
    AND reason = (SELECT e.reason FROM public.exemptions e WHERE e.id = exemptions.id)
    AND processed_by IS NOT DISTINCT FROM (SELECT e.processed_by FROM public.exemptions e WHERE e.id = exemptions.id)
  );
