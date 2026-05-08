"use client";

import { useEffect, useState } from "react";

type Webtoon = {
    title: string;
    writer: string;
    illustrator: string;
    cover: string;
    url: string;
    platform: string;
    genre?: string;
    schedule?: string;
    contentType?: string;
  };

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.4V12L15.1 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="translate(0 2.5)">
        <circle cx="10.5" cy="10.5" r="6.1" stroke="currentColor" strokeWidth="2.3" />
        <path
          d="M15.2 15.2L19.3 19.3"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function WebtoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.5 5.5H18.5V19H5.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 9H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 15H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function WebtoonSearchPage() {
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [now, setNow] = useState(new Date());
  const [popupTitle, setPopupTitle] = useState("");
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateText = now
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

  const resetSearch = () => {
    setIsSearchMode(false);
    setQuery("");
    setWebtoons([]);
    setMessage("");
    setSavingKey("");
    setSavedKey("");
    setPopupTitle("");
  };

  const handleSearch = async () => {
    setMessage("");
    setSavingKey("");
    setSavedKey("");
    setPopupTitle("");

    const keyword = query.trim();

    if (!keyword) {
      setWebtoons([]);
      return;
    }

    setLoading(true);

    try {
      const [ridiRes, kakaoRes, naverRes, bomtoonRes, lezhinRes, mrblueRes] =
        await Promise.all([
          fetch(`/api/webtoon-search/ridi?q=${encodeURIComponent(keyword)}`),
          fetch(`/api/webtoon-search/kakao?q=${encodeURIComponent(keyword)}`),
          fetch(`/api/webtoon-search/naver-series?q=${encodeURIComponent(keyword)}`),
          fetch(`/api/webtoon-search/bomtoon?q=${encodeURIComponent(keyword)}`),
          fetch(`/api/webtoon-search/lezhin?q=${encodeURIComponent(keyword)}`),
          fetch(`/api/webtoon-search/mrblue?q=${encodeURIComponent(keyword)}`),
      ]);
      
      const ridiData = await ridiRes.json();
      const kakaoData = await kakaoRes.json();
      const naverData = await naverRes.json();
      const bomtoonData = await bomtoonRes.json();
      const lezhinData = await lezhinRes.json();
      const mrblueData = await mrblueRes.json();
      
      
      const allWebtoons: Webtoon[] = [
        ...(ridiData.webtoons || []),
        ...(kakaoData.webtoons || []),
        ...(naverData.webtoons || []),
        ...(bomtoonData.webtoons || []),
        ...(lezhinData.webtoons || []),
        ...(mrblueData.webtoons || []),
      ];

      const normalizedKeyword = keyword.replace(/\s/g, "").toLowerCase();

      const filteredWebtoons = allWebtoons.filter((webtoon) => {
        const title = (webtoon.title || "").replace(/\s/g, "").toLowerCase();

        return (
          title === normalizedKeyword ||
          title.startsWith(normalizedKeyword) ||
          title.includes(normalizedKeyword)
        );
      });

      filteredWebtoons.sort((a, b) => {
        const aTitle = (a.title || "").replace(/\s/g, "").toLowerCase();
        const bTitle = (b.title || "").replace(/\s/g, "").toLowerCase();

        const score = (title: string) => {
          if (title === normalizedKeyword) return 0;
          if (title.startsWith(normalizedKeyword)) return 1;
          if (title.includes(normalizedKeyword)) return 2;
          return 3;
        };

        return score(aTitle) - score(bTitle);
      });

      setWebtoons(filteredWebtoons);
    } catch {
      setWebtoons([]);
      setMessage("검색 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (webtoon: Webtoon, key: string) => {
    setSavingKey(key);
    setSavedKey("");
    setPopupTitle("");
    setMessage("");

    try {
      const res = await fetch("/api/webtoon-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webtoon),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || data.error || "저장 실패");
        setSavingKey("");
        return;
      }

      setSavingKey("");
      setSavedKey(key);
    } catch {
      setSavingKey("");
      setMessage("저장 실패");
    }
  };

  const getCreatorText = (webtoon: Webtoon) => {
    if (!webtoon.writer && !webtoon.illustrator) return "";
    if (webtoon.writer === webtoon.illustrator) return webtoon.writer;
    return `${webtoon.writer || "-"} / ${webtoon.illustrator || "-"}`;
  };

  return (
    <main className="page">
      <div className="widget">
        <div className="topbar">
          <div className="title">
            {isSearchMode ? <WebtoonIcon /> : <ClockIcon />}
            <span>{isSearchMode ? "Search" : "WEBTOON SEARCH"}</span>
          </div>

          <div className="dots">
            <span />
            <span />
          </div>
        </div>

        {!isSearchMode ? (
          <section className="home">
            <div className="time">{timeText}</div>
            <div className="date">{dateText}</div>

            <button
              className="searchButton"
              onClick={() => setIsSearchMode(true)}
              aria-label="Click to search webtoons"
            >
              <SearchIcon />
              <span>search</span>
            </button>
          </section>
        ) : (
          <section className="searchPage">
            <div className="searchHeader">
              <button className="back" onClick={resetSearch} aria-label="back">
                <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M15 5L8 12L15 19"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              </button>

              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);

                  if (!e.target.value.trim()) {
                    setWebtoons([]);
                    setMessage("");
                    setSavingKey("");
                    setSavedKey("");
                    setPopupTitle("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Search..."
                autoFocus
              />
            </div>

            <div className="resultArea">
              {message && <div className="message">{message}</div>}

              {!query && !message && (
                <div className="empty">
                  <div className="cloud">♡</div>
                  <div>Search...</div>
                </div>
              )}

              {query && loading && <div className="empty">Searching...</div>}

              {query && !loading && webtoons.length === 0 && (
                <div className="empty">검색 결과 없음</div>
              )}

              {!loading &&
                webtoons.map((webtoon, index) => {
                  const webtoonKey = `${webtoon.title}-${index}`;

                  return (
                    <button
                      className={`bookItem ${
                        savedKey === webtoonKey || savingKey === webtoonKey
                          ? "isSaved"
                          : ""
                      }`}
                      key={webtoonKey}
                      onMouseEnter={(e) => {
                        setPopupTitle(webtoon.title);
                        setPopupPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseMove={(e) => {
                        setPopupPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setPopupTitle("")}
                      onClick={() => handleSave(webtoon, webtoonKey)}
                    >
                      {savedKey === webtoonKey || savingKey === webtoonKey ? (
                        <div className="saveStatus">
                          {savingKey === webtoonKey ? "Saving..." : "✓ Saved!"}
                        </div>
                      ) : (
                        <>
                          {webtoon.cover ? (
                            <img src={webtoon.cover} alt={webtoon.title} />
                          ) : (
                            <div className="noCover" />
                          )}

                          <div className="bookInfo">
                            <div className="bookTitle">
                            <span
                              className="bookTitleText"
                              title={webtoon.title}
                              onClick={(e) => {
                                const isTouchDevice =
                                  typeof window !== "undefined" &&
                                  window.matchMedia("(hover: none)").matches;

                                if (!isTouchDevice) {
                                  return;
                                }

                                e.preventDefault();
                                e.stopPropagation();
                                
                                const rect = e.currentTarget.getBoundingClientRect();
                                
                                setPopupTitle(webtoon.title);
                                setPopupPos({
                                  x: rect.left,
                                  y: rect.bottom,
                                });
                              }}
                            >
                              {webtoon.title}
                            </span>

                              {webtoon.contentType && (
                                <span className="bookType">{webtoon.contentType}</span>
                              )}

                              {webtoon.platform && (
                                <span className="bookType">
                                  {webtoon.platform}
                                </span>
                              )}
                            </div>

                            <div className="author">
                              {getCreatorText(webtoon)}
                            </div>
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
            </div>
          </section>
        )}

        {popupTitle && (
          <div
            className="titlePopup"
            style={{ left: popupPos.x + 10, top: popupPos.y + 10 }}
            onClick={() => setPopupTitle("")}
          >
            {popupTitle}
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap");

        html,
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #ffffff;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }

        @media (prefers-color-scheme: dark) {
          html,
          body {
            background: #191919;
          }
        }

        #__next,
        main {
          background: transparent !important;
        }
      `}</style>

      <style jsx>{`
        .page {
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #ffffff;
          overflow: hidden;
          box-sizing: border-box;
        }

        @media (prefers-color-scheme: dark) {
          .page {
            background: #191919;
          }
        }

        .widget {
          width: 200px;
          height: 180px;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "Segoe UI", sans-serif;
          box-shadow: none;
          box-sizing: border-box;
        }

        .topbar {
          height: 26px;
          background: var(--topbar);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          box-sizing: border-box;
        }

        .title {
          display: flex;
          gap: 5px;
          align-items: center;
          font-size: 9px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .title svg {
          width: 12px;
          height: 12px;
          flex-shrink: 0;
          color: var(--text);
        }

        .dots {
          display: flex;
          gap: 5px;
        }

        .dots span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--dot);
        }

        .home {
          height: 154px;
          position: relative;
          box-sizing: border-box;
        }

        .time {
          position: absolute;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 34px;
          line-height: 1;
          font-weight: 500;
          color: var(--time);
          letter-spacing: -0.02em;
          font-family: "Hanken Grotesk", sans-serif;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
        }

        .date {
          position: absolute;
          top: 58px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 11px;
          letter-spacing: 1.2px;
          color: var(--muted);
          font-weight: 500;
          white-space: nowrap;
          font-family: "Hanken Grotesk", sans-serif;
        }

        .searchButton {
          position: absolute;
          top: 92px;
          left: 50%;
          transform: translateX(-50%);
          border: none;
          background: transparent;
          color: var(--text);
          font-size: 11px;
          font-weight: 400;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          line-height: 1;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "Segoe UI", sans-serif;
        }

        .searchButton:hover,
        .searchButton:focus-visible {
          background: var(--button-hover);
          outline: none;
        }

        .searchPage {
          height: 154px;
          display: flex;
          flex-direction: column;
        }

        .searchHeader {
          height: 38px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          box-sizing: border-box;
          flex-shrink: 0;
          overflow: hidden;
        }

        .back {
          width: 22px;
          min-width: 22px;
          height: 22px;
          border: none;
          background: transparent;
          color: var(--back);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .back svg {
          width: 22px;
          height: 22px;
        }

        input {
          flex: 1;
          min-width: 0;
          width: 100%;
          height: 27px;
          border: 1px solid var(--input-border);
          border-radius: 5px;
          padding: 0 9px;
          font-size: 11px;
          line-height: 27px;
          color: var(--text);
          background: var(--input-bg);
          outline: none;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "Segoe UI", sans-serif;
          appearance: none;
          -webkit-appearance: none;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }

        input::placeholder {
          color: var(--placeholder);
        }

        .resultArea {
          flex: 1;
          overflow-y: auto;
          padding: 8px 10px;
          box-sizing: border-box;
        }

        .resultArea::-webkit-scrollbar {
          width: 4px;
        }

        .resultArea::-webkit-scrollbar-thumb {
          background: var(--scroll);
          border-radius: 999px;
        }

        .message {
          text-align: center;
          font-size: 11px;
          color: var(--text);
          margin-bottom: 8px;
        }

        .empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 12px;
          color: var(--text);
          gap: 6px;
        }

        .cloud {
          font-size: 16px;
          line-height: 1;
          opacity: 0.9;
        }

        .bookItem {
          width: 100%;
          display: flex;
          gap: 7px;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          align-items: center;
          margin-bottom: 8px;
          cursor: pointer;
          border: none;
          background: transparent;
          text-align: left;
          padding: 0;
        }

        .bookItem img,
        .noCover {
          width: 26px;
          height: 36px;
          border-radius: 3px;
          object-fit: cover;
          background: var(--no-cover);
          flex-shrink: 0;
        }

        .bookItem.isSaved {
          width: 100%;
          height: 42px;
          padding: 0;
          border-radius: 8px;
          background: var(--saved-bg);
          justify-content: center;
          align-items: center;
          margin-bottom: 6px;
        }

        .saveStatus {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--text);
        }

        .bookInfo {
          min-width: 0;
          padding-top: 0;
        }

        .bookTitle {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
          min-width: 0;
        }

        .bookTitleText {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .bookType {
          flex-shrink: 0;
          font-size: 8px;
          font-weight: 700;
          line-height: 1;
          padding: 3px 4px;
          border-radius: 999px;
          background: var(--badge-bg);
          color: var(--badge-text);
        }

        .author {
          font-size: 10px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .titlePopup {
          position: fixed;
          z-index: 9999;
          max-width: 220px;
          padding: 7px 9px;
          border-radius: 8px;
          background: rgba(255, 244, 247, 0.96);
          color: var(--text);
          font-size: 10px;
          font-weight: 600;
          line-height: 1.35;
          text-align: left;
          box-sizing: border-box;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        :global(:root) {
          --bg: #ffffff;
          --topbar: #faf6f6;

          --border: #f0e3e3;
          --line: #f3e8e8;

          --input-bg: #ffffff;
          --input-border: #eadede;

          --placeholder: #c7b8b8;

          --text: #7d6f6f;
          --muted: #b19f9f;
          --time: #9f8b8b;

          --dot: #e5d4d4;
          --back: #c9b1b1;

          --no-cover: #f4ebeb;
          --scroll: #e2cfcf;

          --button-hover: #f8f1f1;

          --badge-bg: #f6eeee;
          --badge-text: #9a7f7f;

          --saved-bg: #f7efef;
        }

        @media (prefers-color-scheme: dark) {
          :global(:root) {
            --bg: #21191c;
            --topbar: #312429;
            --border: #463038;
            --line: #3b2a30;
            --input-bg: #21191c;
            --input-border: #463038;
            --placeholder: #7f6570;
            --text: #d8c1c9;
            --muted: #9f7f8b;
            --time: #c8a8b3;
            --dot: #9f7f8b;
            --back: #b9909d;
            --no-cover: #3a2b30;
            --scroll: #6f4d59;
            --button-hover: #302329;
            --badge-bg: #3a2b30;
            --badge-text: #d8aeba;
            --saved-bg: #302329;
          }
        }
      `}</style>
    </main>
  );
}