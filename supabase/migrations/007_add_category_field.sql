-- Add category field to schedules table
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('academic', 'event', 'personal', 'work', 'other'));

-- Create index for category queries
CREATE INDEX IF NOT EXISTS schedules_category_idx ON schedules(category);

-- Update existing schedules to have default category
UPDATE schedules SET category = 'academic' WHERE category IS NULL;

