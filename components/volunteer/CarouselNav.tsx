"use client";

import { motion } from "framer-motion";

interface CarouselNavProps {
  items: string[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export default function CarouselNav({ items, activeIndex, onIndexChange }: CarouselNavProps) {
  return (
    <div className="flex items-center justify-center gap-8 mb-12">
      {items.map((item, index) => {
        const isActive = index === activeIndex;

        return (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            onClick={() => onIndexChange(index)}
            className="relative px-6 py-3 text-lg font-bold transition-colors duration-150"
            style={{
              color: isActive ? "#3BB4C1" : "#475466",
            }}
          >
            {item}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

