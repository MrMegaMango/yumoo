const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric"
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

export type CalendarDay = {
  date: Date;
  localDate: string;
  inCurrentMonth: boolean;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function parseLocalDate(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toLocalDateString(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateAndTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export function formatWeekday(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? parseLocalDate(dateLike) : dateLike;
  return weekdayFormatter.format(date);
}

export function formatMonthLabel(dateLike: Date | string) {
  const date =
    typeof dateLike === "string"
      ? dateLike.length === 7
        ? parseLocalDate(`${dateLike}-01`)
        : parseLocalDate(dateLike)
      : dateLike;
  return monthFormatter.format(date);
}

export function formatFullDate(localDate: string) {
  return fullDateFormatter.format(parseLocalDate(localDate));
}

export function formatTimeLabel(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return timeFormatter.format(date);
}

export function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function getYearMonthKey(dateLike: Date | string) {
  if (typeof dateLike === "string") {
    // Handle both "YYYY-MM" and "YYYY-MM-DD" formats
    const parts = dateLike.split("-");
    return `${parts[0]}-${parts[1]}`;
  }
  return `${dateLike.getFullYear()}-${pad(dateLike.getMonth() + 1)}`;
}

export function parseYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function buildMonthGrid(viewMonth: Date): CalendarDay[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      localDate: toLocalDateString(date),
      inCurrentMonth: date.getMonth() === month
    };
  });
}

export function isToday(localDate: string) {
  return localDate === toLocalDateString(new Date());
}
