import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Lord of the Truth API",
    version: "1.0",
    endpoints: {
      chapters: "/api/chapters",
      comments: "/api/comments",
      characters: "/api/characters",
    },
  });
}
