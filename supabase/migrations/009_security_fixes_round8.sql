-- =============================================
-- Migration 009: Security Fixes Round 8
-- =============================================

-- P1: 승인 전 체크인만 수정 가능 + 리뷰 필드 보호
DROP POLICY IF EXISTS "Users can update own check-ins (pre-review only)" ON public.check_ins;

CREATE POLICY "Users can update own check-ins (pre-review only)" ON public.check_ins
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (SELECT ci.status FROM public.check_ins ci WHERE ci.id = check_ins.id) = '△'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND reject_reason IS NULL
  );

-- P2: workout 사진 업로드를 본인 폴더로 제한
DROP POLICY IF EXISTS "Authenticated users can upload workout photos" ON storage.objects;

CREATE POLICY "Users can upload workout photos to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'workout-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
