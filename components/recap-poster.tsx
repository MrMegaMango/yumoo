import { formatMonthLabel, parseYearMonth } from "@/lib/date";
import type { MealEntry } from "@/lib/types";
import { Card, Tag } from "@/components/ui";

export function RecapPoster({
  yearMonth,
  entries,
  daysLogged,
  currentStreak
}: {
  yearMonth: string;
  entries: MealEntry[];
  daysLogged: number;
  currentStreak: number;
}) {
  const featured = entries.slice(0, 6);

  return (
    <Card className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,247,240,0.94))] p-0">
      <div className="relative overflow-hidden p-6">
        <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-[#FFDCC7]/60 blur-xl" />
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#FFF0B1]/55 blur-xl" />
        <Tag active>Shareable recap</Tag>
        <h2 className="mt-4 text-3xl font-semibold text-ink">
          {formatMonthLabel(parseYearMonth(yearMonth))}
        </h2>
        <p className="mt-2 text-sm leading-6 text-cocoa">
          {daysLogged} days logged, {entries.length} meals, {currentStreak} day streak.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {featured.length ? (
            featured.map((entry) => (
              <div
                key={entry.id}
                className="relative overflow-hidden rounded-[26px] border border-white/70 p-4 shadow-card"
                style={{
                  backgroundImage: `linear-gradient(145deg, ${entry.art.palette[0]}, ${entry.art.palette[1]}, ${entry.art.palette[2]})`
                }}
              >
                <div className="rounded-[18px] bg-white/28 p-3 backdrop-blur">
                  <p className="line-clamp-2 text-sm font-semibold text-ink">
                    {entry.mood || entry.caption || "Saved meal"}
                  </p>
                  <p className="mt-2 text-xs text-cocoa">{entry.localDate}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 rounded-[28px] border border-dashed border-[#EADACC] bg-white/70 p-10 text-center text-sm leading-6 text-cocoa">
              Add a few meals first, then turn the month into a soft little poster.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

