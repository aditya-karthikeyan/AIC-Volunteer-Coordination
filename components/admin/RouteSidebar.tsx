"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategorizedVolunteers, VolunteerWithAssignments } from "@/lib/supabase/volunteers";
import { setRouteRequirement } from "@/lib/supabase/admin";

interface RouteSidebarProps {
  routeNumber: number;
  routeId: string;
  weekId: string;
  day: string;
  currentVolunteers: Array<{ id: string; first_name: string; last_name: string }>;
  volunteers: CategorizedVolunteers;
  maxVolunteers: number;
  onAssign: (volunteerId: string) => void;
  onRemove: (volunteerId: string) => void;
  onClose: () => void;
  onCapacityChange: () => void;
  assigning: boolean;
}

export default function RouteSidebar({
  routeNumber,
  routeId,
  weekId,
  day,
  currentVolunteers,
  volunteers,
  maxVolunteers,
  onAssign,
  onRemove,
  onClose,
  onCapacityChange,
  assigning,
}: RouteSidebarProps) {
  const [newCapacity, setNewCapacity] = useState<number>(maxVolunteers);
  const [capacityInput, setCapacityInput] = useState<string>(maxVolunteers.toString());
  const [updatingCapacity, setUpdatingCapacity] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  // Sync input when maxVolunteers prop changes
  useEffect(() => {
    setNewCapacity(maxVolunteers);
    setCapacityInput(maxVolunteers.toString());
  }, [maxVolunteers]);

  const getDayAbbreviation = (day: string): string => {
    return day.substring(0, 3);
  };

  const handleUpdateCapacity = async () => {
    // Validate and set the numeric value from input
    const numValue = parseInt(capacityInput, 10);
    const validValue = isNaN(numValue) ? 1 : Math.max(1, Math.min(10, numValue));
    setNewCapacity(validValue);
    
    if (validValue === maxVolunteers) return;
    
    try {
      setUpdatingCapacity(true);
      setCapacityError(null);
      await setRouteRequirement(weekId, day, routeId, validValue);
      onCapacityChange(); // Refresh parent view
    } catch (error: any) {
      console.error("Error updating capacity:", error);
      setCapacityError(error.message || "Failed to update capacity");
    } finally {
      setUpdatingCapacity(false);
    }
  };

  const VolunteerItem = ({
    volunteer,
    type,
  }: {
    volunteer: VolunteerWithAssignments;
    type: "available" | "scheduled" | "notAvailable";
  }) => {
    const iconColor =
      type === "available"
        ? "text-primary"
        : type === "scheduled"
        ? "text-yellow-500"
        : "text-gray-400";

    const bgColor =
      type === "available"
        ? "bg-primary/30 border-2 border-primary"
        : type === "scheduled"
        ? "bg-yellow-100 border-2 border-yellow-400"
        : "bg-gray-200 border-2 border-gray-300";

    return (
      <motion.button
        whileHover={{ scale: 1.02, x: 3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        onClick={() => onAssign(volunteer.id)}
        disabled={assigning || type === "notAvailable"}
        className={`w-full p-5 rounded-2xl ${bgColor} flex items-center gap-4 cursor-pointer hover:shadow-clay-hover transition-shadow duration-150 disabled:cursor-not-allowed disabled:opacity-60 shadow-clay-sm`}
      >
        {/* Icon */}
        <div className={iconColor}>
          {type === "available" && (
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <path
                d="M16.6667 5L7.50004 14.1667L3.33337 10"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {type === "scheduled" && (
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" fill="currentColor" />
              <text x="10" y="13" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">
                !
              </text>
            </svg>
          )}
          {type === "notAvailable" && (
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Volunteer Name */}
        <div className="flex-1 text-left">
          <div className="font-bold text-darkBlue text-base">
            {volunteer.first_name} {volunteer.last_name}
          </div>
          {type === "scheduled" && volunteer.assignmentsThisWeek.length > 0 && (
            <div className="text-sm text-darkBlue/80 font-medium mt-0.5">
              {volunteer.assignmentsThisWeek.map((a) => `(${getDayAbbreviation(a.day)})`).join(" ")}
            </div>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.2)] z-50 overflow-y-auto"
      >
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-primary/20 pb-5">
            <h2 className="text-4xl font-bold text-primary">Route {routeNumber}</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              onClick={onClose}
              className="w-12 h-12 rounded-xl hover:bg-gray-100 flex items-center justify-center text-darkBlue transition-colors duration-150"
              aria-label="Close sidebar"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>
          </div>

          {/* Capacity Settings */}
          <div className="neumorphic-inset p-6">
            <div className="text-lg font-bold text-darkBlue mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Max Volunteers
            </div>
            <div className="flex items-center gap-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[1-9]|10"
                value={capacityInput}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow typing numbers only, or empty string
                  // Accept any numeric input, we'll validate on blur
                  if (value === '' || /^\d+$/.test(value)) {
                    setCapacityInput(value);
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
                      setNewCapacity(numValue);
                    }
                  }
                }}
                onBlur={(e) => {
                  // Validate and fix value when user leaves the field
                  const numValue = parseInt(capacityInput, 10);
                  if (isNaN(numValue) || numValue < 1) {
                    setCapacityInput('1');
                    setNewCapacity(1);
                  } else if (numValue > 10) {
                    setCapacityInput('10');
                    setNewCapacity(10);
                  } else {
                    setCapacityInput(numValue.toString());
                    setNewCapacity(numValue);
                  }
                }}
                className="flex-1 px-4 py-3 text-lg font-bold text-darkBlue bg-white border-2 border-primary/30 rounded-xl focus:border-primary focus:outline-none transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpdateCapacity}
                disabled={updatingCapacity || newCapacity === maxVolunteers || isNaN(parseInt(capacityInput, 10))}
                className="px-6 py-3 bg-limeGreen text-white font-bold rounded-xl hover:bg-limeGreen/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {updatingCapacity ? "Updating..." : "Update"}
              </motion.button>
            </div>
            {capacityError && (
              <div className="mt-3 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm">
                {capacityError}
              </div>
            )}
            {newCapacity !== maxVolunteers && !capacityError && (
              <div className="mt-3 text-sm text-textSecondary">
                Click Update to save changes. Don't forget to publish the week again!
              </div>
            )}
          </div>

          {/* Current Assignments */}
          <div className="neumorphic p-6 border-2 border-primary/20">
            <div className="text-lg font-bold text-primary mb-4">
              Current Assignments ({currentVolunteers.length})
            </div>
            {currentVolunteers.length > 0 ? (
              <div className="space-y-3">
                {currentVolunteers.map((volunteer) => (
                  <div
                    key={volunteer.id}
                    className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/30"
                  >
                    <div className="text-base font-bold text-darkBlue">
                      {volunteer.first_name} {volunteer.last_name}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      onClick={() => onRemove(volunteer.id)}
                      disabled={assigning}
                      className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors duration-150 shadow-md"
                    >
                      Remove
                    </motion.button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-lg font-medium text-textSecondary">None assigned yet</div>
            )}
          </div>

          {/* Available Today */}
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent mb-4 flex items-center gap-2">
              <span className="text-primary text-xl">✓</span> Available Today
            </h3>
            <div className="space-y-2">
              {volunteers.available.length > 0 ? (
                volunteers.available.map((volunteer) => (
                  <VolunteerItem
                    key={volunteer.id}
                    volunteer={volunteer}
                    type="available"
                  />
                ))
              ) : (
                <div className="text-base text-darkBlue/50 italic p-4">
                  No volunteers available
                </div>
              )}
            </div>
          </div>

          {/* Already Scheduled This Week */}
          <div>
            <h3 className="text-lg font-bold text-yellow-700 mb-4 flex items-center gap-2">
              <span className="text-yellow-500 text-xl">⚠</span> Already Scheduled This Week
            </h3>
            <div className="space-y-2">
              {volunteers.alreadyScheduled.length > 0 ? (
                volunteers.alreadyScheduled.map((volunteer) => (
                  <VolunteerItem
                    key={volunteer.id}
                    volunteer={volunteer}
                    type="scheduled"
                  />
                ))
              ) : (
                <div className="text-base text-darkBlue/50 italic p-4">
                  No scheduled volunteers
                </div>
              )}
            </div>
          </div>

          {/* Not Available */}
          <div>
            <h3 className="text-lg font-bold text-gray-600 mb-4 flex items-center gap-2">
              <span className="text-gray-400 text-xl">✕</span> Not Available
            </h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {volunteers.notAvailable.length > 0 ? (
                volunteers.notAvailable.map((volunteer) => (
                  <VolunteerItem
                    key={volunteer.id}
                    volunteer={volunteer}
                    type="notAvailable"
                  />
                ))
              ) : (
                <div className="text-base text-darkBlue/50 italic p-4">
                  All volunteers available
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

