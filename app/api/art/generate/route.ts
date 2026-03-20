import { NextResponse } from "next/server";

import { generateArtImage, isOpenAIArtConfigured } from "@/lib/openai-art";
import type { ArtJobInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isOpenAIArtConfigured()) {
    return NextResponse.json(
      { error: "Set OPENAI_API_KEY to enable Yumoo art generation." },
      { status: 503 }
    );
  }

  let payload: ArtJobInput;

  try {
    payload = (await request.json()) as ArtJobInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof payload?.entryId !== "string" ||
    typeof payload?.userId !== "string" ||
    typeof payload?.photoDataUrl !== "string" ||
    typeof payload?.caption !== "string" ||
    typeof payload?.promptVersion !== "string" ||
    typeof payload?.styleVersion !== "string"
  ) {
    return NextResponse.json({ error: "Missing art generation fields." }, { status: 400 });
  }

  try {
    const result = await generateArtImage(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Art generation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
