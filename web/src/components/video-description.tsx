"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLLAPSE_AFTER = 220;

export function VideoDescription({ description, publishedLabel }: { description: string | null; publishedLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = (description?.length ?? 0) > COLLAPSE_AFTER;

  return (
    <Card className="gap-2 py-4">
      <CardContent className="text-sm">
        <p className="mb-1 font-medium">{publishedLabel}</p>
        {description ? (
          <motion.div layout transition={{ type: "spring", stiffness: 300, damping: 32 }}>
            <p className={cn("whitespace-pre-line text-foreground/90", long && !expanded && "line-clamp-3")}>
              {description}
            </p>
          </motion.div>
        ) : (
          <p className="text-muted-foreground">Sem descrição.</p>
        )}
        {long && (
          <Button variant="link" size="sm" className="mt-1 h-auto px-0" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Mostrar menos" : "Mostrar mais"}
            <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
