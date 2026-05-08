async function fetchNaverImage(url: string) {
    return fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://series.naver.com/",
        Cookie: process.env.NAVER_SERIES_COOKIE || "",
      },
    });
  }
  
  export async function uploadExternalImageToNotion(
    token: string,
    imageUrl: string,
    filename: string
  ) {
    const isNaverImage = imageUrl.includes("comicthumb-phinf.pstatic.net");
    const isBomtoonImage = imageUrl.includes("image.balcony.studio");
  
    if (isNaverImage || isBomtoonImage) {
      const imageRes = isNaverImage
        ? await fetchNaverImage(imageUrl)
        : await fetch(imageUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0",
              Referer: "https://www.bomtoon.com/",
            },
          });
  
      if (!imageRes.ok) {
        throw new Error("이미지 fetch 실패");
      }
  
      const imageBuffer = await imageRes.arrayBuffer();
      let contentType = imageRes.headers.get("content-type") || "image/jpeg";

      if (contentType === "image/jpg") {
        contentType = "image/jpeg";
      }
  
      const createRes = await fetch("https://api.notion.com/v1/file_uploads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2026-03-11",
        },
        body: JSON.stringify({
          mode: "single_part",
          filename,
          content_type: contentType,
        }),
      });
  
      const fileUpload = await createRes.json();
  
      if (!createRes.ok) {
        throw new Error(fileUpload.message || "Notion 파일 업로드 생성 실패");
      }
  
      const formData = new FormData();
      formData.append("file", new Blob([imageBuffer], { type: contentType }), filename);
  
      const sendRes = await fetch(
        `https://api.notion.com/v1/file_uploads/${fileUpload.id}/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2026-03-11",
          },
          body: formData,
        }
      );
  
      const sent = await sendRes.json();
  
      if (!sendRes.ok) {
        throw new Error(sent.message || "Notion 파일 전송 실패");
      }
  
      return fileUpload.id;
    }
  
    const createRes = await fetch("https://api.notion.com/v1/file_uploads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2026-03-11",
      },
      body: JSON.stringify({
        mode: "external_url",
        external_url: imageUrl,
        filename,
      }),
    });
  
    const fileUpload = await createRes.json();
  
    if (!createRes.ok) {
      throw new Error(fileUpload.message || "Notion 파일 업로드 생성 실패");
    }
  
    for (let i = 0; i < 10; i++) {
      const checkRes = await fetch(
        `https://api.notion.com/v1/file_uploads/${fileUpload.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2026-03-11",
          },
        }
      );
  
      const checked = await checkRes.json();
  
      if (!checkRes.ok) {
        throw new Error(checked.message || "Notion 파일 업로드 확인 실패");
      }
  
      if (checked.status === "uploaded") {
        return checked.id;
      }
  
      if (checked.status === "failed" || checked.status === "expired") {
        throw new Error("Notion 파일 업로드 실패");
      }
  
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  
    throw new Error("Notion 파일 업로드 대기 시간 초과");
  }