export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebtoon } from "../../../lib/webtoon/normalize";

function classifyGenre(item: any) {
  const text = Array.isArray(item.genres) ? item.genres.join(" ") : "";

  if (/BL|비엘/i.test(text)) return "BL";
  if (/로맨스판타지|로판/i.test(text)) return "로맨스판타지";
  if (/로맨스/i.test(text)) return "로맨스";

  return undefined;
}

function getAuthors(item: any) {
  if (!Array.isArray(item.artists)) return "";

  return item.artists.map((artist: any) => artist.name).filter(Boolean).join(", ");
}

function makeLezhinCoverUrl(id: number | string, updatedAt: number | string) {
    if (!id || !updatedAt) return "";
  
    return `https://ccdn.lezhin.com/v2/comics/${id}/images/tall.webp?updated=${updatedAt}&width=214`;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ webtoons: [] });
  }

  try {
    const lezhinUrl = `https://www.lezhin.com/lz-api/v2/advanced-search?q=${encodeURIComponent(
      query
    )}&t=all&order=popular&offset=0&limit=30`;

    const res = await fetch(lezhinUrl, {
      headers: {
        Accept: "application/json, text/plain, */*",
        Referer: `https://www.lezhin.com/ko/search?keyword=${encodeURIComponent(query)}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    const data = await res.json();

    const rawItems = data?.data || [];

    const webtoons = rawItems
      .map((item: any) =>
        normalizeWebtoon({
          title: item.title || "",
          author: getAuthors(item),
          cover: makeLezhinCoverUrl(item.id, item.updatedAt),
          url: item.alias
            ? `https://www.lezhin.com/ko/comic/${item.alias}`
            : "",
          platform: "레진코믹스",
          genre: classifyGenre(item),
          contentType: "웹툰",
          schedule: undefined,
        })
      )
      .filter((webtoon: any) => webtoon.title);

    return NextResponse.json({ webtoons });
  } catch (error) {
    console.error("LEZHIN WEBTOON SEARCH ERROR:", error);
    return NextResponse.json({ webtoons: [] }, { status: 500 });
  }
}