-- ============================================
-- CREATE SAFE SIGN-UP FUNCTION WITH LOCKING
-- ============================================
-- This function prevents race conditions when multiple users
-- try to sign up for the same open slot simultaneously

-- Drop function if it exists (for re-runs)
DROP FUNCTION IF EXISTS sign_up_for_route_safe(UUID, TEXT, UUID, UUID);

-- Create the function
CREATE OR REPLACE FUNCTION sign_up_for_route_safe(
  p_week_id UUID,
  p_day_of_week TEXT,
  p_route_id UUID,
  p_volunteer_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_volunteers INTEGER := 1; -- Default to 1
  v_current_count INTEGER := 0;
  v_week_published BOOLEAN := false;
  v_existing_assignment UUID;
  v_result JSON;
BEGIN
  -- Check if week is published
  SELECT published INTO v_week_published
  FROM weeks
  WHERE id = p_week_id;
  
  IF NOT v_week_published THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Week is not published'
    );
  END IF;
  
  -- Check if volunteer already has an assignment on this day
  SELECT id INTO v_existing_assignment
  FROM assignments
  WHERE week_id = p_week_id
    AND day_of_week = p_day_of_week
    AND volunteer_id = p_volunteer_id
  LIMIT 1;
  
  IF v_existing_assignment IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You already have an assignment on this day'
    );
  END IF;
  
  -- Use advisory lock to prevent concurrent access to this specific route
  -- This ensures only one transaction can process sign-ups for this route at a time
  -- We create a unique lock key from the route identifiers
  PERFORM pg_advisory_xact_lock(
    hashtext(p_week_id::text || p_day_of_week || p_route_id::text)
  );
  
  -- Get route requirement (or use default of 1)
  SELECT COALESCE(max_volunteers, 1) INTO v_max_volunteers
  FROM route_requirements
  WHERE week_id = p_week_id
    AND day_of_week = p_day_of_week
    AND route_id = p_route_id;
  
  -- Count current assignments (only non-null volunteer_ids)
  -- This happens AFTER the lock, so we get an accurate count
  SELECT COUNT(*) INTO v_current_count
  FROM assignments
  WHERE week_id = p_week_id
    AND day_of_week = p_day_of_week
    AND route_id = p_route_id
    AND volunteer_id IS NOT NULL;
  
  -- Check capacity
  IF v_current_count >= v_max_volunteers THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This slot is now full. Please try another route.',
      'current_count', v_current_count,
      'max_volunteers', v_max_volunteers
    );
  END IF;
  
  -- Check if volunteer is already assigned to this exact route (duplicate check)
  SELECT id INTO v_existing_assignment
  FROM assignments
  WHERE week_id = p_week_id
    AND day_of_week = p_day_of_week
    AND route_id = p_route_id
    AND volunteer_id = p_volunteer_id
  LIMIT 1;
  
  IF v_existing_assignment IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already signed up for this route'
    );
  END IF;
  
  -- Insert the assignment
  INSERT INTO assignments (week_id, day_of_week, route_id, volunteer_id)
  VALUES (p_week_id, p_day_of_week, p_route_id, p_volunteer_id);
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Successfully signed up for route',
    'current_count', v_current_count + 1,
    'max_volunteers', v_max_volunteers
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle unique constraint violation (volunteer already assigned)
    RETURN json_build_object(
      'success', false,
      'error', 'You are already signed up for this route'
    );
  WHEN OTHERS THEN
    -- Handle any other errors
    RETURN json_build_object(
      'success', false,
      'error', 'An error occurred: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sign_up_for_route_safe(UUID, TEXT, UUID, UUID) TO authenticated;

-- Verify the function was created
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosecdef as security_definer
FROM pg_proc
WHERE proname = 'sign_up_for_route_safe';

