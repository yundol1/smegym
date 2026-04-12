-- Allow members to update notified field on their own exemptions
CREATE POLICY "Users can update own exemption notifications" ON public.exemptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = (SELECT e.status FROM public.exemptions e WHERE e.id = exemptions.id)
  );

-- Fix profile photo INSERT/UPDATE to check owner path
DROP POLICY IF EXISTS "Users can upload own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile photo" ON storage.objects;

CREATE POLICY "Users can upload own profile photo" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own profile photo" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
