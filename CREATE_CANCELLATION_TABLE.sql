-- ============================================
-- Create Assignment Cancellations Table
-- ============================================
-- This table logs when volunteers cancel their route assignments

CREATE TABLE assignment_cancellations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  volunteer_id UUID REFERENCES profiles(id) NOT NULL,
  week_id UUID REFERENCES weeks(id) NOT NULL,
  day_of_week TEXT NOT NULL,
  route_id UUID REFERENCES routes(id) NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- Enable RLS
ALTER TABLE assignment_cancellations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all cancellations
CREATE POLICY "Admins can view cancellations" ON assignment_cancellations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy: Volunteers can view their own cancellations
CREATE POLICY "Volunteers can view own cancellations" ON assignment_cancellations
  FOR SELECT USING (volunteer_id = auth.uid());

-- Policy: Volunteers can insert their own cancellations
CREATE POLICY "Volunteers can log cancellations" ON assignment_cancellations
  FOR INSERT WITH CHECK (volunteer_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_cancellations_volunteer ON assignment_cancellations(volunteer_id);
CREATE INDEX idx_cancellations_week ON assignment_cancellations(week_id);
CREATE INDEX idx_cancellations_date ON assignment_cancellations(cancelled_at);

-- ============================================
-- Verify the table was created
-- ============================================
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'assignment_cancellations'
ORDER BY ordinal_position;

