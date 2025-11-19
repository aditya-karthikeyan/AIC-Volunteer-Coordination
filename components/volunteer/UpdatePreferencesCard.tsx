"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateVolunteerPreferences, UpdatePreferencesResult } from "@/lib/supabase/volunteer";
import { getUserProfile } from "@/lib/supabase/profile";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

interface UpdatePreferencesCardProps {
  volunteerId: string;
  onPreferencesUpdated?: () => void;
}

export default function UpdatePreferencesCard({ 
  volunteerId,
  onPreferencesUpdated 
}: UpdatePreferencesCardProps) {
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentAvailability = async () => {
      try {
        const profile = await getUserProfile(volunteerId);
        if (profile && profile.availability_days) {
          setAvailabilityDays(profile.availability_days || []);
        }
      } catch (error) {
        console.error("Error fetching current availability:", error);
        setError("Failed to load current preferences");
      } finally {
        setFetching(false);
      }
    };

    fetchCurrentAvailability();
  }, [volunteerId]);

  const toggleDay = (day: string) => {
    setAvailabilityDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
    // Clear messages when user makes changes
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation - allow removing all days (they can still see open slots)
    try {
      const result: UpdatePreferencesResult = await updateVolunteerPreferences(
        volunteerId,
        availabilityDays
      );

      // Build success message
      let message = "Preferences updated successfully!";
      
      if (result.removedAssignments > 0) {
        message = `Preferences updated! Removed from ${result.removedAssignments} route${result.removedAssignments === 1 ? "" : "s"} across ${result.affectedWeeks} future week${result.affectedWeeks === 1 ? "" : "s"}.`;
      } else if (result.affectedWeeks === 0) {
        message = "Preferences updated for future weeks.";
      } else {
        message = "Preferences updated! No changes needed to future assignments.";
      }

      setSuccess(message);

      // Callback to refresh other cards if needed
      if (onPreferencesUpdated) {
        onPreferencesUpdated();
      }

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      setError(error.message || "Failed to update preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="neumorphic p-10 h-[500px] w-full flex items-center justify-center">
        <div className="text-darkBlue">Loading...</div>
      </div>
    );
  }

  return (
    <div className="neumorphic p-10 h-[500px] w-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="text-center">
          <div className="inline-block p-3 bg-primary/20 rounded-full mb-3">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-darkBlue mb-1">Update Preferences</h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-2 pb-2">
        <div className="max-w-xl mx-auto">
          {/* Warning/Info Box */}
          <div className="mb-5 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-2">How this works:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Updating your preferences will affect all future weeks (after the current week)</li>
                  <li><strong>Adding a day:</strong> You'll become available for that day, and admins can assign you</li>
                  <li><strong>Removing a day:</strong> You'll be automatically removed from all routes on that day in future weeks</li>
                  <li>Current week assignments are not affected</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Days Checkboxes */}
            <div className="mb-5">
              <p className="text-sm text-darkBlue/70 mb-3 font-medium">
                Select the days of the week you are available to volunteer
              </p>
              
              <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day}
                    className="flex items-center cursor-pointer p-3 neumorphic-inset rounded-xl hover:bg-gray-50/50 transition-colors duration-150 h-[52px]"
                  >
                    <input
                      type="checkbox"
                      checked={availabilityDays.includes(day)}
                      onChange={() => toggleDay(day)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-200 mr-3 flex-shrink-0 ${
                        availabilityDays.includes(day)
                          ? "bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-1px_-1px_2px_rgba(255,255,255,0.3)]"
                          : "bg-gray-200 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]"
                      }`}
                    >
                      <motion.svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0"
                        initial={false}
                        animate={{
                          opacity: availabilityDays.includes(day) ? 1 : 0,
                          scale: availabilityDays.includes(day) ? 1 : 0.5,
                        }}
                        transition={{ duration: 0.15 }}
                      >
                        <path
                          d="M10 3L4.5 8.5L2 6"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    </div>
                    <span className="text-darkBlue font-medium flex-shrink-0">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message Area - Fixed height to prevent layout shifts */}
            <div className="h-[80px] mb-5 flex items-start">
              <AnimatePresence mode="wait">
                {availabilityDays.length === 0 && !error && !success && (
                  <motion.div
                    key="warning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
                      <p>
                        <strong>Note:</strong> You're removing all availability days. You can still view and sign up for open slots, but admins won't be able to assign you to routes.
                      </p>
                    </div>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm">
                      {success}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 neumorphic-button text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Preferences"}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}

