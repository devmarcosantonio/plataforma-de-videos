"use client";

import { motion } from "motion/react";

type Props = {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
};

// Entrada suave para usar dentro de Server Components.
export function FadeIn({ children, delay = 0, y = 12, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 26 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
