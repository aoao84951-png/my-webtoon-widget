import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const runtime = "nodejs";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const databaseId = process.env.NOTION_DATABASE_ID;

function getPlainText(property: any) {
  if (!property) return "";

  if (property.type === "title") {
    return property.title?.map((t: any) => t.plain_text).join("") ?? "";
  }

  if (property.type === "rich_text") {
    return property.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  }

  if (property.type === "select") {
    return property.select?.name ?? "";
  }

  if (property.type === "multi_select") {
    return property.multi_select?.map((v: any) => v.name).join(", ") ?? "";
  }

  if (property.type === "status") {
    return property.status?.name ?? "";
  }

  return "";
}

function getUrl(property: any) {
  if (!property) return "";

  if (property.type === "url") {
    return property.url ?? "";
  }

  if (property.type === "rich_text") {
    return property.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  }

  return "";
}

function getCoverUrl(property: any) {
  if (!property) return "";

  if (property.type === "files") {
    const file = property.files?.[0];
    if (!file) return "";

    if (file.type === "external") return file.external.url;
    if (file.type === "file") return file.file.url;
  }

  return "";
}

export async function GET() {
  try {
    if (!databaseId) {
      return NextResponse.json(
        { error: "NOTION_DATABASE_ID가 없습니다." },
        { status: 500 }
      );
    }

    const database = await (notion.databases as any).retrieve({
      database_id: databaseId,
    });

    const dataSourceId = database.data_sources?.[0]?.id;

    if (!dataSourceId) {
      return NextResponse.json(
        { error: "데이터소스 ID를 찾지 못했습니다." },
        { status: 500 }
      );
    }

    const response = await (notion.dataSources as any).query({
      data_source_id: dataSourceId,
      page_size: 100,
    });

    const items = response.results.map((page: any) => {
      const properties = page.properties;

      return {
        id: page.id,
        title: getPlainText(properties["제목"]),
        cover: getCoverUrl(properties["cover"]),
        platform: getPlainText(properties["플랫폼"]),
        schedule: getPlainText(properties["연재일/연재주기"]),
        link: getUrl(properties["플랫폼 링크"]),
        genre: getPlainText(properties["장르"]),
        drawingAuthor: getPlainText(properties["그림작가"]),
        writingAuthor: getPlainText(properties["글작가"]),
      };
    });

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error: any) {
    console.error("WEBTOON SCHEDULE ERROR:", error);

    return NextResponse.json(
      {
        error: "웹툰 스케줄을 불러오지 못했습니다.",
        message: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}