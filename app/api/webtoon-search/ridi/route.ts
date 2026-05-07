export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebtoon } from "../../../lib/webtoon/normalize";

function makeCoverUrl(id: string) {
  if (!id) return "";
  return `https://img.ridicdn.net/cover/${id}/xxlarge?dpi=xxhdpi`;
}

function classifyGenre(item: any) {
  const text = [
    item.parent_category_name,
    item.parent_category_name2,
    item.category_name,
  ]
    .filter(Boolean)
    .join(" ");

  if (/BL|비엘/i.test(text)) return "BL";
  if (/로맨스판타지|로판/i.test(text)) return "로맨스판타지";
  if (/로맨스/i.test(text)) return "로맨스";

  return undefined;
}

function getContentType(item: any) {
  const text = [
    item.parent_category_name,
    item.parent_category_name2,
    item.category_name,
  ]
    .filter(Boolean)
    .join(" ");

  if (/웹툰|만화/i.test(text)) return "웹툰";
  if (Number(item.is_serial) === 1) return "웹소설";

  return "이북";
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ webtoons: [] });
  }

  try {
    const ridiUrl = `https://ridibooks.com/apps/search/search?keyword=${encodeURIComponent(
      query
    )}&adult_exclude=n`;

    const res = await fetch(ridiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json, text/plain, */*",
        Referer: "https://ridibooks.com/",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("RIDI ERROR:", res.status, text.slice(0, 500));
      return NextResponse.json({ webtoons: [] }, { status: 500 });
    }

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("JSON 아님:", text.slice(0, 500));
      return NextResponse.json({ webtoons: [] }, { status: 500 });
    }

    const rawItems = data?.books || [];

    const webtoons = (
      await Promise.all(
        rawItems.map(async (item: any) => {
          const id = item.b_id || item.book_id || item.id || "";
          const url = id ? `https://ridibooks.com/books/${id}` : "";

          return normalizeWebtoon({
            title: item.title || item.web_title || "",
            cover:
              item.cover ||
              item.cover_url ||
              item.thumbnail ||
              item.thumbnail_url ||
              item.image ||
              item.image_url ||
              makeCoverUrl(id),
            url,
            platform: "리디북스",
            author: item.author || item.author2 || "",
            genre: classifyGenre(item),
            contentType: getContentType(item),
          });
        })
      )
    ).filter((webtoon: any) => webtoon.title);

    return NextResponse.json({ webtoons });
  } catch (error) {
    console.error("RIDI WEBTOON SEARCH ERROR:", error);
    return NextResponse.json({ webtoons: [] }, { status: 500 });
  }
}