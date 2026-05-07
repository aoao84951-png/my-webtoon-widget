export type WebtoonPlatform =
  | "리디북스"
  | "카카오페이지"
  | "네이버시리즈"
  | "봄툰"
  | "레진코믹스"
  | "미스터블루";

export type WebtoonGenre =
  | "BL"
  | "로맨스"
  | "로맨스판타지";

export type Webtoon = {
  title: string;
  cover: string;
  url: string;
  platform: WebtoonPlatform;
  genre?: WebtoonGenre;
  writer: string;
  illustrator: string;
  schedule?: string;
  contentType?: string;
};