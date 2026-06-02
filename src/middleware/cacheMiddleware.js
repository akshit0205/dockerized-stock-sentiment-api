import { isDbConnected } from '../config/db.js';
import { SentimentCache, RateLimitCache } from '../models/cacheModel.js';

/**
 * Express middleware to check if stock sentiment is cached.
 * Returns cached data immediately if hit.
 */
export const checkSentimentCache = async (req, res, next) => {
  if (!isDbConnected()) {
    return next(); // DB offline, bypass cache
  }

  const { symbol } = req.params;
  if (!symbol) return next();

  try {
    const cachedData = await SentimentCache.findOne({ symbol: symbol.toUpperCase() });
    
    if (cachedData) {
      console.log(`[Cache] HIT for symbol: ${symbol.toUpperCase()}`);
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({
        success: true,
        cached: true,
        symbol: cachedData.symbol,
        articlesCount: cachedData.articlesCount,
        sentimentSummary: cachedData.sentimentSummary,
        articles: cachedData.articles
      });
    }

    console.log(`[Cache] MISS for symbol: ${symbol.toUpperCase()}`);
    res.setHeader('X-Cache', 'MISS');
    next();
  } catch (error) {
    console.error('[Cache] Error checking sentiment cache:', error.message);
    next(); // Fallback to live calculation on error
  }
};

/**
 * Express middleware to enforce IP-based rate limiting via MongoDB.
 * Allows 15 requests per minute per IP.
 */
export const rateLimiterMiddleware = async (req, res, next) => {
  if (!isDbConnected()) {
    return next(); // DB offline, bypass rate limiting
  }

  // Get client IP address
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const LIMIT = 15; // 15 requests per minute
  const WINDOW_MS = 60 * 1000; // 1 minute window

  try {
    const now = new Date();
    
    // Find rate limit record or insert it if missing (using upsert/atomic operations is best)
    // Here we'll fetch and update/create. To prevent race conditions, we can findOneAndUpdate.
    let record = await RateLimitCache.findOneAndUpdate(
      { ip },
      { $setOnInsert: { expiresAt: new Date(now.getTime() + WINDOW_MS) } },
      { upsert: true, new: true }
    );

    if (record.count >= LIMIT) {
      console.warn(`[RateLimit] Blocked request from IP ${ip}. Limit exceeded.`);
      res.setHeader('X-RateLimit-Limit', LIMIT);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', Math.ceil((record.expiresAt - now) / 1000));
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    }

    // Increment count
    record.count += 1;
    await record.save();

    res.setHeader('X-RateLimit-Limit', LIMIT);
    res.setHeader('X-RateLimit-Remaining', LIMIT - record.count);
    next();
  } catch (error) {
    console.error('[RateLimit] Error executing rate limiter:', error.message);
    next(); // Fallback, let request pass
  }
};
