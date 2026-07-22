import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { checkPassword, createSessionToken, ADMIN_COOKIE, ADMIN_MAX_AGE_SEC } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const password = body?.password;
  if (!password) {
    return Response.json({ error: "كلمة السر مطلوبة" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    return Response.json({ error: "كلمة السر غير صحيحة" }, { status: 401 });
  }

  const token = createSessionToken();
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_MAX_AGE_SEC,
  });

  return Response.json({ ok: true });
}
