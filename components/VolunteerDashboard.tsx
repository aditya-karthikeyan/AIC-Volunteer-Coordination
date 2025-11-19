"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import MealsOnWheelsLogo from "./MealsOnWheelsLogo";
import LogoutButton from "./LogoutButton";
import CarouselNav from "./volunteer/CarouselNav";
import Carousel3D from "./volunteer/Carousel3D";
import MyRoutesCard from "./volunteer/MyRoutesCard";
import OpenSlotsCard from "./volunteer/OpenSlotsCard";
import UpdatePreferencesCard from "./volunteer/UpdatePreferencesCard";

interface VolunteerDashboardProps {
  userId: string;
  userEmail: string;
}

export default function VolunteerDashboard({ userId, userEmail }: VolunteerDashboardProps) {
  const [activeCardIndex, setActiveCardIndex] = useState(1); // Start at middle card (My Routes)
  const [refreshKey, setRefreshKey] = useState(0);

  const navItems = ["Open Slots", "My Routes", "Update"];

  const handleSlotChanged = () => {
    // Trigger a refresh of MyRoutesCard by changing its key
    setRefreshKey(prev => prev + 1);
  };

  const handlePreferencesUpdated = () => {
    // Trigger a refresh of MyRoutesCard and OpenSlotsCard
    setRefreshKey(prev => prev + 1);
  };

  const cards = [
    <OpenSlotsCard key={`open-slots-${refreshKey}`} userId={userId} onSlotChanged={handleSlotChanged} refreshTrigger={refreshKey} />,
    <MyRoutesCard key={`my-routes-${refreshKey}`} volunteerId={userId} />,
    <UpdatePreferencesCard key={`update-preferences-${refreshKey}`} volunteerId={userId} onPreferencesUpdated={handlePreferencesUpdated} />,
  ];

  return (
    <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
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
                Volunteer Dashboard
              </h1>
              <p className="text-textSecondary mt-1 text-base">Welcome back, {userEmail}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </motion.div>

      {/* Carousel Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
      >
        <CarouselNav
          items={navItems}
          activeIndex={activeCardIndex}
          onIndexChange={setActiveCardIndex}
        />
      </motion.div>

      {/* 3D Carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      >
        <Carousel3D
          cards={cards}
          activeIndex={activeCardIndex}
          onIndexChange={setActiveCardIndex}
        />
      </motion.div>

      {/* Swipe Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="text-center mt-8"
      >
        <p className="text-textSecondary text-sm">
          <span className="inline-block mr-2">←</span>
          Swipe or use navigation above
          <span className="inline-block ml-2">→</span>
        </p>
      </motion.div>
    </div>
  );
}

