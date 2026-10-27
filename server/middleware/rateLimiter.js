/**
 * Lightweight in-memory rate limiter middleware for PeakTix API.
 * Regulates aggressive request bursts per client IP.
 */
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = Number.parseInt(process.env.RATE_LIMIT_MAX, 10) || 300;

export function rateLimiter(req, res, next) {
  // Allow health checks and instance queries without throttling
  if (req.path === '/api/health' || req.path === '/api/instance') {
    return next();
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let clientRecord = rateLimitMap.get(clientIp);
  if (!clientRecord || now - clientRecord.windowStart > WINDOW_MS) {
    clientRecord = { count: 1, windowStart: now };
    rateLimitMap.set(clientIp, clientRecord);
  } else {
    clientRecord.count++;
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - clientRecord.count));

  if (clientRecord.count > MAX_REQUESTS) {
    res.setHeader('Retry-After', Math.ceil((clientRecord.windowStart + WINDOW_MS - now) / 1000));
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded: too many requests. Please slow down and try again shortly.',
    });
  }

  next();
}
