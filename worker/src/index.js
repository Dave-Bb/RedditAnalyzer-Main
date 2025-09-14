// Cloudflare Worker for Reddit Analyzer API
// Converts the Express.js backend to work with Cloudflare Workers

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight requests
function handleCORS(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  return null;
}

// Add CORS headers to response
function addCORSHeaders(response) {
  Object.keys(corsHeaders).forEach(key => {
    response.headers.set(key, corsHeaders[key]);
  });
  return response;
}

// Reddit API service functions
class RedditService {
  constructor(env) {
    this.clientId = env.REDDIT_CLIENT_ID;
    this.clientSecret = env.REDDIT_CLIENT_SECRET;
    this.userAgent = env.REDDIT_USER_AGENT || 'RedditSentimentAnalyzer/1.0';
  }

  async getAccessToken() {
    const auth = btoa(`${this.clientId}:${this.clientSecret}`);

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Reddit auth failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async fetchSubredditData(subreddits, startDate, endDate, postLimit = 50) {
    const accessToken = await this.getAccessToken();
    const posts = [];

    for (const subreddit of subreddits) {
      try {
        const url = `https://oauth.reddit.com/r/${subreddit}/new?limit=${postLimit}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': this.userAgent,
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch r/${subreddit}: ${response.status}`);
          continue;
        }

        const data = await response.json();

        for (const post of data.data.children) {
          const postData = post.data;

          // Filter by date if provided
          const postDate = new Date(postData.created_utc * 1000);
          if (startDate && postDate < new Date(startDate)) continue;
          if (endDate && postDate > new Date(endDate)) continue;

          // Fetch comments for this post
          const comments = await this.fetchPostComments(subreddit, postData.id, accessToken);

          posts.push({
            id: postData.id,
            title: postData.title,
            body: postData.selftext || '',
            author: postData.author,
            score: postData.score,
            upvoteRatio: postData.upvote_ratio,
            subreddit: postData.subreddit,
            created: postDate.toISOString(),
            url: postData.url,
            comments: comments,
          });
        }
      } catch (error) {
        console.error(`Error fetching r/${subreddit}:`, error);
      }
    }

    return { posts };
  }

  async fetchPostComments(subreddit, postId, accessToken) {
    try {
      const url = `https://oauth.reddit.com/r/${subreddit}/comments/${postId}?limit=10`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      const comments = [];

      if (data[1] && data[1].data && data[1].data.children) {
        for (const comment of data[1].data.children) {
          if (comment.kind === 't1' && comment.data.body !== '[deleted]') {
            comments.push({
              id: comment.data.id,
              author: comment.data.author,
              body: comment.data.body,
              score: comment.data.score,
              created: new Date(comment.data.created_utc * 1000).toISOString(),
            });
          }
        }
      }

      return comments;
    } catch (error) {
      console.error(`Error fetching comments for ${postId}:`, error);
      return [];
    }
  }

  async testConnection() {
    try {
      await this.getAccessToken();
      return { success: true, message: 'Reddit API connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// AI Sentiment Analysis Service
class SentimentService {
  constructor(env) {
    this.claudeApiKey = env.CLAUDE_API_KEY;
    this.openaiApiKey = env.OPENAI_API_KEY;
    this.preferredModel = env.PREFERRED_MODEL || 'claude';
  }

  async analyzeSentiment(redditData, preferredModel = null) {
    const model = preferredModel || this.preferredModel;

    if (model === 'claude' && this.claudeApiKey) {
      return await this.analyzeWithClaude(redditData);
    } else if (model === 'openai' && this.openaiApiKey) {
      return await this.analyzeWithOpenAI(redditData);
    } else {
      // Fallback to whichever key is available
      if (this.claudeApiKey) {
        return await this.analyzeWithClaude(redditData);
      } else if (this.openaiApiKey) {
        return await this.analyzeWithOpenAI(redditData);
      } else {
        throw new Error('No AI API keys available');
      }
    }
  }

  async analyzeWithClaude(redditData) {
    const posts = redditData.posts.slice(0, 25); // Limit for performance

    const prompt = `Analyze the sentiment of these Reddit posts and comments. For each post, provide a sentiment score from -1 (very negative) to 1 (very positive), and classify as positive, negative, or neutral.

Posts to analyze:
${JSON.stringify(posts.map(p => ({
      title: p.title,
      body: p.body,
      comments: p.comments.map(c => c.body).slice(0, 5)
    })), null, 2)}

Return a JSON response with this structure:
{
  "overall_sentiment": {
    "average_score": 0.2,
    "classification": "positive",
    "confidence": 0.85
  },
  "post_sentiments": [
    {
      "post_id": "post_id",
      "sentiment_score": 0.3,
      "classification": "positive",
      "confidence": 0.8
    }
  ],
  "summary": "Brief analysis summary",
  "aiModel": "claude"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    try {
      const analysis = JSON.parse(content);
      analysis.aiModel = 'claude';
      return analysis;
    } catch (error) {
      throw new Error('Failed to parse Claude response as JSON');
    }
  }

  async analyzeWithOpenAI(redditData) {
    const posts = redditData.posts.slice(0, 25);

    const prompt = `Analyze the sentiment of these Reddit posts and comments. For each post, provide a sentiment score from -1 (very negative) to 1 (very positive), and classify as positive, negative, or neutral.

Posts to analyze:
${JSON.stringify(posts.map(p => ({
      title: p.title,
      body: p.body,
      comments: p.comments.map(c => c.body).slice(0, 5)
    })), null, 2)}

Return a JSON response with this structure:
{
  "overall_sentiment": {
    "average_score": 0.2,
    "classification": "positive",
    "confidence": 0.85
  },
  "post_sentiments": [
    {
      "post_id": "post_id",
      "sentiment_score": 0.3,
      "classification": "positive",
      "confidence": 0.8
    }
  ],
  "summary": "Brief analysis summary",
  "aiModel": "openai"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const analysis = JSON.parse(content);
      analysis.aiModel = 'openai';
      return analysis;
    } catch (error) {
      throw new Error('Failed to parse OpenAI response as JSON');
    }
  }

  async testClaude() {
    if (!this.claudeApiKey) {
      return { success: false, message: 'Claude API key not found' };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: 'Hello, this is a test. Please respond with "Claude API working".'
          }]
        }),
      });

      if (response.ok) {
        return { success: true, message: 'Claude API connection successful' };
      } else {
        return { success: false, message: `Claude API error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async testOpenAI() {
    if (!this.openaiApiKey) {
      return { success: false, message: 'OpenAI API key not found' };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: 'Hello, this is a test. Please respond with "OpenAI API working".'
          }],
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        return { success: true, message: 'OpenAI API connection successful' };
      } else {
        return { success: false, message: `OpenAI API error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Initialize services
      const redditService = new RedditService(env);
      const sentimentService = new SentimentService(env);

      // Route handling
      if (path === '/' || path === '') {
        return addCORSHeaders(new Response(JSON.stringify({
          message: 'Reddit Analyzer API is running!',
          endpoints: ['/api/health', '/api/settings', '/api/test-keys', '/api/analyze'],
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path === '/api/health') {
        return addCORSHeaders(new Response(JSON.stringify({
          status: 'OK',
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path === '/api/settings') {
        const settings = {
          reddit: {
            hasClientId: !!env.REDDIT_CLIENT_ID,
            hasClientSecret: !!env.REDDIT_CLIENT_SECRET,
            userAgent: env.REDDIT_USER_AGENT || 'Not set'
          },
          ai: {
            hasClaude: !!env.CLAUDE_API_KEY,
            hasOpenAI: !!env.OPENAI_API_KEY,
            preferredModel: env.PREFERRED_MODEL || 'claude'
          }
        };

        return addCORSHeaders(new Response(JSON.stringify(settings), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path === '/api/test-keys' && request.method === 'POST') {
        const requestData = await request.json();
        const { keyType } = requestData;
        let result;

        switch (keyType) {
          case 'reddit':
            // Create temporary service with provided keys
            const tempRedditService = new RedditService({
              REDDIT_CLIENT_ID: requestData.redditClientId,
              REDDIT_CLIENT_SECRET: requestData.redditClientSecret,
              REDDIT_USER_AGENT: requestData.redditUserAgent
            });
            result = await tempRedditService.testConnection();
            break;
          case 'claude':
            // Create temporary service with provided key
            const tempClaudeService = new SentimentService({
              CLAUDE_API_KEY: requestData.claudeApiKey
            });
            result = await tempClaudeService.testClaude();
            break;
          case 'openai':
            // Create temporary service with provided key
            const tempOpenAIService = new SentimentService({
              OPENAI_API_KEY: requestData.openaiApiKey
            });
            result = await tempOpenAIService.testOpenAI();
            break;
          default:
            result = { success: false, message: 'Invalid key type' };
        }

        return addCORSHeaders(new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path === '/api/analyze' && request.method === 'POST') {
        const { subreddits, startDate, endDate, postLimit = 50 } = await request.json();

        // Fetch Reddit data
        const redditData = await redditService.fetchSubredditData(
          subreddits,
          startDate,
          endDate,
          Math.min(postLimit, 50) // Limit for performance
        );

        // Analyze sentiment
        const analysis = await sentimentService.analyzeSentiment(redditData);

        const response = {
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
            aiModel: analysis.aiModel
          }
        };

        return addCORSHeaders(new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      // Default 404 response
      return addCORSHeaders(new Response('Not Found', { status: 404 }));

    } catch (error) {
      console.error('Worker error:', error);
      return addCORSHeaders(new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  },
};