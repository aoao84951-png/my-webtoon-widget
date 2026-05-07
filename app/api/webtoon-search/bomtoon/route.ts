export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebtoon } from "../../../lib/webtoon/normalize";

function pickCover(thumbnails: any[]) {
  if (!Array.isArray(thumbnails)) return "";

  return (
    thumbnails.find((t) => t.thumbnailType === "VERTICAL")?.imagePath ||
    thumbnails.find((t) => t.thumbnailType === "MAIN")?.imagePath ||
    thumbnails[0]?.imagePath ||
    ""
  );
}

function classifyGenre(item: any) {
  const text = Array.isArray(item.tags) ? item.tags.join(" ") : "";

  if (/BL|비엘/i.test(text)) return "BL";
  if (/로맨스판타지|로판/i.test(text)) return "로맨스판타지";
  if (/로맨스/i.test(text)) return "로맨스";

  return undefined;
}

function getContentType(item: any) {
  if (item.contentsType === "comic" || item.contentsType === "cartoon") {
    return "웹툰";
  }

  if (item.contentsType === "novel") {
    return "이북";
  }

  return "웹툰";
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ webtoons: [] });
  }

  try {
    const bomtoonUrl = `https://www.bomtoon.com/api/balcony-search-api/search?searchText=${encodeURIComponent(
      query
    )}&contentsType=ALL&page=0&size=50&device=WEB&isExcludeAdult=false&onlyComplete=false&isSearchTool=true&sortType=ACCURACY`;

    const res = await fetch(bomtoonUrl, {
      headers: {
        Accept: "application/json, text/plain, */*",
        Referer: `https://www.bomtoon.com/search?q=${encodeURIComponent(
          query
        )}&ref=input`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    const data = await res.json();

    const rawItems = data?.data?.results || [];

    const webtoons = rawItems
      .map((item: any) =>
        normalizeWebtoon({
          title: item.title || "",
          author: Array.isArray(item.author) ? item.author.join(", ") : "",
          cover: pickCover(item.thumbnail),
          url: item.alias
            ? `https://www.bomtoon.com/detail/${item.alias}`
            : `https://www.bomtoon.com/detail/${item.contentsId}`,
          platform: "봄툰",
          genre: classifyGenre(item),
          contentType: getContentType(item),
          schedule: undefined,
        })
      )
      .filter((webtoon: any) => webtoon.title);

    return NextResponse.json({ webtoons });
  } catch (error) {
    console.error("BOMTOON WEBTOON SEARCH ERROR:", error);
    return NextResponse.json({ webtoons: [] }, { status: 500 });
  }
}