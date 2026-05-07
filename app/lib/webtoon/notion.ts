import { Client } from "@notionhq/client";
import { Webtoon } from "./types";
import { uploadExternalImageToNotion } from "./upload";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export async function saveWebtoonToNotion(webtoon: Webtoon) {
  if (!DATABASE_ID) {
    throw new Error("NOTION_DATABASE_ID가 없습니다.");
  }

  const properties: any = {
    제목: {
      title: [
        {
          text: {
            content: webtoon.title,
          },
        },
      ],
    },

    플랫폼: {
      multi_select: [
        {
          name: webtoon.platform,
        },
      ],
    },

    글작가: {
      rich_text: [
        {
          text: {
            content: webtoon.writer,
          },
        },
      ],
    },

    그림작가: {
      rich_text: [
        {
          text: {
            content: webtoon.illustrator,
          },
        },
      ],
    },
  };

  if (webtoon.genre) {
    properties["장르"] = {
      select: {
        name: webtoon.genre,
      },
    };
  }

  if (webtoon.schedule) {
    properties["연재일/연재주기"] = {
      rich_text: [
        {
          text: {
            content: webtoon.schedule,
          },
        },
      ],
    };
  }

  if (webtoon.url) {
    properties["플랫폼 링크"] = {
      url: webtoon.url,
    };
  }
  
  if (webtoon.cover) {
    const safeTitle = webtoon.title
      .replace(/[\\/:*?"<>|]/g, "")
      .slice(0, 50);
  
    const fileUploadId = await uploadExternalImageToNotion(
      process.env.NOTION_TOKEN!,
      webtoon.cover,
      `${safeTitle || "cover"}.jpg`
    );
  
    properties["cover"] = {
      files: [
        {
          name: `${safeTitle || "cover"}.jpg`,
          type: "file_upload",
          file_upload: {
            id: fileUploadId,
          },
        },
      ],
    };
  }
  
  return await notion.pages.create({
    parent: {
      database_id: DATABASE_ID,
    },
    properties,
  });
}