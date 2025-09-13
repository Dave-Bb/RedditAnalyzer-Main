const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Debug: Check if env vars are loaded
console.log('Environment variables loaded:');
console.log('- REDDIT_CLIENT_ID:', process.env.REDDIT_CLIENT_ID ? 'Present' : 'Missing');
console.log('- CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY ? 'Present' : 'Missing');
console.log('- PORT:', process.env.PORT || 'Using default 3001');

const redditService = require('./services/redditService');
const sentimentService = require('./services/sentimentService');
const storageService = require('./services/storageService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// Increase payload size limits for large analysis data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log streaming for real-time updates
let logClients = [];

const broadcastLog = (message, type = 'info') => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    type
  };
  
  logClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    } catch (error) {
      // Remove disconnected clients
      logClients = logClients.filter(c => c !== client);
    }
  });
};

// Patch console.log to broadcast logs
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  originalConsoleLog(...args);
  
  // Only broadcast analysis-related logs
  if (message.includes('📡') || message.includes('🧠') || message.includes('🔬') || 
      message.includes('✅') || message.includes('⚡') || message.includes('⏳') ||
      message.includes('📊') || message.includes('🎉') || message.includes('🔄') ||
      message.includes('Starting analysis') || message.includes('batch') || message.includes('Generating') ||
      message.includes('Processing') || message.includes('completed') || message.includes('finished')) {
    broadcastLog(message);
  }
};

// SSE endpoint for real-time logs
app.get('/api/logs', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add client to the list
  logClients.push(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    timestamp: new Date().toISOString(),
    message: '🔗 Connected to analysis logs',
    type: 'connection'
  })}\n\n`);

  // Remove client when connection closes
  req.on('close', () => {
    logClients = logClients.filter(client => client !== res);
  });
});

// Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { subreddits, startDate, endDate, postLimit = 50 } = req.body;
    
    console.log(`📊 Starting analysis for subreddits: ${subreddits.join(', ')}`);
    const startTime = Date.now();
    
    // Fetch Reddit data
    console.log('📡 Fetching Reddit data...');
    const redditData = await redditService.fetchSubredditData(subreddits, startDate, endDate, postLimit);
    const fetchTime = Date.now() - startTime;
    console.log(`✅ Reddit data collected: ${redditData.posts.length} posts`);
    
    // Analyze sentiment
    console.log('🧠 Starting sentiment analysis...');
    const analysisStart = Date.now();
    const analysis = await sentimentService.analyzeSentiment(redditData);
    const analysisTime = Date.now() - analysisStart;
    console.log(`✅ Sentiment analysis complete`);
    
    const totalTime = Date.now() - startTime;
    console.log(`🎉 Analysis finished in ${(totalTime / 1000).toFixed(1)}s`);
    
    res.json({
      success: true,
      data: {
        posts: redditData.posts,
        analysis: analysis,
        summary: {
          totalPosts: redditData.posts.length,
          totalComments: redditData.posts.reduce((sum, post) => sum + post.comments.length, 0),
          subreddits: subreddits,
          dateRange: { startDate, endDate }
        }
      },
      performance: {
        redditFetchTime: fetchTime,
        sentimentAnalysisTime: analysisTime,
        totalTime: totalTime
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Settings and API testing endpoints
app.get('/api/settings', (req, res) => {
  res.json({
    reddit: {
      hasClientId: !!process.env.REDDIT_CLIENT_ID,
      hasClientSecret: !!process.env.REDDIT_CLIENT_SECRET,
      userAgent: process.env.REDDIT_USER_AGENT || 'Not set'
    },
    ai: {
      hasClaude: !!process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY !== 'your_claude_api_key',
      hasOpenAI: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key'
    }
  });
});

app.post('/api/test-keys', async (req, res) => {
  const { keyType } = req.body;
  
  try {
    let result = { success: false, message: '' };
    
    switch (keyType) {
      case 'reddit':
        result = await redditService.testConnection();
        break;
      case 'claude':
        result = await sentimentService.testClaude();
        break;
      case 'openai':
        result = await sentimentService.testOpenAI();
        break;
      default:
        result = { success: false, message: 'Invalid key type' };
    }
    
    res.json(result);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.post('/api/update-settings', (req, res) => {
  const { redditClientId, redditClientSecret, redditUserAgent, claudeApiKey, openaiApiKey } = req.body;
  
  // Update environment variables temporarily (for this session)
  if (redditClientId) process.env.REDDIT_CLIENT_ID = redditClientId;
  if (redditClientSecret) process.env.REDDIT_CLIENT_SECRET = redditClientSecret;
  if (redditUserAgent) process.env.REDDIT_USER_AGENT = redditUserAgent;
  if (claudeApiKey) process.env.CLAUDE_API_KEY = claudeApiKey;
  if (openaiApiKey) process.env.OPENAI_API_KEY = openaiApiKey;
  
  // Reinitialize services with new keys
  const redditService = require('./services/redditService');
  const sentimentService = require('./services/sentimentService');
  
  res.json({ success: true, message: 'Settings updated for this session' });
});

// Analysis storage endpoints
app.get('/api/analyses', async (req, res) => {
  try {
    const analyses = await storageService.getAnalysesList();
    res.json({ success: true, analyses });
  } catch (error) {
    console.error('Failed to load analyses:', error);
    res.status(500).json({ success: false, error: 'Failed to load saved analyses' });
  }
});

app.get('/api/analyses/:id', async (req, res) => {
  try {
    const analysis = await storageService.getAnalysis(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Failed to load analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to load analysis' });
  }
});

app.post('/api/analyses', async (req, res) => {
  try {
    const { analysisData, metadata } = req.body;
    const savedAnalysis = await storageService.saveAnalysis(analysisData, metadata);
    res.json({ success: true, analysis: savedAnalysis });
  } catch (error) {
    console.error('Failed to save analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to save analysis' });
  }
});

app.delete('/api/analyses/:id', async (req, res) => {
  try {
    const result = await storageService.deleteAnalysis(req.params.id);
    if (!result.deleted) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    res.json({ success: true, message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Failed to delete analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to delete analysis' });
  }
});

app.post('/api/analyses/:id/generate-framework', async (req, res) => {
  try {
    const analysis = await storageService.getAnalysis(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }

    console.log(`🔬 Generating framework analysis for saved analysis: ${analysis.name}`);
    
    // Generate framework analysis for the existing data
    const frameworkResult = await sentimentService.generateFrameworkAnalysis(
      analysis.data.posts,
      analysis.data.analysis
    );

    // Update the analysis data with framework analysis
    analysis.data.analysis.framework_analysis = frameworkResult;

    // Save the updated analysis
    await storageService.updateAnalysis(req.params.id, analysis);

    res.json({ 
      success: true, 
      framework_analysis: frameworkResult,
      message: 'Framework analysis generated and saved successfully'
    });
  } catch (error) {
    console.error('Failed to generate framework analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate framework analysis: ' + error.message 
    });
  }
});

// Generate synthetic Reddit post endpoint
app.post('/api/generate-synthetic-post', async (req, res) => {
  try {
    const { data } = req.body;
    console.log('🤖 Generating synthetic post for subreddit:', data.subreddit);
    
    // Create the prompt exactly like you did manually
    const prompt = `Based on this Reddit data from r/${data.subreddit}, create a realistic synthetic post with 3-4 comments that captures the community's discussion style, terminology, and engagement patterns.

Sample posts and comments:
${JSON.stringify(data.sample_posts, null, 2)}

Generate a JSON response with this structure:
{
  "title": "realistic post title",
  "author": "realistic_username", 
  "body": "realistic post body with multiple paragraphs",
  "score": 847,
  "upvoteRatio": 0.89,
  "comments": [
    {
      "id": "comment1",
      "author": "username",
      "body": "realistic comment",
      "score": 123,
      "replies": [],
      "level": 0,
      "sentiment": "positive"
    }
  ],
  "subreddit": "${data.subreddit}",
  "timeAgo": "6 hours ago",
  "sentiment": "positive"
}

Make it feel authentic to this specific community - use their terminology, discussion patterns, and typical concerns/interests. Only return the JSON, no other text.`;

    // Use the existing sentiment service to call Claude
    const response = await sentimentService.generateSyntheticPost(prompt);
    
    console.log('✅ Generated synthetic post successfully');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Failed to generate synthetic post:', error);
    res.status(500).json({ 
      error: 'Failed to generate synthetic post',
      details: error.message 
    });
  }
});

// Regenerate claude insights endpoint (for retry functionality)
app.post('/api/regenerate-claude-insights', async (req, res) => {
  try {
    const { analysisData } = req.body;
    console.log('🔄 Regenerating Claude insights for analysis...');

    // Extract the posts from the analysis data
    const posts = analysisData.posts || [];
    const subreddits = analysisData.summary?.subreddits || [];

    if (posts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No posts found in analysis data to regenerate insights'
      });
    }

    // Regenerate Claude insights using the sentiment service
    const claudeInsights = await sentimentService.generateClaudeInsights(posts, subreddits);

    console.log('✅ Successfully regenerated Claude insights');
    res.json({
      success: true,
      claude_insights: claudeInsights
    });

  } catch (error) {
    console.error('❌ Failed to regenerate Claude insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate Claude insights: ' + error.message
    });
  }
});

// Alternative framework analysis endpoint (for compatibility)
app.post('/api/generate-framework-analysis', async (req, res) => {
  try {
    const { analysisData } = req.body;
    console.log('🔄 Generating framework analysis...');

    // Use the existing framework analysis logic
    const frameworkAnalysis = await sentimentService.generateFrameworkAnalysis(analysisData);

    console.log('✅ Successfully generated framework analysis');
    res.json({
      success: true,
      framework_analysis: frameworkAnalysis
    });

  } catch (error) {
    console.error('❌ Failed to generate framework analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate framework analysis: ' + error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});