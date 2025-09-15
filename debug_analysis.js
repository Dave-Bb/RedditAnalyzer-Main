// Debug script to test the analysis pipeline locally
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const redditService = require('./server/services/redditService');
const sentimentService = require('./server/services/sentimentService');

async function debugAnalysis() {
  console.log('🔍 DEBUGGING REDDIT SENTIMENT ANALYSIS');
  console.log('=====================================');

  // Check environment variables
  console.log('\n📋 Environment Check:');
  console.log('- CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY ? `Present (${process.env.CLAUDE_API_KEY.length} chars)` : '❌ Missing');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `Present (${process.env.OPENAI_API_KEY.length} chars)` : '❌ Missing');
  console.log('- REDDIT_CLIENT_ID:', process.env.REDDIT_CLIENT_ID ? `Present (${process.env.REDDIT_CLIENT_ID.length} chars)` : '❌ Missing');
  console.log('- REDDIT_CLIENT_SECRET:', process.env.REDDIT_CLIENT_SECRET ? `Present (${process.env.REDDIT_CLIENT_SECRET.length} chars)` : '❌ Missing');

  // Test API connections
  console.log('\n🔑 Testing API Connections:');

  try {
    // Test Reddit
    console.log('Testing Reddit API...');
    const redditTest = await redditService.testConnection();
    console.log('Reddit:', redditTest.success ? '✅ Connected' : `❌ Failed: ${redditTest.message}`);
  } catch (error) {
    console.log('Reddit: ❌ Error:', error.message);
  }

  try {
    // Test Claude
    console.log('Testing Claude API...');
    const claudeTest = await sentimentService.testClaude();
    console.log('Claude:', claudeTest.success ? '✅ Connected' : `❌ Failed: ${claudeTest.message}`);
  } catch (error) {
    console.log('Claude: ❌ Error:', error.message);
  }

  try {
    // Test OpenAI
    console.log('Testing OpenAI API...');
    const openaiTest = await sentimentService.testOpenAI();
    console.log('OpenAI:', openaiTest.success ? '✅ Connected' : `❌ Failed: ${openaiTest.message}`);
  } catch (error) {
    console.log('OpenAI: ❌ Error:', error.message);
  }

  // Test Reddit data fetching
  console.log('\n📡 Testing Reddit Data Fetching:');
  try {
    console.log('Fetching data from r/test (small sample)...');
    const redditData = await redditService.fetchSubredditData(
      ['test'], // Small safe subreddit
      '2024-01-01', // Wide date range
      '2024-12-31',
      3 // Only 3 posts
    );

    console.log(`📊 Reddit Data Results:`);
    console.log(`- Posts fetched: ${redditData.posts.length}`);
    console.log(`- Total comments: ${redditData.posts.reduce((sum, post) => sum + post.comments.length, 0)}`);

    if (redditData.posts.length > 0) {
      console.log(`- Sample post: "${redditData.posts[0].title.substring(0, 50)}..."`);
      console.log(`- Sample post has ${redditData.posts[0].comments.length} comments`);
    }

    // Test sentiment analysis
    if (redditData.posts.length > 0) {
      console.log('\n🧠 Testing Sentiment Analysis:');
      console.log('Running analysis on fetched data...');

      const analysisResult = await sentimentService.analyzeSentiment(redditData);

      console.log('✅ Sentiment Analysis Results:');
      console.log(`- Overall score: ${analysisResult.overall_sentiment?.average_score || 'N/A'}`);
      console.log(`- Individual scores: ${analysisResult.individual_scores?.length || 0} items analyzed`);
      console.log(`- AI Model used: ${analysisResult.aiModel || 'Unknown'}`);
      console.log(`- Themes found: ${analysisResult.overall_sentiment?.dominant_themes?.length || 0}`);

      if (analysisResult.overall_sentiment?.dominant_themes?.length > 0) {
        console.log(`- Sample themes: ${analysisResult.overall_sentiment.dominant_themes.slice(0, 3).join(', ')}`);
      }
    }

  } catch (error) {
    console.log('❌ Reddit/Analysis Error:', error.message);
    console.log('Full error:', error);
  }

  console.log('\n🎯 Debug Complete!');
}

// Run the debug
debugAnalysis().catch(error => {
  console.error('Debug script failed:', error);
});