"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getOpenSlots, signUpForRoute, type OpenSlot } from "@/lib/supabase/volunteer";

interface OpenSlotsCardProps {
  userId: string;
  onSlotChanged?: () => void;
  refreshTrigger?: number; // When this changes, trigger a refresh
}

interface SlotsByWeek {
  [weekId: string]: {
    weekLabel: string;
    weekStartDate: string;
    days: {
      [day: string]: OpenSlot[];
    };
  };
}

export default function OpenSlotsCard({ userId, onSlotChanged, refreshTrigger }: OpenSlotsCardProps) {
  const [slots, setSlots] = useState<OpenSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const prevRefreshTrigger = useRef<number | undefined>(undefined);

  const fetchSlots = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const data = await getOpenSlots(userId);
      setSlots(data);
      
      // Auto-expand the first week only on initial load
      if (showLoading && data.length > 0) {
        const firstWeekId = data[0].weekId;
        setExpandedWeeks(new Set([firstWeekId]));
      }
    } catch (err: any) {
      console.error("Error fetching open slots:", err);
      setError(err.message || "Failed to load open slots");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    fetchSlots(true); // Show loading on initial load
  }, [fetchSlots]);

  // Refresh when refreshTrigger changes (e.g., when preferences are updated)
  // Use a ref to track the previous value and only refresh when it actually changes
  useEffect(() => {
    if (refreshTrigger !== undefined && prevRefreshTrigger.current !== undefined && refreshTrigger !== prevRefreshTrigger.current) {
      // Only refresh if the value actually changed (not on initial mount)
      fetchSlots(false); // Silent refresh when triggered externally
    }
    prevRefreshTrigger.current = refreshTrigger;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]); // Only depend on refreshTrigger, not fetchSlots to avoid extra refreshes

  // Auto-refresh slots periodically to catch changes from other users
  // Only poll when tab is visible to save resources
  // Don't show loading spinner on background refreshes
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll if tab is visible (not hidden)
      if (!document.hidden) {
        fetchSlots(false); // Silent refresh
      }
    }, 2000); // Refresh every 2 seconds when tab is active

    return () => clearInterval(interval);
  }, [fetchSlots]);

  // Refresh when window gains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchSlots(false); // Silent refresh
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSlots]);

  const handleSignUp = async (slot: OpenSlot) => {
    const slotKey = `${slot.weekId}-${slot.dayOfWeek}-${slot.routeId}`;
    setSigningUp(slotKey);
    setError(null);
    setSuccessMessage(null);

    try {
      await signUpForRoute(userId, slot.weekId, slot.dayOfWeek, slot.routeId);
      setSuccessMessage(`Successfully signed up for Route ${slot.routeNumber} on ${slot.dayOfWeek}!`);
      
      // Refresh slots to update availability (silent refresh)
      await fetchSlots(false);
      onSlotChanged?.();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Error signing up for route:", err);
      
      // Show user-friendly error messages
      let errorMessage = "Failed to sign up for route";
      
      if (err.message) {
        // Check for specific error messages from the database function
        if (err.message.includes("slot is now full") || err.message.includes("full")) {
          errorMessage = "This slot is now full. Please try another route.";
        } else if (err.message.includes("already") || err.message.includes("assigned")) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
      // Refresh slots after error to show updated availability
      // (e.g., if someone else took the slot while they were trying)
      await fetchSlots(false);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setSigningUp(null);
    }
  };

  const toggleWeek = (weekId: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
      // Also collapse all days in this week
      const newExpandedDays = new Set(expandedDays);
      Array.from(expandedDays).forEach(key => {
        if (key.startsWith(`${weekId}-`)) {
          newExpandedDays.delete(key);
        }
      });
      setExpandedDays(newExpandedDays);
    } else {
      newExpanded.add(weekId);
    }
    setExpandedWeeks(newExpanded);
  };

  const toggleDay = (weekId: string, day: string) => {
    const key = `${weekId}-${day}`;
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDays(newExpanded);
  };

  // Group slots by week, then by day
  const slotsByWeek: SlotsByWeek = slots.reduce((acc, slot) => {
    if (!acc[slot.weekId]) {
      acc[slot.weekId] = {
        weekLabel: slot.weekLabel,
        weekStartDate: slot.weekStartDate,
        days: {},
      };
    }
    if (!acc[slot.weekId].days[slot.dayOfWeek]) {
      acc[slot.weekId].days[slot.dayOfWeek] = [];
    }
    acc[slot.weekId].days[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as SlotsByWeek);

  // Sort weeks by start date
  const sortedWeeks = Object.entries(slotsByWeek).sort(([, a], [, b]) => {
    return new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime();
  });

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  if (loading) {
    return (
      <div className="neumorphic p-10 h-[500px] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-textSecondary">Loading open slots...</p>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="neumorphic p-10 h-[500px] w-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="inline-block p-6 bg-limeGreen/20 rounded-full mb-6">
            <svg
              className="w-16 h-16 text-limeGreen"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-darkBlue mb-4">All Caught Up!</h2>
          <p className="text-textSecondary text-lg">No open slots available at the moment</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="neumorphic p-10 h-[500px] w-full flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-3xl font-bold text-darkBlue mb-2">Open Slots</h2>
        <p className="text-textSecondary">
          {slots.length} slot{slots.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Success/Error Messages - Fixed */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-shrink-0 mb-4 p-4 bg-limeGreen/20 border-2 border-limeGreen rounded-lg flex items-center gap-3"
          >
            <svg className="w-6 h-6 text-limeGreen flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-darkBlue font-medium">{successMessage}</p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-shrink-0 mb-4 p-4 bg-red-100 border-2 border-red-500 rounded-lg flex items-center gap-3"
          >
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-900 font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {sortedWeeks.map(([weekId, weekData]) => {
          const isWeekExpanded = expandedWeeks.has(weekId);
          const sortedDays = dayOrder.filter(day => weekData.days[day]);

          return (
            <div key={weekId} className="neumorphic-inset rounded-xl overflow-hidden">
              {/* Week Header */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleWeek(weekId)}
                className="w-full p-5 flex items-center justify-between bg-white hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-lg font-bold text-darkBlue">{weekData.weekLabel}</span>
                </div>
                <motion.svg
                  animate={{ rotate: isWeekExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-6 h-6 text-darkBlue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </motion.button>

              {/* Days - Collapsible */}
              <AnimatePresence>
                {isWeekExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3 bg-gray-50/50">
                      {sortedDays.map((day) => {
                        const daySlots = weekData.days[day];
                        const dayKey = `${weekId}-${day}`;
                        const isDayExpanded = expandedDays.has(dayKey);

                        return (
                          <div key={dayKey} className="neumorphic rounded-xl overflow-hidden">
                            {/* Day Header */}
                            <motion.button
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => toggleDay(weekId, day)}
                              className="w-full p-4 flex items-center justify-between bg-white hover:bg-primary/5 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-primary/20 text-primary font-semibold rounded-md text-sm">
                                  {day}
                                </span>
                                <span className="text-sm text-textSecondary font-medium">
                                  {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""} available
                                </span>
                              </div>
                              <motion.svg
                                animate={{ rotate: isDayExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="w-5 h-5 text-darkBlue"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </motion.svg>
                            </motion.button>

                            {/* Routes - Collapsible */}
                            <AnimatePresence>
                              {isDayExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 space-y-3 bg-gray-50/50">
                                    {daySlots.map((slot) => {
                                      const slotKey = `${slot.weekId}-${slot.dayOfWeek}-${slot.routeId}`;
                                      const isSigningUp = signingUp === slotKey;

                                      return (
                                        <div
                                          key={slotKey}
                                          className="neumorphic-inset p-4 flex items-center justify-between gap-4 bg-white"
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                              <span className="text-lg font-bold text-darkBlue">
                                                Route {slot.routeNumber}
                                              </span>
                                              {slot.routeName && (
                                                <span className="text-sm text-textSecondary">
                                                  ({slot.routeName})
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-sm text-textSecondary">
                                              {slot.currentVolunteers} of {slot.maxVolunteers} volunteer{slot.maxVolunteers !== 1 ? "s" : ""} assigned
                                            </div>
                                          </div>

                                          <button
                                            onClick={() => handleSignUp(slot)}
                                            disabled={isSigningUp}
                                            className="px-6 py-2 bg-limeGreen text-white font-semibold rounded-lg hover:bg-limeGreen/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                                          >
                                            {isSigningUp ? "Signing up..." : "Sign Up"}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
