const partsCache = new Map();

function partsFormatter(tz) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    partsCache.set(tz, f);
  }
  return f;
}

export const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function systemUses12Hour() {
  const cycle = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
  return cycle === "h12" || cycle === "h11";
}

export function uses12Hour(setting) {
  if (setting === "12") return true;
  if (setting === "24") return false;
  return systemUses12Hour();
}

export function isValidTimeZone(tz) {
  try {
    partsFormatter(tz);
    return true;
  } catch {
    return false;
  }
}

export function wallClock(tz, ms) {
  const p = {};
  for (const { type, value } of partsFormatter(tz).formatToParts(ms)) p[type] = value;
  const year = +p.year;
  const month = +p.month;
  const day = +p.day;
  const hour = +p.hour % 24;
  const minute = +p.minute;
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, +p.second);
  return {
    hour,
    minute,
    weekday: p.weekday,
    dayNumber: Math.floor(Date.UTC(year, month - 1, day) / 86400000),
    offsetMinutes: Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000),
  };
}

export function formatOffset(minutes) {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export function formatClock(hour, minute, twelve) {
  const mm = String(minute).padStart(2, "0");
  if (!twelve) return { time: `${String(hour).padStart(2, "0")}:${mm}`, period: "" };
  return { time: `${hour % 12 || 12}:${mm}`, period: hour < 12 ? "AM" : "PM" };
}

export function cityClock(tz, ms, twelve) {
  const wall = wallClock(tz, ms);
  const local = wallClock(localTimeZone, ms);
  const delta = wall.dayNumber - local.dayNumber;
  return {
    ...formatClock(wall.hour, wall.minute, twelve),
    offset: formatOffset(wall.offsetMinutes),
    offsetMinutes: wall.offsetMinutes,
    weekday: wall.weekday,
    dayLabel: delta === 1 ? "Tomorrow" : delta === -1 ? "Yesterday" : delta ? wall.weekday : "",
  };
}

export function formatShift(steps) {
  if (!steps) return "Now";
  const minutes = Math.abs(steps) * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const sign = steps < 0 ? "−" : "+";
  return `${sign}${h ? `${h}h` : ""}${h && m ? " " : ""}${m ? `${m}m` : ""}`;
}
