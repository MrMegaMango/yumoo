import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export type CreditPackage = "10" | "50";

export const CREDIT_PACKAGES: Record<
  CreditPackage,
  { credits: number; label: string; priceEnvKey: string }
> = {
  "10": { credits: 10, label: "$1.00", priceEnvKey: "STRIPE_PRICE_10_CREDITS" },
  "50": { credits: 50, label: "$4.00", priceEnvKey: "STRIPE_PRICE_50_CREDITS" }
};

export function getPriceId(pkg: CreditPackage): string | null {
  const envKey = CREDIT_PACKAGES[pkg].priceEnvKey;
  return process.env[envKey] ?? null;
}

export function getTipPriceId(): string | null {
  return process.env.STRIPE_PRICE_TIP ?? null;
}
