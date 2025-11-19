"use client";

import { motion } from "framer-motion";
import { formatWeekRange } from "@/lib/utils/dateUtils";

interface AdminDashboardProps {
  weekStart: Date;
  weekEnd: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCopyPreviousWeek: () => void;
  onPublishWeek: () => void;
  onDayClick: (day: string) => void;
  assignmentCounts: { [key: string]: number };
  isPublished: boolean;
  copyingWeek: boolean;
  publishingWeek: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TOTAL_ROUTES = 15;

export default function AdminDashboard({
  weekStart,
  weekEnd,
  onPreviousWeek,
  onNextWeek,
  onCopyPreviousWeek,
  onPublishWeek,
  onDayClick,
  assignmentCounts,
  isPublished,
  copyingWeek,
  publishingWeek,
}: AdminDashboardProps) {
  return (
    <div className="space-y-10 px-8 py-10">
      {/* Week Selector */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center justify-center gap-6"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          onClick={onPreviousWeek}
          className="w-16 h-16 neumorphic flex items-center justify-center text-primary hover:text-primary-dark transition-colors duration-150"
          aria-label="Previous week"
        >
          <svg
            width="28"
            height="28"
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

        <div className="neumorphic px-12 py-6 min-w-[280px] text-center">
          <h2 className="text-3xl font-bold text-darkBlue">
            {formatWeekRange(weekStart, weekEnd)}
          </h2>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          onClick={onNextWeek}
          className="w-16 h-16 neumorphic flex items-center justify-center text-primary hover:text-primary-dark transition-colors duration-150"
          aria-label="Next week"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        className="flex gap-6 justify-center flex-wrap"
      >
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          onClick={onCopyPreviousWeek}
          disabled={copyingWeek}
          className="px-10 py-5 text-lg neumorphic-button text-white font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copyingWeek ? "Copying..." : "Copy Previous Week"}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          onClick={onPublishWeek}
          disabled={publishingWeek}
          className="px-10 py-5 text-lg bg-limeGreen text-darkBlue font-bold rounded-2xl shadow-[0px_8px_20px_rgba(196,214,0,0.4),inset_0px_-3px_5px_rgba(0,0,0,0.15),inset_0px_3px_6px_rgba(255,255,255,0.5)] hover:bg-limeGreen/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublished ? "Published ✓" : publishingWeek ? "Publishing..." : "Publish Week"}
        </motion.button>
      </motion.div>

      {/* Day Cards - Increased spacing and improved hierarchy */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8"
      >
        {DAYS.map((day, index) => {
          const assigned = assignmentCounts[day] || 0;
          const percentage = (assigned / TOTAL_ROUTES) * 100;
          
          // Determine border color based on assignment status
          let borderClass = "route-empty";
          if (assigned === TOTAL_ROUTES) {
            borderClass = "route-assigned";
          } else if (assigned > 0) {
            borderClass = "route-warning";
          }

          return (
            <motion.button
              key={day}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
              whileHover={{ scale: 1.04, y: -6 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDayClick(day)}
              className={`neumorphic ${borderClass} p-8 cursor-pointer hover:shadow-clay-hover transition-shadow duration-150`}
            >
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-darkBlue">{day}</h3>
                <div className="text-sm text-textSecondary font-medium">Assigned</div>
                <div className="text-5xl font-bold text-primary">
                  {assigned}
                  <span className="text-textSecondary text-3xl">/{TOTAL_ROUTES}</span>
                </div>
                {/* Progress indicator */}
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
