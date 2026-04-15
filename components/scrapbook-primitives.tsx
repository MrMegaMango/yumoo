"use client";

import Link from "next/link";

import type { MealEntry } from "@/lib/types";
import { parseLocalDate, toLocalDateString } from "@/lib/date";

/* ── Deterministic seed ── */

export function seed(id: string) {
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

export function WashiStrip({ entryId, position }: { entryId: string; position: "top-left" | "top-right" | "bottom-left" }) {
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

export function Paperclip({ entryId }: { entryId: string }) {
  const s = seed(entryId + "clip");
  if (s % 3 !== 0) return null;
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

export function ScrapbookCard({ entry }: { entry: MealEntry }) {
  const s = seed(entry.id);
  const rotate = rotations[s % rotations.length];
  const xOff = xOffsets[s % xOffsets.length];
  const yOff = yOffsets[s % yOffsets.length];
  const date = parseLocalDate(entry.localDate);
  const monthAbbr = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dateLabel = `${monthAbbr[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}`;
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
        <WashiStrip entryId={entry.id} position={s % 2 === 0 ? "top-left" : "top-right"} />
        <Paperclip entryId={entry.id} />

        <div className="relative overflow-hidden rounded-[10px]">
          <img
            src={entry.art.status === "ready" ? (entry.art.imageUrl ?? entry.art.imageDataUrl ?? entry.photoUrl ?? entry.photoDataUrl) : (entry.photoUrl ?? entry.photoDataUrl)}
            alt={entry.mood ? `${entry.mood} meal` : "Meal"}
            className="block aspect-[4/5] w-full object-cover"
          />
        </div>

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

/* ── Sketched illustrations for empty slots ── */

export function SketchCamera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 16 C7 14, 9 12, 12 12 L16 12 L18 9 C19 8, 20 8, 21 8 L27 8 C28 8, 29 8, 30 9 L32 12 L36 12 C39 12, 41 14, 40 16 L39 34 C40 37, 38 39, 35 38 L13 38 C10 39, 8 37, 9 34 Z"
        stroke="#A08060" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
      />
      <circle cx="24" cy="24" r="7" stroke="#A08060" strokeWidth="2.4" opacity="0.55" />
      <circle cx="24" cy="24" r="4" stroke="#A08060" strokeWidth="1.8" strokeDasharray="2 2" opacity="0.4" />
      <circle cx="34" cy="15" r="1.5" fill="#A08060" opacity="0.45" />
    </svg>
  );
}

export function SketchBowl({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M8 22 C8 22, 10 34, 24 36 C38 34, 40 22, 40 22" stroke="#A08060" strokeWidth="2.8" strokeLinecap="round" opacity="0.6" />
      <path d="M6 22 L42 22" stroke="#A08060" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <path d="M14 18 C14 14, 18 12, 18 12" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <path d="M22 16 C22 12, 24 10, 24 10" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <path d="M30 18 C30 14, 32 13, 32 13" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <ellipse cx="24" cy="27" rx="10" ry="3" stroke="#A08060" strokeWidth="1.4" strokeDasharray="2 3" opacity="0.3" />
    </svg>
  );
}

export function SketchCoffee({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 18 L14 36 C14 38, 16 40, 20 40 L28 40 C32 40, 34 38, 34 36 L36 18" stroke="#A08060" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <path d="M10 18 L38 18" stroke="#A08060" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <path d="M36 22 C40 22, 42 24, 42 28 C42 32, 40 34, 36 34" stroke="#A08060" strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
      <path d="M18 14 C18 10, 20 8, 20 8" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <path d="M26 12 C26 9, 28 7, 28 7" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <ellipse cx="12" cy="42" rx="14" ry="1.5" fill="#A08060" opacity="0.1" />
    </svg>
  );
}

export function SketchToast({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18 C10 10, 16 6, 24 6 C32 6, 38 10, 38 18 L38 38 C38 40, 36 42, 34 42 L14 42 C12 42, 10 40, 10 38 Z" stroke="#A08060" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <path d="M16 22 C16 18, 20 16, 24 16 C28 16, 32 18, 32 22 L32 32 L16 32 Z" stroke="#A08060" strokeWidth="1.8" strokeDasharray="2 3" strokeLinecap="round" opacity="0.4" />
      <circle cx="22" cy="26" r="1.2" fill="#A08060" opacity="0.35" />
      <circle cx="26" cy="24" r="1" fill="#A08060" opacity="0.3" />
      <circle cx="24" cy="28" r="0.8" fill="#A08060" opacity="0.25" />
    </svg>
  );
}

export const slotIllustrations = [SketchCamera, SketchBowl, SketchCoffee, SketchCamera, SketchToast, SketchCoffee, SketchCamera];

/* ── Deckled edge clip paths ── */

export const deckledEdgeRight = `polygon(
  0% 0%, 97% 0%, 99% 2%, 97% 4%, 100% 6%, 98% 8%, 99% 10%, 97% 12%, 100% 14%, 98% 16%, 99% 18%, 97% 20%,
  100% 22%, 98% 24%, 99% 26%, 97% 28%, 100% 30%, 98% 32%, 99% 34%, 97% 36%, 100% 38%, 98% 40%,
  99% 42%, 97% 44%, 100% 46%, 98% 48%, 99% 50%, 97% 52%, 100% 54%, 98% 56%, 99% 58%, 97% 60%,
  100% 62%, 98% 64%, 99% 66%, 97% 68%, 100% 70%, 98% 72%, 99% 74%, 97% 76%, 100% 78%, 98% 80%,
  99% 82%, 97% 84%, 100% 86%, 98% 88%, 99% 90%, 97% 92%, 100% 94%, 98% 96%, 99% 98%, 97% 100%,
  0% 100%
)`;

export const deckledCard = `polygon(
  3% 0%, 100% 0%, 100% 97%,
  97% 99%, 95% 97%, 92% 100%, 90% 98%, 87% 99%, 85% 97%, 82% 100%, 80% 98%,
  77% 99%, 75% 97%, 72% 100%, 70% 98%, 67% 99%, 65% 97%, 62% 100%, 60% 98%,
  57% 99%, 55% 97%, 52% 100%, 50% 98%, 47% 99%, 45% 97%, 42% 100%, 40% 98%,
  37% 99%, 35% 97%, 32% 100%, 30% 98%, 27% 99%, 25% 97%, 22% 100%, 20% 98%,
  17% 99%, 15% 97%, 12% 100%, 10% 98%, 7% 99%, 5% 97%, 2% 100%, 0% 98%,
  0% 97%, 2% 95%, 0% 92%, 2% 90%, 0% 87%, 2% 85%, 0% 82%, 2% 80%,
  0% 77%, 2% 75%, 0% 72%, 2% 70%, 0% 67%, 2% 65%, 0% 62%, 2% 60%,
  0% 57%, 2% 55%, 0% 52%, 2% 50%, 0% 47%, 2% 45%, 0% 42%, 2% 40%,
  0% 37%, 2% 35%, 0% 32%, 2% 30%, 0% 27%, 2% 25%, 0% 22%, 2% 20%,
  0% 17%, 2% 15%, 0% 12%, 2% 10%, 0% 7%, 2% 5%, 0% 2%, 3% 0%
)`;

export const deckledCover = `polygon(
  0% 0%, 97% 0%, 99% 3%, 97% 5%, 100% 8%, 98% 10%, 99% 13%, 97% 16%, 100% 18%, 98% 21%, 99% 24%, 97% 27%,
  100% 30%, 98% 33%, 99% 36%, 97% 39%, 100% 42%, 98% 45%, 99% 48%, 97% 51%, 100% 54%, 98% 57%,
  99% 60%, 97% 63%, 100% 66%, 98% 69%, 99% 72%, 97% 75%, 100% 78%, 98% 81%, 99% 84%, 97% 87%,
  100% 90%, 98% 93%, 99% 96%, 97% 100%,
  0% 100%
)`;

/* ── Canvas rounded rect helper ── */

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ── Week helpers ── */

export function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekRange(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const mn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startMonth = mn[weekStart.getMonth()];
  const endMonth = mn[end.getMonth()];
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} – ${end.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${end.getDate()}`;
}

export type WeekGroup = {
  weekKey: string;
  weekStart: Date;
  days: (MealEntry | null)[];
};

export function groupByWeek(entries: MealEntry[]): WeekGroup[] {
  const weekMap = new Map<string, Map<string, MealEntry>>();

  for (const entry of entries) {
    const date = parseLocalDate(entry.localDate);
    const ws = getWeekStart(date);
    const weekKey = toLocalDateString(ws);
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Map());
    const dayMap = weekMap.get(weekKey)!;
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

export function getCurrentWeekGroup(): WeekGroup {
  const ws = getWeekStart(new Date());
  const days: null[] = [null, null, null, null, null, null, null];
  return { weekKey: toLocalDateString(ws), weekStart: ws, days };
}

/* ── Day labels ── */

export const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── Polaroid layout presets ── */

export const polaroidLayouts = [
  { rotate: -2.5, xOff: 2, yOff: 0 },
  { rotate: 1.8, xOff: -2, yOff: 3 },
  { rotate: -1.2, xOff: 1, yOff: 0 },
  { rotate: 2.0, xOff: -3, yOff: 3 },
  { rotate: -1.5, xOff: 3, yOff: 0 },
  { rotate: 1.5, xOff: -1, yOff: 3 },
  { rotate: -2.0, xOff: 2, yOff: 0 },
];

/* ── WeekSpread (journal page with scattered polaroids) ── */

export function WeekSpread({ week, onImageTap }: { week: WeekGroup; onImageTap?: (src: string, caption: string) => void }) {
  function renderSlot(entry: MealEntry | null, dayIndex: number) {
    const layout = polaroidLayouts[dayIndex];
    const d = new Date(week.weekStart);
    d.setDate(d.getDate() + dayIndex);
    const dayNum = d.getDate();

    if (entry) {
      const s = seed(entry.id);
      const showSticker = s % 2 === 0;
      const imgSrc = entry.art.imageUrl ?? entry.art.imageDataUrl ?? entry.photoUrl ?? entry.photoDataUrl;
      const caption = entry.caption || entry.mood || "Meal";

      return (
        <div className="group block">
          <div
            className="relative rounded-[12px] bg-white p-[4px] pb-[22px] transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
            style={{
              rotate: `${layout.rotate}deg`,
              translate: `${layout.xOff}px ${layout.yOff}px`,
              boxShadow: "0 3px 20px rgba(107,88,78,0.12), 0 1px 4px rgba(107,88,78,0.07)",
            }}
          >
            <WashiStrip entryId={entry.id} position={s % 2 === 0 ? "top-left" : "top-right"} />
            <Paperclip entryId={entry.id} />

            <button
              type="button"
              className="relative w-full overflow-hidden rounded-[8px]"
              onClick={() => onImageTap?.(imgSrc, caption)}
            >
              <img
                src={imgSrc}
                alt={entry.mood ? `${entry.mood} meal` : "Meal"}
                className="block aspect-square w-full object-cover"
              />
            </button>

            <Link href={`/entry/${entry.id}`} className="mt-1 block px-0.5">
              <p className="text-[9px] font-bold tracking-[0.15em] text-cocoa/60">
                {dayLabels[dayIndex]} {dayNum}
              </p>
              <p className="truncate text-[10px] text-ink">
                {caption.toLowerCase()}
              </p>
            </Link>

            {showSticker && (
              <span
                className="pointer-events-none absolute text-sm"
                style={{
                  bottom: "-5px",
                  right: s % 3 === 0 ? "-5px" : undefined,
                  left: s % 3 !== 0 ? "-5px" : undefined,
                }}
              >
                {pickSticker(entry.id)}
              </span>
            )}
          </div>
        </div>
      );
    }

    const localDate = toLocalDateString(d);
    const Illust = slotIllustrations[dayIndex];
    return (
      <Link href={`/entry/new?date=${localDate}`} className="group block">
        <div
          className="relative transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
          style={{
            rotate: `${layout.rotate}deg`,
            translate: `${layout.xOff}px ${layout.yOff}px`,
          }}
        >
          <div
            className="relative overflow-hidden p-2 pb-5"
            style={{
              background: "linear-gradient(170deg, #FFF9F0 0%, #FFF3E4 50%, #FFEDD8 100%)",
              clipPath: deckledCard,
              boxShadow: "2px 3px 12px rgba(107,88,78,0.1)",
            }}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 160 200" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 6 C5 4, 12 2, 20 3 L140 5 C148 3, 155 6, 154 10 L152 188 C153 194, 148 198, 140 196 L18 195 C10 197, 5 193, 7 188 Z"
                stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"
              />
            </svg>

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />

            <div className="flex aspect-square flex-col items-center justify-center">
              <Illust className="h-10 w-10" />
            </div>

            <div className="mt-0.5 px-0.5">
              <p className="text-[9px] font-bold tracking-[0.15em] text-cocoa/70">
                {dayLabels[dayIndex]} {dayNum}
              </p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-l-[8px] border-l-[6px] border-l-[#C4A882]"
        style={{
          background: "linear-gradient(170deg, #FFF9F0 0%, #FFF3E4 40%, #FFEDD8 100%)",
          clipPath: deckledEdgeRight,
          boxShadow: "4px 4px 24px rgba(107,88,78,0.12), inset 0 0 40px rgba(200,170,140,0.08)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="absolute bottom-3 left-1 top-3 flex flex-col justify-between">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-1 w-1 rounded-full bg-[#C4A882]/30" />
          ))}
        </div>

        <div className="relative px-3 py-3">
          <p className="mb-2 text-center text-xs font-bold tracking-[0.2em] text-cocoa/60">
            {formatWeekRange(week.weekStart)}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {week.days.map((entry, i) => (
              <div key={i}>{renderSlot(entry, i)}</div>
            ))}
            <div className="overflow-hidden rounded-[10px]">
              <img
                src="/dogavacado.png"
                alt=""
                className="aspect-square w-full object-cover opacity-[0.35]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
