import mongoose from 'mongoose';

// --- 1. Sentiment Cache Schema ---
const SentimentCacheSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  articlesCount: {
    type: Number,
    required: true
  },
  sentimentSummary: {
    overallSentiment: { type: String, required: true },
    bullishPercent: { type: Number, required: true },
    bearishPercent: { type: Number, required: true },
    neutralPercent: { type: Number, required: true },
    averageScore: { type: Number, required: true }
  },
  articles: {
    type: Array,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL Index: Automatically deletes document after 1 hour (3600 seconds)
    // You can adjust this threshold (e.g. 24 hours = 86400) depending on requirements
    index: { expires: 3600 }
  }
});

// --- 2. Rate Limiting Schema ---
const RateLimitSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true
  },
  count: {
    type: Number,
    default: 1
  },
  expiresAt: {
    type: Date,
    required: true,
    // TTL Index: Document will expire exactly at the date stored in expiresAt
    index: { expireAfterSeconds: 0 }
  }
});

// Force compound unique index on ip and window start if doing window-based rate limiting,
// but since we'll use a single window per IP, we'll keep it simple and clean.
RateLimitSchema.index({ ip: 1 }, { unique: true });

export const SentimentCache = mongoose.model('SentimentCache', SentimentCacheSchema);
export const RateLimitCache = mongoose.model('RateLimitCache', RateLimitSchema);
