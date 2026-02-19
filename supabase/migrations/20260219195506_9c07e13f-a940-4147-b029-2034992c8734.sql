
-- Beta Bug Reports table
CREATE TABLE public.beta_bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  context TEXT NOT NULL DEFAULT '',
  expected_behavior TEXT NOT NULL DEFAULT '',
  actual_behavior TEXT NOT NULL DEFAULT '',
  run_reference TEXT,
  environment TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'new'
);

ALTER TABLE public.beta_bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bug reports"
  ON public.beta_bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bug reports"
  ON public.beta_bug_reports FOR SELECT
  USING (auth.uid() = user_id OR is_platform_admin(auth.uid()));

CREATE POLICY "Admins can update bug reports"
  ON public.beta_bug_reports FOR UPDATE
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Admins can delete bug reports"
  ON public.beta_bug_reports FOR DELETE
  USING (is_platform_admin(auth.uid()));

-- Beta Feedback (questionnaire) table
CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.beta_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback FOR SELECT
  USING (auth.uid() = user_id OR is_platform_admin(auth.uid()));

CREATE POLICY "Admins can delete feedback"
  ON public.beta_feedback FOR DELETE
  USING (is_platform_admin(auth.uid()));
