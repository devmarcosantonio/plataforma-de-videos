"use client";

import { useState } from "react";
import { Ban, ChevronRight, Loader2, Search, ShieldCheck, Upload, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { errorMessage, getJson, postJson, sendJson } from "@/lib/client-api";
import { channelHref, handle } from "@/lib/format";
import { isAdmin, outranks } from "@/lib/permissions";
import type { Access, AdminUser, AuthUser, Page, UserRole } from "@/lib/types";
import { EmptyState } from "../empty-state";
import { UserAvatar } from "../user-avatar";
import { RestrictDialog } from "./restrict-dialog";
import { RestrictionBadges } from "./restriction-badges";

const ROLES: UserRole[] = ["user", "moderator", "admin"];

type Props = { viewer: Pick<AuthUser, "id" | "role">; query: string; initialPage: Page<AdminUser> };

export function UserTable({ viewer, query, initialPage }: Props) {
  const t = useTranslations("admin.users");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.next_cursor);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [restricting, setRestricting] = useState<AdminUser | null>(null);

  const update = (id: string, patch: Partial<AdminUser>) =>
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get("q")?.toString().trim();
    router.push(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ cursor: nextCursor, ...(query && { q: query }) });
      const page = await getJson<Page<AdminUser>>(`/admin/users?${params}`);
      setUsers((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setLoading(false);
    }
  }

  async function approve(user: AdminUser) {
    setPending(user.id);
    try {
      const { access } = await postJson<{ access: Access }>(`/admin/users/${user.id}/upload-access/grant`, {});
      update(user.id, { access });
      toast.success(t("granted", { handle: handle(user) }));
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setPending(null);
    }
  }

  async function changeRole(user: AdminUser, role: UserRole) {
    setPending(user.id);
    try {
      await sendJson("PATCH", `/admin/users/${user.id}/role`, { role });
      update(user.id, { role });
      toast.success(t("roleChanged", { handle: handle(user), role: tr(role) }));
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} role="search" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          key={query}
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t("search")}
          aria-label={t("search")}
          className="h-10 rounded-full pl-10"
        />
      </form>

      {users.length === 0 ? (
        <EmptyState icon={<Users />} title={t("empty")} />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <ul className="divide-y">
            {users.map((user) => {
              // Só age sobre quem está abaixo na hierarquia (e nunca sobre si).
              const manageable = user.id !== viewer.id && outranks(viewer, user);
              const busy = pending === user.id;
              return (
                <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1 basis-48">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={channelHref(user)} className="truncate font-medium hover:text-primary">
                        {user.display_name}
                      </Link>
                      {user.role !== "user" && (
                        <Badge variant="secondary">
                          <ShieldCheck />
                          {tr(user.role)}
                        </Badge>
                      )}
                      {user.access.upload_blocked_by === "approval" && <Badge variant="outline">{t("notApproved")}</Badge>}
                      <RestrictionBadges access={user.access} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {handle(user)} · {user.email} · {t("videos", { count: user.videos_count })} ·{" "}
                      {format.dateTime(new Date(user.created_at), { dateStyle: "medium" })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {manageable && user.access.upload_blocked_by === "approval" && (
                      <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => approve(user)}>
                        <Upload />
                        {t("grant")}
                      </Button>
                    )}
                    {manageable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-destructive hover:text-destructive"
                        disabled={busy}
                        onClick={() => setRestricting(user)}
                      >
                        <Ban />
                        {t("restrict")}
                      </Button>
                    )}
                    {isAdmin(viewer) && manageable && (
                      <Select value={user.role} onValueChange={(role) => changeRole(user, role as UserRole)} disabled={busy}>
                        <SelectTrigger size="sm" aria-label={t("role")} className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {tr(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button asChild size="sm" variant="ghost" className="rounded-full">
                      <Link href={`/admin/users/${user.id}`}>
                        {t("details")}
                        <ChevronRight />
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-full px-6" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? tc("loading") : tc("loadMore")}
          </Button>
        </div>
      )}

      <RestrictDialog
        target={restricting}
        isAdmin={isAdmin(viewer)}
        onOpenChange={(open) => !open && setRestricting(null)}
        onApplied={(access) => restricting && update(restricting.id, { access })}
      />
    </div>
  );
}
