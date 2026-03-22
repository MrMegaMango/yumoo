import type { ArtJobInput } from "@/lib/types";

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const BASE64_DATA_URL_PREFIX = /^data:image\/[a-z0-9.+-]+;base64,/i;

type TimestampBuckets = Map<string, number[]>;

type GlobalRateLimiterState = {
  entry: TimestampBuckets;
  ip: TimestampBuckets;
  user: TimestampBuckets;
};

const DEFAULTS = {
  maxCaptionLength: 240,
  maxEntryPerHour: 6,
  maxIpPerHour: 20,
  maxPhotoBytes: 3_000_000,
  maxUserPerDay: 40
};

type ArtAbuseLimitErrorOptions = {
  retryAfterSeconds?: number;
  status?: number;
};

export class ArtAbuseLimitError extends Error {
  retryAfterSeconds?: number;
  status: number;

  constructor(message: string, options: ArtAbuseLimitErrorOptions = {}) {
    super(message);
    this.name = "ArtAbuseLimitError";
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.status = options.status ?? 400;
  }
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig() {
  return {
    maxCaptionLength: parsePositiveInt(
      process.env.ART_MAX_CAPTION_LENGTH,
      DEFAULTS.maxCaptionLength
    ),
    maxEntryPerHour: parsePositiveInt(
      process.env.ART_MAX_REQUESTS_PER_ENTRY_PER_HOUR,
      DEFAULTS.maxEntryPerHour
    ),
    maxIpPerHour: parsePositiveInt(
      process.env.ART_MAX_REQUESTS_PER_IP_PER_HOUR,
      DEFAULTS.maxIpPerHour
    ),
    maxPhotoBytes: parsePositiveInt(
      process.env.ART_MAX_PHOTO_BYTES,
      DEFAULTS.maxPhotoBytes
    ),
    maxUserPerDay: parsePositiveInt(
      process.env.ART_MAX_REQUESTS_PER_USER_PER_DAY,
      DEFAULTS.maxUserPerDay
    )
  };
}

function getRateLimiterState() {
  const globalState = globalThis as typeof globalThis & {
    __yumooArtRateLimiter?: GlobalRateLimiterState;
  };

  if (!globalState.__yumooArtRateLimiter) {
    globalState.__yumooArtRateLimiter = {
      entry: new Map(),
      ip: new Map(),
      user: new Map()
    };
  }

  return globalState.__yumooArtRateLimiter;
}

function estimateBase64Bytes(dataUrl: string) {
  const [, base64Payload = ""] = dataUrl.split(",", 2);
  const padding =
    base64Payload.endsWith("==") ? 2 : base64Payload.endsWith("=") ? 1 : 0;

  return Math.max(0, Math.floor((base64Payload.length * 3) / 4) - padding);
}

function consumeLimit(
  buckets: TimestampBuckets,
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const activeTimestamps = (buckets.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (activeTimestamps.length >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((activeTimestamps[0] + windowMs - now) / 1000)
    );

    buckets.set(key, activeTimestamps);
    return {
      allowed: false,
      retryAfterSeconds
    };
  }

  activeTimestamps.push(now);
  buckets.set(key, activeTimestamps);

  return {
    allowed: true,
    retryAfterSeconds: 0
  };
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function assertSafeArtPayload(payload: ArtJobInput) {
  const config = getConfig();

  if (payload.caption.trim().length > config.maxCaptionLength) {
    throw new ArtAbuseLimitError(
      `Captions must be ${config.maxCaptionLength} characters or shorter.`
    );
  }

  if (!BASE64_DATA_URL_PREFIX.test(payload.photoDataUrl)) {
    throw new ArtAbuseLimitError("Meal photos must be base64 image data URLs.");
  }

  if (estimateBase64Bytes(payload.photoDataUrl) > config.maxPhotoBytes) {
    throw new ArtAbuseLimitError(
      "Meal photo is too large after compression. Try a smaller image.",
      { status: 413 }
    );
  }
}

export function enforceArtRequestLimits(
  request: Request,
  userId: string,
  payload: ArtJobInput,
  options?: { skipUserLimit?: boolean }
) {
  const config = getConfig();
  const state = getRateLimiterState();
  const ipKey = `ip:${getClientIp(request)}`;
  const userKey = `user:${userId}`;
  const entryKey = `entry:${payload.entryId}`;
  const ipResult = consumeLimit(state.ip, ipKey, config.maxIpPerHour, HOUR_IN_MS);

  if (!ipResult.allowed) {
    throw new ArtAbuseLimitError(
      "Too many art requests from this connection. Try again a little later.",
      {
        retryAfterSeconds: ipResult.retryAfterSeconds,
        status: 429
      }
    );
  }

  if (!options?.skipUserLimit) {
    const userResult = consumeLimit(
      state.user,
      userKey,
      config.maxUserPerDay,
      DAY_IN_MS
    );

    if (!userResult.allowed) {
      throw new ArtAbuseLimitError(
        "This diary has hit its art limit for today. Try again tomorrow.",
        {
          retryAfterSeconds: userResult.retryAfterSeconds,
          status: 429
        }
      );
    }
  }

  const entryResult = consumeLimit(
    state.entry,
    entryKey,
    config.maxEntryPerHour,
    HOUR_IN_MS
  );

  if (!entryResult.allowed) {
    throw new ArtAbuseLimitError(
      "This meal has been retried too many times in the last hour.",
      {
        retryAfterSeconds: entryResult.retryAfterSeconds,
        status: 429
      }
    );
  }
}
