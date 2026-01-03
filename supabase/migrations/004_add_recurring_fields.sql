-- Add recurring schedule fields
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'none')),
ADD COLUMN IF NOT EXISTS recurrence_start_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_days_of_week INTEGER[];

-- Update existing schedules to have is_recurring = false
UPDATE schedules SET is_recurring = FALSE WHERE is_recurring IS NULL;

-- Add index for recurring queries
CREATE INDEX IF NOT EXISTS schedules_recurring_idx ON schedules(is_recurring, recurrence_start_date, recurrence_end_date);

