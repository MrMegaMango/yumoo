import Stripe from "stripe";

let stripeClient: Stripe | null = null;
let stripeClientKey: string | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  if (!stripeClient || stripeClientKey !== secretKey) {
    stripeClient = new Stripe(secretKey);
    stripeClientKey = secretKey;
  }

  return stripeClient;
}

export type CreditPackage = "10" | "50";

export const CREDIT_PACKAGES: Record<
  CreditPackage,
  {
    credits: number;
    label: string;
    priceEnvKey: string;
    productName: string;
    unitAmount: number;
    currency: "usd";
  }
> = {
  "10": {
    credits: 10,
    label: "$1.00",
    priceEnvKey: "STRIPE_PRICE_10_CREDITS",
    productName: "10 Yumoo Credits",
    unitAmount: 100,
    currency: "usd"
  },
  "50": {
    credits: 50,
    label: "$4.00",
    priceEnvKey: "STRIPE_PRICE_50_CREDITS",
    productName: "50 Yumoo Credits",
    unitAmount: 400,
    currency: "usd"
  }
};

const TIP_PRICE = {
  envKey: "STRIPE_PRICE_TIP",
  productNames: ["tipping jar", "tip jar"]
} as const;

type PriceMatch = {
  productNames: readonly string[];
  currency?: string;
  unitAmount?: number;
};

function normalizeProductName(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase();
}

function isExpandedPrice(
  price: string | Stripe.Price | Stripe.DeletedPrice | null | undefined
): price is Stripe.Price {
  return Boolean(price && typeof price !== "string" && price.object === "price");
}

function isExpandedProduct(
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined
): product is Stripe.Product {
  return Boolean(product && typeof product !== "string" && product.object === "product");
}

function matchesPrice(
  price: Stripe.Price,
  product: Stripe.Product | null,
  match: PriceMatch
) {
  if (!price.active || price.type !== "one_time") {
    return false;
  }

  if (!product?.active) {
    return false;
  }

  if (
    !match.productNames.some(
      (candidate) => normalizeProductName(product.name) === normalizeProductName(candidate)
    )
  ) {
    return false;
  }

  if (match.currency && price.currency !== match.currency) {
    return false;
  }

  if (match.unitAmount !== undefined && price.unit_amount !== match.unitAmount) {
    return false;
  }

  return true;
}

async function retrievePrice(
  stripe: Stripe,
  priceId: string
): Promise<Stripe.Price | null> {
  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"]
    });

    return isExpandedPrice(price) ? price : null;
  } catch {
    return null;
  }
}

async function getDefaultPrice(
  stripe: Stripe,
  product: Stripe.Product
): Promise<Stripe.Price | null> {
  if (!product.default_price) {
    return null;
  }

  if (isExpandedPrice(product.default_price)) {
    return product.default_price;
  }

  return retrievePrice(stripe, product.default_price);
}

async function findMatchingPrice(
  stripe: Stripe,
  match: PriceMatch
): Promise<string | null> {
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.products.list({
      active: true,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
      expand: ["data.default_price"]
    });

    for (const product of page.data) {
      if (
        !match.productNames.some(
          (candidate) =>
            normalizeProductName(product.name) === normalizeProductName(candidate)
        )
      ) {
        continue;
      }

      const defaultPrice = await getDefaultPrice(stripe, product);
      if (defaultPrice && matchesPrice(defaultPrice, product, match)) {
        return defaultPrice.id;
      }

      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 25
      });
      const fallbackPrice = prices.data.find((price) =>
        matchesPrice(price, product, match)
      );

      if (fallbackPrice) {
        return fallbackPrice.id;
      }
    }

    if (!page.has_more || page.data.length === 0) {
      return null;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
  }
}

async function resolvePriceId(
  envKey: string,
  match: PriceMatch
): Promise<string | null> {
  const stripe = getStripeClient();

  if (!stripe) {
    return null;
  }

  const configuredPriceId = process.env[envKey]?.trim();

  if (configuredPriceId) {
    const configuredPrice = await retrievePrice(stripe, configuredPriceId);
    const configuredProduct = configuredPrice
      ? isExpandedProduct(configuredPrice.product)
        ? configuredPrice.product
        : null
      : null;

    if (configuredPrice && matchesPrice(configuredPrice, configuredProduct, match)) {
      return configuredPrice.id;
    }
  }

  return findMatchingPrice(stripe, match);
}

export async function resolveCreditPriceId(
  pkg: CreditPackage
): Promise<string | null> {
  const config = CREDIT_PACKAGES[pkg];

  return resolvePriceId(config.priceEnvKey, {
    productNames: [config.productName],
    currency: config.currency,
    unitAmount: config.unitAmount
  });
}

export async function resolveTipPriceId(): Promise<string | null> {
  return resolvePriceId(TIP_PRICE.envKey, {
    productNames: TIP_PRICE.productNames
  });
}
