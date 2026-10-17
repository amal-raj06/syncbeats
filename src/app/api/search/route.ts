import { NextResponse } from "next/server";
import YouTube from "youtube-sr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const videos = await YouTube.search(query, { limit: 6, type: "video" });
    const results = videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail?.url,
      channel: v.channel?.name,
      duration: v.durationFormatted,
    }));
    return NextResponse.json({ results });
  } catch (error) {
    console.error("YouTube search error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}