-- ============================================
-- FIX WEEK END DATES
-- ============================================
-- This script checks and fixes week_end_date values
-- The end date should always be Friday (4 days after Monday)
-- If a week has Monday Nov 17, Friday should be Nov 21 (not Nov 22)

-- First, let's see what we have
SELECT 
  id,
  week_start_date,
  week_end_date,
  -- Calculate what Friday should be (Monday + 4 days)
  (week_start_date::date + INTERVAL '4 days')::date as expected_friday,
  -- Check if they match
  CASE 
    WHEN week_end_date::date = (week_start_date::date + INTERVAL '4 days')::date 
    THEN 'CORRECT' 
    ELSE 'WRONG - Should be ' || (week_start_date::date + INTERVAL '4 days')::date::text
  END as status
FROM weeks
ORDER BY week_start_date DESC;

-- Fix any incorrect end dates
UPDATE weeks
SET week_end_date = (week_start_date::date + INTERVAL '4 days')::date,
    updated_at = NOW()
WHERE week_end_date::date != (week_start_date::date + INTERVAL '4 days')::date;

-- Verify the fix
SELECT 
  id,
  week_start_date,
  week_end_date,
  (week_start_date::date + INTERVAL '4 days')::date as expected_friday,
  CASE 
    WHEN week_end_date::date = (week_start_date::date + INTERVAL '4 days')::date 
    THEN '✓ CORRECT' 
    ELSE '✗ STILL WRONG'
  END as status
FROM weeks
ORDER BY week_start_date DESC;

