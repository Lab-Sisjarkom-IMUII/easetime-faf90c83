-- Fix RLS Policies untuk schedules table dan storage bucket
-- Jalankan file ini di Supabase SQL Editor jika ada masalah RLS

-- ============================================
-- 1. Fix Schedules Table Policies
-- ============================================

-- Hapus policy lama jika ada (untuk re-create)
DROP POLICY IF EXISTS "Users can view own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can insert own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can delete own schedules" ON schedules;

-- Create policy: Users can only see their own schedules
CREATE POLICY "Users can view own schedules"
  ON schedules FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own schedules
CREATE POLICY "Users can insert own schedules"
  ON schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own schedules
CREATE POLICY "Users can update own schedules"
  ON schedules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own schedules
CREATE POLICY "Users can delete own schedules"
  ON schedules FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. Fix Storage Bucket Policies
-- ============================================

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Users can upload schedule files" ON storage.objects;
DROP POLICY IF EXISTS "Users can download schedule files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete schedule files" ON storage.objects;

-- Policy untuk upload (insert)
CREATE POLICY "Users can upload schedule files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'schedule-files');

-- Policy untuk download (select)
CREATE POLICY "Users can download schedule files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'schedule-files');

-- Policy untuk delete (optional)
CREATE POLICY "Users can delete schedule files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'schedule-files');

