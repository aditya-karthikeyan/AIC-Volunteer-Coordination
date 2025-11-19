# Database Schema for Admin Portal

## Required Supabase Tables

### 1. `weeks` Table
Stores week information for scheduling.

```sql
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start_date DATE UNIQUE NOT NULL, -- Monday of the week (e.g., 2025-01-06)
  week_end_date DATE NOT NULL, -- Friday of the week
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage weeks
CREATE POLICY "Admins can manage weeks" ON weeks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );
```

### 2. `routes` Table
Stores the 15 delivery routes.

```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_number INTEGER UNIQUE NOT NULL, -- 1-15
  route_name TEXT, -- Optional route name/description
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 15 routes
INSERT INTO routes (route_number, route_name) 
VALUES 
  (1, 'Route 1'), (2, 'Route 2'), (3, 'Route 3'), (4, 'Route 4'), (5, 'Route 5'),
  (6, 'Route 6'), (7, 'Route 7'), (8, 'Route 8'), (9, 'Route 9'), (10, 'Route 10'),
  (11, 'Route 11'), (12, 'Route 12'), (13, 'Route 13'), (14, 'Route 14'), (15, 'Route 15');

-- Enable RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read routes
CREATE POLICY "Anyone can view routes" ON routes
  FOR SELECT USING (true);
```

### 3. `assignments` Table
Stores volunteer assignments to routes. **Multiple volunteers can be assigned to the same route.**

```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE NOT NULL,
  day_of_week TEXT NOT NULL, -- "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
  route_id UUID REFERENCES routes(id) NOT NULL,
  volunteer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Note: No UNIQUE constraint - multiple volunteers allowed per route
  UNIQUE(week_id, day_of_week, route_id, volunteer_id) -- Only prevent duplicate volunteer on same route
);

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage assignments
CREATE POLICY "Admins can manage assignments" ON assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy: Volunteers can view their own assignments
CREATE POLICY "Volunteers can view own assignments" ON assignments
  FOR SELECT USING (volunteer_id = auth.uid());

-- Policy: Volunteers can delete (cancel) their own assignments
CREATE POLICY "Volunteers can delete own assignments" ON assignments
  FOR DELETE USING (volunteer_id = auth.uid());
```

### 4. Update `profiles` Table
Already exists, but ensure it has:

```sql
-- Already added in previous steps:
-- is_admin BOOLEAN DEFAULT false
-- availability_days TEXT[] DEFAULT '{}'
-- first_name TEXT
-- last_name TEXT
-- phone_number TEXT
-- email TEXT
-- onboarding_completed BOOLEAN DEFAULT false
```

## Indexes for Performance

```sql
-- Index for quick week lookups
CREATE INDEX idx_weeks_start_date ON weeks(week_start_date);

-- Index for assignment queries
CREATE INDEX idx_assignments_week_day ON assignments(week_id, day_of_week);
CREATE INDEX idx_assignments_volunteer ON assignments(volunteer_id);

-- Index for route queries
CREATE INDEX idx_routes_number ON routes(route_number);

-- Index for volunteer availability
CREATE INDEX idx_profiles_availability ON profiles USING GIN(availability_days);
```

## Views for Convenience (Optional)

```sql
-- View to get assignment counts per day per week
CREATE VIEW assignment_counts AS
SELECT 
  w.id as week_id,
  w.week_start_date,
  a.day_of_week,
  COUNT(a.volunteer_id) as assigned_count,
  15 as total_routes,
  w.published
FROM weeks w
CROSS JOIN (
  SELECT UNNEST(ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) as day_of_week
) days
LEFT JOIN assignments a ON a.week_id = w.id AND a.day_of_week = days.day_of_week
GROUP BY w.id, w.week_start_date, a.day_of_week, w.published;
```

