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
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
console.log('- PORT:', process.env.PORT || 'Using default 3001');

const redditService = require('./services/redditService');
const sentimentService = require('./services/sentimentService');
const storageService = require('./services/storageService');

const app = express();
const PORT = process.env.PORT || 3001;

// Track current preferred model in memory (can be updated at runtime)
let currentPreferredModel = process.env.PREFERRED_MODEL || 'claude';

app.use(cors());
// Increase payload size limits for large analysis data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log streaming for real-time updates
let logClients = [];

// Active analysis tracking for cancellation and progress
let activeAnalyses = new Map(); // analysisId -> { abortController, type, startTime, progress }
let analysisProgress = new Map(); // analysisId -> { stage, percentage, tokenCount, partialResults }

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

// Update analysis progress
const updateProgress = (analysisId, update) => {
  if (!analysisProgress.has(analysisId)) {
    analysisProgress.set(analysisId, {
      stage: 'initializing',
      percentage: 0,
      tokenCount: 0,
      partialResults: null,
      postsProcessed: 0,
      totalPosts: 0,
      subredditsProcessed: 0,
      totalSubreddits: 0
    });
  }

  const current = analysisProgress.get(analysisId);
  analysisProgress.set(analysisId, { ...current, ...update });

  // Broadcast progress update
  broadcastLog(JSON.stringify({
    type: 'progress',
    analysisId,
    ...analysisProgress.get(analysisId)
  }), 'progress');
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

// Endpoint to get current analysis progress
app.get('/api/progress/:analysisId', (req, res) => {
  const { analysisId } = req.params;
  const progress = analysisProgress.get(analysisId);

  if (!progress) {
    return res.status(404).json({ error: 'Analysis not found' });
  }

  res.json(progress);
});

// Routes
app.post('/api/analyze', async (req, res) => {
  // Use the analysisId from client if provided, otherwise generate one
  const analysisId = req.body.analysisId || 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const abortController = new AbortController();

  try {
    const { subreddits, startDate, endDate, postLimit = 50 } = req.body;

    // Initialize progress tracking immediately
    updateProgress(analysisId, {
      stage: 'initializing',
      percentage: 0,
      totalSubreddits: subreddits.length,
      subredditsProcessed: 0,
      postsProcessed: 0,
      totalPosts: 0,
      tokenCount: 0
    });

    // Track this analysis for potential cancellation
    activeAnalyses.set(analysisId, {
      abortController,
      type: 'initial_analysis',
      startTime: Date.now(),
      subreddits: subreddits.join(', ')
    });

    // Robust key loading that searches all sources and validates
    console.log('🔑 Loading and validating API keys before analysis...');
    const keyResults = await sentimentService.loadAndValidateKeys();

    if (!keyResults.hasAnyWorkingKey) {
      // Clean up on error
      activeAnalyses.delete(analysisId);
      analysisProgress.delete(analysisId);

      return res.status(400).json({
        success: false,
        error: 'No valid AI API keys found. Please set your API keys in Settings or check your .env file.',
        details: {
          claude: keyResults.claudeKey ? 'Key found but failed validation' : 'No key found',
          openai: keyResults.openaiKey ? 'Key found but failed validation' : 'No key found',
          sources_checked: ['Web Settings', '.env file']
        }
      });
    }

    console.log('✅ Keys loaded successfully for analysis');

    // Update progress to show we're fetching Reddit data
    updateProgress(analysisId, {
      stage: 'fetching_reddit_data',
      percentage: 5
    });

    // Handle client cancellation
    req.on('close', () => {
      console.log('⚠️ Client disconnected, cancelling analysis');
      abortController.abort();
      activeAnalyses.delete(analysisId);
    });

    console.log(`📊 Starting analysis (${analysisId}) for subreddits: ${subreddits.join(', ')}`);
    const startTime = Date.now();
    
    // Fetch Reddit data with progress tracking
    console.log('📡 Fetching Reddit data...');
    const redditData = await redditService.fetchSubredditData(
      subreddits,
      startDate,
      endDate,
      postLimit,
      (progress) => {
        updateProgress(analysisId, {
          stage: 'fetching_reddit_data',
          percentage: Math.min(30, progress.percentage * 0.3), // Reddit fetch is 0-30% of total
          subredditsProcessed: progress.subredditsProcessed || 0,
          postsProcessed: progress.postsCollected || 0
        });
      }
    );
    const fetchTime = Date.now() - startTime;
    console.log(`✅ Reddit data collected: ${redditData.posts.length} posts`);

    updateProgress(analysisId, {
      stage: 'analyzing_sentiment',
      percentage: 30,
      totalPosts: redditData.posts.length
    });
    
    // Check if analysis was cancelled before sentiment analysis
    if (abortController.signal.aborted) {
      activeAnalyses.delete(analysisId);
      return res.status(499).json({
        success: false,
        error: 'Analysis was cancelled',
        cancelled: true
      });
    }

    // Analyze sentiment with progress tracking
    console.log('🧠 Starting sentiment analysis...');
    const analysisStart = Date.now();
    const analysis = await sentimentService.analyzeSentiment(
      redditData,
      null,
      abortController.signal,
      (progress) => {
        updateProgress(analysisId, {
          stage: 'analyzing_sentiment',
          percentage: 30 + Math.min(70, progress.percentage * 0.7), // Sentiment is 30-100% of total
          postsProcessed: progress.itemsProcessed || 0,
          tokenCount: progress.tokenCount || 0,
          partialResults: progress.partialResults || null
        });
      }
    );
    const analysisTime = Date.now() - analysisStart;
    console.log(`✅ Sentiment analysis complete`);

    // Generate framework analysis automatically
    console.log('🔬 Generating framework analysis...');
    const frameworkAnalysis = await sentimentService.generateFrameworkAnalysis(redditData.posts, analysis);
    analysis.framework_analysis = frameworkAnalysis;
    console.log('✅ Framework analysis completed');

    // Get which AI model was used
    const aiModel = analysis.aiModel || sentimentService.getUsedModel();

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Analysis finished in ${(totalTime / 1000).toFixed(1)}s`);

    // Mark as complete
    updateProgress(analysisId, {
      stage: 'complete',
      percentage: 100,
      tokenCount: analysis.tokenCount || 0
    });

    // Clean up tracking after a delay
    setTimeout(() => {
      activeAnalyses.delete(analysisId);
      analysisProgress.delete(analysisId);
    }, 60000); // Keep progress data for 1 minute after completion

    res.json({
      analysisId,
      success: true,
      data: {
        posts: redditData.posts,
        analysis: analysis,
        summary: {
          totalPosts: redditData.posts.length,
          totalComments: redditData.posts.reduce((sum, post) => sum + post.comments.length, 0),
          subreddits: subreddits,
          dateRange: { startDate, endDate }
        },
        aiModel: aiModel // Include which AI model was used
      },
      performance: {
        redditFetchTime: fetchTime,
        sentimentAnalysisTime: analysisTime,
        totalTime: totalTime
      },
      analysisId: analysisId
    });
  } catch (error) {
    console.error('Analysis error:', error);

    // Get partial results if available
    const progress = analysisProgress.get(analysisId);
    const partialResults = progress?.partialResults;

    // Clean up tracking on error
    activeAnalyses.delete(analysisId);
    setTimeout(() => analysisProgress.delete(analysisId), 60000); // Keep for 1 minute

    if (error.name === 'AbortError' || abortController.signal.aborted) {
      return res.status(499).json({
        success: false,
        error: 'Analysis was cancelled',
        cancelled: true,
        partialResults: partialResults || null,
        progress: progress || null
      });
    }

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
  // Helper function to check if an API key is valid
  const isValidKey = (key) => {
    return key &&
           typeof key === 'string' &&
           key.trim() !== '' &&
           key !== 'your_claude_api_key' &&
           key !== 'your_openai_api_key';
  };

  console.log('🔍 Settings check:', {
    claudeKey: process.env.CLAUDE_API_KEY ? `Present (${process.env.CLAUDE_API_KEY.length} chars)` : 'Missing',
    openaiKey: process.env.OPENAI_API_KEY ? `Present (${process.env.OPENAI_API_KEY.length} chars)` : 'Missing'
  });

  res.json({
    reddit: {
      hasClientId: isValidKey(process.env.REDDIT_CLIENT_ID),
      hasClientSecret: isValidKey(process.env.REDDIT_CLIENT_SECRET),
      userAgent: process.env.REDDIT_USER_AGENT || 'Not set'
    },
    ai: {
      hasClaude: isValidKey(process.env.CLAUDE_API_KEY),
      hasOpenAI: isValidKey(process.env.OPENAI_API_KEY),
      preferredModel: currentPreferredModel
    }
  });
});

app.post('/api/test-keys', async (req, res) => {
  const { keyType } = req.body;

  console.log(`🧪 Testing ${keyType} API key...`);

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
  const { redditClientId, redditClientSecret, redditUserAgent, claudeApiKey, openaiApiKey, preferredModel } = req.body;

  console.log('🔧 Updating settings with:', {
    redditClientId: redditClientId ? 'Present' : 'Empty',
    redditClientSecret: redditClientSecret ? 'Present' : 'Empty',
    claudeApiKey: claudeApiKey ? 'Present' : 'Empty',
    openaiApiKey: openaiApiKey ? 'Present' : 'Empty',
    preferredModel
  });

  // Update environment variables temporarily (for this session)
  // Always update the values, even if they're empty (to allow clearing)
  if (redditClientId !== undefined) process.env.REDDIT_CLIENT_ID = redditClientId;
  if (redditClientSecret !== undefined) process.env.REDDIT_CLIENT_SECRET = redditClientSecret;
  if (redditUserAgent !== undefined) process.env.REDDIT_USER_AGENT = redditUserAgent;
  if (claudeApiKey !== undefined) process.env.CLAUDE_API_KEY = claudeApiKey;
  if (openaiApiKey !== undefined) process.env.OPENAI_API_KEY = openaiApiKey;
  if (preferredModel !== undefined) {
    process.env.PREFERRED_MODEL = preferredModel;
    currentPreferredModel = preferredModel; // Update in-memory tracker
  }

  // Reinitialize services with new keys by clearing the require cache
  delete require.cache[require.resolve('./services/redditService')];
  delete require.cache[require.resolve('./services/sentimentService')];
  const redditService = require('./services/redditService');
  const sentimentService = require('./services/sentimentService');

  res.json({
    success: true,
    message: 'Settings updated for this session',
    preferredModel: preferredModel || process.env.PREFERRED_MODEL || 'claude'
  });
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
    const prompt = `Based on this Reddit data from r/${data.subreddit}, create a realistic synthetic post with 10 comments that captures the community's discussion style, terminology, and engagement patterns.

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
// Regenerate just sentiment analysis (not full insights)
app.post('/api/regenerate-sentiment', async (req, res) => {
  try {
    const { analysisData } = req.body;

    console.log('🔄 Regenerating sentiment analysis only...');

    // Extract all text content from the existing analysis
    const allTexts = [];

    // Add post titles and content
    if (analysisData.posts) {
      analysisData.posts.forEach(post => {
        if (post.title) allTexts.push(post.title);
        if (post.selftext) allTexts.push(post.selftext);
      });
    }

    // Add all comments
    if (analysisData.posts) {
      analysisData.posts.forEach(post => {
        if (post.comments) {
          post.comments.forEach(comment => {
            if (comment.body && comment.body.length > 20) {
              allTexts.push(comment.body.substring(0, 600));
            }
          });
        }
      });
    }

    console.log(`🔍 Recalculating sentiment for ${allTexts.length} texts`);

    // Generate sentiment data locally from existing saved comments/posts
    console.log(`🔍 Generating local sentiment analysis from ${allTexts.length} existing texts`);

    // Simple local sentiment analysis using keyword matching
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 'love', 'like', 'best', 'perfect', 'happy', 'glad', 'thanks', 'thank', 'appreciate', 'brilliant', 'outstanding', 'superb', 'impressive', 'incredible', 'remarkable'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'sucks', 'disappointing', 'frustrated', 'angry', 'annoyed', 'stupid', 'dumb', 'ridiculous', 'pathetic', 'useless', 'garbage', 'trash', 'disgusting', 'outrageous'];

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const wordFrequency = {};

    // Process each text for sentiment and word frequency
    allTexts.forEach(text => {
      const lowerText = text.toLowerCase();
      const words = lowerText.match(/\b\w+\b/g) || [];

      // Count word frequency for word cloud
      words.forEach(word => {
        if (word.length > 3) { // Only count longer words
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });

      // Simple sentiment scoring
      const positiveMatches = positiveWords.filter(word => lowerText.includes(word)).length;
      const negativeMatches = negativeWords.filter(word => lowerText.includes(word)).length;

      if (positiveMatches > negativeMatches) {
        positiveCount++;
      } else if (negativeMatches > positiveMatches) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });

    // Calculate percentages
    const total = allTexts.length;
    const sentimentDistribution = {
      positive: Math.round((positiveCount / total) * 100),
      neutral: Math.round((neutralCount / total) * 100),
      negative: Math.round((negativeCount / total) * 100)
    };

    // Get top themes/words for word cloud
    const sortedWords = Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ text: word, value: count }));

    // Create the result structure
    const sentimentResult = {
      overall_analysis: {
        average_score: ((positiveCount * 1 + negativeCount * -1) / total).toFixed(2),
        sentiment_distribution: sentimentDistribution,
        dominant_themes: sortedWords.slice(0, 10).map(item => item.text),
        key_emotions: ['analytical', 'discussion', 'commentary'] // Generic emotions
      }
    };

    console.log('📊 Local sentiment analysis completed:', {
      totalTexts: total,
      distribution: sentimentDistribution,
      topWords: sortedWords.slice(0, 5).map(w => w.text)
    });

    // Update just the sentiment parts of the analysis
    if (analysisData.summary && sentimentResult.overall_analysis) {
      analysisData.summary.averageSentiment = sentimentResult.overall_analysis.average_score;
      analysisData.summary.sentimentDistribution = sentimentResult.overall_analysis.sentiment_distribution;

      // Update themes if available
      if (sentimentResult.overall_analysis.dominant_themes) {
        analysisData.summary.topThemes = sentimentResult.overall_analysis.dominant_themes;
      }

      // Update emotions if available
      if (sentimentResult.overall_analysis.key_emotions) {
        analysisData.summary.keyEmotions = sentimentResult.overall_analysis.key_emotions;
      }
    }

    console.log('✅ Sentiment recalculated successfully');

    res.json({
      success: true,
      updatedAnalysis: analysisData,
      message: 'Sentiment analysis regenerated successfully'
    });

  } catch (error) {
    console.error('❌ Failed to regenerate sentiment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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

    // Regenerate AI insights using the sentiment service
    const aiInsights = await sentimentService.generateAIInsights(posts, subreddits);

    console.log('✅ Successfully regenerated AI insights');
    res.json({
      success: true,
      ai_insights: aiInsights
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
    const frameworkAnalysis = await sentimentService.generateFrameworkAnalysis(analysisData.posts, analysisData.analysis);

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

// Reanalyze saved data with current AI model
app.post('/api/analyses/:id/reanalyze', async (req, res) => {
  try {
    const { id } = req.params;
    const { preferredModel } = req.body; // Optional: specific model to use

    // Get the saved analysis
    const analysis = await storageService.getAnalysis(id);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    console.log(`🔄 Reanalyzing saved analysis: ${analysis.name}`);

    // Check which AI models are available
    const claudeApiKey = process.env.CLAUDE_API_KEY?.trim();
    const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
    const hasClaudeKey = claudeApiKey && claudeApiKey !== 'your_claude_api_key';
    const hasOpenAIKey = openaiApiKey && openaiApiKey !== 'your_openai_api_key';

    if (!hasClaudeKey && !hasOpenAIKey) {
      return res.status(400).json({
        success: false,
        error: 'No AI API keys available for reanalysis'
      });
    }

    // Set preferred model if specified, otherwise keep current setting
    if (preferredModel && (preferredModel === 'claude' || preferredModel === 'openai')) {
      const currentModel = process.env.PREFERRED_MODEL;
      process.env.PREFERRED_MODEL = preferredModel;
      console.log(`🎯 Using specified model: ${preferredModel} (was: ${currentModel || 'auto'})`);
    }

    // Get the Reddit data from the saved analysis
    const redditData = { posts: analysis.data.posts };

    console.log(`📊 Reanalyzing ${analysis.data.posts.length} posts with current AI model...`);

    // Run the sentiment analysis with current AI configuration
    const newAnalysisResults = await sentimentService.analyzeSentiment(redditData);

    console.log(`🎯 Reanalysis completed using: ${newAnalysisResults.aiModel || 'Unknown model'}`);

    // Update the saved analysis with new results, but keep original metadata
    const updatedAnalysis = {
      ...analysis,
      data: {
        ...analysis.data,
        analysis: newAnalysisResults,
        // Keep original posts data
        posts: analysis.data.posts
      },
      // Add reanalysis metadata
      lastReanalyzed: new Date().toISOString(),
      reanalyzedWith: newAnalysisResults.aiModel,
      originalAnalyzedWith: analysis.data.analysis?.aiModel || analysis.analyzedWith || 'Unknown'
    };

    // Save the updated analysis
    await storageService.updateAnalysis(id, updatedAnalysis);

    console.log(`✅ Reanalysis saved successfully`);

    res.json({
      success: true,
      message: `Analysis reanalyzed with ${newAnalysisResults.aiModel}`,
      analysis: updatedAnalysis.data,
      reanalyzedWith: newAnalysisResults.aiModel,
      originalModel: updatedAnalysis.originalAnalyzedWith
    });

  } catch (error) {
    console.error('Failed to reanalyze:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reanalyze: ' + error.message
    });
  }
});

// Reanalyze current data endpoint (for Results page)
app.post('/api/reanalyze-current', async (req, res) => {
  const analysisId = 'reanalysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const abortController = new AbortController();

  // Set a longer timeout for reanalysis (10 minutes)
  req.setTimeout(600000, () => {
    console.log('⏰ Reanalysis request timed out after 10 minutes');
    abortController.abort();
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Analysis timed out after 10 minutes'
      });
    }
  });

  try {
    const { posts, preferredModel } = req.body;

    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid posts data provided'
      });
    }

    // Robust key loading that searches all sources and validates
    console.log('🔑 Loading and validating API keys before reanalysis...');

    // Set preferred model in environment if provided
    if (preferredModel) {
      process.env.PREFERRED_MODEL = preferredModel;
      console.log(`🔧 Client requested model: "${preferredModel}"`);
    } else {
      console.log(`⚠️ No preferredModel in request body, using default: "${process.env.PREFERRED_MODEL || 'claude'}"`);
    }

    // First, try to get keys from request body (in case they were provided by client)
    const clientKeys = {
      claudeApiKey: req.body.claudeApiKey,
      openaiApiKey: req.body.openaiApiKey
    };

    // If client provided keys, update environment (like Settings test does)
    if (clientKeys.claudeApiKey) process.env.CLAUDE_API_KEY = clientKeys.claudeApiKey;
    if (clientKeys.openaiApiKey) process.env.OPENAI_API_KEY = clientKeys.openaiApiKey;

    // Use robust key loader to find and validate keys from all sources
    const keyResults = await sentimentService.loadAndValidateKeys(clientKeys);

    if (!keyResults.hasAnyWorkingKey) {
      return res.status(400).json({
        success: false,
        error: 'No valid AI API keys found. Please set your API keys in Settings or check your .env file.',
        details: {
          claude: keyResults.claudeKey ? 'Key found but failed validation' : 'No key found',
          openai: keyResults.openaiKey ? 'Key found but failed validation' : 'No key found',
          sources_checked: ['Web Settings', '.env file']
        }
      });
    }

    console.log('✅ Keys loaded successfully:', {
      claude: keyResults.claudeWorking,
      openai: keyResults.openaiWorking,
      preferredModel: preferredModel || process.env.PREFERRED_MODEL || 'claude'
    });

    // Track this reanalysis for potential cancellation
    activeAnalyses.set(analysisId, {
      abortController,
      type: 'reanalysis',
      startTime: Date.now(),
      postsCount: posts.length
    });

    // Handle client cancellation
    req.on('close', () => {
      console.log('⚠️ Client disconnected, cancelling reanalysis');
      abortController.abort();
      activeAnalyses.delete(analysisId);
    });

    console.log(`🔄 Reanalyzing current data (${analysisId}) with ${posts.length} posts using preferred model: ${preferredModel}`);

    // Create a fake reddit data object for the sentiment service
    const redditData = { posts };

    // Analyze sentiment with preferred model
    const analysisResults = await sentimentService.analyzeSentiment(redditData, preferredModel, abortController.signal);

    // Clean up tracking
    activeAnalyses.delete(analysisId);

    res.json({
      success: true,
      message: `Current data reanalyzed with ${analysisResults.aiModel}`,
      analysis: analysisResults,
      reanalyzedWith: analysisResults.aiModel,
      analysisId: analysisId
    });

  } catch (error) {
    console.error('Failed to reanalyze current data:', error);

    // Clean up tracking on error
    activeAnalyses.delete(analysisId);

    if (error.name === 'AbortError' || abortController.signal.aborted) {
      return res.status(499).json({
        success: false,
        error: 'Reanalysis was cancelled',
        cancelled: true
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to reanalyze current data: ' + error.message
    });
  }
});

// Cancel analysis endpoint
app.post('/api/cancel-analysis', async (req, res) => {
  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        success: false,
        error: 'Analysis ID is required'
      });
    }

    const activeAnalysis = activeAnalyses.get(analysisId);
    if (!activeAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found or already completed'
      });
    }

    // Cancel the analysis
    activeAnalysis.abortController.abort();
    activeAnalyses.delete(analysisId);

    console.log(`🛑 Analysis cancelled: ${analysisId} (${activeAnalysis.type})`);

    res.json({
      success: true,
      message: 'Analysis cancelled successfully'
    });

  } catch (error) {
    console.error('Failed to cancel analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel analysis: ' + error.message
    });
  }
});

// Get active analyses
app.get('/api/active-analyses', (req, res) => {
  const active = Array.from(activeAnalyses.entries()).map(([id, data]) => ({
    id,
    type: data.type,
    startTime: data.startTime,
    duration: Date.now() - data.startTime,
    subreddits: data.subreddits,
    postsCount: data.postsCount
  }));

  res.json({
    success: true,
    activeAnalyses: active
  });
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer(PORT); 
