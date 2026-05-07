export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebtoon } from "../../../lib/webtoon/normalize";

function makeKakaoCoverUrl(thumbnail: string) {
  if (!thumbnail) return "";

  return `https://dn-img-page.kakao.com/download/resource?kid=${thumbnail}`;
}

function classifyGenre(item: any) {
  const text = [item.sub_category, item.category]
    .filter(Boolean)
    .join(" ");

  if (/BL|비엘/i.test(text)) return "BL";
  if (/로맨스판타지|로판/i.test(text)) return "로맨스판타지";
  if (/로맨스/i.test(text)) return "로맨스";

  return undefined;
}

function getContentType(item: any) {
  const text = [item.category, item.sub_category]
    .filter(Boolean)
    .join(" ");

  if (/웹툰|만화/i.test(text)) return "웹툰";
  if (/웹소설/i.test(text)) return "웹소설";

  return "이북";
}

function extractKakaoSchedule(description: string) {
    if (!description) return undefined;
  
    const text = description.replace(/\s+/g, " ");
  
    const weekdayMatch = text.match(
      /매주\s*([월화수목금토일])(?:요일)?\s*(?:연재|업데이트)/
    );
  
    if (weekdayMatch?.[1]) {
      return weekdayMatch[1];
    }
  
    const weekdayListMatch = text.match(
      /매주\s*([월화수목금토일](?:\s*,\s*[월화수목금토일])*)\s*(?:요일)?\s*(?:연재|업데이트)/
    );
  
    if (weekdayListMatch?.[1]) {
      return weekdayListMatch[1].replace(/\s/g, "");
    }
  
    if (/완결/.test(text)) {
      return "완결";
    }
  
    return undefined;
  }

async function getKakaoSchedule(seriesId: number | string) {
    if (!seriesId) return undefined;
  
    try {
      const url = `https://bff-page.kakao.com/api/gateway/api/v2/content/product/list?series_id=${seriesId}&cursor_index=0&cursor_direction=ANCHOR&window_size=6`;
  
      const res = await fetch(url, {
        headers: {
          Accept: "application/json, text/plain, */*",
          Origin: "https://page.kakao.com",
          Referer: `https://page.kakao.com/content/${seriesId}`,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });
  
      const data = await res.json();
  
      const description = data?.result?.series_item?.description || "";
      console.log("카카오 상세 제목:", data?.result?.series_item?.title);
      console.log("카카오 상세 설명:", description);
      console.log("카카오 추출 연재일:", extractKakaoSchedule(description));
      return extractKakaoSchedule(description);
    } catch (error) {
      console.error("카카오 연재일 가져오기 실패:", error);
      return undefined;
    }
  }

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ webtoons: [] });
  }

  try {
    const kakaoUrl = `https://bff-page.kakao.com/api/gateway/api/v1/search/series?keyword=${encodeURIComponent(
      query
    )}&category_uid=0&is_complete=false&sort_type=ACCURACY&page=0&size=25`;

    const res = await fetch(kakaoUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        Origin: "https://page.kakao.com",
        Referer: `https://page.kakao.com/search/result?keyword=${encodeURIComponent(
          query
        )}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("KAKAO ERROR:", res.status);
      return NextResponse.json({ webtoons: [] }, { status: 500 });
    }

    const data = JSON.parse(text);

    const rawItems = data?.result?.list || [];

    const webtoons = (
        await Promise.all(
          rawItems.map(async (item: any) => {
            const schedule = await getKakaoSchedule(item.series_id);
      
            return normalizeWebtoon({
              title: item.title || "",
              author: item.authors || "",
              cover: makeKakaoCoverUrl(item.thumbnail || ""),
              url: item.series_id
                ? `https://page.kakao.com/content/${item.series_id}`
                : "",
              platform: "카카오페이지",
              genre: classifyGenre(item),
              contentType: getContentType(item),
              schedule,
            });
          })
        )
      ).filter((webtoon: any) => webtoon.title);

    return NextResponse.json({ webtoons });
  } catch (error) {
    console.error("KAKAO WEBTOON SEARCH ERROR:", error);

    return NextResponse.json({ webtoons: [] }, { status: 500 });
  }
}