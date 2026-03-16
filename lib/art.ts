import type { EntryArt } from "@/lib/types";

const paletteBank: [string, string, string][] = [
  ["#FFE5CC", "#F5B59A", "#8E6856"],
  ["#FFF0C9", "#F8D68B", "#7A8B53"],
  ["#FFD9D5", "#F6A8A6", "#8A6A82"],
  ["#F9E7B5", "#FFC47C", "#7A5C47"],
  ["#E7F3D8", "#B9D7A5", "#637A63"],
  ["#FEE2CD", "#F3B58C", "#6B7FA3"]
];

export const MOCK_ART_DELAY_MS = 1400;

function hashSeed(seed: string) {
  return seed.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
}

export function pickPalette(seed: string): [string, string, string] {
  return paletteBank[hashSeed(seed) % paletteBank.length];
}

export function createQueuedArt(seed: string, updatedAt: string): EntryArt {
  return {
    status: "queued",
    promptVersion: "yumoo-soft-v1",
    styleVersion: "storybook-v1",
    palette: pickPalette(seed),
    updatedAt
  };
}

export function createReadyArt(art: EntryArt, updatedAt: string): EntryArt {
  return {
    ...art,
    status: "ready",
    provider: "local-placeholder",
    model: "storybook-v1",
    updatedAt,
    metadata: {
      renderStyle: "gradient-collage"
    }
  };
}

export function createFailedArt(art: EntryArt, updatedAt: string): EntryArt {
  return {
    ...art,
    status: "failed",
    updatedAt,
    error: "Cute art generation did not finish."
  };
}

export function paletteBackground(palette: [string, string, string]) {
  return {
    backgroundImage: [
      `radial-gradient(circle at 18% 20%, ${palette[0]} 0%, transparent 40%)`,
      `radial-gradient(circle at 82% 18%, ${palette[1]} 0%, transparent 36%)`,
      `linear-gradient(160deg, ${palette[2]} 0%, ${palette[0]} 100%)`
    ].join(", ")
  };
}

