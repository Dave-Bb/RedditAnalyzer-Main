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
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Reddit Client ID and Secret are required');
    }

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
      const errorText = await response.text();
      console.error('Reddit auth error:', response.status, errorText);
      throw new Error(`Reddit auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async fetchSubredditData(subreddits, startDate, endDate, postLimit = 50) {
    console.log('🔥 Fetching subreddits:', subreddits, 'limit:', postLimit);
    const accessToken = await this.getAccessToken();
    const posts = [];

    for (const subreddit of subreddits) {
      try {
        const url = `https://oauth.reddit.com/r/${subreddit}/new?limit=${postLimit}`;
        console.log('🔥 Fetching URL:', url);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': this.userAgent,
          },
        });

        console.log('🔥 Reddit response status:', response.status);
        if (!response.ok) {
          console.error(`🔥 Failed to fetch r/${subreddit}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`🔥 Raw Reddit response for r/${subreddit}:`, data.data?.children?.length || 0, 'posts');

        for (const post of data.data.children) {
          const postData = post.data;
          console.log(`🔥 Processing post: ${postData.title?.substring(0, 50)}...`);

          // Filter by date if provided - make date filtering less restrictive
          const postDate = new Date(postData.created_utc * 1000);
          console.log(`🔥 Post date: ${postDate.toISOString()}, Start: ${startDate}, End: ${endDate}`);

          if (startDate && postDate < new Date(startDate)) {
            console.log(`🔥 Skipping post - too old`);
            continue;
          }
          if (endDate && postDate > new Date(endDate)) {
            console.log(`🔥 Skipping post - too new`);
            continue;
          }

          // Fetch comments for this post
          const comments = await this.fetchPostComments(subreddit, postData.id, accessToken);
          console.log(`🔥 Fetched ${comments.length} comments for post ${postData.id}`);

          // Map to structure that matches your TypeScript interface
          posts.push({
            id: postData.id,
            title: postData.title,
            selftext: postData.selftext || '', // Use 'selftext' not 'body'
            author: postData.author,
            score: postData.score,
            num_comments: postData.num_comments, // Add this
            created_utc: postData.created_utc, // Keep as timestamp
            subreddit: postData.subreddit,
            permalink: postData.permalink, // Add this
            url: postData.url,
            comments: comments,
          });

          console.log(`🔥 Added post to results. Total posts now: ${posts.length}`);
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
              created_utc: comment.data.created_utc, // Keep as timestamp like posts
            });
          }
        }
      }

      console.log(`🔥 Returning ${comments.length} comments for post ${postId}`);
      return comments;
    } catch (error) {
      console.error(`Error fetching comments for ${postId}:`, error);
      return [];
    }
  }

  async testConnection(clientId = null, clientSecret = null, userAgent = null) {
    // Use provided keys or fall back to instance keys
    const idToUse = clientId || this.clientId;
    const secretToUse = clientSecret || this.clientSecret;
    const agentToUse = userAgent || this.userAgent;

    try {
      console.log('Testing Reddit connection with:', {
        clientId: idToUse ? 'Present' : 'Missing',
        clientSecret: secretToUse ? 'Present' : 'Missing',
        userAgent: agentToUse
      });

      // Temporarily override instance values for this test
      const originalId = this.clientId;
      const originalSecret = this.clientSecret;
      const originalAgent = this.userAgent;

      this.clientId = idToUse;
      this.clientSecret = secretToUse;
      this.userAgent = agentToUse;

      await this.getAccessToken();

      // Restore original values
      this.clientId = originalId;
      this.clientSecret = originalSecret;
      this.userAgent = originalAgent;

      return { success: true, message: 'Reddit API connection successful' };
    } catch (error) {
      console.error('Reddit test failed:', error);
      return { success: false, message: `Reddit API error: ${error.message}` };
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
    console.log('🔥 Claude raw response:', JSON.stringify(data));

    const content = data.content[0].text;
    console.log('🔥 Claude content to parse:', content);

    try {
      // Extract JSON from Claude's response (it might have extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const jsonString = jsonMatch[0];
      console.log('🔥 Extracted JSON:', jsonString);

      const analysis = JSON.parse(jsonString);
      analysis.aiModel = 'claude';
      return analysis;
    } catch (error) {
      console.error('🔥 JSON parse error. Claude returned:', content);
      throw new Error(`Failed to parse Claude response as JSON: ${error.message}`);
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

  async testClaude(apiKey = null) {
    const keyToUse = apiKey || this.claudeApiKey;
    if (!keyToUse) {
      return { success: false, message: 'Claude API key not found' };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keyToUse,
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

  async testOpenAI(apiKey = null) {
    const keyToUse = apiKey || this.openaiApiKey;
    if (!keyToUse) {
      return { success: false, message: 'OpenAI API key not found' };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
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

        // Debug log that should definitely appear
        console.log('🔥 TEST-KEYS ENDPOINT HIT! KeyType:', keyType);
        console.log('🔥 Request data:', JSON.stringify(requestData));

        let result;

        switch (keyType) {
          case 'reddit':
            // Create temporary service with provided keys
            const tempRedditService = new RedditService({
              REDDIT_CLIENT_ID: requestData.redditClientId,
              REDDIT_CLIENT_SECRET: requestData.redditClientSecret,
              REDDIT_USER_AGENT: requestData.redditUserAgent
            });
            result = await tempRedditService.testConnection(
              requestData.redditClientId,
              requestData.redditClientSecret,
              requestData.redditUserAgent
            );
            break;
          case 'claude':
            // Create temporary service with provided key
            console.log('Testing Claude with key:', requestData.claudeApiKey ? 'Present' : 'Missing');
            const tempClaudeService = new SentimentService({
              CLAUDE_API_KEY: requestData.claudeApiKey
            });
            console.log('Claude service created, key in service:', tempClaudeService.claudeApiKey ? 'Present' : 'Missing');
            result = await tempClaudeService.testClaude(requestData.claudeApiKey);
            break;
          case 'openai':
            // Create temporary service with provided key
            console.log('Testing OpenAI with key:', requestData.openaiApiKey ? 'Present' : 'Missing');
            const tempOpenAIService = new SentimentService({
              OPENAI_API_KEY: requestData.openaiApiKey
            });
            console.log('OpenAI service created, key in service:', tempOpenAIService.openaiApiKey ? 'Present' : 'Missing');
            result = await tempOpenAIService.testOpenAI(requestData.openaiApiKey);
            break;
          default:
            result = { success: false, message: 'Invalid key type' };
        }

        return addCORSHeaders(new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path === '/api/analyze' && request.method === 'POST') {
        const requestData = await request.json();
        const { subreddits, startDate, endDate, postLimit = 50, apiKeys } = requestData;

        console.log('🔥 ANALYZE ENDPOINT HIT!');
        console.log('🔥 Request params:', { subreddits, startDate, endDate, postLimit });
        console.log('🔥 API Keys provided:', {
          reddit: !!apiKeys?.reddit?.redditClientId,
          claude: !!apiKeys?.claude?.claudeApiKey,
          openai: !!apiKeys?.openai?.openaiApiKey
        });
        console.log('🔥 Full apiKeys structure:', JSON.stringify(apiKeys, null, 2));

        try {
          // Create services with provided API keys
          const tempRedditService = new RedditService({
            REDDIT_CLIENT_ID: apiKeys?.reddit?.redditClientId,
            REDDIT_CLIENT_SECRET: apiKeys?.reddit?.redditClientSecret,
            REDDIT_USER_AGENT: apiKeys?.reddit?.redditUserAgent || 'RedditSentimentAnalyzer/1.0'
          });

          const tempSentimentService = new SentimentService({
            CLAUDE_API_KEY: apiKeys?.claude?.claudeApiKey,
            OPENAI_API_KEY: apiKeys?.openai?.openaiApiKey,
            PREFERRED_MODEL: 'claude'
          });

          // Fetch Reddit data
          console.log('🔥 Fetching Reddit data...');
          const redditData = await tempRedditService.fetchSubredditData(
            subreddits,
            startDate,
            endDate,
            Math.min(postLimit, 50)
          );

          console.log('🔥 Reddit data fetched:', redditData.posts.length, 'posts');

          // Analyze sentiment
          console.log('🔥 Starting sentiment analysis...');
          const analysis = await tempSentimentService.analyzeSentiment(redditData);

          console.log('🔥 Analysis complete!');

          // Transform Claude's response to match frontend TypeScript interface
          // Create basic by_subreddit data from posts
          const bySubreddit = {};
          subreddits.forEach(subreddit => {
            const subredditPosts = redditData.posts.filter(post => post.subreddit === subreddit);
            if (subredditPosts.length > 0) {
              bySubreddit[subreddit] = {
                scores: [analysis.overall_sentiment?.average_score || 0],
                positive: 0.4,
                neutral: 0.3,
                negative: 0.3,
                average_score: analysis.overall_sentiment?.average_score || 0,
                total_analyzed: subredditPosts.length
              };
            }
          });

          const transformedAnalysis = {
            overall_sentiment: {
              average_score: analysis.overall_sentiment?.average_score || 0,
              sentiment_distribution: {
                positive: 0.4, // Default values - Claude's response format is different
                neutral: 0.3,
                negative: 0.3
              },
              dominant_themes: analysis.overall_sentiment?.dominant_themes || [],
              key_emotions: analysis.overall_sentiment?.key_emotions || [],
              summary: analysis.summary || 'Analysis completed successfully.'
            },
            individual_scores: [], // Empty for now - Claude doesn't return this format
            by_subreddit: bySubreddit,
            timeline: [], // Empty for now - would need to group by date
            aiModel: analysis.aiModel
          };

          const response = {
            success: true,
            data: {
              posts: redditData.posts,
              analysis: transformedAnalysis,
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

        } catch (error) {
          console.error('🔥 Analysis error:', error);
          return addCORSHeaders(new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      }

      if (path.startsWith('/api/progress/')) {
        // Simple progress endpoint - since Workers are fast, just return completed
        return addCORSHeaders(new Response(JSON.stringify({
          stage: 'complete',
          percentage: 100,
          message: 'Analysis completed'
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path === '/api/logs') {
        // Return a simple message for logs
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode('data: {"message":"📡 Connected to analysis logs","type":"connection"}\n\n'));
            controller.enqueue(encoder.encode('data: {"message":"🔗 Ready for analysis - logs will appear here during processing","type":"info"}\n\n'));
          }
        });

        return addCORSHeaders(new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
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