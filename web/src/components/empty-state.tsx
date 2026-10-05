"use client";

import { motion } from "motion/react";

type Props = {
  // Elemento (ex.: <VideoOff />), não o componente: funções não podem ser passadas
  // de Server Components para Client Components.
  icon: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon, title, description, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center"
    >
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 [&_svg]:size-7"
      >
        {icon}
      </motion.span>
      <h2 className="mt-2 text-lg font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-2">{children}</div>}
    </motion.div>
  );
}
