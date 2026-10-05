"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

// Número que desliza para cima ao aumentar e para baixo ao diminuir.
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [last, setLast] = useState({ value, direction: 1 });

  // Ajuste de estado durante a renderização (padrão recomendado pelo React) para lembrar a direção.
  if (last.value !== value) {
    setLast({ value, direction: value > last.value ? 1 : -1 });
  }
  const direction = last.value !== value ? (value > last.value ? 1 : -1) : last.direction;

  return (
    <span className={cn("relative inline-flex overflow-hidden tabular-nums", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: `${direction * 100}%`, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: `${direction * -100}%`, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
