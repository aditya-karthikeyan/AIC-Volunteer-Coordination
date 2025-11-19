# Admin Portal Setup Instructions

## ✅ What You've Already Done

You've created the basic tables:
- `weeks`
- `routes` (with 15 routes)
- `assignments`

## 🔧 Required Setup Steps

### Step 1: Enable Row Level Security (RLS)

Run these commands in your Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create RLS Policies

**IMPORTANT: For profiles table (allows admins to see all volunteers):**
```sql
-- Check if this policy exists first
SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles';

-- If it doesn't exist, create it:
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() 
      AND p2.is_admin = true
    )
  );
```

**For weeks table:**
```sql
-- Policy 1: Admins can manage weeks
CREATE POLICY "Admins can manage weeks" ON weeks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy 2: Volunteers can view published weeks
CREATE POLICY "Volunteers can view published weeks" ON weeks
  FOR SELECT USING (published = true);
```

**For routes table:**
```sql
CREATE POLICY "Anyone can view routes" ON routes 
  FOR SELECT USING (true);
```

**For assignments table:**
```sql
-- Policy 1: Admins can do everything
CREATE POLICY "Admins can manage assignments" ON assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy 2: Volunteers can view their own assignments
CREATE POLICY "Volunteers can view own assignments" ON assignments
  FOR SELECT USING (volunteer_id = auth.uid());

-- Policy 3: Volunteers can delete (cancel) their own assignments
CREATE POLICY "Volunteers can delete own assignments" ON assignments
  FOR DELETE USING (volunteer_id = auth.uid());
```

### Step 3: Add Missing Constraints

```sql
-- Make route_number unique
ALTER TABLE routes ADD CONSTRAINT routes_route_number_unique UNIQUE (route_number);

-- Ensure NOT NULL constraints
ALTER TABLE assignments ALTER COLUMN week_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN route_id SET NOT NULL;
```

### Step 4: Add Performance Indexes

```sql
CREATE INDEX idx_weeks_start_date ON weeks(week_start_date);
CREATE INDEX idx_assignments_week_day ON assignments(week_id, day_of_week);
CREATE INDEX idx_assignments_volunteer ON assignments(volunteer_id);
CREATE INDEX idx_routes_number ON routes(route_number);
```

### Step 5: Update Route Names (Optional)

```sql
UPDATE routes SET route_name = 'Route ' || route_number::text;
```

## 🧪 Testing

### 1. Create a Test Admin Account

In Supabase SQL Editor:
```sql
-- Replace 'your-user-id' with your actual user ID from the profiles table
UPDATE profiles 
SET is_admin = true 
WHERE email = 'your-admin-email@example.com';
```

### 2. Test the Admin Portal

1. Log in with your admin account
2. You should see the Admin Dashboard
3. Try clicking on a day (Monday-Friday)
4. Click on a route to see the volunteer assignment sidebar
5. Test assigning a volunteer to a route

## 🐛 Troubleshooting

### Issue: "Failed to load week data"
- **Solution**: Make sure RLS policies are set up correctly
- Verify your user has `is_admin = true` in the profiles table

### Issue: "No volunteers available"
- **Solution**: Make sure you have volunteers who have:
  - Completed onboarding (`onboarding_completed = true`)
  - Selected availability days
  - Are not admins (`is_admin = false` or `null`)

### Issue: 409 Conflict Error
- **Fixed**: The code now handles race conditions when creating weeks
- If you still see this, refresh the page

### Issue: 406 Not Acceptable
- **Fixed**: The code now uses simpler queries to avoid header issues
- If you still see this, check your RLS policies

## 📋 Verify Setup Checklist

Run this query to verify everything is set up:

```sql
-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('weeks', 'routes', 'assignments');

-- Should show: rowsecurity = true for all three tables

-- Check if policies exist
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public';

-- Should show 4 policies total:
-- 1. Admins can manage weeks
-- 2. Anyone can view routes  
-- 3. Admins can manage assignments
-- 4. Volunteers can view own assignments

-- Check if indexes exist
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('weeks', 'routes', 'assignments');

-- Should show 4 indexes
```

## 🎯 Next Steps

After completing the setup:

1. **Create volunteer accounts** through the sign-up flow
2. **Set one account as admin** using the SQL above
3. **Log in as admin** to access the portal
4. **Assign volunteers to routes** for the current week
5. **Publish the week** when ready

## 📝 Notes

- The system automatically creates weeks when you navigate to them
- Copy Previous Week only works if there's data from last week
- Published weeks prevent further editing (you'll need to unpublish manually if needed)
- All dates are stored in YYYY-MM-DD format
- The week always starts on Monday and ends on Friday

