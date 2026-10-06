import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  user: Pick<User, "display_name"> | null | undefined;
  size?: "sm" | "default" | "lg";
  className?: string;
};

export function UserAvatar({ user, size = "default", className }: Props) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback
        className={cn("font-semibold", user ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}
      >
        {initials(user)}
      </AvatarFallback>
    </Avatar>
  );
}
