import type { ArtJobResult, EntryArt } from "@/lib/types";

const paletteBank: [string, string, string][] = [
  ["#FFE5CC", "#F5B59A", "#8E6856"],
  ["#FFF0C9", "#F8D68B", "#7A8B53"],
  ["#FFD9D5", "#F6A8A6", "#8A6A82"],
  ["#F9E7B5", "#FFC47C", "#7A5C47"],
  ["#E7F3D8", "#B9D7A5", "#637A63"],
  ["#FEE2CD", "#F3B58C", "#6B7FA3"]
];

export const ART_PROMPT_VERSION = "yumoo-openai-edit-v1";
export const ART_STYLE_VERSION = "storybook-sticker-v2";

function hashSeed(seed: string) {
  return seed.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
}

export function pickPalette(seed: string): [string, string, string] {
  return paletteBank[hashSeed(seed) % paletteBank.length];
}

export function createQueuedArt(seed: string, updatedAt: string): EntryArt {
  return {
    jobId: crypto.randomUUID(),
    status: "queued",
    promptVersion: ART_PROMPT_VERSION,
    styleVersion: ART_STYLE_VERSION,
    palette: pickPalette(seed),
    imageDataUrl: undefined,
    provider: undefined,
    model: undefined,
    updatedAt
  };
}

export function createReadyArt(
  art: EntryArt,
  updatedAt: string,
  result: ArtJobResult
): EntryArt {
  return {
    ...art,
    status: "ready",
    imageDataUrl: result.imageDataUrl,
    provider: result.provider,
    model: result.model,
    updatedAt,
    metadata: result.metadata,
    error: undefined
  };
}

export function createFailedArt(
  art: EntryArt,
  updatedAt: string,
  error = "Cute art generation did not finish."
): EntryArt {
  return {
    ...art,
    status: "failed",
    imageDataUrl: undefined,
    updatedAt,
    error
  };
}

const FALLBACK_PALETTE: [string, string, string] = paletteBank[0];

export function paletteBackground(palette: [string, string, string] | null | undefined) {
  const p = palette ?? FALLBACK_PALETTE;
  return {
    backgroundImage: [
      `radial-gradient(circle at 18% 20%, ${p[0]} 0%, transparent 40%)`,
      `radial-gradient(circle at 82% 18%, ${p[1]} 0%, transparent 36%)`,
      `linear-gradient(160deg, ${p[2]} 0%, ${p[0]} 100%)`
    ].join(", ")
  };
}
