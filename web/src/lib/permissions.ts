// Espelho das regras da API, só para decidir o que mostrar. Quem garante a permissão é a API.
import type { Access, ActiveRestriction, AuthUser, RestrictionType, UserRole } from "./types";

export function isStaff(user: Pick<AuthUser, "role"> | null | undefined): boolean {
  return user?.role === "moderator" || user?.role === "admin";
}

export function isAdmin(user: Pick<AuthUser, "role"> | null | undefined): boolean {
  return user?.role === "admin";
}

// Mesma regra da API: suspensão e banimento bloqueiam tudo.
const BLOCKED_BY: Record<"upload" | "comment" | "react" | "follow", RestrictionType[]> = {
  upload: ["upload", "suspend", "ban"],
  comment: ["comment", "suspend", "ban"],
  react: ["react", "suspend", "ban"],
  follow: ["suspend", "ban"],
};

// A restrição que impede uma ação (para mostrar prazo e motivo). Permanente vem antes; depois, a que acaba mais tarde.
export function blockingRestriction(access: Access, action: keyof typeof BLOCKED_BY): ActiveRestriction | null {
  const matching = access.restrictions.filter((item) => BLOCKED_BY[action].includes(item.type));
  matching.sort((a, b) => (a.until === null ? -1 : b.until === null ? 1 : b.until.localeCompare(a.until)));
  return matching[0] ?? null;
}

const RANK: Record<UserRole, number> = { user: 0, moderator: 1, admin: 2 };

// Só age sobre quem está abaixo na hierarquia.
export function outranks(actor: Pick<AuthUser, "role">, target: { role: UserRole }): boolean {
  return RANK[actor.role] > RANK[target.role];
}
