-- Gallery: public approved check-ins ordered by created_at
CREATE INDEX IF NOT EXISTS idx_check_ins_public_approved
  ON public.check_ins (created_at DESC)
  WHERE is_public = true AND status = 'O';

-- Photo review: pending check-ins ordered by created_at
CREATE INDEX IF NOT EXISTS idx_check_ins_pending_review
  ON public.check_ins (created_at DESC)
  WHERE status = '△';

-- Reactions by reactor (for report stats)
CREATE INDEX IF NOT EXISTS idx_reactions_reactor
  ON public.reactions (reactor_id);

-- AI logs by user (for report stats)
CREATE INDEX IF NOT EXISTS idx_ai_logs_user
  ON public.ai_logs (user_id);

-- Transactions latest (for fine payment balance)
CREATE INDEX IF NOT EXISTS idx_transactions_latest
  ON public.transactions (created_at DESC);

-- Fines unpaid with amount
CREATE INDEX IF NOT EXISTS idx_fines_unpaid_amount
  ON public.fines (created_at DESC)
  WHERE is_paid = false AND fine_amount > 0;

-- Challenges by start date
CREATE INDEX IF NOT EXISTS idx_challenges_start_date
  ON public.challenges (start_date DESC);
