import {
    Webtoon,
    WebtoonPlatform,
    WebtoonGenre,
} from "./types";

type NormalizeParams = {
  title: string;
  cover: string;
  url: string;
  platform: WebtoonPlatform;
  author?: string;
  writer?: string;
  illustrator?: string;
  genre?: WebtoonGenre;
  schedule?: string;
  contentType?: string;
};

export function normalizeWebtoon({
  title,
  cover,
  url,
  platform,
  author,
  writer,
  illustrator,
  genre,
  schedule,
  contentType,
}: NormalizeParams): Webtoon {
  const finalWriter = writer || author || "";
  const finalIllustrator = illustrator || author || "";

  return {
    title: cleanTitle(title),
    writer: finalWriter,
    illustrator: finalIllustrator,
    cover,
    url,
    platform,
    genre,
    schedule,
    contentType,
  };
}

function cleanTitle(title: string) {
  return title
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/19세/g, "")
    .replace(/성인/g, "")
    .trim();
}