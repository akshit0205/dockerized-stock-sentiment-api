import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { getStockSentiment } from './controllers/sentimentController.js';
import { rateLimiterMiddleware, checkSentimentCache } from './middleware/cacheMiddleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Enable body parser for JSON requests
app.use(express.json());

// Establish connection to MongoDB
// We don't block server startup on DB connection, letting the API start immediately
// and operate in a degraded/un-cached mode if MongoDB is slow or offline.
connectDB();

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Stock Sentiment API is healthy.' });
});

// Endpoint to get stock sentiment with MongoDB caching & rate-limiting middleware
app.get(
  '/api/sentiment/:symbol', 
  rateLimiterMiddleware, 
  checkSentimentCache, 
  getStockSentiment
);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[AppError]', err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong on the server!'
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Stock Sentiment API Server started on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   API Endpoint: http://localhost:${PORT}/api/sentiment/AAPL`);
  console.log(`==================================================`);
});

export default app;
