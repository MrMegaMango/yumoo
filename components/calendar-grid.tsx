import Link from "next/link";

import { buildMonthGrid, isToday } from "@/lib/date";
import type { MealEntry } from "@/lib/types";
import { cx } from "@/components/ui";

function entriesByDay(entries: MealEntry[]) {
  return entries.reduce<Record<string, MealEntry[]>>((grouped, entry) => {
    grouped[entry.localDate] = [...(grouped[entry.localDate] ?? []), entry];
    return grouped;
  }, {});
}

export function CalendarGrid({
  viewMonth,
  entries
}: {
  viewMonth: Date;
  entries: MealEntry[];
}) {
  const grouped = entriesByDay(entries);
  const days = buildMonthGrid(viewMonth);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cocoa/70">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEntries = grouped[day.localDate] ?? [];
          return (
            <Link
              key={day.localDate}
              href={`/day/${day.localDate}`}
              className={cx(
                "min-h-24 rounded-[22px] border p-2 shadow-card transition",
                dayEntries.length
                  ? "border-white/90 bg-white/90 hover:-translate-y-0.5"
                  : "border-[#ECDACC] bg-white/55 hover:bg-white/75",
                day.inCurrentMonth ? "text-ink" : "text-cocoa/40",
                isToday(day.localDate) ? "ring-2 ring-[#FFC9A9]" : "ring-0"
              )}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>{day.date.getDate()}</span>
                {dayEntries.length ? (
                  <span className="rounded-full bg-butter px-1.5 py-0.5 text-[0.65rem] text-cocoa">
                    {dayEntries.length}
                  </span>
                ) : null}
              </div>
              {dayEntries.length ? (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {dayEntries.slice(0, 4).map((entry) => (
                    <div
                      key={entry.id}
                      className="h-7 rounded-[10px] border border-white/70"
                      style={{
                        backgroundImage: entry.art.imageDataUrl
                          ? `url(${entry.art.imageDataUrl})`
                          : `linear-gradient(135deg, ${entry.art.palette[0]}, ${entry.art.palette[1]}, ${entry.art.palette[2]})`,
                        backgroundPosition: "center",
                        backgroundSize: "cover"
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-3 h-10 rounded-[16px] border border-dashed border-[#EBDCCE] bg-white/40" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
