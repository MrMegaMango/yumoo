import { NextResponse } from "next/server";

import {
  ArtAbuseLimitError,
  assertSafeArtPayload,
  enforceArtRequestLimits
} from "@/lib/art-abuse";
import { generateArtImage, isOpenAIArtConfigured } from "@/lib/openai-art";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ArtJobInput } from "@/lib/types";

export const runtime = "nodejs";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

async function getVerifiedSupabaseUserId(request: Request) {
  const accessToken = getBearerToken(request);
  const supabase = getSupabaseServerClient();

  if (!accessToken || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new ArtAbuseLimitError("Supabase session could not be verified.", {
      status: 401
    });
  }

  return data.user.id;
}

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
    assertSafeArtPayload(payload);

    const verifiedUserId = await getVerifiedSupabaseUserId(request);

    if (verifiedUserId && verifiedUserId !== payload.userId) {
      throw new ArtAbuseLimitError(
        "Art generation user does not match the active Supabase session.",
        { status: 403 }
      );
    }

    enforceArtRequestLimits(request, verifiedUserId ?? payload.userId, payload);

    const result = await generateArtImage(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ArtAbuseLimitError) {
      return NextResponse.json(
        { error: error.message },
        {
          headers: error.retryAfterSeconds
            ? {
                "Retry-After": String(error.retryAfterSeconds)
              }
            : undefined,
          status: error.status
        }
      );
    }

    const message =
      error instanceof Error ? error.message : "Art generation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
