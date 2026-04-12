-- =============================================
-- Migration 010: Fix check-in self-approval
-- =============================================

-- Members can only update image/public/content on pending check-ins
-- Status must remain '△' (cannot self-approve)
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
  );
