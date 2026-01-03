-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  suggested_start TIMESTAMP WITH TIME ZONE NOT NULL,
  suggested_end TIMESTAMP WITH TIME ZONE,
  category TEXT CHECK (category IN ('academic', 'event', 'personal', 'work', 'other')) DEFAULT 'other',
  recurrence TEXT CHECK (recurrence IN ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY')) DEFAULT 'NONE',
  remind_before INTEGER, -- minutes, null = default user preference
  source TEXT NOT NULL CHECK (source IN ('AI_SCAN', 'AI_CHATBOT', 'SYSTEM', 'MANUAL')),
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SAVED', 'DISMISSED')) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own recommendations"
  ON recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations"
  ON recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON recommendations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendations"
  ON recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS recommendations_user_id_idx ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS recommendations_status_idx ON recommendations(status);
CREATE INDEX IF NOT EXISTS recommendations_user_status_idx ON recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS recommendations_suggested_start_idx ON recommendations(suggested_start);


