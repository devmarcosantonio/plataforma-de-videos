"use client";

import { motion } from "motion/react";
import { Clapperboard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { title: string; description: string; children: React.ReactNode; footer: React.ReactNode };

export function AuthCard({ title, description, children, footer }: Props) {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="w-full max-w-md"
      >
        <Card className="relative overflow-hidden">
          {/* Brilho suave da cor da marca no topo do card. */}
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-primary/20 blur-3xl" />
          <CardHeader className="relative items-center text-center">
            <motion.span
              initial={{ rotate: -12, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
              className="mx-auto mb-2 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            >
              <Clapperboard className="size-6" />
            </motion.span>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="relative flex flex-col gap-6">
            {children}
            <p className="text-center text-sm text-muted-foreground">{footer}</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
