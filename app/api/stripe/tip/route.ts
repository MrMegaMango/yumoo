import Stripe from "stripe";
import { NextResponse } from "next/server";

import { getStripeClient, getTipPriceId, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  const priceId = getTipPriceId();

  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_TIP is not configured." },
      { status: 503 }
    );
  }

  const stripe = getStripeClient()!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?tip=success`,
      cancel_url: `${appUrl}/settings`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe error creating tip session:", error.message);
      return NextResponse.json(
        { error: "Checkout is unavailable right now. Please try again later." },
        { status: 503 }
      );
    }
    const message = error instanceof Error ? error.message : "Checkout session could not be created.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
