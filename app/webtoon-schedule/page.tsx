"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type WebtoonItem = {
  id: string;
  title: string;
  cover: string;
  platform: string;
  schedule: string;
  link: string;
};

const DAYS = [
  { key: "월", en: "MON" },
  { key: "화", en: "TUE" },
  { key: "수", en: "WED" },
  { key: "목", en: "THU" },
  { key: "금", en: "FRI" },
  { key: "토", en: "SAT" },
  { key: "일", en: "SUN" },
  { key: "10일", en: "10D" },
  { key: "완결", en: "END" },
];

const DESIGN_WIDTH = 820;

function getTodayKor() {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()];
}

function formatToday() {
  const date = new Date();
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${getTodayKor()})`;
}

function isTenDaySchedule(schedule: string, date = new Date()) {
  const clean = schedule.replace(/\s/g, "");
  if (!clean.includes("10일주기")) return false;

  const match = clean.match(/\(([^)]+)\)/);
  if (!match) return false;

  const todayDate = date.getDate();

  const days = match[1]
    .replace(/일/g, "")
    .split("/")
    .map((v) => Number(v.trim()))
    .filter((v) => !Number.isNaN(v));

  return days.includes(todayDate);
}

function isWebtoonForSelectedDay(
  item: WebtoonItem,
  selectedDay: string,
  todayDay: string
) {
  const schedule = item.schedule || "";
  const clean = schedule.replace(/\s/g, "");

  if (selectedDay === "완결") return clean.includes("완결");

  if (selectedDay === "10일") {
    return clean.includes("10일주기");
  }

  if (clean.includes("완결")) return false;

  if (clean.includes("10일주기")) {
    return selectedDay === todayDay && isTenDaySchedule(schedule);
  }

  return clean.includes(selectedDay);
}

function getPlatformClass(platform: string) {
  const clean = platform.replace(/\s/g, "");

  if (clean.includes("네이버시리즈")) return "naver";
  if (clean.includes("네이버")) return "naver";
  if (clean.includes("봄툰")) return "bomtoon";
  if (clean.includes("리디")) return "ridi";
  if (clean.includes("레진")) return "lezhin";
  if (clean.includes("미스터블루")) return "mrblue";
  if (clean.includes("카카오")) return "kakao";

  return "default";
}

function splitPlatforms(platform: string) {
  return platform
    .split(/,|\/|·|\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function getTenDayText(schedule: string) {
  const clean = schedule.replace(/\s/g, "");

  if (!clean.includes("10일주기")) return "";

  const match = clean.match(/\(([^)]+)\)/);

  if (!match) return "";

  return match[1];
}

export default function WebtoonSchedulePage() {
  const todayDay = getTodayKor();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  const [items, setItems] = useState<WebtoonItem[]>([]);
  const [selectedDay, setSelectedDay] = useState(todayDay);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);

  async function loadItems() {
    setRefreshing(true);

    try {
      const res = await fetch(`/api/webtoon-schedule?t=${Date.now()}`);
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    function resize() {
      if (!wrapRef.current || !widgetRef.current) return;

      const containerWidth = wrapRef.current.clientWidth;
      const nextScale = Math.min(1, containerWidth / DESIGN_WIDTH);

      setScale(nextScale);
      setHeight(widgetRef.current.offsetHeight * nextScale);
    }

    resize();

    const observer = new ResizeObserver(resize);
    if (wrapRef.current) observer.observe(wrapRef.current);

    return () => observer.disconnect();
  }, [items, selectedDay, page, loading]);

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      isWebtoonForSelectedDay(item, selectedDay, todayDay)
    );
  }, [items, selectedDay, todayDay]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  const visibleItems = filteredItems.slice(
    page * pageSize,
    page * pageSize + pageSize
  );

  useEffect(() => {
    setPage(0);
  }, [selectedDay]);

  return (
    <main className="notion-bg">
      <div ref={wrapRef} className="scale-wrap" style={{ height }}>
        <div
          ref={widgetRef}
          className="widget"
          style={{ transform: `scale(${scale})` }}
        >
          <header className="header">
            <div className="title">
              <span>♥</span>
              <h1>Webtoon Schedule</h1>
            </div>

            <button className="refresh" onClick={loadItems} disabled={refreshing}>
              <span className={refreshing ? "spin" : ""}>↻</span>
              <span>{refreshing ? "업데이트 중" : "자동 업데이트"}</span>
              <i />
            </button>
          </header>

          <div className="line" />

          <nav className="tabs">
            {DAYS.map((day) => {
              const active = selectedDay === day.key;
              const isToday = day.key === todayDay;

              return (
                <button
                  key={day.key}
                  className={`tab ${active ? "active" : ""}`}
                  onClick={() => setSelectedDay(day.key)}
                >
                  <div className="tab-row">
                    <span>{day.en}</span>
                    {isToday && <b>오늘</b>}
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="date">
            <span />
            <p>
              {selectedDay === "완결"
                ? "완결 웹툰"
                : selectedDay === "10일"
                ? "10일 주기 웹툰"
                : formatToday()}
            </p>
            <span />
          </div>

          {loading ? (
            <div className="empty">불러오는 중...</div>
          ) : visibleItems.length === 0 ? (
            <div className="empty">등록된 웹툰이 없어요 ♡</div>
          ) : (
            <section className="cards">
              {visibleItems.map((item) => (
                <article key={item.id} className="card">
                  <a
                    className="card-link"
                    href={item.link || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="cover">
                      {item.cover ? (
                        <img src={item.cover} alt={item.title} />
                      ) : (
                        <div className="no-cover">No Cover</div>
                      )}
                    </div>

                    <h2>{item.title}</h2>
                  </a>

                  <div className="platforms">
                    {splitPlatforms(item.platform).length > 0 ? (
                      splitPlatforms(item.platform).map((platform) => (
                        <span
                          key={platform}
                          className={`platform ${getPlatformClass(platform)}`}
                        >
                          {platform}
                        </span>
                      ))
                    ) : (
                      <span className="platform default">플랫폼 없음</span>
                    )}
                  </div>

                  {item.schedule.includes("10일") && (
                    <div className="ten-day">
                      {getTenDayText(item.schedule)}
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}

          <div className="pager">
            <button
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page === 0}
            >
              ‹
            </button>

            <div className="dots">
              {Array.from({ length: totalPages }).map((_, index) => (
                <span
                  key={index}
                  className={index === page ? "on" : ""}
                  onClick={() => setPage(index)}
                />
              ))}
            </div>

            <button
              onClick={() =>
                setPage((prev) => Math.min(totalPages - 1, prev + 1))
              }
              disabled={page >= totalPages - 1}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notion-bg {
          min-height: 100vh;
          background: #ffffff;
          padding: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Inter, "Pretendard", -apple-system, BlinkMacSystemFont,
            "Segoe UI", "Apple SD Gothic Neo", sans-serif;
          color: #2f2a2d;
        }

        .scale-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow: hidden;
        }

        .widget {
          width: ${DESIGN_WIDTH}px;
          transform-origin: top center;
          border: 1px solid #e8dce1;
          border-radius: 16px;
          background: #fbfbfb;
          padding: 18px 22px 20px;
          box-sizing: border-box;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.035);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .title span {
          color: #dfb7c4;
          font-size: 15px;
        }

        h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #b88a98;
          text-transform: uppercase;

          font-family:
            "Avenir Next",
            "Montserrat",
            "Pretendard",
            sans-serif;
        }

        .refresh {
          display: flex;
          align-items: center;
          gap: 7px;
          border: 0;
          background: transparent;
          cursor: pointer;
          color: #4a4548;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 7px;
          border-radius: 999px;
        }

        .refresh:hover {
          background: #f7eef2;
        }

        .refresh i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d97c9e;
        }

        .spin {
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .line {
          height: 1px;
          background: #eadde2;
          margin: 15px 0 17px;
        }

        .tabs {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          gap: 7px;
          margin-bottom: 17px;
        }

        .tab {
          height: 44px;
          border-radius: 14px;
          border: 1px solid #e8dce1;
          background: #fbfbfb;
          cursor: pointer;
          font-family: inherit;
          color: #2f2a2d;
          padding: 6px 4px;
        }

        .tab.active {
          background: #fff4f7;
          border-color: #d9789f;
          box-shadow: inset 0 0 0 1px rgba(217, 120, 159, 0.12);
        }

        .tab-row {
          height: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          white-space: nowrap;
        }

        .tab-row span {
          font-size: 10px;
          color: #9a858c;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .tab.active .tab-row span {
          color: #d66f98;
        }

        .tab-row b {
          padding: 2px 6px;
          border-radius: 999px;
          background: #d66f98;
          color: white;
          font-size: 9px;
          line-height: 1;
          font-weight: 800;
        }

        .date {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          margin-bottom: 17px;
        }

        .date span {
          height: 1px;
          background: #eadde2;
        }

        .date p {
          margin: 0;
          color: #a17c88;
          font-size: 13px;
          font-weight: 700;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          min-height: 196px;
        }

        .card {
          text-align: center;
          min-width: 0;
        }

        .card-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .card-link:hover h2 {
          color: #b88a98;
        }

        .cover {
          width: 100%;
          aspect-ratio: 1 / 1.28;
          border-radius: 12px;
          overflow: hidden;
          background: #f7f1f4;
          border: 1px solid #e8dce1;
        }

        .cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .card h2 {
          margin: 8px 0 5px;
          font-size: 12.5px;
          font-weight: 750;
          line-height: 1.25;
          letter-spacing: -0.04em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .platforms {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          max-width: 100%;
        }

        .platform {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 15px;
          padding: 2px 7px;
          margin: 0;
          border-radius: 999px;
          font-size: 8.5px;
          font-weight: 800;
          line-height: 1;
          border: 1px solid transparent;
          max-width: 100%;
          white-space: nowrap;
          backdrop-filter: blur(4px);
        }

        /* 네이버 */
        .platform.naver {
          background: #dff7e8;
          border-color: #dff7e8;
          color: #2ea85f;
        }

        /* 봄툰 */
        .platform.bomtoon {
          background: #ffe0ec;
          border-color: #ffe0ec;
          color: #de6f99;
        }

        /* 리디북스 */
        .platform.ridi {
          background: #dfeaff;
          border-color: #dfeaff;
          color: #4f8fff;
        }

        /* 레진 */
        .platform.lezhin {
          background: #ffe1e1;
          border-color: #ffe1e1;
          color: #df6666;
        }

        /* 미스터블루 */
        .platform.mrblue {
          background: #e3ebff;
          border-color: #e3ebff;
          color: #5874c9;
        }

        /* 카카오페이지 */
        .platform.kakao {
          background: #fff1b8;
          border-color: #fff1b8;
          color: #9f7b00;
        }

        /* 기본 */
        .platform.default {
          background: #f2e8ec;
          border-color: #f2e8ec;
          color: #9d7b86;
        }

        .ten-day {
          margin-top: 5px;
          font-size: 10px;
          font-weight: 700;
          color: #b38b98;
          letter-spacing: -0.01em;
        }

        .empty {
          height: 196px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a17c88;
          font-size: 13px;
          font-weight: 600;
        }

        .pager {
          margin-top: 18px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 18px;
        }

        .pager button {
          width: 26px;
          height: 26px;
          border: 0;
          border-radius: 50%;
          background: #f9edf2;
          color: #d889a5;
          font-size: 21px;
          line-height: 1;
          cursor: pointer;
        }

        .pager button:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .dots {
          display: flex;
          gap: 9px;
        }

        .dots span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #d0c7ca;
          cursor: pointer;
        }

        .dots span.on {
          background: #d9799f;
        }

        .no-cover {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #bd93a2;
          font-size: 11px;
        }

        @media (prefers-color-scheme: dark) {
          .notion-bg {
            background: #191919;
            color: #f1eeee;
          }

          .ten-day {
            color: #d6aebb;
          }

          .widget {
            background: #202020;
            border-color: #4a4044;
            box-shadow: none;
          }

          .line,
          .date span {
            background: #4a4044;
          }

          .tab {
            background: #202020;
            border-color: #4a4044;
            color: #f1eeee;
          }

          .tab.active {
            background: #34262c;
            border-color: #d9799f;
          }

          .refresh {
            color: #e7dde1;
          }

          .refresh:hover {
            background: #34262c;
          }

          .cover {
            background: #292426;
            border-color: #4a4044;
          }

          .empty,
          .date p {
            color: #d1aebc;
          }
        }
      `}</style>
    </main>
  );
}