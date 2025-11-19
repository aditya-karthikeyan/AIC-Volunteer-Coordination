-- ============================================
-- ROUTE REQUIREMENTS TABLE
-- ============================================
-- This table tracks how many volunteers each route needs per week and day.
-- Admins can set capacity per route/day/week (defaults to 1 volunteer).
-- When a route needs more than 1 volunteer, admins update this table.

CREATE TABLE IF NOT EXISTS route_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  max_volunteers INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, day_of_week, route_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_requirements_week ON route_requirements(week_id);
CREATE INDEX IF NOT EXISTS idx_route_requirements_lookup ON route_requirements(week_id, day_of_week, route_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE route_requirements ENABLE ROW LEVEL SECURITY;

-- Admins can manage all route requirements
CREATE POLICY "Admins can manage route requirements" ON route_requirements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Volunteers can view route requirements (read-only)
CREATE POLICY "Volunteers can view requirements" ON route_requirements
  FOR SELECT USING (true);

-- ============================================
-- HELPER FUNCTION
-- ============================================
-- Update timestamp on update
CREATE OR REPLACE FUNCTION update_route_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER route_requirements_updated_at
  BEFORE UPDATE ON route_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_route_requirements_updated_at();

