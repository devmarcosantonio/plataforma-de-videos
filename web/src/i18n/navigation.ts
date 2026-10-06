import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Versões de Link/redirect/useRouter/usePathname que mantêm o idioma atual na URL.
// Use estes no lugar dos equivalentes de "next/link" e "next/navigation".
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
