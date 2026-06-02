import { pipeline } from '@xenova/transformers';

let classifier = null;
let isModelLoading = false;

/**
 * Fallback rule-based sentiment analyzer in case HuggingFace model fails to load/run
 * @param {string} text - Text to analyze
 * @returns {Object} Sentiment result
 */
const fallbackAnalyzeText = (text) => {
  const cleanText = text.toLowerCase();
  
  const positiveWords = [
    'bullish', 'gain', 'high', 'profit', 'growth', 'record', 'partnership', 
    'outperforming', 'strong', 'upgrade', 'rise', 'positive', 'surge', 'rebound',
    'win', 'beats', 'expansion', 'buy', 'opportunity'
  ];
  
  const negativeWords = [
    'bearish', 'loss', 'fall', 'compliance', 'regulatory', 'drop', 'audit', 
    'deficit', 'downgrade', 'warning', 'negative', 'headwind', 'plummet', 'slump',
    'decline', 'investigation', 'lawsuit', 'sell', 'risk', 'shrink'
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = cleanText.match(regex);
    if (matches) positiveScore += matches.length;
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = cleanText.match(regex);
    if (matches) negativeScore += matches.length;
  });

  if (positiveScore > negativeScore) {
    const total = positiveScore + negativeScore;
    const score = 0.5 + (positiveScore / (total * 2)); // map to 0.5 - 1.0
    return { label: 'POSITIVE', score: Math.min(score, 0.95) };
  } else if (negativeScore > positiveScore) {
    const total = positiveScore + negativeScore;
    const score = 0.5 + (negativeScore / (total * 2)); // map to 0.5 - 1.0
    return { label: 'NEGATIVE', score: Math.min(score, 0.95) };
  } else {
    return { label: 'NEUTRAL', score: 0.50 };
  }
};

/**
 * Initializes and caches the HuggingFace Finbert model pipeline.
 */
export const initModel = async () => {
  if (classifier) return classifier;
  if (isModelLoading) {
    // Wait until loading is done
    while (isModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return classifier;
  }

  isModelLoading = true;
  try {
    console.log('[SentimentService] Loading Hugging Face FinBERT model (ONNX local execution)...');
    // Using Xenova/finbert which is specifically trained on financial sentiment
    classifier = await pipeline('sentiment-analysis', 'Xenova/finbert', {
      progress_callback: (info) => {
        if (info.status === 'progress') {
          console.log(`[SentimentService] Downloading model: ${info.file} (${Math.round(info.progress)}%)`);
        }
      }
    });
    console.log('[SentimentService] Hugging Face FinBERT model loaded successfully.');
    return classifier;
  } catch (error) {
    console.error('[SentimentService] Failed to load model. Inference will fall back to rule-based analysis.', error.message);
    classifier = null;
    return null;
  } finally {
    isModelLoading = false;
  }
};

/**
 * Analyzes the sentiment of a text string (headline or summary).
 * @param {string} text - The input text to analyze
 * @returns {Promise<Object>} Object containing { label, score } where label is POSITIVE, NEGATIVE, or NEUTRAL
 */
export const analyzeText = async (text) => {
  if (!text || text.trim() === '') {
    return { label: 'NEUTRAL', score: 0.50 };
  }

  const model = await initModel();
  if (!model) {
    return fallbackAnalyzeText(text);
  }

  try {
    const results = await model(text);
    // Xenova/finbert returns array: [{ label: 'positive', score: 0.999 }]
    if (results && results.length > 0) {
      return {
        label: results[0].label.toUpperCase(), // POSITIVE, NEGATIVE, NEUTRAL
        score: parseFloat(results[0].score.toFixed(4))
      };
    }
    return fallbackAnalyzeText(text);
  } catch (error) {
    console.error('[SentimentService] Inference error:', error.message);
    return fallbackAnalyzeText(text);
  }
};

/**
 * Analyzes a list of news articles and returns them annotated with sentiment,
 * along with an aggregated summary score.
 * @param {Array} articles - List of articles to analyze
 * @returns {Promise<Object>} Sentiment result with articles and summary
 */
export const analyzeArticlesSentiment = async (articles) => {
  if (!articles || articles.length === 0) {
    return {
      status: 'success',
      overallSentiment: 'NEUTRAL',
      bullishPercent: 50,
      bearishPercent: 50,
      averageScore: 0.0,
      annotatedArticles: []
    };
  }

  console.log(`[SentimentService] Analyzing sentiment for ${articles.length} articles...`);
  
  // Predict sentiment for each article based on its headline and summary
  const annotatedArticles = await Promise.all(
    articles.map(async (article) => {
      const textToAnalyze = `${article.headline}. ${article.summary || ''}`;
      const sentiment = await analyzeText(textToAnalyze);
      return {
        ...article,
        sentiment
      };
    })
  );

  // Aggregate results
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let totalScore = 0; // Bullish adds positive score, Bearish adds negative, Neutral is 0

  annotatedArticles.forEach(article => {
    const { label, score } = article.sentiment;
    if (label === 'POSITIVE') {
      positiveCount++;
      totalScore += score;
    } else if (label === 'NEGATIVE') {
      negativeCount++;
      totalScore -= score;
    } else {
      neutralCount++;
    }
  });

  const totalArticles = annotatedArticles.length;
  const bullishPercent = Math.round((positiveCount / totalArticles) * 100);
  const bearishPercent = Math.round((negativeCount / totalArticles) * 100);
  const neutralPercent = Math.round((neutralCount / totalArticles) * 100);

  let overallSentiment = 'NEUTRAL';
  if (positiveCount > negativeCount) {
    overallSentiment = 'BULLISH';
  } else if (negativeCount > positiveCount) {
    overallSentiment = 'BEARISH';
  }

  const averageScore = parseFloat((totalScore / totalArticles).toFixed(4));

  return {
    status: 'success',
    overallSentiment,
    bullishPercent,
    bearishPercent,
    neutralPercent,
    averageScore,
    annotatedArticles
  };
};
