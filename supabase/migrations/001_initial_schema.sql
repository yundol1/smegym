-- ============================================
-- SME Gym App - Initial Database Schema
-- Migration: 001_initial_schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'pending' CHECK (role IN ('member', 'admin', 'test', 'pending', 'withdrawn')),
  profile_image_url TEXT,
  security_question TEXT,
  security_answer TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  menu_order JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. WEEKS
-- ============================================
CREATE TABLE public.weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  aggregated_at TIMESTAMPTZ,
  aggregated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_weeks_current ON public.weeks (is_current) WHERE is_current = TRUE;
CREATE INDEX idx_weeks_dates ON public.weeks (start_date, end_date);

-- ============================================
-- 3. CHECK-INS
-- ============================================
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  status TEXT CHECK (status IN ('O', '△', 'X', '☆')),
  image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  post_content TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_id, day_of_week)
);

CREATE INDEX idx_check_ins_week ON public.check_ins (week_id);
CREATE INDEX idx_check_ins_user_week ON public.check_ins (user_id, week_id);
CREATE INDEX idx_check_ins_status ON public.check_ins (status) WHERE status = '△';

-- ============================================
-- 4. FINES
-- ============================================
CREATE TABLE public.fines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  workout_count INT NOT NULL DEFAULT 0,
  fine_amount INT NOT NULL DEFAULT 6000,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_id)
);

CREATE INDEX idx_fines_unpaid ON public.fines (is_paid) WHERE is_paid = FALSE;

-- ============================================
-- 5. TRANSACTIONS
-- ============================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  income INT NOT NULL DEFAULT 0,
  expense INT NOT NULL DEFAULT 0,
  balance INT NOT NULL DEFAULT 0,
  transacted_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. EXEMPTIONS
-- ============================================
CREATE TABLE public.exemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dates TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  processed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exemptions_pending ON public.exemptions (status) WHERE status = 'pending';
CREATE INDEX idx_exemptions_user ON public.exemptions (user_id);

-- ============================================
-- 7. REACTIONS
-- ============================================
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_in_id UUID NOT NULL REFERENCES public.check_ins(id) ON DELETE CASCADE,
  emoji_type TEXT NOT NULL CHECK (emoji_type IN ('fire', 'muscle', 'chili')),
  reactor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (check_in_id, emoji_type, reactor_id)
);

CREATE INDEX idx_reactions_check_in ON public.reactions (check_in_id);

-- ============================================
-- 8. CHALLENGES
-- ============================================
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_count INT NOT NULL,
  reward TEXT,
  description TEXT,
  banner_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 9. NOTICES
-- ============================================
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notices_latest ON public.notices (created_at DESC);

-- ============================================
-- 10. AI LOGS
-- ============================================
CREATE TABLE public.ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 11. SEMI-ANNUAL REPORTS
-- ============================================
CREATE TABLE public.semi_annual_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  mon_count INT NOT NULL DEFAULT 0,
  tue_count INT NOT NULL DEFAULT 0,
  wed_count INT NOT NULL DEFAULT 0,
  thu_count INT NOT NULL DEFAULT 0,
  fri_count INT NOT NULL DEFAULT 0,
  sat_count INT NOT NULL DEFAULT 0,
  sun_count INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  max_streak INT NOT NULL DEFAULT 0,
  current_miss_streak INT NOT NULL DEFAULT 0,
  max_miss_streak INT NOT NULL DEFAULT 0,
  total_exemptions INT NOT NULL DEFAULT 0,
  reactions_received INT NOT NULL DEFAULT 0,
  reactions_sent INT NOT NULL DEFAULT 0,
  gallery_shares INT NOT NULL DEFAULT 0,
  total_fines_paid INT NOT NULL DEFAULT 0,
  posts_written INT NOT NULL DEFAULT 0,
  ai_coach_uses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period)
);

-- ============================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semi_annual_reports ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS policies
CREATE POLICY "Users can view all members" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE USING (public.is_admin());

-- WEEKS policies
CREATE POLICY "Anyone can view weeks" ON public.weeks
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage weeks" ON public.weeks
  FOR ALL USING (public.is_admin());

-- CHECK_INS policies
CREATE POLICY "Anyone can view check-ins" ON public.check_ins
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own check-ins" ON public.check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins" ON public.check_ins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any check-in" ON public.check_ins
  FOR UPDATE USING (public.is_admin());

-- FINES policies
CREATE POLICY "Users can view own fines" ON public.fines
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage fines" ON public.fines
  FOR ALL USING (public.is_admin());

-- TRANSACTIONS policies
CREATE POLICY "Admins can manage transactions" ON public.transactions
  FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone can view transactions" ON public.transactions
  FOR SELECT USING (true);

-- EXEMPTIONS policies
CREATE POLICY "Users can view own exemptions" ON public.exemptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own exemptions" ON public.exemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage exemptions" ON public.exemptions
  FOR ALL USING (public.is_admin());

-- REACTIONS policies
CREATE POLICY "Anyone can view reactions" ON public.reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own reactions" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = reactor_id);

CREATE POLICY "Users can delete own reactions" ON public.reactions
  FOR DELETE USING (auth.uid() = reactor_id);

CREATE POLICY "Admins can delete any reaction" ON public.reactions
  FOR DELETE USING (public.is_admin());

-- CHALLENGES policies
CREATE POLICY "Anyone can view challenges" ON public.challenges
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage challenges" ON public.challenges
  FOR ALL USING (public.is_admin());

-- NOTICES policies
CREATE POLICY "Anyone can view notices" ON public.notices
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage notices" ON public.notices
  FOR ALL USING (public.is_admin());

-- AI_LOGS policies
CREATE POLICY "Users can view own ai logs" ON public.ai_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai logs" ON public.ai_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SEMI_ANNUAL_REPORTS policies
CREATE POLICY "Anyone can view reports" ON public.semi_annual_reports
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage reports" ON public.semi_annual_reports
  FOR ALL USING (public.is_admin());

-- ============================================
-- 13. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('workout-photos', 'workout-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('challenge-banners', 'challenge-banners', true);

-- Storage policies: workout-photos
CREATE POLICY "Anyone can view workout photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'workout-photos');

CREATE POLICY "Authenticated users can upload workout photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workout-photos' AND auth.role() = 'authenticated');

-- Storage policies: profile-photos
CREATE POLICY "Anyone can view profile photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload own profile photo" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile photo" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

-- Storage policies: challenge-banners
CREATE POLICY "Anyone can view challenge banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'challenge-banners');

CREATE POLICY "Admins can upload challenge banners" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'challenge-banners' AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));
