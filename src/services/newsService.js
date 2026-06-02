import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Generates realistic mock stock news articles if API key is missing or request fails.
 * @param {string} symbol - Ticker symbol
 * @returns {Array} List of mock articles
 */
const getMockNews = (symbol) => {
  const upperSymbol = symbol.toUpperCase();
  const currentDate = new Date().toISOString().split('T')[0];
  
  return [
    {
      id: 1,
      headline: `${upperSymbol} Outperforms Market Expectations in Latest Quarterly Report`,
      summary: `Analysts are raising price targets for ${upperSymbol} following a strong performance in key business sectors. Institutional interest remains high.`,
      source: 'FinTech News',
      url: 'https://example.com/news/1',
      datetime: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      related: upperSymbol
    },
    {
      id: 2,
      headline: `Regulatory Headwinds Face ${upperSymbol} Amid New Compliance Audits`,
      summary: `New regulatory standards in international markets could pose challenges to ${upperSymbol}'s growth strategy over the next fiscal year.`,
      source: 'Global Market Insights',
      url: 'https://example.com/news/2',
      datetime: Math.floor(Date.now() / 1000) - 14400, // 4 hours ago
      related: upperSymbol
    },
    {
      id: 3,
      headline: `${upperSymbol} Announces Strategic Partnership to Expand AI Integration`,
      summary: `In a joint press release, ${upperSymbol} detailed plans to integrate cutting-edge machine learning across its product suite, promising operational efficiency.`,
      source: 'TechPulse',
      url: 'https://example.com/news/3',
      datetime: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      related: upperSymbol
    }
  ];
};

/**
 * Fetches stock news for a given symbol from Finnhub or falls back to mock data.
 * @param {string} symbol - The stock ticker symbol (e.g. AAPL)
 * @returns {Promise<Array>} List of news articles
 */
export const fetchStockNews = async (symbol) => {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    console.warn(`[NewsService] FINNHUB_API_KEY not found. Returning mock news for ${symbol.toUpperCase()}.`);
    return getMockNews(symbol);
  }

  try {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);

    const fromDate = oneWeekAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const response = await axios.get(`${FINNHUB_BASE_URL}/company-news`, {
      params: {
        symbol: symbol.toUpperCase(),
        from: fromDate,
        to: toDate,
        token: apiKey
      },
      timeout: 5000 // 5-second timeout
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Return top 10 articles to keep context size manageable for subsequent steps
      return response.data.slice(0, 10).map((article, idx) => ({
        id: article.id || idx,
        headline: article.headline,
        summary: article.summary,
        source: article.source,
        url: article.url,
        datetime: article.datetime,
        related: symbol.toUpperCase()
      }));
    }

    console.warn(`[NewsService] No news articles returned from Finnhub for ${symbol}. Using mock news.`);
    return getMockNews(symbol);
  } catch (error) {
    console.error(`[NewsService] Error fetching news for ${symbol}:`, error.message);
    console.warn(`[NewsService] Falling back to mock news for ${symbol}.`);
    return getMockNews(symbol);
  }
};
