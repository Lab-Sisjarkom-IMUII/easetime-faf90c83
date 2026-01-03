-- Add reminder fields to schedules table
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER DEFAULT 30;

-- Update existing schedules to have reminder_enabled = false
UPDATE schedules SET reminder_enabled = FALSE WHERE reminder_enabled IS NULL;

-- Add index for reminder queries
CREATE INDEX IF NOT EXISTS schedules_reminder_idx ON schedules(reminder_enabled, date, time_start);

