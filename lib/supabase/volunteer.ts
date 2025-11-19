import { createClient } from "./client";
import { formatWeekRange, parseDateFromDB, getCurrentWeek, formatDateForDB } from "../utils/dateUtils";

export interface VolunteerRoute {
  assignmentId: string;
  weekId: string;
  weekStartDate: string;
  weekEndDate: string;
  dayOfWeek: string;
  routeId: string;
  routeNumber: number;
  routeName: string | null;
}

export interface VolunteerRoutesByWeek {
  weekId: string;
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  routes: Array<{
    assignmentId: string;
    dayOfWeek: string;
    routeId: string;
    routeNumber: number;
    routeName: string | null;
  }>;
}

export interface OpenSlot {
  weekId: string;
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  dayOfWeek: string;
  routeId: string;
  routeNumber: number;
  routeName: string | null;
  currentVolunteers: number;
  maxVolunteers: number;
}

/**
 * Get volunteer's routes from published weeks only
 */
export async function getMyRoutes(volunteerId: string): Promise<VolunteerRoutesByWeek[]> {
  try {
    const supabase = createClient();

    console.log("Fetching routes for volunteer:", volunteerId);

    // Fetch assignments for this volunteer in published weeks only
    const { data: assignments, error } = await supabase
      .from("assignments")
      .select(`
        id,
        week_id,
        day_of_week,
        route_id,
        weeks!inner (
          id,
          week_start_date,
          week_end_date,
          published
        ),
        routes (
          id,
          route_number,
          route_name
        )
      `)
      .eq("volunteer_id", volunteerId)
      .eq("weeks.published", true);

    console.log("Query result:", { assignments, error });

    if (error) {
      console.error("Error fetching volunteer routes:", error);
      throw error;
    }

    if (!assignments || assignments.length === 0) {
      console.log("No assignments found for this volunteer");
      return [];
    }

    // Group by week
    const weekMap = new Map<string, VolunteerRoutesByWeek>();

    assignments.forEach((assignment: any) => {
      const week = assignment.weeks;
      const route = assignment.routes;

      if (!week || !route) return;

      const weekId = week.id;

      if (!weekMap.has(weekId)) {
        // Format week label using the same function as admin dashboard to avoid timezone issues
        const startDate = parseDateFromDB(week.week_start_date);
        const endDate = parseDateFromDB(week.week_end_date);
        const weekLabel = `Week of ${formatWeekRange(startDate, endDate)}`;

        weekMap.set(weekId, {
          weekId: weekId,
          weekStartDate: week.week_start_date,
          weekEndDate: week.week_end_date,
          weekLabel,
          routes: [],
        });
      }

      const weekData = weekMap.get(weekId)!;
      weekData.routes.push({
        assignmentId: assignment.id,
        dayOfWeek: assignment.day_of_week,
        routeId: route.id,
        routeNumber: route.route_number,
        routeName: route.route_name,
      });
    });

    // Convert map to array and sort by week start date
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const result = Array.from(weekMap.values());
    
    // Sort weeks by start date
    result.sort((a, b) => {
      return new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime();
    });
    
    // Sort routes within each week by day
    result.forEach((week) => {
      week.routes.sort((a, b) => {
        return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
      });
    });

    return result;
  } catch (error) {
    console.error("Error in getMyRoutes:", error);
    throw error;
  }
}

/**
 * Cancel a volunteer's route assignment
 * Logs the cancellation and deletes the assignment
 */
export async function cancelRoute(
  assignmentId: string,
  volunteerId: string,
  reason?: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    console.log("Cancelling route:", { assignmentId, volunteerId });

    // First, get the assignment details before deleting
    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("week_id, day_of_week, route_id, volunteer_id")
      .eq("id", assignmentId)
      .single();

    console.log("Fetched assignment:", { assignment, fetchError });

    if (fetchError) {
      console.error("Error fetching assignment:", fetchError);
      throw fetchError;
    }

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Verify the volunteer owns this assignment
    if (assignment.volunteer_id !== volunteerId) {
      throw new Error("You can only cancel your own assignments");
    }

    // Log the cancellation
    const { error: logError } = await supabase
      .from("assignment_cancellations")
      .insert({
        assignment_id: assignmentId,
        volunteer_id: volunteerId,
        week_id: assignment.week_id,
        day_of_week: assignment.day_of_week,
        route_id: assignment.route_id,
        reason: reason || null,
      });

    console.log("Logged cancellation:", { logError });

    if (logError) {
      console.error("Error logging cancellation:", logError);
      throw logError;
    }

    // Delete the assignment
    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId)
      .eq("volunteer_id", volunteerId); // Double-check ownership

    console.log("Deleted assignment:", { deleteError });

    if (deleteError) {
      console.error("Error deleting assignment:", deleteError);
      throw deleteError;
    }

    console.log("Cancellation successful!");
    return true;
  } catch (error) {
    console.error("Error in cancelRoute:", error);
    throw error;
  }
}

/**
 * Get all open slots from published weeks
 * A slot is "open" if it has fewer than the maximum number of volunteers (from route_requirements, defaults to 1)
 */
export async function getOpenSlots(volunteerId: string): Promise<OpenSlot[]> {
  try {
    const supabase = createClient();

    // Get all published weeks
    const { data: weeks, error: weeksError } = await supabase
      .from("weeks")
      .select("id, week_start_date, week_end_date")
      .eq("published", true)
      .order("week_start_date", { ascending: true});

    if (weeksError) throw weeksError;
    if (!weeks || weeks.length === 0) return [];

    // Get all routes
    const { data: routes, error: routesError } = await supabase
      .from("routes")
      .select("id, route_number, route_name")
      .order("route_number", { ascending: true });

    if (routesError) throw routesError;
    if (!routes || routes.length === 0) return [];

    // Get all route requirements for published weeks
    const weekIds = weeks.map(w => w.id);
    const { data: requirements, error: requirementsError } = await supabase
      .from("route_requirements")
      .select("week_id, day_of_week, route_id, max_volunteers")
      .in("week_id", weekIds);

    if (requirementsError) throw requirementsError;

    // Get all assignments for published weeks (only those with volunteers assigned)
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("week_id, day_of_week, route_id, volunteer_id")
      .in("week_id", weekIds)
      .not("volunteer_id", "is", null);

    if (assignmentsError) throw assignmentsError;

    // Build a map of route requirements: weekId-day-routeId -> maxVolunteers
    const requirementMap = new Map<string, number>();
    (requirements || []).forEach((req: any) => {
      const key = `${req.week_id}-${req.day_of_week}-${req.route_id}`;
      requirementMap.set(key, req.max_volunteers);
    });

    // Build a map of assignment counts: weekId-day-routeId -> count
    // Since we filtered assignments to only include those with volunteer_id, we can count all of them
    const assignmentCounts = new Map<string, number>();
    (assignments || []).forEach((assignment: any) => {
      const key = `${assignment.week_id}-${assignment.day_of_week}-${assignment.route_id}`;
      assignmentCounts.set(key, (assignmentCounts.get(key) || 0) + 1);
    });

    // Build a set of slots the current volunteer is already signed up for
    const volunteerSlots = new Set<string>();
    (assignments || []).forEach((assignment: any) => {
      if (assignment.volunteer_id === volunteerId) {
        const key = `${assignment.week_id}-${assignment.day_of_week}-${assignment.route_id}`;
        volunteerSlots.add(key);
      }
    });

    // Build open slots list
    const openSlots: OpenSlot[] = [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    weeks.forEach((week: any) => {
      // Parse dates as local time to avoid UTC conversion issues
      const startDate = parseDateFromDB(week.week_start_date);
      const endDate = parseDateFromDB(week.week_end_date);
      const weekLabel = `Week of ${formatWeekRange(startDate, endDate)}`;

      days.forEach((day) => {
        routes.forEach((route: any) => {
          const key = `${week.id}-${day}-${route.id}`;
          const currentCount = assignmentCounts.get(key) || 0;
          const maxVolunteers = requirementMap.get(key) || 1; // Default to 1 if not set
          const isVolunteerAssigned = volunteerSlots.has(key);

          // For published weeks, show all routes that have space available
          // A route is open if:
          // 1. currentCount < maxVolunteers (has space)
          // 2. volunteer is not already assigned to this route
          // Since the week is published, all routes should be available by default
          // The route_requirement is just for setting capacity, but if it doesn't exist, default to 1
          if (currentCount < maxVolunteers && !isVolunteerAssigned) {
            openSlots.push({
              weekId: week.id,
              weekStartDate: week.week_start_date,
              weekEndDate: week.week_end_date,
              weekLabel,
              dayOfWeek: day,
              routeId: route.id,
              routeNumber: route.route_number,
              routeName: route.route_name,
              currentVolunteers: currentCount,
              maxVolunteers: maxVolunteers,
            });
          }
        });
      });
    });

    return openSlots;
  } catch (error) {
    console.error("Error in getOpenSlots:", error);
    throw error;
  }
}

/**
 * Sign up a volunteer for an open route
 * Uses database function with row-level locking to prevent race conditions
 */
export async function signUpForRoute(
  volunteerId: string,
  weekId: string,
  dayOfWeek: string,
  routeId: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    // Call the database function which handles all validation and locking
    const { data, error } = await supabase.rpc('sign_up_for_route_safe', {
      p_week_id: weekId,
      p_day_of_week: dayOfWeek,
      p_route_id: routeId,
      p_volunteer_id: volunteerId,
    });

    if (error) {
      console.error("Error calling sign_up_for_route_safe:", error);
      throw error;
    }

    // Parse the JSON response
    const result = data as { success: boolean; error?: string; message?: string };

    if (!result.success) {
      // Throw user-friendly error message
      throw new Error(result.error || "Failed to sign up for route");
    }

    return true;
  } catch (error: any) {
    // Re-throw with user-friendly message
    if (error.message) {
      throw error;
    }
    console.error("Error in signUpForRoute:", error);
    throw new Error("An error occurred while signing up for the route. Please try again.");
  }
}

export interface UpdatePreferencesResult {
  updated: boolean;
  removedAssignments: number;
  affectedWeeks: number;
}

/**
 * Update volunteer's availability preferences
 * - Updates profile with new availability_days
 * - Finds current week (week containing today)
 * - Removes assignments from future weeks where volunteer is no longer available
 * - Returns summary of changes
 */
export async function updateVolunteerPreferences(
  volunteerId: string,
  newAvailabilityDays: string[]
): Promise<UpdatePreferencesResult> {
  try {
    const supabase = createClient();

    // Step 1: Update profile with new availability
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        availability_days: newAvailabilityDays,
        updated_at: new Date().toISOString(),
      })
      .eq("id", volunteerId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      throw profileError;
    }

    // Step 2: Find current week (week containing today)
    const currentWeek = getCurrentWeek();
    const currentWeekEndDate = formatDateForDB(currentWeek.end);

    // Step 3: Get all weeks that start AFTER the current week
    const { data: futureWeeks, error: weeksError } = await supabase
      .from("weeks")
      .select("id, week_start_date")
      .gt("week_start_date", currentWeekEndDate)
      .order("week_start_date", { ascending: true });

    if (weeksError) {
      console.error("Error fetching future weeks:", weeksError);
      throw weeksError;
    }

    // If no future weeks exist, just return success
    if (!futureWeeks || futureWeeks.length === 0) {
      return {
        updated: true,
        removedAssignments: 0,
        affectedWeeks: 0,
      };
    }

    const futureWeekIds = futureWeeks.map((w) => w.id);

    // Step 4: Find assignments in future weeks where day_of_week is NOT in new availability
    // Get all assignments for this volunteer in future weeks
    const { data: allFutureAssignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id, week_id, day_of_week")
      .eq("volunteer_id", volunteerId)
      .in("week_id", futureWeekIds);

    if (assignmentsError) {
      console.error("Error fetching future assignments:", assignmentsError);
      throw assignmentsError;
    }

    // Filter to find assignments that need to be removed (day not in new availability)
    const assignmentsToRemove = (allFutureAssignments || []).filter(
      (assignment) => !newAvailabilityDays.includes(assignment.day_of_week)
    );

    // If no assignments to remove, return success
    if (assignmentsToRemove.length === 0) {
      return {
        updated: true,
        removedAssignments: 0,
        affectedWeeks: 0,
      };
    }

    // Step 5: Delete the conflicting assignments
    const assignmentIdsToRemove = assignmentsToRemove.map((a) => a.id);
    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .in("id", assignmentIdsToRemove);

    if (deleteError) {
      console.error("Error deleting assignments:", deleteError);
      throw deleteError;
    }

    // Calculate affected weeks (unique week_ids from removed assignments)
    const affectedWeekIds = new Set(
      assignmentsToRemove.map((a) => a.week_id)
    );

    return {
      updated: true,
      removedAssignments: assignmentsToRemove.length,
      affectedWeeks: affectedWeekIds.size,
    };
  } catch (error) {
    console.error("Error in updateVolunteerPreferences:", error);
    throw error;
  }
}

