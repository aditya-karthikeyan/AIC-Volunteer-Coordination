"use client";

import { motion } from "framer-motion";
import { Route, Assignment, RouteRequirement } from "@/lib/supabase/admin";

interface DayViewProps {
  day: string;
  date: Date;
  routes: Route[];
  assignments: Assignment[];
  routeRequirements: RouteRequirement[];
  onRouteClick: (routeId: string, routeNumber: number) => void;
  onBack: () => void;
  selectedRouteId: string | null;
  volunteers: { [key: string]: { first_name: string; last_name: string } };
  isPublished: boolean;
}

export default function DayView({
  day,
  date,
  routes,
  assignments,
  routeRequirements,
  onRouteClick,
  onBack,
  selectedRouteId,
  volunteers,
  isPublished,
}: DayViewProps) {
  // Create a map of routeId -> array of volunteerIds for quick lookup
  const assignmentMap = new Map<string, string[]>();
  assignments.forEach((assignment) => {
    if (assignment.volunteer_id) {
      const existing = assignmentMap.get(assignment.route_id) || [];
      existing.push(assignment.volunteer_id);
      assignmentMap.set(assignment.route_id, existing);
    }
  });

  // Create a map of routeId -> maxVolunteers for quick lookup
  const requirementMap = new Map<string, number>();
  routeRequirements.forEach((req) => {
    requirementMap.set(req.route_id, req.max_volunteers);
  });

  const formatDate = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  return (
    <div className="space-y-10 px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            onClick={onBack}
            className="w-14 h-14 neumorphic flex items-center justify-center text-darkBlue hover:text-primary transition-colors duration-150"
            aria-label="Back to week view"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
          <h2 className="text-4xl font-bold text-darkBlue">
            {day} • {formatDate(date)}
          </h2>
          {isPublished && (
            <span className="px-5 py-2 bg-limeGreen/20 text-primary text-base font-semibold rounded-xl border-2 border-limeGreen/50">
              Week Published ✓
            </span>
          )}
        </div>
      </div>

      {/* Route Cards Grid - Increased spacing for breathing room */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
      >
        {routes.map((route, index) => {
          const volunteerIds = assignmentMap.get(route.id) || [];
          const assignedVolunteers = volunteerIds.map(id => volunteers[id]).filter(Boolean);
          const maxVolunteers = requirementMap.get(route.id) || 1; // Default to 1
          const currentCount = assignedVolunteers.length;
          const isSelected = selectedRouteId === route.id;
          
          // Determine border color based on assignment status and capacity
          let borderClass = "route-empty"; // Gray - no assignments
          if (currentCount > 0 && currentCount < maxVolunteers) {
            borderClass = "route-warning"; // Yellow - partially filled
          } else if (currentCount >= maxVolunteers) {
            borderClass = "route-assigned"; // Green - fully staffed
          }

          return (
            <motion.button
              key={route.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03, ease: "easeOut" }}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onRouteClick(route.id, route.route_number)}
              className={`neumorphic ${borderClass} p-8 cursor-pointer transition-shadow duration-150 ${
                isSelected
                  ? "ring-4 ring-primary shadow-clay-hover"
                  : "hover:shadow-clay-hover"
              }`}
            >
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-darkBlue">
                  Route {route.route_number}
                </h3>
                <div className="text-base font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                  {currentCount} / {maxVolunteers} assigned
                </div>
                <div className="text-base font-semibold text-darkBlue mt-3 space-y-2 min-h-[60px]">
                  {assignedVolunteers.length > 0 ? (
                    assignedVolunteers.slice(0, 3).map((vol, idx) => (
                      <div key={idx} className="truncate">
                        {vol.first_name} {vol.last_name}
                      </div>
                    ))
                  ) : (
                    <div className="text-xl text-gray-300">—</div>
                  )}
                  {assignedVolunteers.length > 3 && (
                    <div className="text-sm text-primary font-bold">
                      +{assignedVolunteers.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
