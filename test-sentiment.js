import { analyzeText, analyzeArticlesSentiment } from './src/services/sentimentService.js';

const runTest = async () => {
  console.log('--- Testing Stock Sentiment Analysis ---');
  
  // Test 1: Single Sentence (Positive)
  const posText = 'Apple stock surges to record high after revolutionary AI announcements.';
  console.log(`Analyzing: "${posText}"`);
  const posResult = await analyzeText(posText);
  console.log('Result:', posResult);

  // Test 2: Single Sentence (Negative)
  const negText = 'Tesla faces heavy sell-off after regulatory investigation and sales slump.';
  console.log(`\nAnalyzing: "${negText}"`);
  const negResult = await analyzeText(negText);
  console.log('Result:', negResult);

  // Test 3: Multiple articles
  const mockArticles = [
    { headline: 'NVIDIA partnership triggers massive stock gain.', summary: 'Strong demand for chips drives growth.' },
    { headline: 'NVIDIA warning on chip export limitations.', summary: 'New regulations might reduce international sales.' },
    { headline: 'NVIDIA holds annual developer conference.', summary: 'No major news announced but interest remains steady.' }
  ];
  
  console.log('\nAnalyzing batch articles...');
  const batchResult = await analyzeArticlesSentiment(mockArticles);
  console.log('Batch Aggregation Results:');
  console.log('- Overall Sentiment:', batchResult.overallSentiment);
  console.log('- Bullish %:', batchResult.bullishPercent);
  console.log('- Bearish %:', batchResult.bearishPercent);
  console.log('- Neutral %:', batchResult.neutralPercent);
  console.log('- Average Score:', batchResult.averageScore);
  
  console.log('\nAnnotated Articles:');
  batchResult.annotatedArticles.forEach((art, i) => {
    console.log(`[Article ${i+1}] ${art.headline} -> ${art.sentiment.label} (Score: ${art.sentiment.score})`);
  });
};

runTest().catch(console.error);
