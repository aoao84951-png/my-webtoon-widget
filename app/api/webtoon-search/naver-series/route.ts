export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebtoon } from "../../../lib/webtoon/normalize";

function decodeHtml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(text: string) {
  return decodeHtml(text.replace(/<[^>]*>/g, ""));
}

function classifyGenre(genre: string) {
  if (/BL|비엘/i.test(genre)) return "BL";
  if (/로판|로맨스판타지/i.test(genre)) return "로맨스판타지";
  if (/로맨스/i.test(genre)) return "로맨스";

  return undefined;
}

async function getNaverGenre(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Cookie: process.env.NAVER_SERIES_COOKIE || "",
      },
    });

    const html = await res.text();

    const genreMatch = html.match(
      /<a href="\/(?:novel|comic|ebook)\/categoryProductList\.series\?categoryTypeCode=genre[^"]*">([^<]+)<\/a>/
    );

    return genreMatch?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

function getContentType(li: string, rawTitle: string) {
  if (li.includes("N=a:com.title")) {
    return rawTitle.includes("화") ? "웹툰" : "만화";
  }

  if (li.includes("N=a:nov.title")) {
    return "웹소설";
  }

  if (li.includes("N=a:book.title")) {
    return "이북";
  }

  return "네이버시리즈";
}

async function getNaverSeriesSchedule(url: string) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://series.naver.com/",
        Cookie: process.env.NAVER_SERIES_COOKIE || "",
      },
    });

    const html = await res.text();
    const text = stripTags(html);

    const scheduleIndex = text.search(/연재|요일|완결|휴재|업데이트/);

    console.log("네이버 연재정보 위치:", scheduleIndex);

    if (scheduleIndex !== -1) {
      console.log(
        "네이버 연재정보 주변:",
        text.slice(Math.max(0, scheduleIndex - 500), scheduleIndex + 1000)
      );
    }

    const scheduleMatch = text.match(
      /(매주\s*[월화수목금토일](?:,\s*[월화수목금토일])*\s*연재|[월화수목금토일](?:,\s*[월화수목금토일])*\s*연재|매일\s*연재|완결|연재중)/
    );

    if (scheduleMatch?.[1]) {
      const value = scheduleMatch[1].trim();
    
      if (value === "연재중") {
        return "연재중";
      }
    
      return value
        .replace(/매주\s*/g, "")
        .replace(/\s*연재/g, "")
        .replace(/\s+/g, "")
        .trim();
    }

    return undefined;
  } catch (error) {
    console.error("네이버 연재주기 가져오기 실패:", error);
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ webtoons: [] });
  }

  try {
    const url = `https://series.naver.com/search/search.series?t=all&fs=novel&q=${encodeURIComponent(
      query
    )}`;

    const res = await fetch(url, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://series.naver.com/",
        Cookie: process.env.NAVER_SERIES_COOKIE || "",
      },
    });

    const html = await res.text();

    if (!res.ok) {
      console.error("NAVER SERIES ERROR:", res.status);

      return NextResponse.json({ webtoons: [] }, { status: 500 });
    }

    const liMatches = [...html.matchAll(/<li>[\s\S]*?<\/li>/g)];

    const webtoons = (
      await Promise.all(
        liMatches.map(async (match) => {
          const li = match[0];

          const titleMatch = li.match(
            /<a[^>]+href="([^"]*detail\.series\?productNo=[^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>/
          );

          if (!titleMatch) return null;

          const detailPath = decodeHtml(titleMatch[1]);
          const rawTitle = stripTags(titleMatch[2]);

          const coverMatch =
            li.match(/<img[^>]+data-original="([^"]+)"/) ||
            li.match(/<img[^>]+src="([^"]+)"/);

          const authorMatch = li.match(
            /<span class="author">([\s\S]*?)<\/span>/
          );

          const cleanTitle = rawTitle
            .replace(/\s*\(총\s*[0-9]+(?:화|권)\/[^)]*\)\s*/g, "")
            .trim();

          const fullUrl = `https://series.naver.com${detailPath}`;

          const genreText = await getNaverGenre(fullUrl);

          const schedule = await getNaverSeriesSchedule(fullUrl);

          return normalizeWebtoon({
            title: cleanTitle,
            author: authorMatch ? stripTags(authorMatch[1]) : "",
            cover: coverMatch
                ? decodeHtml(coverMatch[1]).replace(/\?.*$/, "")
                : "",
            url: fullUrl,
            platform: "네이버시리즈",
            genre: classifyGenre(genreText),
            contentType: getContentType(li, rawTitle),
            schedule,
          });
        })
      )
    ).filter(Boolean);

    return NextResponse.json({ webtoons });
  } catch (error) {
    console.error("NAVER SERIES WEBTOON SEARCH ERROR:", error);

    return NextResponse.json({ webtoons: [] }, { status: 500 });
  }
}