import { UserTable } from "@/components/admin/user-table";
import { getAdminUsers } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export default async function AdminUsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  const user = await requireSession("/admin/users");
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const page = await getAdminUsers(query);

  return <UserTable key={query} viewer={user} query={query} initialPage={page} />;
}
