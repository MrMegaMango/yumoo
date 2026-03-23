import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { addUserCredits, grantLifetimeAccess } from "@/lib/supabase-server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Invalid session metadata." }, { status: 400 });
    }

    try {
      if (session.metadata?.lifetime === "true") {
        await grantLifetimeAccess(userId);
      } else {
        const credits = parseInt(session.metadata?.credits ?? "", 10);

        if (!Number.isFinite(credits) || credits <= 0) {
          return NextResponse.json({ error: "Invalid session metadata." }, { status: 400 });
        }

        await addUserCredits(userId, credits);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process purchase.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
