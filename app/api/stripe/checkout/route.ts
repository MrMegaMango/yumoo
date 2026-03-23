import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  CREDIT_PACKAGES,
  LIFETIME_PACKAGE,
  type CreditPackage,
  getStripeClient,
  isStripeConfigured,
  resolveCreditPriceId,
  resolveLifetimePriceId
} from "@/lib/stripe";

export const runtime = "nodejs";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  const accessToken = getBearerToken(request);
  const supabase = getSupabaseServerClient();

  if (!accessToken || !supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user || data.user.is_anonymous) {
    return NextResponse.json(
      { error: "Sign in to a saved account before topping up credits." },
      { status: 401 }
    );
  }

  let pkg: CreditPackage | "lifetime";

  try {
    const body = (await request.json()) as { package?: string };
    if (body?.package !== "10" && body?.package !== "50" && body?.package !== "lifetime") {
      return NextResponse.json({ error: "Invalid credit package." }, { status: 400 });
    }
    pkg = body.package;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const stripe = getStripeClient()!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (pkg === "lifetime") {
    const priceId = await resolveLifetimePriceId();

    if (!priceId) {
      return NextResponse.json(
        { error: "No active Stripe price was found for lifetime access." },
        { status: 503 }
      );
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          userId: data.user.id,
          lifetime: "true"
        },
        success_url: `${appUrl}/settings?topup=success&lifetime=true`,
        cancel_url: `${appUrl}/settings`
      });

      return NextResponse.json({ url: session.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout session could not be created.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const priceId = await resolveCreditPriceId(pkg);

  if (!priceId) {
    return NextResponse.json(
      { error: `No active Stripe price was found for the ${pkg}-credit package.` },
      { status: 503 }
    );
  }

  const { credits } = CREDIT_PACKAGES[pkg];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: data.user.id,
        credits: String(credits)
      },
      success_url: `${appUrl}/settings?topup=success&credits=${credits}`,
      cancel_url: `${appUrl}/settings`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout session could not be created.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
