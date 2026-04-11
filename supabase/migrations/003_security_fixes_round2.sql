-- =============================================
-- Migration 003: Security Fixes Round 2 (Codex Review)
-- =============================================

-- P1-1: users INSERT 시 role을 'pending'으로 강제
-- =============================================

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can insert own profile (pending only)" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND role = 'pending'
  );

-- P1-2: check_ins INSERT 시 status를 '△'(대기)로 강제
-- =============================================

DROP POLICY IF EXISTS "Users can insert own check-ins" ON public.check_ins;

CREATE POLICY "Users can insert own check-ins (pending only)" ON public.check_ins
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = '△'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND reject_reason IS NULL
  );

-- P2-1: 비공개 체크인 SELECT 제한
-- =============================================

DROP POLICY IF EXISTS "Anyone can view check-ins" ON public.check_ins;

-- 본인의 체크인은 전부 볼 수 있음
CREATE POLICY "Users can view own check-ins" ON public.check_ins
  FOR SELECT USING (auth.uid() = user_id);

-- 다른 사람의 체크인은 공개된 것만
CREATE POLICY "Anyone can view public check-ins" ON public.check_ins
  FOR SELECT USING (is_public = true);

-- 관리자는 전부 조회 가능
CREATE POLICY "Admins can view all check-ins" ON public.check_ins
  FOR SELECT USING (public.is_admin());

-- P2-2: workout-photos 버킷을 비공개로 전환
-- =============================================

UPDATE storage.buckets SET public = false WHERE id = 'workout-photos';

-- 기존 공개 SELECT 정책 삭제 후 제한된 정책 생성
DROP POLICY IF EXISTS "Anyone can view workout photos" ON storage.objects;

-- 본인 사진은 볼 수 있음 (경로: workout-photos/{user_id}/...)
CREATE POLICY "Users can view own workout photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'workout-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 관리자는 전체 조회 가능
CREATE POLICY "Admins can view all workout photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'workout-photos'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- 공개 체크인의 사진은 인증된 유저가 조회 가능
CREATE POLICY "Authenticated can view public workout photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'workout-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.check_ins
      WHERE is_public = true
      AND image_url LIKE '%' || storage.filename(name) || '%'
    )
  );
