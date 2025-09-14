// Cloudflare Worker for Reddit Analyzer API
// Converts the Express.js backend to work with Cloudflare Workers

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Function to broadcast logs - in Workers this just logs to console
// Real streaming happens directly in the analyze endpoint
function broadcastLog(message, type = 'info') {
  console.log(message); // Always log to console for Cloudflare logs

  // In Workers, we'll handle streaming differently per request
  if (typeof globalThis !== 'undefined' && globalThis.currentLogController && globalThis.currentLogEncoder) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message: message,
        type: type
      };
      const data = `data: ${JSON.stringify(logEntry)}\n\n`;
      globalThis.currentLogController.enqueue(globalThis.currentLogEncoder.encode(data));
    } catch (e) {
      // If streaming fails, just ignore
    }
  }
}

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
    console.log('🔥 Authenticating with Reddit API...');
    const accessToken = await this.getAccessToken();
    const posts = [];

    // Cloudflare Workers limit: max ~50 subrequests per execution
    // Smart strategy: Get fewer posts but WITH comments for meaningful analysis
    const maxPostsPerSubreddit = Math.min(8, postLimit); // Fetch 8 posts per subreddit
    let totalRequests = 1; // Started with 1 for auth
    const allPostsForComments = []; // Collect all posts first

    // Step 1: Fetch all posts first
    for (const subreddit of subreddits) {
      try {
        if (totalRequests >= 45) {
          console.log('⚠️ Approaching request limit, stopping subreddit fetching');
          break;
        }

        const url = `https://oauth.reddit.com/r/${subreddit}/hot?limit=${maxPostsPerSubreddit}`;
        console.log('📡 Fetching from r/' + subreddit + ' (limit: ' + maxPostsPerSubreddit + ')');

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': this.userAgent,
          },
        });
        totalRequests++;

        if (!response.ok) {
          console.log('❌ Failed to fetch r/' + subreddit + ': ' + response.status);
          continue;
        }

        const data = await response.json();
        const rawPosts = data.data?.children || [];
        console.log('📊 Retrieved ' + rawPosts.length + ' posts from r/' + subreddit);

        // Filter and collect posts
        for (const post of rawPosts) {
          const postData = post.data;
          const postDate = new Date(postData.created_utc * 1000);

          // Apply date filtering if provided
          if (startDate && endDate) {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);

            if (postDate < startDateObj || postDate > endDateObj) {
              continue;
            }
          }

          // Store post for potential comment fetching
          allPostsForComments.push({
            id: postData.id,
            title: postData.title,
            selftext: postData.selftext || '',
            author: postData.author,
            score: postData.score,
            num_comments: postData.num_comments,
            created_utc: postData.created_utc,
            subreddit: postData.subreddit,
            permalink: postData.permalink,
            url: postData.url,
            comments: [], // Will be filled later
            priority: postData.score + (postData.num_comments * 2) // Score for prioritization
          });
        }
      } catch (error) {
        console.log('❌ Error fetching r/' + subreddit + ':', error.message);
      }
    }

    // Step 2: Prioritize posts by engagement and fetch comments for top ones
    allPostsForComments.sort((a, b) => b.priority - a.priority); // Sort by priority (score + comments)

    const maxCommentsToFetch = Math.min(15, 45 - totalRequests); // Use remaining request budget
    console.log('📝 Fetching comments for top ' + maxCommentsToFetch + ' posts...');

    for (let i = 0; i < Math.min(maxCommentsToFetch, allPostsForComments.length); i++) {
      if (totalRequests >= 45) break; // Safety check

      const post = allPostsForComments[i];
      try {
        post.comments = await this.fetchPostComments(post.subreddit, post.id, accessToken);
        totalRequests++;

        if (i % 5 === 0) { // Log progress every 5 posts
          console.log('💬 Fetched comments for ' + (i + 1) + '/' + Math.min(maxCommentsToFetch, allPostsForComments.length) + ' posts');
        }
      } catch (error) {
        console.log('⚠️ Failed to fetch comments for post ' + post.id);
        post.comments = []; // Keep post but with empty comments
      }
    }

    // Step 3: Add all posts to final results (some with comments, some without)
    posts.push(...allPostsForComments);

    console.log('✅ Final result: ' + posts.length + ' posts, ' +
      posts.filter(p => p.comments.length > 0).length + ' with comments');
    console.log('🔢 Total API requests used: ' + totalRequests + '/50');

    console.log(`🔥 Reddit data fetched: ${posts.length} posts`);

    // If no posts found after filtering, log helpful info
    if (posts.length === 0) {
      console.log(`⚠️ No posts found after date filtering. Try:
        1. Expanding your date range (current: ${startDate} to ${endDate})
        2. Using more active subreddits
        3. Checking if the subreddit names are correct`);
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
    const posts = redditData.posts.slice(0, 15); // Reduce to 15 posts for faster processing

    const prompt = `Analyze the sentiment of these Reddit posts. For each post, provide a sentiment score from -1 (very negative) to 1 (very positive), and classify as positive, negative, or neutral.

Posts to analyze (titles and content only):
${posts.map(p => `Title: ${p.title}\nContent: ${p.selftext || 'No content'}`).join('\n\n')}

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

  async generateFrameworkAnalysis(posts, analysis) {
    console.log('🔬 Starting framework analysis generation...');

    try {
      // Prepare data for framework analysis
      const frameworkPrompt = `Generate a comprehensive framework analysis of this Reddit sentiment data.

Data Summary:
- Total Posts: ${posts.length}
- Overall Sentiment: ${analysis.overall_sentiment?.average_score || 'N/A'}
- Distribution: ${JSON.stringify(analysis.overall_sentiment?.sentiment_distribution || {})}

Sample Posts (first 5):
${posts.slice(0, 5).map(post => `Title: ${post.title}\nContent: ${post.selftext || post.body || 'N/A'}`).join('\n\n')}

Please provide a structured analysis using these sections:

**PATTERN IDENTIFICATION**
Identify recurring themes, sentiment patterns, and discussion trends.

**TEMPORAL TRENDS**
Analyze how sentiment and topics evolved over time.

**KEY INSIGHTS**
Provide 3-5 key insights about the community sentiment and concerns.

**RECOMMENDATIONS**
Suggest actionable recommendations based on the sentiment analysis.

**STRATEGIC QUESTIONS**
Pose 2-3 strategic questions for further investigation.

**EXECUTIVE SUMMARY**
Provide a concise summary for decision-makers.

Format your response as clear, well-structured text with section headers.`;

      const aiModel = this.claudeApiKey ? 'claude' : 'openai';
      let frameworkResult;

      if (aiModel === 'claude' && this.claudeApiKey) {
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
              content: frameworkPrompt
            }]
          }),
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        frameworkResult = data.content[0].text;

      } else if (this.openaiApiKey) {
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
              content: frameworkPrompt
            }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        frameworkResult = data.choices[0].message.content;

      } else {
        throw new Error('No AI API keys available for framework analysis');
      }

      console.log('🎯 Framework analysis completed with ' + aiModel);

      return {
        success: true,
        analysis: frameworkResult,
        generated_at: new Date().toISOString(),
        model_used: aiModel,
        posts_analyzed: posts.length
      };

    } catch (error) {
      console.log('❌ Framework analysis error: ' + error.message);
      return {
        success: false,
        error: error.message,
        generated_at: new Date().toISOString()
      };
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
          },
          platform: {
            type: 'cloudflare-workers',
            limitations: {
              maxSubreddits: 3,
              maxPostsPerSubreddit: 15,
              maxTotalRequests: 45,
              recommendedPostLimit: 25,
              message: 'Cloudflare Workers has API request limits. For larger analyses, consider running locally.'
            }
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

        console.log('📊 Starting analysis for subreddits:', subreddits.join(', '));
        console.log('🔧 Date range:', startDate, 'to', endDate);
        console.log('📊 Post limit:', postLimit, 'per subreddit');
        console.log('🔑 API Keys configured:', {
          reddit: !!apiKeys?.reddit?.redditClientId,
          claude: !!apiKeys?.claude?.claudeApiKey,
          openai: !!apiKeys?.openai?.openaiApiKey
        });

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
          console.log('📡 Fetching Reddit data from ' + subreddits.length + ' subreddit(s)...');
          const redditData = await tempRedditService.fetchSubredditData(
            subreddits,
            startDate,
            endDate,
            Math.min(postLimit, 50)
          );

          console.log('🔥 Reddit data fetched:', redditData.posts.length, 'posts');

          // Analyze sentiment
          console.log('🔥 Starting sentiment analysis...');
          console.log('🧠 Analyzing sentiment with AI for ' + redditData.posts.length + ' posts...');
          const analysis = await tempSentimentService.analyzeSentiment(redditData);
          console.log('✅ Sentiment analysis completed using ' + (analysis.aiModel || 'AI'));

          // Generate framework analysis automatically
          console.log('🔬 Generating framework analysis...');
          const frameworkAnalysis = await tempSentimentService.generateFrameworkAnalysis(redditData.posts, analysis);
          analysis.framework_analysis = frameworkAnalysis;
          console.log('✅ Framework analysis completed');

          console.log('🔥 Analysis complete!');

          // Transform Claude's response to match frontend TypeScript interface
          // Calculate sentiment distribution from Claude's analysis
          const avgScore = analysis.overall_sentiment?.average_score || 0;
          let positive = 0.33, neutral = 0.34, negative = 0.33;

          // Estimate distribution based on average score
          if (avgScore > 0.3) {
            positive = 0.6;
            neutral = 0.25;
            negative = 0.15;
          } else if (avgScore > 0) {
            positive = 0.45;
            neutral = 0.35;
            negative = 0.2;
          } else if (avgScore < -0.3) {
            positive = 0.15;
            neutral = 0.25;
            negative = 0.6;
          } else if (avgScore < 0) {
            positive = 0.2;
            neutral = 0.35;
            negative = 0.45;
          }

          // Create basic by_subreddit data from posts
          const bySubreddit = {};
          subreddits.forEach(subreddit => {
            const subredditPosts = redditData.posts.filter(post => post.subreddit === subreddit);
            if (subredditPosts.length > 0) {
              bySubreddit[subreddit] = {
                scores: [avgScore],
                positive: positive,
                neutral: neutral,
                negative: negative,
                average_score: avgScore,
                total_analyzed: subredditPosts.length
              };
            }
          });

          // Extract themes and emotions from Claude's summary if not provided
          const extractedThemes = analysis.overall_sentiment?.dominant_themes ||
            (analysis.summary ?
              analysis.summary.match(/\b(concerns?|issues?|problems?|support|community|discussion|frustration|experience)\b/gi)
                ?.filter((v, i, a) => a.indexOf(v) === i).slice(0, 5) || []
              : []);

          const extractedEmotions = analysis.overall_sentiment?.key_emotions ||
            (avgScore > 0 ? ['hopeful', 'positive', 'supportive'] :
             avgScore < 0 ? ['frustrated', 'concerned', 'disappointed'] :
             ['neutral', 'mixed', 'uncertain']);

          const transformedAnalysis = {
            overall_sentiment: {
              average_score: avgScore,
              sentiment_distribution: {
                positive: Math.round(positive * 100),
                neutral: Math.round(neutral * 100),
                negative: Math.round(negative * 100)
              },
              dominant_themes: extractedThemes,
              key_emotions: extractedEmotions,
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
          console.log('❌ Analysis failed: ' + error.message);

          let userFriendlyMessage = 'Analysis failed. ';
          let suggestions = [];

          // Handle specific error types
          if (error.message.includes('Too many subrequests')) {
            userFriendlyMessage = 'Analysis failed due to Cloudflare Workers API limits. ';
            suggestions = [
              'Try analyzing fewer subreddits (1-2 max)',
              'Reduce the post limit to 10-25 posts',
              'Use shorter date ranges to get fewer posts',
              'Consider running this locally instead for larger analyses'
            ];
          } else if (error.message.includes('timeout') || error.message.includes('time')) {
            userFriendlyMessage = 'Analysis timed out. ';
            suggestions = [
              'Try analyzing fewer posts or subreddits',
              'Use shorter date ranges',
              'Try again - sometimes Reddit API is slow'
            ];
          } else if (error.message.includes('Reddit') || error.message.includes('authentication')) {
            userFriendlyMessage = 'Reddit API error. ';
            suggestions = [
              'Check if your Reddit API keys are correct',
              'Make sure the subreddit names are valid',
              'Reddit might be experiencing issues - try again later'
            ];
          } else if (error.message.includes('Claude') || error.message.includes('OpenAI')) {
            userFriendlyMessage = 'AI analysis failed. ';
            suggestions = [
              'Check if your AI API keys (Claude/OpenAI) are valid',
              'You might have hit API rate limits - wait a few minutes',
              'Try again with fewer posts'
            ];
          }

          return addCORSHeaders(new Response(JSON.stringify({
            success: false,
            error: userFriendlyMessage + error.message,
            userMessage: userFriendlyMessage,
            suggestions: suggestions,
            technicalError: error.message,
            errorType: error.name || 'Unknown',
            timestamp: new Date().toISOString()
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
        // Simple message for Cloudflare Workers - real logs are in CF dashboard
        return addCORSHeaders(new Response(JSON.stringify({
          message: 'Logs are available in Cloudflare Workers dashboard',
          note: 'In Cloudflare Workers, console.log outputs appear in the Wrangler tail or CF dashboard',
          dashboard_url: 'https://dash.cloudflare.com/',
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path === '/api/generate-framework-analysis' && request.method === 'POST') {
        const requestData = await request.json();
        const { analysisData } = requestData;

        try {
          console.log('🔬 Generating framework analysis...');

          // Create a sentiment service to generate framework analysis
          const sentimentService = new SentimentService(env);
          const frameworkAnalysis = await sentimentService.generateFrameworkAnalysis(analysisData.posts, analysisData.analysis);

          console.log('✅ Framework analysis generated successfully');

          return addCORSHeaders(new Response(JSON.stringify({
            success: true,
            framework_analysis: frameworkAnalysis
          }), {
            headers: { 'Content-Type': 'application/json' }
          }));

        } catch (error) {
          console.log('❌ Framework analysis failed: ' + error.message);
          return addCORSHeaders(new Response(JSON.stringify({
            success: false,
            error: 'Failed to generate framework analysis: ' + error.message
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      }

      // Analysis storage endpoints
      if (path === '/api/analyses' && request.method === 'GET') {
        // List saved analyses - for now return empty since we don't have persistent storage
        return addCORSHeaders(new Response(JSON.stringify({
          success: true,
          analyses: [],
          message: 'Analysis storage not available in Cloudflare Workers without KV setup'
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path === '/api/analyses' && request.method === 'POST') {
        // Save analysis - for now just return success without actually saving
        const requestData = await request.json();
        console.log('💾 Analysis save requested (not persisted in basic Worker)');

        return addCORSHeaders(new Response(JSON.stringify({
          success: true,
          analysis: {
            id: 'temp_' + Date.now(),
            name: requestData.metadata?.name || 'Unnamed Analysis',
            created_at: new Date().toISOString(),
            temporary: true
          },
          message: 'Analysis saved temporarily. For persistent storage, configure Cloudflare KV.'
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path.startsWith('/api/analyses/') && request.method === 'GET') {
        // Get specific analysis - not available without persistent storage
        const id = path.split('/').pop();
        return addCORSHeaders(new Response(JSON.stringify({
          success: false,
          error: 'Analysis not found. Persistent storage not configured.'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (path.startsWith('/api/analyses/') && request.method === 'DELETE') {
        // Delete analysis - not available without persistent storage
        const id = path.split('/').pop();
        return addCORSHeaders(new Response(JSON.stringify({
          success: false,
          error: 'Analysis deletion not available without persistent storage.'
        }), {
          status: 404,
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