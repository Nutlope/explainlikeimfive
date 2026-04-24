import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const HOURLY_MESSAGE_LIMIT = 9;
const DAILY_MESSAGE_LIMIT = 21;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

const isLocal = false;

const hourlyRatelimit =
  !isLocal && redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(HOURLY_MESSAGE_LIMIT, "1 h"),
        analytics: true,
        prefix: "eli5:replies:hour",
      })
    : undefined;

const dailyRatelimit =
  !isLocal && redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(DAILY_MESSAGE_LIMIT, "1 d"),
        analytics: true,
        prefix: "eli5:replies:day",
      })
    : undefined;

export const getRemainingMessages = async (userFingerPrint: string) => {
  if (!hourlyRatelimit || !dailyRatelimit) {
    return {
      daily: { remaining: DAILY_MESSAGE_LIMIT },
      hourly: { remaining: HOURLY_MESSAGE_LIMIT },
    };
  }

  const [hourly, daily] = await Promise.all([
    hourlyRatelimit.getRemaining(userFingerPrint),
    dailyRatelimit.getRemaining(userFingerPrint),
  ]);

  return {
    daily: {
      remaining: daily.remaining,
      reset: daily.reset,
    },
    hourly: {
      remaining: hourly.remaining,
      reset: hourly.reset,
    },
  };
};

export const limitMessages = async (userFingerPrint: string) => {
  if (!hourlyRatelimit || !dailyRatelimit) {
    return;
  }

  const hourly = await hourlyRatelimit.limit(userFingerPrint);

  if (!hourly.success) {
    throw new Error("Too many messages");
  }

  const daily = await dailyRatelimit.limit(userFingerPrint);

  if (!daily.success) {
    throw new Error("Too many messages");
  }

  return { daily, hourly };
};
