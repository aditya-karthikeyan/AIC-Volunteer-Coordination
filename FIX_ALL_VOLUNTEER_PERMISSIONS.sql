-- ============================================
-- COMPREHENSIVE FIX: All Volunteer Permissions
-- ============================================
-- This file contains ALL the RLS policies needed for volunteers to:
-- 1. View their assignments
-- 2. View published weeks
-- 3. Delete (cancel) their own assignments
-- 4. Log cancellations

-- ============================================
-- 1. WEEKS TABLE - Allow volunteers to view published weeks
-- ============================================

-- Check if policy exists
SELECT policyname FROM pg_policies 
WHERE tablename = 'weeks' AND policyname = 'Volunteers can view published weeks';

-- Create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'weeks' 
    AND policyname = 'Volunteers can view published weeks'
  ) THEN
    CREATE POLICY "Volunteers can view published weeks" ON weeks
      FOR SELECT USING (published = true);
  END IF;
END $$;

-- ============================================
-- 2. ASSIGNMENTS TABLE - Allow volunteers to delete their own
-- ============================================

-- Check if delete policy exists
SELECT policyname FROM pg_policies 
WHERE tablename = 'assignments' AND policyname = 'Volunteers can delete own assignments';

-- Create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'assignments' 
    AND policyname = 'Volunteers can delete own assignments'
  ) THEN
    CREATE POLICY "Volunteers can delete own assignments" ON assignments
      FOR DELETE USING (volunteer_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- VERIFICATION - Check all policies are in place
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'ALL' THEN 'All Operations'
    WHEN cmd = 'SELECT' THEN 'Read Only'
    WHEN cmd = 'INSERT' THEN 'Insert Only'
    WHEN cmd = 'UPDATE' THEN 'Update Only'
    WHEN cmd = 'DELETE' THEN 'Delete Only'
  END as description
FROM pg_policies 
WHERE tablename IN ('weeks', 'routes', 'assignments', 'assignment_cancellations', 'profiles')
ORDER BY tablename, policyname;

-- ============================================
-- EXPECTED POLICIES:
-- ============================================
-- weeks:
--   - Admins can manage weeks (ALL)
--   - Volunteers can view published weeks (SELECT) ← NEW
--
-- routes:
--   - Anyone can view routes (SELECT)
--
-- assignments:
--   - Admins can manage assignments (ALL)
--   - Volunteers can view own assignments (SELECT)
--   - Volunteers can delete own assignments (DELETE) ← NEW
--
-- assignment_cancellations:
--   - Admins can view cancellations (SELECT)
--   - Volunteers can view own cancellations (SELECT)
--   - Volunteers can log cancellations (INSERT)
--
-- profiles:
--   - RLS DISABLED (per previous fix)
-- ============================================

-- Test as volunteer (optional - run after logging in as volunteer):
/*
-- This should work now:
DELETE FROM assignments 
WHERE id = 'your-assignment-id' 
AND volunteer_id = auth.uid();

-- This should also work:
SELECT * FROM weeks WHERE published = true;
*/

