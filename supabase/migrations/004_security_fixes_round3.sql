-- =============================================
-- Migration 004: Security Fixes Round 3 (Codex Review)
-- =============================================

-- P2-1: Storage 정책 수정 - full path 매칭으로 변경
-- =============================================

-- 기존 공개 사진 정책 삭제 (filename만 매칭하던 것)
DROP POLICY IF EXISTS "Authenticated can view public workout photos" ON storage.objects;

-- 공개 체크인의 사진은 image_url 전체 경로로 매칭
CREATE POLICY "Authenticated can view public workout photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'workout-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.check_ins
      WHERE is_public = true
      AND image_url = name
    )
  );

-- P2-2: 보안 답변 해시 함수 생성
-- =============================================

-- pgcrypto 확장 활성화 (해시 함수 사용)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 보안 답변 해시 함수
CREATE OR REPLACE FUNCTION public.hash_security_answer(answer TEXT)
RETURNS TEXT AS $$
  SELECT encode(digest(lower(trim(answer)), 'sha256'), 'hex');
$$ LANGUAGE sql IMMUTABLE;

-- 기존 평문 보안 답변을 해시로 변환
UPDATE public.users
SET security_answer = public.hash_security_answer(security_answer)
WHERE security_answer IS NOT NULL
AND length(security_answer) < 64;
