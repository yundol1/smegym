-- =============================================
-- Migration 012: Allow re-upload of rejected check-ins
-- =============================================

-- 반려된(X) 체크인도 본인이 업데이트 가능하도록 RLS 수정
-- 단, 업데이트 후 status는 반드시 △(대기)로 리셋되어야 함
DROP POLICY IF EXISTS "Users can update own check-ins (pre-review only)" ON public.check_ins;

CREATE POLICY "Users can update own check-ins (pending or rejected)" ON public.check_ins
  FOR UPDATE USING (
    auth.uid() = user_id
    AND status IN ('△', 'X')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = '△'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND reject_reason IS NULL
    AND week_id = (SELECT ci.week_id FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND day_of_week = (SELECT ci.day_of_week FROM public.check_ins ci WHERE ci.id = check_ins.id)
    AND user_id = (SELECT ci.user_id FROM public.check_ins ci WHERE ci.id = check_ins.id)
  );
