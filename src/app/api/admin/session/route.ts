import { isAuthenticated } from "@/lib/server-auth";

export async function GET() {
  const authed = await isAuthenticated();
  return Response.json({ authenticated: authed });
}
