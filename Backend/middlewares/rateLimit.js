const buckets = new Map();

function getClientKey(request) {
  return request.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || request.ip
    || request.socket?.remoteAddress
    || "unknown";
}

export function rateLimit({ windowMs = 60_000, max = 180, keyPrefix = "default" } = {}) {
  return (request, response, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientKey(request)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      response.status(429).json({
        success: false,
        message: "Too many analytics events. Please retry shortly."
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
