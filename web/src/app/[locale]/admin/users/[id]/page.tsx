import { notFound } from "next/navigation";
import { UserDetails } from "@/components/admin/user-details";
import { getAdminUserDetails } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export default async function AdminUserPage({ params }: PageProps<"/[locale]/admin/users/[id]">) {
  const { id } = await params;
  const viewer = await requireSession(`/admin/users/${id}`);
  const details = await getAdminUserDetails(id).catch(() => null);
  if (!details) notFound();

  return <UserDetails viewer={viewer} details={details} />;
}
