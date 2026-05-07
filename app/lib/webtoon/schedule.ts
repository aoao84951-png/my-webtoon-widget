export type WebtoonScheduleItem = {
    id: string;
    title: string;
    cover: string;
    platform: string;
    schedule: string;
  };
  
  const dayMap: Record<number, string[]> = {
    0: ["일", "일요일", "SUN", "Sunday"],
    1: ["월", "월요일", "MON", "Monday"],
    2: ["화", "화요일", "TUE", "Tuesday"],
    3: ["수", "수요일", "WED", "Wednesday"],
    4: ["목", "목요일", "THU", "Thursday"],
    5: ["금", "금요일", "FRI", "Friday"],
    6: ["토", "토요일", "SAT", "Saturday"],
  };
  
  export function isWebtoonForDate(schedule: string, date = new Date()) {
    if (!schedule) return false;
  
    const cleanSchedule = schedule.replace(/\s/g, "");
    const todayDate = date.getDate();
    const todayDayTexts = dayMap[date.getDay()];
  
    // 예: 10일 주기(1/11/21일)
    if (cleanSchedule.includes("10일주기")) {
      const match = cleanSchedule.match(/\(([^)]+)\)/);
  
      if (!match) return false;
  
      const days = match[1]
        .replace(/일/g, "")
        .split("/")
        .map((v) => Number(v.trim()))
        .filter((v) => !Number.isNaN(v));
  
      return days.includes(todayDate);
    }
  
    // 예: 월, 월요일, 월/수, 매주 월요일
    return todayDayTexts.some((dayText) => cleanSchedule.includes(dayText));
  }
  
  export function filterWebtoonsByDate(
    webtoons: WebtoonScheduleItem[],
    date = new Date()
  ) {
    return webtoons.filter((item) => isWebtoonForDate(item.schedule, date));
  }