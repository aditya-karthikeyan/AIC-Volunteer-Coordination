"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getMyRoutes, cancelRoute, VolunteerRoutesByWeek } from "@/lib/supabase/volunteer";

interface MyRoutesCardProps {
  volunteerId: string;
}

export default function MyRoutesCard({ volunteerId }: MyRoutesCardProps) {
  const [routes, setRoutes] = useState<VolunteerRoutesByWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    loadRoutes();
  }, [volunteerId]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("MyRoutesCard loading routes for volunteer:", volunteerId);
      const data = await getMyRoutes(volunteerId);
      console.log("MyRoutesCard received routes:", data);
      setRoutes(data);
    } catch (err: any) {
      console.error("Error loading routes:", err);
      setError(err.message || "Failed to load your routes");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (assignmentId: string, day: string, routeNumber: number) => {
    const confirmed = confirm(
      `Are you sure you want to cancel ${day} - Route ${routeNumber}?\n\nThis will make the route available for other volunteers.`
    );

    if (!confirmed) return;

    try {
      setCancelling(assignmentId);
      await cancelRoute(assignmentId, volunteerId);
      await loadRoutes(); // Refresh the list
    } catch (err: any) {
      console.error("Error cancelling route:", err);
      alert(err.message || "Failed to cancel route");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="neumorphic p-10 h-[500px] w-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-3xl font-bold text-darkBlue text-center">My Routes</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-textSecondary">Loading your routes...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && routes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="inline-block p-6 bg-primary/10 rounded-full mb-6">
            <svg
              className="w-16 h-16 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-darkBlue mb-3">No Routes Assigned Yet</h3>
          <p className="text-textSecondary mb-4">Check back later for route assignments</p>
          <details className="mt-6 text-left max-w-md mx-auto">
            <summary className="cursor-pointer text-sm text-textSecondary hover:text-primary">
              Debug Info (click to expand)
            </summary>
            <div className="mt-3 p-4 bg-gray-100 rounded-lg text-xs font-mono space-y-1">
              <div><strong>Volunteer ID:</strong> {volunteerId}</div>
              <div><strong>Check console</strong> for detailed logs</div>
              <div className="mt-2 text-textSecondary">
                <strong>Possible reasons:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>No routes assigned to you yet</li>
                  <li>Week hasn't been published by admin</li>
                  <li>Assignments are in unpublished weeks</li>
                </ul>
              </div>
            </div>
          </details>
        </motion.div>
      )}

      {!loading && !error && routes.length > 0 && (
        <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2">
          {routes.map((week, weekIndex) => (
            <motion.div
              key={week.weekId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: weekIndex * 0.1 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-bold text-primary border-b-2 border-primary/20 pb-2">
                {week.weekLabel}
              </h3>

              <div className="space-y-3">
                {week.routes.map((route) => (
                  <div
                    key={route.assignmentId}
                    className="flex items-center justify-between p-5 bg-white rounded-xl border-2 border-primary/20 shadow-clay-sm hover:shadow-clay transition-shadow duration-150"
                  >
                    <div>
                      <div className="text-lg font-bold text-darkBlue">
                        {route.dayOfWeek}
                      </div>
                      <div className="text-base text-textSecondary font-medium">
                        Route {route.routeNumber}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      onClick={() => handleCancel(route.assignmentId, route.dayOfWeek, route.routeNumber)}
                      disabled={cancelling === route.assignmentId}
                      className="px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors duration-150 shadow-md"
                    >
                      {cancelling === route.assignmentId ? "Cancelling..." : "Cancel"}
                    </motion.button>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

