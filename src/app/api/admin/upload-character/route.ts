import { NextRequest } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

/**
 * POST /api/admin/upload-character
 * Upload a character portrait (multipart form, field "file").
 * Saves to public/uploads/characters/. Returns { url }.
 */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "طلب رفع غير صالح" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "لم يتم إرسال ملف" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json(
      { error: "نوع الملف غير مدعوم (jpg/png/webp فقط)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "حجم الملف يتجاوز 6 ميجابايت" },
      { status: 400 }
    );
  }

  const ext = EXT_BY_TYPE[file.type] || "jpg";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const filename = `char-${stamp}-${rand}.${ext}`;

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "characters"
  );
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
  const filepath = path.join(uploadDir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  const url = `/uploads/characters/${filename}`;
  return Response.json({ url });
}
