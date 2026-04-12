-- =============================================
-- Migration 011: Fix check-in update policy to preserve date fields
-- =============================================

DROP POLICY IF EXISTS "Users can update own check-ins (pre-review only)" ON public.check_ins;

CREATE POLICY "Users can update own check-ins (pre-review only)" ON public.check_ins
  FOR UPDATE USING (
    auth.uid() = user_id
    AND status = '△'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = '△'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND reject_reason IS NULL
    -- Preserve immutable fields
    AND week_id = (SELECT ci.week_id FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND day_of_week = (SELECT ci.day_of_week FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND user_id = (SELECT ci.user_id FROM public.check_ins ci WHERE ci.id = check_ins.id)
  );
