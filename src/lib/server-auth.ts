import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "./auth";

/** Check whether the current request carries a valid admin session cookie. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token);
}

/** Unauthorized JSON response helper. */
export function unauthorized() {
  return Response.json({ error: "غير مصرح" }, { status: 401 });
}
