import { createClient } from "./client";
import { formatDateForDB } from "../utils/dateUtils";

export interface Week {
  id: string;
  week_start_date: string;
  week_end_date: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  week_id: string;
  day_of_week: string;
  route_id: string;
  volunteer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  route_number: number;
  route_name: string | null;
}

export interface RouteRequirement {
  id: string;
  week_id: string;
  day_of_week: string;
  route_id: string;
  max_volunteers: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create a week by start date
 */
export async function getOrCreateWeek(startDate: Date, endDate: Date): Promise<Week | null> {
  try {
    const supabase = createClient();
    const startDateStr = formatDateForDB(startDate);
    const endDateStr = formatDateForDB(endDate);

    // Try to get existing week - use maybeSingle() to avoid error if not found
    const { data: existingWeek, error: fetchError } = await supabase
      .from("weeks")
      .select("*")
      .eq("week_start_date", startDateStr)
      .maybeSingle();

    // If there's a fetch error, throw it
    if (fetchError) {
      console.error("Error fetching week:", fetchError);
      throw fetchError;
    }

    // If week exists, return it
    if (existingWeek) {
      return existingWeek;
    }

    // Create new week
    const { data: newWeek, error: insertError } = await supabase
      .from("weeks")
      .insert({
        week_start_date: startDateStr,
        week_end_date: endDateStr,
        published: false,
      })
      .select()
      .single();

    // If insert fails due to conflict (week was created by another request), fetch it
    if (insertError) {
      if (insertError.code === "23505") {
        // Unique constraint violation - week was created by another request
        const { data: retryWeek } = await supabase
          .from("weeks")
          .select("*")
          .eq("week_start_date", startDateStr)
          .single();
        return retryWeek;
      }
      throw insertError;
    }

    return newWeek;
  } catch (error) {
    console.error("Error getting/creating week:", error);
    return null;
  }
}

/**
 * Get all routes
 */
export async function getRoutes(): Promise<Route[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .order("route_number", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting routes:", error);
    return [];
  }
}

/**
 * Get all assignments for a week
 */
export async function getAssignments(weekId: string): Promise<Assignment[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("week_id", weekId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting assignments:", error);
    return [];
  }
}

/**
 * Assign volunteer to a route (allows multiple volunteers per route)
 */
export async function assignVolunteer(
  weekId: string,
  day: string,
  routeId: string,
  volunteerId: string | null
): Promise<Assignment | null> {
  try {
    const supabase = createClient();

    // If removing (volunteerId is null), this shouldn't be called - use unassignVolunteer instead
    if (!volunteerId) {
      throw new Error("Use unassignVolunteer to remove assignments");
    }

    // Check if volunteer is already assigned to a different route on the same day
    const { data: existingAssignment } = await supabase
      .from("assignments")
      .select("id, route_id, routes (route_number)")
      .eq("week_id", weekId)
      .eq("day_of_week", day)
      .eq("volunteer_id", volunteerId)
      .maybeSingle();

    if (existingAssignment && existingAssignment.route_id !== routeId) {
      const routeNumber = (existingAssignment.routes as any)?.route_number;
      throw new Error(
        `This volunteer is already assigned to Route ${routeNumber} on ${day}`
      );
    }

    // Check if this volunteer is already assigned to this exact route
    const { data: duplicateCheck } = await supabase
      .from("assignments")
      .select("id")
      .eq("week_id", weekId)
      .eq("day_of_week", day)
      .eq("route_id", routeId)
      .eq("volunteer_id", volunteerId)
      .maybeSingle();

    if (duplicateCheck) {
      throw new Error("This volunteer is already assigned to this route");
    }

    // Create new assignment (multiple volunteers allowed per route)
    const { data, error } = await supabase
      .from("assignments")
      .insert({
        week_id: weekId,
        day_of_week: day,
        route_id: routeId,
        volunteer_id: volunteerId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error assigning volunteer:", error);
    throw error;
  }
}

/**
 * Remove a specific volunteer assignment
 */
export async function removeVolunteerFromRoute(
  weekId: string,
  day: string,
  routeId: string,
  volunteerId: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("week_id", weekId)
      .eq("day_of_week", day)
      .eq("route_id", routeId)
      .eq("volunteer_id", volunteerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error removing volunteer:", error);
    return false;
  }
}

/**
 * Unassign volunteer from a route
 */
export async function unassignVolunteer(assignmentId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error unassigning volunteer:", error);
    return false;
  }
}

/**
 * Copy previous week's assignments to current week
 * WARNING: This will DELETE all existing assignments for the current week first!
 */
export async function copyPreviousWeek(
  currentWeekStartDate: Date
): Promise<boolean> {
  try {
    const supabase = createClient();
    const currentStartStr = formatDateForDB(currentWeekStartDate);

    // Get previous week's Monday (7 days before)
    const previousMonday = new Date(currentWeekStartDate);
    previousMonday.setDate(currentWeekStartDate.getDate() - 7);
    const previousStartStr = formatDateForDB(previousMonday);

    // Get previous week
    const { data: previousWeek } = await supabase
      .from("weeks")
      .select("id")
      .eq("week_start_date", previousStartStr)
      .single();

    if (!previousWeek) {
      throw new Error("Previous week not found");
    }

    // Get current week
    const { data: currentWeek } = await supabase
      .from("weeks")
      .select("id")
      .eq("week_start_date", currentStartStr)
      .single();

    if (!currentWeek) {
      throw new Error("Current week not found");
    }

    // Get all previous week's assignments
    const { data: previousAssignments } = await supabase
      .from("assignments")
      .select("day_of_week, route_id, volunteer_id")
      .eq("week_id", previousWeek.id);

    if (!previousAssignments || previousAssignments.length === 0) {
      throw new Error("No assignments found in previous week");
    }

    // Step 1: DELETE all existing assignments for current week
    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .eq("week_id", currentWeek.id);

    if (deleteError) throw deleteError;

    // Step 2: INSERT new assignments from previous week
    const newAssignments = previousAssignments.map((assignment) => ({
      week_id: currentWeek.id,
      day_of_week: assignment.day_of_week,
      route_id: assignment.route_id,
      volunteer_id: assignment.volunteer_id,
    }));

    const { error: insertError } = await supabase
      .from("assignments")
      .insert(newAssignments);

    if (insertError) throw insertError;
    return true;
  } catch (error) {
    console.error("Error copying previous week:", error);
    throw error;
  }
}

/**
 * Publish week (mark as published)
 */
export async function publishWeek(weekId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("weeks")
      .update({
        published: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", weekId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error publishing week:", error);
    return false;
  }
}

/**
 * Get volunteer's assignments for a week
 */
export async function getVolunteerAssignmentsForWeek(
  volunteerId: string,
  weekId: string
): Promise<Assignment[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("week_id", weekId)
      .eq("volunteer_id", volunteerId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting volunteer assignments:", error);
    return [];
  }
}

/**
 * Get assignment count for a specific day in a week
 */
export async function getAssignmentCount(
  weekId: string,
  day: string
): Promise<number> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assignments")
      .select("id", { count: "exact" })
      .eq("week_id", weekId)
      .eq("day_of_week", day)
      .not("volunteer_id", "is", null);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error("Error getting assignment count:", error);
    return 0;
  }
}

/**
 * Get all weeks (for admin view)
 */
export async function getAllWeeks(): Promise<Week[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("weeks")
      .select("*")
      .order("week_start_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting weeks:", error);
    return [];
  }
}

/**
 * Get all route requirements for a week
 */
export async function getRouteRequirements(weekId: string): Promise<RouteRequirement[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("route_requirements")
      .select("*")
      .eq("week_id", weekId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting route requirements:", error);
    return [];
  }
}

/**
 * Get a specific route requirement (defaults to 1 if not found)
 */
export async function getRouteRequirement(
  weekId: string,
  day: string,
  routeId: string
): Promise<number> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("route_requirements")
      .select("max_volunteers")
      .eq("week_id", weekId)
      .eq("day_of_week", day)
      .eq("route_id", routeId)
      .maybeSingle();

    if (error) throw error;
    return data?.max_volunteers || 1; // Default to 1 if not set
  } catch (error) {
    console.error("Error getting route requirement:", error);
    return 1; // Default to 1 on error
  }
}

/**
 * Set or update route requirement for max volunteers
 */
export async function setRouteRequirement(
  weekId: string,
  day: string,
  routeId: string,
  maxVolunteers: number
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Validate input
    if (maxVolunteers < 1 || maxVolunteers > 10) {
      throw new Error("Max volunteers must be between 1 and 10");
    }

    // Upsert (insert or update)
    const { error } = await supabase
      .from("route_requirements")
      .upsert({
        week_id: weekId,
        day_of_week: day,
        route_id: routeId,
        max_volunteers: maxVolunteers,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "week_id,day_of_week,route_id"
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error setting route requirement:", error);
    throw error;
  }
}

