export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebtoon } from "../../../lib/webtoon/normalize";

function decodeHtml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
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

function getContentType(text: string) {
  if (/웹툰/i.test(text)) return "웹툰";
  if (/만화/i.test(text)) return "만화";
  if (/소설|웹소설/i.test(text)) return "웹소설";

  return "웹툰";
}

function makeMrblueCoverUrl(pid: string) {
  if (!pid) return "";

  if (pid.startsWith("wt_")) {
    return `https://img.mrblue.com/prod_img/comics/${pid}/cover_w480.jpg`;
  }

  if (pid.startsWith("E")) {
    return `https://img.mrblue.com/prod_img/ebook/${pid}/vol_0001.jpg`;
  }

  return "";
}

async function getMrblueDetailGenre(detailUrl: string) {
  if (!detailUrl) return undefined;

  try {
    const res = await fetch(detailUrl, {
        headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            Referer: "https://www.mrblue.com/",
            Cookie: process.env.MRBLUE_COOKIE || "",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
    });

    const html = await res.text();

    const keywordsMatch = html.match(
      /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i
    );

    const keywords = decodeHtml(keywordsMatch?.[1] || "");

    if (keywords.split(",").some((word) => word.trim().toUpperCase() === "BL")) {
      return "BL";
    }

    if (keywords.includes("로맨스판타지") || keywords.includes("로판")) {
      return "로맨스판타지";
    }

    if (keywords.includes("로맨스")) {
      return "로맨스";
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ webtoons: [] });
  }

  try {
    const mrblueUrl = `https://www.mrblue.com/search?keyword=${encodeURIComponent(
      query
    )}`;

    const res = await fetch(mrblueUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: "https://www.mrblue.com/",
          Cookie: process.env.MRBLUE_COOKIE || "",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

    const html = await res.text();

    if (!res.ok) {
      console.error("MRBLUE ERROR:", res.status);
      return NextResponse.json({ webtoons: [] }, { status: 500 });
    }

    const liMatches = [
      ...html.matchAll(/<li\s+data-pid="[^"]+"[\s\S]*?<\/li>/g),
    ];

    const webtoons = (
      await Promise.all(
        liMatches.map(async (match) => {
          const li = match[0];

          const pidMatch = li.match(/data-pid="([^"]+)"/);
          const pid = pidMatch ? pidMatch[1] : "";

          const hrefMatch = li.match(/<a\s+href="([^"]+)"/);
          const coverMatch = li.match(/data-original="([^"]+)"/);

          const titleMatch = li.match(
            /<a[^>]+title="([^"]+)"[\s\S]*?<\/a>/
          );

          const authorMatch = li.match(
            /<span class="name">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/span>/
          );

          const categoryMatch = li.match(
            /<span class="label-category[^"]*">([\s\S]*?)<\/span>/
          );

          const title = titleMatch ? decodeHtml(titleMatch[1]) : "";
          const author = authorMatch ? stripTags(authorMatch[1]) : "";
          const category = categoryMatch ? stripTags(categoryMatch[1]) : "";

          if (!title) return null;

          const detailUrl = hrefMatch
            ? `https://www.mrblue.com${decodeHtml(hrefMatch[1])}`
            : "";

          const detailGenre = await getMrblueDetailGenre(detailUrl);

          return normalizeWebtoon({
            title,
            author,
            cover: coverMatch
              ? decodeHtml(coverMatch[1])
              : makeMrblueCoverUrl(pid),
            url: detailUrl,
            platform: "미스터블루",
            genre: detailGenre,
            contentType: getContentType(category),
            schedule: undefined,
          });
        })
      )
    ).filter(Boolean);

    return NextResponse.json({ webtoons });
  } catch (error) {
    console.error("MRBLUE WEBTOON SEARCH ERROR:", error);
    return NextResponse.json({ webtoons: [] }, { status: 500 });
  }
}