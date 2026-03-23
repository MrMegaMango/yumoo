import "server-only";

import OpenAI from "openai";

import type { ArtJobInput, ArtJobResult } from "@/lib/types";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const OPENAI_ART_MODEL = "gpt-image-1-mini";
const OUTPUT_FORMAT = "jpeg";
const OUTPUT_COMPRESSION = 60;
const QUALITY = "low";
const SIZE = "1024x1024";

export async function generateArtImage(
  input: ArtJobInput
): Promise<ArtJobResult> {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const sourceImage = dataUrlToFile(input.photoDataUrl, `${input.entryId}-meal`);
  const response = await openai.images.edit({
    model: OPENAI_ART_MODEL,
    image: sourceImage,
    prompt: buildMealArtPrompt(input),
    quality: QUALITY,
    size: SIZE,
    background: "opaque",
    output_format: OUTPUT_FORMAT,
    output_compression: OUTPUT_COMPRESSION,
    user: input.userId
  });

  const encodedImage = response.data?.[0]?.b64_json;
  if (!encodedImage) {
    throw new Error("OpenAI did not return image data.");
  }

  return {
    imageDataUrl: `data:image/${OUTPUT_FORMAT};base64,${encodedImage}`,
    provider: "openai",
    model: OPENAI_ART_MODEL,
    metadata: {
      promptVersion: input.promptVersion,
      styleVersion: input.styleVersion,
      quality: QUALITY,
      size: SIZE,
      outputFormat: OUTPUT_FORMAT,
      outputCompression: OUTPUT_COMPRESSION,
      renderStyle: "japanese-watercolor"
    }
  };
}

export function isOpenAIArtConfigured() {
  return Boolean(openai);
}

function buildMealArtPrompt(input: ArtJobInput) {
  const promptParts = [
    "Transform the provided meal photo into a Japanese minimal sumi-e watercolor painting.",
    "Keep the recognizable ingredients and overall composition from the source image.",
    "Use soft natural lighting, a muted pastel palette with low color saturation, and gentle ink-wash brushstrokes.",
    "Leave generous negative space in the style of wabi-sabi aesthetics.",
    "The result should feel calm, elegant, and understated — not photorealistic.",
    "Return one finished square image."
  ];

  if (input.mood) {
    promptParts.push(`Mood cue: ${input.mood}. Let that mood subtly influence the color and energy.`);
  }

  if (input.mealType) {
    promptParts.push(`Vibe tag: ${input.mealType}.`);
  }

  if (input.caption.trim()) {
    promptParts.push(`Meal note: ${input.caption.trim()}.`);
  }

  return promptParts.join(" ");
}

function dataUrlToFile(dataUrl: string, fileStem: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("The meal photo is not a valid image.");
  }

  const [, mimeType, base64Payload] = match;
  const buffer = Buffer.from(base64Payload, "base64");
  const extension = mimeType.split("/")[1] ?? "jpeg";

  return new File([buffer], `${fileStem}.${extension}`, { type: mimeType });
}
