-- ============================================
-- VERIFY: Check All Volunteer Permissions Are Working
-- ============================================

-- 1. Check all RLS policies on relevant tables
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as condition
FROM pg_policies 
WHERE tablename IN ('weeks', 'routes', 'assignments', 'assignment_cancellations')
ORDER BY tablename, policyname;

-- ============================================
-- Expected Results:
-- ============================================
-- weeks:
--   - Admins can manage weeks (ALL)
--   - Volunteers can view published weeks (SELECT)
--
-- routes:
--   - Anyone can view routes (SELECT)
--
-- assignments:
--   - Admins can manage assignments (ALL)
--   - Volunteers can view own assignments (SELECT)
--   - Volunteers can delete own assignments (DELETE)
--
-- assignment_cancellations:
--   - Admins can view cancellations (SELECT)
--   - Volunteers can view own cancellations (SELECT)
--   - Volunteers can log cancellations (INSERT)

-- ============================================
-- 2. If "Volunteers can delete own assignments" is MISSING, add it:
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'assignments' 
    AND policyname = 'Volunteers can delete own assignments'
  ) THEN
    CREATE POLICY "Volunteers can delete own assignments" ON assignments
      FOR DELETE USING (volunteer_id = auth.uid());
    RAISE NOTICE 'Created policy: Volunteers can delete own assignments';
  ELSE
    RAISE NOTICE 'Policy already exists: Volunteers can delete own assignments';
  END IF;
END $$;

-- ============================================
-- 3. Verify RLS is enabled on all tables
-- ============================================

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('weeks', 'routes', 'assignments', 'assignment_cancellations', 'profiles')
ORDER BY tablename;

