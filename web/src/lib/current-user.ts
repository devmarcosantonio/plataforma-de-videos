// "Usuário atual" provisório, guardado em cookie até existir login de verdade.
import { cookies } from "next/headers";
import { CURRENT_USER_COOKIE } from "./format";

export async function getCurrentUserId(): Promise<string | null> {
  return (await cookies()).get(CURRENT_USER_COOKIE)?.value ?? null;
}
