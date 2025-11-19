-- ============================================
-- FIX VOLUNTEER ASSIGNMENT VIEW PERMISSIONS
-- ============================================
-- Volunteers need to see ALL assignments in published weeks (not just their own)
-- to correctly determine which routes are open/closed

-- Check current policies
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as condition
FROM pg_policies 
WHERE tablename = 'assignments'
ORDER BY policyname;

-- Drop the policy if it exists (to avoid errors on re-run)
DROP POLICY IF EXISTS "Volunteers can view assignments in published weeks" ON assignments;

-- Add policy for volunteers to view all assignments in published weeks
-- This allows them to see assignment counts for open slots
CREATE POLICY "Volunteers can view assignments in published weeks" 
ON assignments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM weeks 
    WHERE weeks.id = assignments.week_id 
    AND weeks.published = true
  )
);

-- Drop the INSERT policy if it exists (to avoid errors on re-run)
DROP POLICY IF EXISTS "Volunteers can insert own assignments in published weeks" ON assignments;

-- Add policy for volunteers to INSERT their own assignments in published weeks
-- This allows them to sign up for open slots
CREATE POLICY "Volunteers can insert own assignments in published weeks" 
ON assignments 
FOR INSERT 
WITH CHECK (
  volunteer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM weeks 
    WHERE weeks.id = assignments.week_id 
    AND weeks.published = true
  )
);

-- Verify both policies were created
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'assignments' 
AND (policyname = 'Volunteers can view assignments in published weeks'
     OR policyname = 'Volunteers can insert own assignments in published weeks')
ORDER BY policyname;

