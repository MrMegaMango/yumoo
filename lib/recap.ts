import { formatMonthLabel, parseYearMonth } from "@/lib/date";
import type { MealEntry, MealType } from "@/lib/types";

export type RecapMetrics = {
  totalMeals: number;
  daysLogged: number;
  currentStreak: number;
  topMealType?: MealType;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function getTopMealType(entries: MealEntry[]) {
  const totals = new Map<MealType, number>();

  for (const entry of entries) {
    if (!entry.mealType) {
      continue;
    }

    totals.set(entry.mealType, (totals.get(entry.mealType) ?? 0) + 1);
  }

  return [...totals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

export function buildRecapSvg(input: {
  yearMonth: string;
  entries: MealEntry[];
  metrics: RecapMetrics;
}) {
  const monthLabel = formatMonthLabel(parseYearMonth(input.yearMonth));
  const featured = input.entries.slice(0, 6);

  const tileMarkup = featured
    .map((entry, index) => {
      const x = index % 2 === 0 ? 72 : 556;
      const y = 410 + Math.floor(index / 2) * 340;
      const [a, b, c] = entry.art.palette;

      return `
        <g transform="translate(${x}, ${y})">
          <rect width="452" height="252" rx="34" fill="${a}" />
          <rect x="24" y="24" width="404" height="204" rx="28" fill="${b}" opacity="0.55" />
          <circle cx="340" cy="72" r="44" fill="${c}" opacity="0.86" />
          <text x="32" y="196" font-size="28" font-family="Arial, sans-serif" fill="#2B221E">
            ${escapeXml(entry.mood || entry.caption || "Logged meal")}
          </text>
          <text x="32" y="228" font-size="20" font-family="Arial, sans-serif" fill="#6B584E">
            ${escapeXml(entry.localDate)}
          </text>
        </g>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1080" y2="1920" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFF8F2"/>
          <stop offset="1" stop-color="#FFE8D6"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bg)" />
      <circle cx="156" cy="224" r="96" fill="#FFD9C6" opacity="0.72" />
      <circle cx="906" cy="278" r="124" fill="#FFE6A8" opacity="0.72" />
      <text x="72" y="162" font-size="42" font-family="Arial, sans-serif" fill="#6B584E">Yumoo monthly recap</text>
      <text x="72" y="254" font-size="82" font-weight="700" font-family="Georgia, serif" fill="#2B221E">${escapeXml(monthLabel)}</text>
      <text x="72" y="324" font-size="34" font-family="Arial, sans-serif" fill="#6B584E">${input.metrics.daysLogged} days logged  •  ${input.metrics.totalMeals} meals  •  ${input.metrics.currentStreak} day streak</text>
      ${tileMarkup}
      <rect x="72" y="1566" width="936" height="236" rx="42" fill="#FFFDFB" />
      <text x="120" y="1648" font-size="28" font-family="Arial, sans-serif" fill="#6B584E">Most common vibe</text>
      <text x="120" y="1718" font-size="54" font-weight="700" font-family="Georgia, serif" fill="#2B221E">${escapeXml(input.metrics.topMealType ?? "mixed plate")}</text>
      <text x="120" y="1776" font-size="26" font-family="Arial, sans-serif" fill="#6B584E">Private by default. Cute on purpose.</text>
    </svg>
  `.trim();
}

export function downloadRecapSvg(svg: string, fileName: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

