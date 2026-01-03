-- Make location field nullable (optional)
ALTER TABLE schedules
ALTER COLUMN location DROP NOT NULL;

-- Update existing schedules with empty location to NULL
UPDATE schedules SET location = NULL WHERE location = '' OR location = 'TBD';

