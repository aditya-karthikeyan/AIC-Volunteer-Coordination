"use client";

import { ReactNode } from "react";
import { motion, PanInfo } from "framer-motion";

interface Carousel3DProps {
  cards: ReactNode[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export default function Carousel3D({ cards, activeIndex, onIndexChange }: Carousel3DProps) {
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;

    if (info.offset.x > threshold && activeIndex > 0) {
      // Swiped right, go to previous card
      onIndexChange(activeIndex - 1);
    } else if (info.offset.x < -threshold && activeIndex < cards.length - 1) {
      // Swiped left, go to next card
      onIndexChange(activeIndex + 1);
    }
  };

  const getCardStyle = (index: number) => {
    const offset = index - activeIndex;

    if (offset === 0) {
      // Center card - use -50% to center from left: 50%
      return {
        x: "-50%",
        scale: 1,
        opacity: 1,
        zIndex: 30,
        filter: "blur(0px)",
      };
    } else if (offset === -1) {
      // Left card
      return {
        x: "calc(-50% - 450px)",
        scale: 0.85,
        opacity: 0.5,
        zIndex: 10,
        filter: "blur(2px)",
      };
    } else if (offset === 1) {
      // Right card
      return {
        x: "calc(-50% + 450px)",
        scale: 0.85,
        opacity: 0.5,
        zIndex: 10,
        filter: "blur(2px)",
      };
    } else {
      // Hidden cards
      return {
        x: offset > 0 ? "calc(-50% + 800px)" : "calc(-50% - 800px)",
        scale: 0.7,
        opacity: 0,
        zIndex: 0,
        filter: "blur(4px)",
      };
    }
  };

  return (
    <div className="relative w-full" style={{ height: "560px" }}>
      {cards.map((card, index) => {
        const style = getCardStyle(index);
        // Use React key from card if available, otherwise use index
        const cardKey = (card as any)?.key || `card-${index}`;

        return (
          <motion.div
            key={cardKey}
            drag={index === activeIndex ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            animate={style}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              top: "30px",
              left: "50%",
              width: "640px",
              maxWidth: "95vw",
              height: "500px",
              cursor: index === activeIndex ? "grab" : "default",
            }}
            className="select-none"
          >
            <div
              className="w-full"
              style={{
                pointerEvents: index === activeIndex ? "auto" : "none",
              }}
            >
              {card}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

