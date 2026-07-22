import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/server-auth";
import { EditChapterClient } from "./edit-client";

export const dynamic = "force-dynamic";

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  if (!(await isAuthenticated())) {
    redirect("/admin");
  }

  const { number: numStr } = await params;
  const num = Number(numStr);
  if (!Number.isFinite(num) || num < 1) notFound();

  const [chapter, characters] = await Promise.all([
    db.chapter.findFirst({
      where: { number: num },
      select: {
        id: true,
        number: true,
        title: true,
        content: true,
        coverImageUrl: true,
        recap: true,
      },
    }),
    db.character.findMany({
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
      select: { id: true, name: true, imageUrl: true },
    }),
  ]);

  if (!chapter) notFound();

  return (
    <EditChapterClient
      chapter={chapter}
      characters={characters.map((c) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
      }))}
    />
  );
}
