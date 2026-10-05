"use client";

import { useState } from "react";
import type { User } from "@/lib/types";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

type Props = { children: React.ReactNode; users: User[]; currentUserId: string | null };

export function AppShell({ children, users, currentUserId }: Props) {
  // Desktop: alterna entre menu largo e compacto. Mobile: abre como gaveta.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleMenu() {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((value) => !value);
    else setMobileOpen((value) => !value);
  }

  return (
    <>
      <Header onMenuClick={toggleMenu} users={users} currentUserId={currentUserId} />
      <div className="flex">
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </>
  );
}
