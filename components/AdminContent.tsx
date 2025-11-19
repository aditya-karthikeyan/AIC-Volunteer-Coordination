"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import LogoutButton from "./LogoutButton";
import MealsOnWheelsLogo from "./MealsOnWheelsLogo";
import AdminDashboard from "./admin/AdminDashboard";
import DayView from "./admin/DayView";
import RouteSidebar from "./admin/RouteSidebar";
import { getWeekRange, getNextWeek, getPreviousWeek, getWeekDays, parseDateFromDB } from "@/lib/utils/dateUtils";
import {
  getOrCreateWeek,
  getRoutes,
  getAssignments,
  assignVolunteer,
  copyPreviousWeek,
  publishWeek,
  getRouteRequirements,
  getRouteRequirement,
  removeVolunteerFromRoute,
  Week,
  Route,
  Assignment,
  RouteRequirement,
} from "@/lib/supabase/admin";
import { categorizeVolunteers, getAllVolunteers, CategorizedVolunteers } from "@/lib/supabase/volunteers";

export default function AdminContent() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedRouteNumber, setSelectedRouteNumber] = useState<number | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [routeRequirements, setRouteRequirements] = useState<RouteRequirement[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [categorized, setCategorized] = useState<CategorizedVolunteers>({
    available: [],
    alreadyScheduled: [],
    notAvailable: [],
  });
  const [loading, setLoading] = useState(true);
  const [copyingWeek, setCopyingWeek] = useState(false);
  const [publishingWeek, setPublishingWeek] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  // Initialize week on mount
  useEffect(() => {
    const { start } = getWeekRange(new Date());
    setCurrentWeekStart(start);
  }, []);

  // Load data when week changes
  useEffect(() => {
    loadWeekData();
  }, [currentWeekStart]);

  // Load volunteers categorization when day/week changes
  useEffect(() => {
    if (selectedDay && currentWeek) {
      loadVolunteerCategories();
    }
  }, [selectedDay, currentWeek, assignments]);

  const loadWeekData = async () => {
    setLoading(true);
    try {
      const { start, end } = getWeekRange(currentWeekStart);
      const week = await getOrCreateWeek(start, end);
      setCurrentWeek(week);

      if (week) {
        const [routesData, assignmentsData, volunteersData, requirementsData] = await Promise.all([
          getRoutes(),
          getAssignments(week.id),
          getAllVolunteers(),
          getRouteRequirements(week.id),
        ]);

        setRoutes(routesData);
        setAssignments(assignmentsData);
        setVolunteers(volunteersData);
        setRouteRequirements(requirementsData);
      }
    } catch (error) {
      console.error("Error loading week data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVolunteerCategories = async () => {
    if (!selectedDay || !currentWeek) return;

    try {
      const categorized = await categorizeVolunteers(selectedDay, currentWeek.id);
      setCategorized(categorized);
    } catch (error) {
      console.error("Error categorizing volunteers:", error);
    }
  };

  const handlePreviousWeek = () => {
    const prevWeek = getPreviousWeek(currentWeekStart);
    setCurrentWeekStart(prevWeek);
    setSelectedDay(null);
    setSelectedRouteId(null);
  };

  const handleNextWeek = () => {
    const nextWeek = getNextWeek(currentWeekStart);
    setCurrentWeekStart(nextWeek);
    setSelectedDay(null);
    setSelectedRouteId(null);
  };

  const handleCopyPreviousWeek = async () => {
    if (!currentWeek) return;

    // Warning confirmation
    const confirmCopy = confirm(
      "⚠️ WARNING: This will DELETE all current assignments for this week and replace them with last week's schedule.\n\n" +
      "This action cannot be undone. Are you sure you want to continue?"
    );

    if (!confirmCopy) {
      return;
    }

    setCopyingWeek(true);
    setErrorMessage(null);
    try {
      await copyPreviousWeek(currentWeekStart);
      await loadWeekData(); // Refresh data
      setSuccessMessage("Previous week copied successfully! All current assignments have been replaced.");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to copy previous week");
    } finally {
      setCopyingWeek(false);
    }
  };

  const handlePublishWeek = async () => {
    if (!currentWeek) return;

    if (!confirm("Are you sure you want to publish this week? Volunteers will be notified of their assignments.")) {
      return;
    }

    setPublishingWeek(true);
    setErrorMessage(null);
    try {
      await publishWeek(currentWeek.id);
      await loadWeekData(); // Refresh data
      setSuccessMessage("Week published successfully!");
    } catch (error) {
      setErrorMessage("Failed to publish week");
    } finally {
      setPublishingWeek(false);
    }
  };

  const handleDayClick = (day: string) => {
    setSelectedDay(day);
    setSelectedRouteId(null);
  };

  const handleBackToWeek = () => {
    setSelectedDay(null);
    setSelectedRouteId(null);
  };

  const handleRouteClick = (routeId: string, routeNumber: number) => {
    setSelectedRouteId(routeId);
    setSelectedRouteNumber(routeNumber);
  };

  const handleAssignVolunteer = async (volunteerId: string) => {
    if (!currentWeek || !selectedDay || !selectedRouteId) return;

    // Check if route is at capacity before assigning
    const routeAssignments = assignments.filter(
      (a) => a.day_of_week === selectedDay && a.route_id === selectedRouteId && a.volunteer_id
    );
    const currentCount = routeAssignments.length;
    
    const routeRequirement = routeRequirements.find(
      (req) => req.day_of_week === selectedDay && req.route_id === selectedRouteId
    );
    const maxVolunteers = routeRequirement?.max_volunteers || 1;
    
    // Check if route is already at capacity
    if (currentCount >= maxVolunteers) {
      setErrorMessage(
        `This route is already at capacity (${currentCount}/${maxVolunteers}). Please either increase the number of volunteers or remove the current volunteer(s) to replace with a new one.`
      );
      return;
    }

    setAssigning(true);
    setErrorMessage(null);
    try {
      await assignVolunteer(currentWeek.id, selectedDay, selectedRouteId, volunteerId);
      await loadWeekData(); // Refresh assignments
      setSuccessMessage("Volunteer assigned successfully!");
      // Keep sidebar open after assignment
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to assign volunteer");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveVolunteer = async (volunteerId: string) => {
    if (!currentWeek || !selectedDay || !selectedRouteId) return;

    setAssigning(true);
    setErrorMessage(null);
    try {
      await removeVolunteerFromRoute(currentWeek.id, selectedDay, selectedRouteId, volunteerId);
      await loadWeekData(); // Refresh assignments
      setSuccessMessage("Volunteer removed successfully!");
      // Keep sidebar open after removal
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to remove volunteer");
    } finally {
      setAssigning(false);
    }
  };

  const handleCloseSidebar = () => {
    setSelectedRouteId(null);
  };

  // Calculate assignment counts for each day
  // Count only fully staffed routes (currentCount >= maxVolunteers)
  const assignmentCounts = (() => {
    const counts: { [key: string]: number } = {};
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    
    days.forEach((day) => {
      // Get all routes for this day
      const dayRoutes = routes;
      let fullyStaffedCount = 0;
      
      dayRoutes.forEach((route) => {
        // Get assignments for this route on this day
        const routeAssignments = assignments.filter(
          (a) => a.day_of_week === day && a.route_id === route.id && a.volunteer_id
        );
        const currentCount = routeAssignments.length;
        
        // Get max volunteers for this route
        const requirement = routeRequirements.find(
          (req) => req.day_of_week === day && req.route_id === route.id
        );
        const maxVolunteers = requirement?.max_volunteers || 1;
        
        // Only count if fully staffed
        if (currentCount >= maxVolunteers) {
          fullyStaffedCount++;
        }
      });
      
      counts[day] = fullyStaffedCount;
    });
    
    return counts;
  })();

  // Create volunteer map for quick lookup
  const volunteerMap = volunteers.reduce((acc, v) => {
    acc[v.id] = { first_name: v.first_name, last_name: v.last_name };
    return acc;
  }, {} as { [key: string]: { first_name: string; last_name: string } });

  // Get all current volunteers for selected route
  const currentAssignments = assignments.filter(
    (a) => a.day_of_week === selectedDay && a.route_id === selectedRouteId && a.volunteer_id
  );
  const currentVolunteers = currentAssignments.map((a) => ({
    id: a.volunteer_id!,
    ...volunteerMap[a.volunteer_id!],
  })).filter((v) => v.first_name && v.last_name);

  // Get max volunteers for selected route
  const selectedRouteRequirement = routeRequirements.find(
    req => req.day_of_week === selectedDay && req.route_id === selectedRouteId
  );
  const maxVolunteersForRoute = selectedRouteRequirement?.max_volunteers || 1;

  // Get assignments for selected day
  const dayAssignments = selectedDay
    ? assignments.filter((a) => a.day_of_week === selectedDay)
    : [];

  // Get the selected day's date - parse as local time to avoid timezone issues
  const selectedDayDate = selectedDay && currentWeek
    ? (() => {
        const weekStart = parseDateFromDB(currentWeek.week_start_date);
        return getWeekDays(weekStart).find((d) => d.day === selectedDay)?.date;
      })()
    : null;

  if (loading) {
    return (
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center text-darkBlue">Loading...</div>
      </div>
    );
  }

  if (!currentWeek) {
    return (
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center text-darkBlue">Failed to load week data</div>
      </div>
    );
  }

  const { start, end } = getWeekRange(currentWeekStart);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-8 sm:px-12 lg:px-16 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-12"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-6">
            <MealsOnWheelsLogo className="w-48" />
            <div className="border-l-2 border-primary/30 pl-6">
              <h1 className="text-4xl font-bold text-darkBlue">
                Admin Portal
              </h1>
              <p className="text-darkBlue/70 mt-1 text-base">Volunteer Coordination</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      {(errorMessage || successMessage) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-6"
        >
          {errorMessage && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-medium">{errorMessage}</p>
              </div>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700 font-medium">{successMessage}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {!selectedDay ? (
          /* Week Overview */
          <AdminDashboard
            weekStart={start}
            weekEnd={end}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onCopyPreviousWeek={handleCopyPreviousWeek}
            onPublishWeek={handlePublishWeek}
            onDayClick={handleDayClick}
            assignmentCounts={assignmentCounts}
            isPublished={currentWeek.published}
            copyingWeek={copyingWeek}
            publishingWeek={publishingWeek}
          />
        ) : (
          /* Day View with Routes */
          <DayView
            day={selectedDay}
            date={selectedDayDate || new Date()}
            routes={routes}
            assignments={dayAssignments}
            routeRequirements={routeRequirements.filter(req => req.day_of_week === selectedDay)}
            onRouteClick={handleRouteClick}
            onBack={handleBackToWeek}
            selectedRouteId={selectedRouteId}
            volunteers={volunteerMap}
            isPublished={currentWeek.published}
          />
        )}
      </motion.div>

      {/* Route Sidebar */}
      {selectedRouteId && selectedRouteNumber && selectedDay && currentWeek && (
        <RouteSidebar
          routeNumber={selectedRouteNumber}
          routeId={selectedRouteId}
          weekId={currentWeek.id}
          day={selectedDay}
          currentVolunteers={currentVolunteers}
          volunteers={categorized}
          maxVolunteers={maxVolunteersForRoute}
          onAssign={handleAssignVolunteer}
          onRemove={handleRemoveVolunteer}
          onClose={handleCloseSidebar}
          onCapacityChange={loadWeekData}
          assigning={assigning}
        />
      )}
    </div>
  );
}

