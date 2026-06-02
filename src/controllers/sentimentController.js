import { fetchStockNews } from '../services/newsService.js';
import { analyzeArticlesSentiment } from '../services/sentimentService.js';
import { isDbConnected } from '../config/db.js';
import { SentimentCache } from '../models/cacheModel.js';

/**
 * Controller to fetch stock sentiment.
 * In Phase 3, it checks caches via middleware, calculates if a miss, and then writes the result back to MongoDB cache.
 */
export const getStockSentiment = async (req, res) => {
  const { symbol } = req.params;
  if (!symbol) return res.status(400).json({ success: false, error: 'Stock ticker symbol is required.' });

  try {
    const uppercaseSymbol = symbol.toUpperCase();
    console.log(`[SentimentController] Cache miss. Fetching fresh news for: ${uppercaseSymbol}`);
    
    // 1. Fetch news articles
    const articles = await fetchStockNews(uppercaseSymbol);

    if (!articles || articles.length === 0) {
      return res.status(200).json({
        success: true,
        symbol: uppercaseSymbol,
        articlesCount: 0,
        sentimentSummary: {
          status: 'no_news_available',
          overallSentiment: 'NEUTRAL',
          bullishPercent: 50,
          bearishPercent: 50,
          averageScore: 0.0
        },
        articles: []
      });
    }

    // 2. Perform Hugging Face NLP Sentiment Analysis
    console.log(`[SentimentController] Running sentiment analysis for ${uppercaseSymbol}`);
    const analysis = await analyzeArticlesSentiment(articles);

    // 3. Save to MongoDB Cache asynchronously
    if (isDbConnected()) {
      SentimentCache.create({
        symbol: uppercaseSymbol,
        articlesCount: articles.length,
        sentimentSummary: {
          overallSentiment: analysis.overallSentiment,
          bullishPercent: analysis.bullishPercent,
          bearishPercent: analysis.bearishPercent,
          neutralPercent: analysis.neutralPercent,
          averageScore: analysis.averageScore
        },
        articles: analysis.annotatedArticles
      }).catch(cacheErr => {
        // Handle duplicate key errors gracefully (e.g. concurrent requests)
        if (cacheErr.code === 11000) {
          console.log(`[Cache] Cache document for ${uppercaseSymbol} was already written by a concurrent request.`);
        } else {
          console.error('[Cache] Error writing to sentiment cache:', cacheErr.message);
        }
      });
    }

    // 4. Return the response
    return res.status(200).json({
      success: true,
      symbol: uppercaseSymbol,
      articlesCount: articles.length,
      sentimentSummary: {
        status: 'success',
        overallSentiment: analysis.overallSentiment,
        bullishPercent: analysis.bullishPercent,
        bearishPercent: analysis.bearishPercent,
        neutralPercent: analysis.neutralPercent,
        averageScore: analysis.averageScore
      },
      articles: analysis.annotatedArticles
    });
  } catch (error) {
    console.error(`[SentimentController] Error in getStockSentiment for ${symbol}:`, error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while analyzing stock sentiment.'
    });
  }
};
