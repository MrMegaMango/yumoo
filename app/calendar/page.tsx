"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { Tag, cx } from "@/components/ui";
import {
  formatMonthLabel,
  getYearMonthKey,
  parseLocalDate,
  toLocalDateString,
} from "@/lib/date";
import type { MealEntry } from "@/lib/types";

/* ── Week helpers ── */

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startMonth = monthNames[weekStart.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} – ${end.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${end.getDate()}`;
}

type WeekGroup = {
  weekKey: string;
  weekStart: Date;
  days: (MealEntry | null)[];
};

function groupByWeek(entries: MealEntry[]): WeekGroup[] {
  const weekMap = new Map<string, Map<string, MealEntry>>();

  for (const entry of entries) {
    const date = parseLocalDate(entry.localDate);
    const ws = getWeekStart(date);
    const weekKey = toLocalDateString(ws);
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Map());
    const dayMap = weekMap.get(weekKey)!;
    // Keep first entry per day
    if (!dayMap.has(entry.localDate)) {
      dayMap.set(entry.localDate, entry);
    }
  }

  return [...weekMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekKey, dayMap]) => {
      const weekStart = parseLocalDate(weekKey);
      const days: (MealEntry | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const ld = toLocalDateString(d);
        days.push(dayMap.get(ld) ?? null);
      }
      return { weekKey, weekStart, days };
    });
}

function getCurrentWeekGroup(): WeekGroup {
  const ws = getWeekStart(new Date());
  const days: null[] = [null, null, null, null, null, null, null];
  return { weekKey: toLocalDateString(ws), weekStart: ws, days };
}

/* ── Deterministic seed ── */

function seed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ── Organic variations ── */

const rotations = [-3, 1.8, -1.4, 2.6, -2, 1, -2.5, 1.5, 0.6, -1.8];
const xOffsets = [-8, 6, -3, 10, -6, 8, -10, 4, -2, 7];
const yOffsets = [0, 6, 2, 10, 4, 8, 1, 12, 3, 7];

/* ── Decorative stickers ── */

const stickers = ["😊", "⭐", "❤️", "😋", "🍴", "✨", "🌟", "💛", "🧡", "😍"];

function pickSticker(id: string) {
  return stickers[seed(id) % stickers.length];
}

/* ── Washi tape ── */

const tapeColors = [
  "bg-[#FFD4B8]/60",
  "bg-[#D4E8D0]/60",
  "bg-[#FFE8A3]/60",
  "bg-[#E8D0E8]/60",
  "bg-[#F5D0C0]/60",
];

function WashiStrip({ entryId, position }: { entryId: string; position: "top-left" | "top-right" | "bottom-left" }) {
  const s = seed(entryId + position);
  const color = tapeColors[s % tapeColors.length];
  const rotate = [-14, 10, -8, 16, -12][s % 5];
  const posClass =
    position === "top-left"
      ? "-left-2 -top-2"
      : position === "top-right"
        ? "-right-2 -top-2"
        : "-bottom-1 -left-2";

  return (
    <div
      className={`pointer-events-none absolute z-10 h-4 w-12 rounded-[2px] ${color} ${posClass}`}
      style={{ rotate: `${rotate}deg` }}
    />
  );
}

/* ── Paperclip ── */

function Paperclip({ entryId }: { entryId: string }) {
  const s = seed(entryId + "clip");
  if (s % 3 !== 0) return null; // Only show on ~1/3 of cards
  const side = s % 2 === 0 ? "-right-1 top-3" : "-right-1 top-6";
  return (
    <div
      className={`pointer-events-none absolute z-10 text-lg text-cocoa/30 ${side}`}
      style={{ rotate: `${15 + (s % 20)}deg` }}
    >
      📎
    </div>
  );
}

/* ── Polaroid card for scrapbook ── */

function ScrapbookCard({ entry }: { entry: MealEntry }) {
  const s = seed(entry.id);
  const rotate = rotations[s % rotations.length];
  const xOff = xOffsets[s % xOffsets.length];
  const yOff = yOffsets[s % yOffsets.length];
  const date = parseLocalDate(entry.localDate);
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dateLabel = `${monthNames[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}`;
  const showSticker = s % 2 === 0;
  const stickerPos = s % 4;

  return (
    <Link href={`/entry/${entry.id}`} className="group block">
      <div
        className="relative rounded-[14px] bg-white p-[6px] pb-10 transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
        style={{
          rotate: `${rotate}deg`,
          translate: `${xOff}px ${yOff}px`,
          boxShadow: "0 3px 20px rgba(107,88,78,0.12), 0 1px 4px rgba(107,88,78,0.07)",
        }}
      >
        {/* Washi tape */}
        <WashiStrip entryId={entry.id} position={s % 2 === 0 ? "top-left" : "top-right"} />

        {/* Paperclip */}
        <Paperclip entryId={entry.id} />

        {/* Photo */}
        <div className="relative overflow-hidden rounded-[10px]">
          <img
            src={entry.photoDataUrl}
            alt={entry.mood ? `${entry.mood} meal` : "Meal"}
            className="block aspect-[4/5] w-full object-cover"
          />
        </div>

        {/* Info below photo */}
        <div className="mt-2 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cocoa/50">
            {dateLabel}
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">
            {entry.caption || entry.mood || "Meal"}
          </p>
          {entry.mealType && (
            <div className="mt-1 flex gap-1">
              <span className="rounded-full bg-[#FFF0E6] px-2 py-0.5 text-[9px] font-medium text-cocoa">
                {entry.mealType}
              </span>
            </div>
          )}
        </div>

        {/* Floating sticker decoration */}
        {showSticker && (
          <span
            className="pointer-events-none absolute text-lg"
            style={{
              top: stickerPos < 2 ? "-6px" : undefined,
              bottom: stickerPos >= 2 ? "-4px" : undefined,
              left: stickerPos % 2 === 0 ? "-4px" : undefined,
              right: stickerPos % 2 === 1 ? "-4px" : undefined,
            }}
          >
            {pickSticker(entry.id)}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ── Vintage album covers ── */

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const albumCovers = [
  { spine: "#8B5E3C", cover: "linear-gradient(145deg, #D4A574, #C4956A, #B8845C)", accent: "#F0D4B0" },
  { spine: "#9B6B7A", cover: "linear-gradient(145deg, #D4A0B0, #C890A0, #BC8090)", accent: "#F0D0DC" },
  { spine: "#5C7A5C", cover: "linear-gradient(145deg, #8CB48C, #7CA47C, #6C946C)", accent: "#C8E0C8" },
  { spine: "#7A7050", cover: "linear-gradient(145deg, #C8B888, #B8A878, #A89868)", accent: "#E8DCC0" },
  { spine: "#506878", cover: "linear-gradient(145deg, #88A8B8, #7898A8, #688898)", accent: "#C0D8E0" },
  { spine: "#8B5070", cover: "linear-gradient(145deg, #C88CA8, #B87C98, #A86C88)", accent: "#E8C0D4" },
  { spine: "#5A7050", cover: "linear-gradient(145deg, #98B888, #88A878, #789868)", accent: "#CCE0C0" },
  { spine: "#7A6830", cover: "linear-gradient(145deg, #C8B060, #B8A050, #A89040)", accent: "#E8D898" },
  { spine: "#685878", cover: "linear-gradient(145deg, #A890B8, #9880A8, #887098)", accent: "#D4C0E0" },
  { spine: "#8B5840", cover: "linear-gradient(145deg, #D09868, #C08858, #B07848)", accent: "#E8C8A0" },
  { spine: "#507070", cover: "linear-gradient(145deg, #88B0B0, #78A0A0, #689090)", accent: "#C0D8D8" },
  { spine: "#706048", cover: "linear-gradient(145deg, #B8A078, #A89068, #988058)", accent: "#DCD0B0" },
];

function MonthAlbum({
  monthIndex,
  year,
  entries,
}: {
  monthIndex: number;
  year: number;
  entries: MealEntry[];
}) {
  const album = albumCovers[monthIndex];
  const ym = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const count = entries.length;
  const hasEntries = count > 0;
  const coverRotation = [-1.2, 0.8, -0.5, 1, -0.8, 0.6, -1, 0.4, -0.6, 1.2, -0.4, 0.7][monthIndex];

  return (
    <Link href={`/recap/${ym}`} className="group block">
      <div
        className="relative transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
        style={{ rotate: `${coverRotation}deg` }}
      >
        {/* Book shadow / stacked pages underneath */}
        <div
          className="absolute -bottom-1 left-1 right-1 top-2 rounded-[14px]"
          style={{ background: album.accent, opacity: 0.5 }}
        />
        <div
          className="absolute -bottom-[6px] left-2 right-2 top-3 rounded-[14px]"
          style={{ background: album.accent, opacity: 0.3 }}
        />

        {/* Main cover */}
        <div
          className="relative overflow-hidden rounded-[16px]"
          style={{
            background: album.cover,
            boxShadow: `4px 4px 20px rgba(60,40,20,0.2), inset -1px 0 0 rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}
        >
          {/* Spine */}
          <div
            className="absolute bottom-0 left-0 top-0 w-3"
            style={{
              background: album.spine,
              boxShadow: "inset -1px 0 2px rgba(0,0,0,0.15), 1px 0 3px rgba(0,0,0,0.08)",
            }}
          />

          {/* Spine lines */}
          <div className="absolute bottom-4 left-[5px] top-4 w-px bg-white/20" />
          <div className="absolute bottom-4 left-[8px] top-4 w-px bg-white/10" />

          {/* Leather texture overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative px-4 pb-4 pl-6 pt-5">
            {/* Washi tape on cover */}
            <div
              className="pointer-events-none absolute -right-1 top-3 z-10 h-4 w-10 rounded-[2px] bg-white/25"
              style={{ rotate: "12deg" }}
            />

            {/* Photo collage or empty state */}
            {hasEntries ? (
              <div className="relative mb-3 h-24">
                {entries.slice(0, 3).map((entry, i) => (
                  <div
                    key={entry.id}
                    className="absolute overflow-hidden rounded-[8px] border-2 border-white/80 bg-white shadow-sm"
                    style={{
                      width: "56px",
                      height: "68px",
                      left: `${i * 28}px`,
                      top: `${[4, 0, 8][i]}px`,
                      rotate: `${[-5, 3, -2][i]}deg`,
                      zIndex: i,
                      padding: "2px",
                      paddingBottom: "10px",
                    }}
                  >
                    <img
                      src={entry.photoDataUrl}
                      alt=""
                      className="h-full w-full rounded-[6px] object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-3 flex h-24 items-center justify-center">
                <div className="rounded-[10px] border border-dashed border-white/25 px-4 py-3 text-center">
                  <span className="text-lg opacity-40">📷</span>
                  <p className="mt-1 text-[9px] text-white/30">no pages yet</p>
                </div>
              </div>
            )}

            {/* Title embossed on cover */}
            <p
              className="text-[15px] font-bold leading-tight"
              style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
            >
              {monthNames[monthIndex]}
            </p>
            <p className="mt-0.5 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              {hasEntries ? `${count} ${count === 1 ? "page" : "pages"}` : "empty"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Weekly scrapbook spread (scattered polaroids) ── */

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* Layout positions for 7 polaroids scattered across a 2-column spread */
const polaroidLayouts = [
  { col: 0, rotate: -3, xOff: 4, yOff: 0 },
  { col: 1, rotate: 2.2, xOff: -2, yOff: 8 },
  { col: 0, rotate: 1.5, xOff: -6, yOff: 0 },
  { col: 1, rotate: -2, xOff: 6, yOff: 4 },
  { col: 0, rotate: -1.2, xOff: 8, yOff: 0 },
  { col: 1, rotate: 2.8, xOff: -4, yOff: 10 },
  { col: 0, rotate: -2.5, xOff: 2, yOff: 0 },
];

function WeekSpread({ week }: { week: WeekGroup }) {
  const col0 = week.days.map((entry, i) => ({ entry, i })).filter((_, idx) => polaroidLayouts[idx].col === 0);
  const col1 = week.days.map((entry, i) => ({ entry, i })).filter((_, idx) => polaroidLayouts[idx].col === 1);

  function renderSlot(entry: MealEntry | null, dayIndex: number) {
    const layout = polaroidLayouts[dayIndex];
    const d = new Date(week.weekStart);
    d.setDate(d.getDate() + dayIndex);
    const dayNum = d.getDate();

    if (entry) {
      const s = seed(entry.id);
      const showSticker = s % 2 === 0;

      return (
        <Link href={`/entry/${entry.id}`} className="group block">
          <div
            className="relative rounded-[14px] bg-white p-[6px] pb-8 transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
            style={{
              rotate: `${layout.rotate}deg`,
              translate: `${layout.xOff}px ${layout.yOff}px`,
              boxShadow: "0 3px 20px rgba(107,88,78,0.12), 0 1px 4px rgba(107,88,78,0.07)",
            }}
          >
            {/* Washi tape */}
            <WashiStrip entryId={entry.id} position={s % 2 === 0 ? "top-left" : "top-right"} />
            <Paperclip entryId={entry.id} />

            <div className="relative overflow-hidden rounded-[10px]">
              <img
                src={entry.photoDataUrl}
                alt={entry.mood ? `${entry.mood} meal` : "Meal"}
                className="block aspect-[4/5] w-full object-cover"
              />
            </div>

            {/* Caption area */}
            <div className="mt-1.5 px-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-cocoa/40">
                {dayLabels[dayIndex]} {dayNum}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-ink">
                {entry.caption || entry.mood || "Meal"}
              </p>
            </div>

            {/* Sticker */}
            {showSticker && (
              <span
                className="pointer-events-none absolute text-base"
                style={{
                  bottom: "-6px",
                  right: s % 3 === 0 ? "-6px" : undefined,
                  left: s % 3 !== 0 ? "-6px" : undefined,
                }}
              >
                {pickSticker(entry.id)}
              </span>
            )}
          </div>
        </Link>
      );
    }

    // Empty polaroid placeholder
    return (
      <div
        className="rounded-[14px] border-2 border-dashed border-[#EAD6C7]/35 bg-white/30 p-[6px] pb-8"
        style={{
          rotate: `${layout.rotate}deg`,
          translate: `${layout.xOff}px ${layout.yOff}px`,
        }}
      >
        <div className="flex aspect-[4/5] items-center justify-center rounded-[10px] bg-[#EAD6C7]/10">
          <span className="text-xl text-cocoa/15">📷</span>
        </div>
        <div className="mt-1.5 px-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-cocoa/25">
            {dayLabels[dayIndex]} {dayNum}
          </p>
          <p className="mt-0.5 text-[11px] text-cocoa/20">waiting for art</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Week header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[#EAD6C7]/30" />
        <span className="text-xs font-semibold uppercase tracking-wider text-cocoa/50">
          {formatWeekRange(week.weekStart)}
        </span>
        <div className="h-px flex-1 bg-[#EAD6C7]/30" />
      </div>

      {/* Scattered 2-column polaroid layout */}
      <div className="flex gap-3 px-2">
        <div className="flex flex-1 flex-col gap-4">
          {col0.map(({ entry, i }) => (
            <div key={i}>{renderSlot(entry, i)}</div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-4 pt-8">
          {col1.map(({ entry, i }) => (
            <div key={i}>{renderSlot(entry, i)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Group entries by month ── */

function groupByMonth(entries: MealEntry[]) {
  const map = new Map<string, MealEntry[]>();
  for (const entry of entries) {
    const ym = getYearMonthKey(entry.localDate);
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym)!.push(entry);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([yearMonth, monthEntries]) => ({ yearMonth, entries: monthEntries }));
}

/* ── Page ── */

export default function MyPagesPage() {
  const { entries, ready } = useDiary();
  const [tab, setTab] = useState<"scrapbook" | "stacks">("scrapbook");

  const months = useMemo(() => groupByMonth(entries), [entries]);
  const weeks = useMemo(() => {
    const w = groupByWeek(entries);
    // Always include current week even if empty
    const currentWeek = getCurrentWeekGroup();
    if (w.length === 0 || w[0].weekKey !== currentWeek.weekKey) {
      w.unshift(currentWeek);
    }
    return w;
  }, [entries]);

  return (
    <AppShell
      title="My Pages"
      subtitle="A quiet collection of your inner appetite."
      headerTrailing={
        <Tag active>{ready ? `${entries.length} meals` : "..."}</Tag>
      }
    >
      {/* Tab switcher */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-white/70 p-1 ring-1 ring-[#EAD6C7]/40 backdrop-blur-sm">
          <button
            onClick={() => setTab("scrapbook")}
            className={cx(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              tab === "scrapbook"
                ? "bg-ink text-white shadow-card"
                : "text-cocoa hover:bg-cream"
            )}
          >
            Weekly
          </button>
          <button
            onClick={() => setTab("stacks")}
            className={cx(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              tab === "stacks"
                ? "bg-ink text-white shadow-card"
                : "text-cocoa hover:bg-cream"
            )}
          >
            Stacks
          </button>
        </div>
      </div>

      {tab === "scrapbook" ? (
        /* ── Weekly scrapbook view ── */
        <div className="space-y-6">
          {weeks.map((week) => (
            <WeekSpread key={week.weekKey} week={week} />
          ))}
        </div>
      ) : (
        /* ── Stacks view (12 vintage album covers) ── */
        <div>
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-ink">Monthly Stacks</h2>
            <span className="text-base">✨</span>
          </div>
          <div className="grid grid-cols-2 gap-5 px-1">
            {Array.from({ length: 12 }, (_, i) => {
              const year = new Date().getFullYear();
              const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
              const monthEntries = months.find((m) => m.yearMonth === ym)?.entries ?? [];
              return (
                <MonthAlbum
                  key={i}
                  monthIndex={i}
                  year={year}
                  entries={monthEntries}
                />
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
