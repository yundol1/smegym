-- Lock all fields on approved/reviewed check-ins (members cannot edit after review)
DROP POLICY IF EXISTS "Users can update own check-ins (limited)" ON public.check_ins;

CREATE POLICY "Users can update own check-ins (pre-review only)" ON public.check_ins
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Only allow updates on pending (△) or unreviewed check-ins
    AND (SELECT ci.status FROM public.check_ins ci WHERE ci.id = check_ins.id) = '△'
  );
