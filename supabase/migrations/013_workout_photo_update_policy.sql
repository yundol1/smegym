-- =============================================
-- Migration 013: Allow upsert for workout photo re-uploads
-- =============================================

-- 반려 재업로드 시 같은 경로에 upsert하려면 UPDATE 정책 필요
CREATE POLICY "Users can update own workout photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'workout-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
