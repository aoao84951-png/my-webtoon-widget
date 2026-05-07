import { NextRequest, NextResponse } from "next/server";
import { saveWebtoonToNotion } from "../../lib/webtoon/notion";

export async function POST(req: NextRequest) {
  try {
    const webtoon = await req.json();

    const result = await saveWebtoonToNotion(webtoon);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("웹툰 저장 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
        code: error.code,
        status: error.status,
      },
      { status: 500 }
    );
  }
}