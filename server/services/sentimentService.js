const axios = require('axios');

class SentimentService {
  constructor() {
    this.usedModel = null; // Track which model was used in the last analysis
  }

  // Robust key loading that searches all sources and forces refresh
  async loadAndValidateKeys(providedKeys = {}) {
    console.log('🔍 Loading and validating API keys from all sources...');

    // Debug: Show current environment state
    console.log('🔍 Current process.env keys:', {
      claude: process.env.CLAUDE_API_KEY ? `Present (${process.env.CLAUDE_API_KEY.length} chars)` : 'Missing',
      openai: process.env.OPENAI_API_KEY ? `Present (${process.env.OPENAI_API_KEY.length} chars)` : 'Missing'
    });

    // 1. Start with provided keys (from web interface)
    let claudeKey = providedKeys.claudeApiKey?.trim();
    let openaiKey = providedKeys.openaiApiKey?.trim();

    // 2. Fall back to environment variables if not provided via web
    if (!claudeKey || claudeKey === 'your_claude_api_key') {
      claudeKey = process.env.CLAUDE_API_KEY?.trim();
      console.log('🔍 Claude key from env:', claudeKey ? `"${claudeKey}"` : 'null');
      if (claudeKey && claudeKey !== 'your_claude_api_key') {
        console.log('📁 Using Claude key from process.env');
      }
    } else {
      console.log('🌐 Using Claude key from web settings');
      // Update environment with web-provided key for consistency
      process.env.CLAUDE_API_KEY = claudeKey;
    }

    if (!openaiKey || openaiKey === 'your_openai_api_key') {
      openaiKey = process.env.OPENAI_API_KEY?.trim();
      console.log('🔍 OpenAI key from env:', openaiKey ? `"${openaiKey}"` : 'null');
      if (openaiKey && openaiKey !== 'your_openai_api_key') {
        console.log('📁 Using OpenAI key from process.env');
      }
    } else {
      console.log('🌐 Using OpenAI key from web settings');
      // Update environment with web-provided key for consistency
      process.env.OPENAI_API_KEY = openaiKey;
    }

    // 3. Validate what we found
    const hasValidClaude = claudeKey && claudeKey !== 'your_claude_api_key';
    const hasValidOpenAI = openaiKey && openaiKey !== 'your_openai_api_key';

    console.log('🔑 Key validation results:', {
      claude: hasValidClaude ? `Valid (${claudeKey.length} chars)` : 'Invalid/Missing',
      openai: hasValidOpenAI ? `Valid (${openaiKey.length} chars)` : 'Invalid/Missing'
    });

    // 4. Test the keys that we found (like the test button does)
    let claudeWorking = false;
    let openaiWorking = false;

    if (hasValidClaude) {
      try {
        const claudeTest = await this.testClaude();
        claudeWorking = claudeTest.success;
        console.log('✅ Claude key test:', claudeWorking ? 'PASSED' : 'FAILED');
      } catch (error) {
        console.log('❌ Claude key test failed:', error.message);
      }
    }

    if (hasValidOpenAI) {
      try {
        const openaiTest = await this.testOpenAI();
        openaiWorking = openaiTest.success;
        console.log('✅ OpenAI key test:', openaiWorking ? 'PASSED' : `FAILED - ${openaiTest.message}`);
      } catch (error) {
        console.log('❌ OpenAI key test failed:', error.message);
      }
    }

    return {
      claudeKey: hasValidClaude ? claudeKey : null,
      openaiKey: hasValidOpenAI ? openaiKey : null,
      claudeWorking,
      openaiWorking,
      hasAnyWorkingKey: claudeWorking || openaiWorking
    };
  }

  // Get fresh API keys from environment (not cached)
  getClaudeApiKey() {
    return process.env.CLAUDE_API_KEY?.trim();
  }

  getOpenAIApiKey() {
    return process.env.OPENAI_API_KEY?.trim();
  }

  cleanTextForAnalysis(text) {
    if (!text || typeof text !== 'string') return '';

    return text
      // Remove URLs (keep the content readable)
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      // Remove Reddit markdown links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove Reddit markup **bold** and *italic*
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove Reddit quote markup
      .replace(/^>\s*/gm, '')
      // Remove multiple spaces and normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  shouldIncludeText(text, score = 0) {
    if (!text || typeof text !== 'string') return false;

    const cleanedText = text.trim();

    // Skip very short or low-value comments
    if (cleanedText.length < 5) return false;

    // Skip deleted/removed content
    if (cleanedText === '[deleted]' || cleanedText === '[removed]') return false;

    // Skip emoji-only or single-word responses unless they have good scores
    if (cleanedText.length < 15 && score < 5) {
      // Allow if it contains actual words, not just emojis/punctuation
      if (!/[a-zA-Z]{3,}/.test(cleanedText)) return false;
    }

    // Skip obvious spam or low-effort
    const lowEffortPatterns = [
      /^(lol|haha|lmao|this|yes|no|wtf|omg)\.?!?$/i,
      /^[\d\s.,!?]+$/, // Just numbers and punctuation
      /^[^\w\s]+$/ // Just symbols/emojis
    ];

    if (lowEffortPatterns.some(pattern => pattern.test(cleanedText))) {
      return score >= 10; // Only include if highly upvoted
    }

    return true;
  }

  async analyzeWithClaude(texts) {
    try {
      const claudeApiKey = this.getClaudeApiKey();
      console.log('Making Claude API request with key length:', claudeApiKey?.length || 0);

      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Analyze the sentiment of these Reddit posts and comments. For each text, provide a sentiment score from -1 (very negative) to 1 (very positive), and classify as positive, negative, or neutral. Also identify key themes and emotions.

Texts to analyze:
${texts.map((text, i) => `${i + 1}. ${text.substring(0, 500)}`).join('\n\n')}

Respond in JSON format:
{
  "individual_scores": [
    {"index": 1, "score": 0.5, "sentiment": "positive", "confidence": 0.8, "themes": ["happiness", "satisfaction"]},
    ...
  ],
  "overall_analysis": {
    "average_score": 0.2,
    "sentiment_distribution": {"positive": 40, "neutral": 35, "negative": 25},
    "dominant_themes": ["theme1", "theme2"],
    "key_emotions": ["emotion1", "emotion2"],
    "summary": "Brief summary of overall sentiment trends"
  }
}`
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      console.log('Claude API response received successfully');
      return JSON.parse(response.data.content[0].text);
    } catch (error) {
      console.error('Claude API error details:', error.response?.status, error.response?.data || error.message);
      throw new Error('Failed to analyze sentiment with Claude: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  async analyzeWithClaudeLarge(texts) {
    try {
      const claudeApiKey = this.getClaudeApiKey();
      console.log(`Making optimized Claude API request for ${texts.length} texts`);
      
      // Use Claude 3.5 Sonnet for larger batches and better performance
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8000, // Increased for larger responses
        messages: [{
          role: 'user',
          content: `You are a sentiment analysis expert. Analyze these ${texts.length} Reddit posts and comments efficiently.

For each text, provide:
- Score: -1 (very negative) to 1 (very positive) 
- Sentiment: positive/negative/neutral
- Key themes (2-3 words max)

Texts:
${texts.map((text, i) => `[${i + 1}] ${text.substring(0, 400)}`).join('\n\n')}

Respond in this exact JSON format (no additional text):
{
  "individual_scores": [
    {"index": 1, "score": 0.5, "sentiment": "positive", "confidence": 0.8, "themes": ["topic", "emotion"]},
    {"index": 2, "score": -0.2, "sentiment": "negative", "confidence": 0.7, "themes": ["complaint", "frustration"]}
  ],
  "overall_analysis": {
    "average_score": 0.2,
    "sentiment_distribution": {"positive": 40, "neutral": 35, "negative": 25},
    "dominant_themes": ["theme1", "theme2", "theme3"],
    "key_emotions": ["emotion1", "emotion2"],
    "summary": "Brief analysis summary"
  }
}`
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      console.log(`Claude API processed ${texts.length} texts successfully`);
      
      // Parse response with better error handling
      const responseText = response.data.content[0].text;
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.log('Raw Claude response:', responseText);
        
        // Try to extract JSON from response if it has extra text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('Claude returned invalid JSON format');
      }
    } catch (error) {
      console.error('Claude API error details:', error.response?.status, error.response?.data || error.message);
      throw new Error('Failed to analyze sentiment with Claude: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  async analyzeWithClaudeMaximized(texts, maxTextLength = 800) {
    try {
      const claudeApiKey = this.getClaudeApiKey();
      console.log(`🚀 MAXIMIZED Claude request: ${texts.length} texts, ${maxTextLength} chars each`);
      
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192, // Use full 8K token limit
        messages: [{
          role: 'user',
          content: `BULK SENTIMENT ANALYSIS: Process ${texts.length} texts efficiently.

OUTPUT FORMAT: Pure JSON, no explanations.

ANALYSIS SPECS:
- Sentiment score: -1 to +1 (decimal precision)
- Classification: positive/negative/neutral  
- Confidence: 0.0 to 1.0
- Themes: Max 3 relevant keywords

TEXTS TO ANALYZE:
${texts.map((text, i) => `[${i + 1}] ${text.substring(0, maxTextLength)}`).join('\n\n')}

JSON RESPONSE:
{
  "individual_scores": [
    {"index": 1, "score": 0.75, "sentiment": "positive", "confidence": 0.9, "themes": ["word1", "word2", "word3"]},
    {"index": 2, "score": -0.3, "sentiment": "negative", "confidence": 0.8, "themes": ["complaint", "issue"]}
  ],
  "overall_analysis": {
    "average_score": 0.2,
    "sentiment_distribution": {"positive": 45, "neutral": 30, "negative": 25},
    "dominant_themes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
    "key_emotions": ["emotion1", "emotion2", "emotion3"],
    "summary": "One sentence summary of dominant sentiment patterns"
  }
}`
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15' // Enable 8K token output
        }
      });

      const responseText = response.data.content[0].text;
      
      // Enhanced JSON parsing with better error handling
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.log('❌ JSON parse error:', parseError.message);
        console.log('Raw response length:', responseText.length);
        console.log('Raw response preview:', responseText.substring(0, 200));
        
        // Try to clean and extract JSON
        let cleanedText = responseText;
        
        // Remove common prefixes/suffixes that Claude might add
        cleanedText = cleanedText.replace(/^[^{]*/, ''); // Remove everything before first {
        cleanedText = cleanedText.replace(/[^}]*$/, ''); // Remove everything after last }
        
        // Try parsing the cleaned text
        try {
          return JSON.parse(cleanedText);
        } catch (secondParseError) {
          console.log('❌ Cleaned JSON parse failed:', secondParseError.message);
        }
        
        // Find the largest valid JSON object
        const jsonMatches = responseText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
        for (const match of jsonMatches.sort((a, b) => b.length - a.length)) {
          try {
            const parsed = JSON.parse(match);
            if (parsed.individual_scores || parsed.overall_analysis) {
              console.log('✅ Found valid JSON object');
              return parsed;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Last resort: Create minimal response to continue processing
        console.log('🔧 Creating fallback response due to JSON parsing failure');
        return {
          individual_scores: [],
          overall_analysis: {
            average_score: 0,
            sentiment_distribution: {"positive": 33, "neutral": 34, "negative": 33},
            dominant_themes: ["parsing_error"],
            key_emotions: ["unknown"],
            summary: "Analysis failed due to JSON parsing issues"
          }
        };
      }
    } catch (error) {
      console.error('🔥 Claude MAXIMIZED API error:', error.response?.status, error.response?.data || error.message);
      throw new Error('Claude maximized analysis failed: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  async analyzeWithOpenAI(texts, maxTextLength = 300) {
    try {
      const openaiApiKey = this.getOpenAIApiKey();
      console.log(`Making OpenAI API request for ${texts.length} texts`);

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Analyze sentiment for ${texts.length} Reddit texts. Score: -1 to +1, classify as positive/negative/neutral, identify themes.

${texts.map((text, i) => `${i + 1}. ${text.substring(0, maxTextLength)}`).join('\n')}

JSON response:
{
  "individual_scores": [{"index": 1, "score": 0.5, "sentiment": "positive", "confidence": 0.8, "themes": ["theme1", "theme2"]}],
  "overall_analysis": {"average_score": 0.2, "sentiment_distribution": {"positive": 40, "neutral": 35, "negative": 25}, "dominant_themes": ["theme1", "theme2"], "key_emotions": ["emotion1", "emotion2"], "summary": "Brief summary"}
}`
        }],
        max_tokens: 4000,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`OpenAI API processed ${texts.length} texts successfully`);

      // Parse response with better error handling
      const responseText = response.data.choices[0].message.content;
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.log('Raw OpenAI response:', responseText);

        // Try to extract JSON from response if it has extra text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        throw new Error('OpenAI returned invalid JSON format');
      }
    } catch (error) {
      console.error('OpenAI API error details:', error.response?.status, error.response?.data || error.message);
      throw new Error('Failed to analyze sentiment with OpenAI: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  async analyzeSentiment(redditData, options = null, abortSignal = null, progressCallback = null) {
    const texts = [];
    const textSources = [];

    // Collect all texts (posts and comments) with cleaning
    redditData.posts.forEach(post => {
      if (post.title && post.title.trim()) {
        const cleanTitle = this.cleanTextForAnalysis(post.title);
        if (cleanTitle) {
          texts.push(cleanTitle);
          textSources.push({ type: 'post_title', postId: post.id, subreddit: post.subreddit, originalScore: post.score });
        }
      }

      if (post.selftext && post.selftext.trim()) {
        const cleanSelftext = this.cleanTextForAnalysis(post.selftext);
        if (this.shouldIncludeText(cleanSelftext, post.score)) {
          texts.push(cleanSelftext);
          textSources.push({ type: 'post_body', postId: post.id, subreddit: post.subreddit, originalScore: post.score });
        }
      }

      post.comments.forEach(comment => {
        if (comment.body && this.shouldIncludeText(comment.body, comment.score)) {
          const cleanComment = this.cleanTextForAnalysis(comment.body);
          if (cleanComment) {
            texts.push(cleanComment);
            textSources.push({ type: 'comment', postId: post.id, commentId: comment.id, subreddit: post.subreddit, originalScore: comment.score });
          }
        }
      });
    });

    if (texts.length === 0) {
      return {
        overall_analysis: {
          average_score: 0,
          sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
          dominant_themes: [],
          key_emotions: [],
          summary: "No content available for analysis"
        },
        individual_scores: [],
        by_subreddit: {},
        timeline: []
      };
    }

    // Use fresh environment variables instead of cached constructor values
    const currentClaudeKey = process.env.CLAUDE_API_KEY?.trim();
    const currentOpenAIKey = process.env.OPENAI_API_KEY?.trim();

    console.log('🔍 Analyzing sentiment with current env keys:', {
      claudeKey: currentClaudeKey ? `Present (${currentClaudeKey.length} chars)` : 'Missing',
      openaiKey: currentOpenAIKey ? `Present (${currentOpenAIKey.length} chars)` : 'Missing'
    });

    const hasClaudeKey = currentClaudeKey && currentClaudeKey !== 'your_claude_api_key';
    const hasOpenAIKey = currentOpenAIKey && currentOpenAIKey !== 'your_openai_api_key';

    console.log('🔍 Key validation results:', { hasClaudeKey, hasOpenAIKey });

    if (!hasClaudeKey && !hasOpenAIKey) {
      throw new Error('No valid AI API keys provided. Please check your .env file.');
    }

    // Determine which model to use based on preference and availability
    const preferredModel = process.env.PREFERRED_MODEL || 'claude';
    console.log(`🎯 User preference: "${preferredModel}", Available: Claude=${hasClaudeKey}, OpenAI=${hasOpenAIKey}`);

    let useClaude, useOpenAI;

    if (preferredModel === 'claude' && hasClaudeKey) {
      useClaude = true;
      useOpenAI = false;
      console.log('🧠 DECISION: Using Claude (user preference + key available)');
    } else if (preferredModel === 'openai' && hasOpenAIKey) {
      useClaude = false;
      useOpenAI = true;
      console.log('🚀 DECISION: Using OpenAI (user preference + key available)');
    } else {
      // Fall back to whatever is available
      useClaude = hasClaudeKey;
      useOpenAI = !useClaude && hasOpenAIKey;
      console.log(`⚠️ FALLBACK DECISION: Claude=${useClaude}, OpenAI=${useOpenAI} (preference "${preferredModel}" not available)`);
    }

    // Optimize API with reasonable batches to avoid rate limits
    const batchSize = useClaude ? 50 : 15; // Smaller batches for OpenAI to avoid context limits
    const maxTextLength = useClaude ? 600 : 300; // Shorter text for OpenAI to fit in context

    console.log(`🤖 Using ${useClaude ? 'Claude 3.5 Sonnet' : 'OpenAI GPT-4'} for analysis (preferred: ${preferredModel})`);

    // Track which model was used
    this.usedModel = useClaude ? 'Claude 3.5 Sonnet' : 'OpenAI GPT-4';

    const batches = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push({
        texts: texts.slice(i, i + batchSize),
        sources: textSources.slice(i, i + batchSize)
      });
    }

    console.log(`⚡ OPTIMIZED: Processing ${texts.length} texts in ${batches.length} batch(es) of up to ${batchSize} items each`);
    console.log(`📝 Using ${maxTextLength} character limit per text for analysis`);
    
    let allResults = [];

    // Initial progress update
    if (progressCallback) {
      progressCallback({
        percentage: 0,
        itemsProcessed: 0,
        partialResults: null
      });
    }

    // Process batches with maximum efficiency
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Check for abort signal
      if (abortSignal?.aborted) {
        console.log('⚠️ Sentiment analysis aborted by user');

        // Return partial results if any
        if (progressCallback && allResults.length > 0) {
          progressCallback({
            percentage: Math.floor((i / batches.length) * 100),
            itemsProcessed: allResults.length,
            partialResults: {
              individual_scores: allResults,
              processed: allResults.length,
              total: texts.length
            }
          });
        }

        throw new Error('Analysis was aborted');
      }

      try {
        console.log(`🧠 Processing batch ${i + 1}/${batches.length} (${batch.texts.length} items)...`);
        const batchStart = Date.now();

        let batchResult;
        if (useClaude) {
          // Keys are now fetched fresh in the function
          batchResult = await this.analyzeWithClaudeMaximized(batch.texts, maxTextLength);
        } else {
          // Keys are now fetched fresh in the function
          batchResult = await this.analyzeWithOpenAI(batch.texts, maxTextLength);
        }


        // Add source information to results
        if (batchResult.individual_scores) {
          batchResult.individual_scores.forEach((score, index) => {
            if (batch.sources[index]) {
              score.source = batch.sources[index];
            }
          });
          allResults.push(...batchResult.individual_scores);
        }

        const batchTime = Date.now() - batchStart;
        console.log(`✅ Batch ${i + 1} completed in ${(batchTime / 1000).toFixed(1)}s`);

        // Update progress after each batch
        if (progressCallback) {
          progressCallback({
            percentage: Math.floor(((i + 1) / batches.length) * 100),
            itemsProcessed: allResults.length,
            partialResults: allResults.length > 0 ? {
              individual_scores: allResults,
              processed: allResults.length,
              total: texts.length
            } : null
          });
        }

        // Add delays to respect rate limits
        if (i < batches.length - 1) {
          const delay = useClaude ? 1000 : 4000; // 1 second for Claude, 4 seconds for OpenAI to avoid rate limits
          console.log(`⏳ Waiting ${delay}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`❌ Batch ${i + 1} analysis failed:`, error.message);
        // Continue with other batches
      }
    }

    // Aggregate results
    const aggregatedResults = this.aggregateResults(allResults, redditData.posts);
    
    // Add AI insights
    aggregatedResults.ai_insights = await this.generateAIInsights(redditData.posts);
    
    // Add framework analysis with delay to avoid rate limits
    try {
      console.log('🔬 Starting framework analysis...');
      console.log('⏳ Waiting 3 seconds to avoid rate limits...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      
      aggregatedResults.framework_analysis = await this.generateFrameworkAnalysis(redditData.posts, aggregatedResults);
      console.log('✅ Framework analysis completed');
    } catch (error) {
      console.error('Framework analysis failed:', error.message);
      aggregatedResults.framework_analysis = { 
        success: false, 
        error: 'Framework analysis failed: ' + error.message 
      };
    }

    // Set the used model on the aggregated results
    aggregatedResults.aiModel = this.usedModel;

    // Final progress update
    if (progressCallback) {
      progressCallback({
        percentage: 100,
        itemsProcessed: allResults.length,
        partialResults: null
      });
    }

    return aggregatedResults;
  }

  getUsedModel() {
    return this.usedModel;
  }

  aggregateResults(individualScores, posts) {
    if (individualScores.length === 0) {
      return {
        overall_analysis: {
          average_score: 0,
          sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
          dominant_themes: [],
          key_emotions: [],
          summary: "Analysis failed - no results available"
        },
        individual_scores: [],
        by_subreddit: {},
        timeline: []
      };
    }

    // Calculate overall metrics
    const totalScores = individualScores.length;
    const averageScore = individualScores.reduce((sum, item) => sum + item.score, 0) / totalScores;
    
    const sentimentCounts = individualScores.reduce((acc, item) => {
      acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
      return acc;
    }, {});

    const sentimentDistribution = {
      positive: Math.round((sentimentCounts.positive || 0) / totalScores * 100),
      neutral: Math.round((sentimentCounts.neutral || 0) / totalScores * 100),
      negative: Math.round((sentimentCounts.negative || 0) / totalScores * 100)
    };

    // Extract themes and emotions
    const allThemes = individualScores.flatMap(item => item.themes || []);
    const allEmotions = individualScores.flatMap(item => item.emotions || []);
    
    const themeFreq = allThemes.reduce((acc, theme) => {
      acc[theme] = (acc[theme] || 0) + 1;
      return acc;
    }, {});
    
    const emotionFreq = allEmotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});

    const dominantThemes = Object.entries(themeFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([theme]) => theme);

    const keyEmotions = Object.entries(emotionFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([emotion]) => emotion);

    // Group by subreddit
    const bySubreddit = {};
    individualScores.forEach(score => {
      const subreddit = score.source.subreddit;
      if (!bySubreddit[subreddit]) {
        bySubreddit[subreddit] = {
          scores: [],
          positive: 0,
          neutral: 0,
          negative: 0
        };
      }
      bySubreddit[subreddit].scores.push(score.score);
      bySubreddit[subreddit][score.sentiment]++;
    });

    // Calculate averages for each subreddit
    Object.keys(bySubreddit).forEach(subreddit => {
      const data = bySubreddit[subreddit];
      data.average_score = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      data.total_analyzed = data.scores.length;
    });

    // Create timeline analysis
    const timeline = this.createTimeline(posts, individualScores);

    return {
      overall_analysis: {
        average_score: Math.round(averageScore * 100) / 100,
        sentiment_distribution: sentimentDistribution,
        dominant_themes: dominantThemes,
        key_emotions: keyEmotions,
        summary: this.generateSummary(averageScore, sentimentDistribution, dominantThemes)
      },
      individual_scores: individualScores,
      by_subreddit: bySubreddit,
      timeline: timeline
    };
  }

  createTimeline(posts, individualScores) {
    const timelineData = {};
    
    posts.forEach(post => {
      const date = new Date(post.created_utc * 1000).toISOString().split('T')[0];
      if (!timelineData[date]) {
        timelineData[date] = { scores: [], positive: 0, neutral: 0, negative: 0 };
      }
      
      // Find scores for this post
      const postScores = individualScores.filter(score => score.source.postId === post.id);
      postScores.forEach(score => {
        timelineData[date].scores.push(score.score);
        timelineData[date][score.sentiment]++;
      });
    });

    return Object.entries(timelineData)
      .map(([date, data]) => ({
        date,
        average_score: data.scores.length > 0 ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length : 0,
        positive: data.positive,
        neutral: data.neutral,
        negative: data.negative,
        total: data.scores.length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  generateSummary(averageScore, distribution, themes) {
    let sentiment = 'neutral';
    if (averageScore > 0.1) sentiment = 'positive';
    else if (averageScore < -0.1) sentiment = 'negative';

    const dominantSentiment = Object.entries(distribution).sort(([,a], [,b]) => b - a)[0][0];
    const topThemes = themes.slice(0, 3).join(', ');

    return `The overall sentiment is ${sentiment} (${dominantSentiment} ${distribution[dominantSentiment]}%). ${topThemes ? `Key themes include: ${topThemes}.` : ''}`;
  }

  async generateAIInsights(posts) {
    try {
      // Use fresh API keys - try Claude first, fall back to OpenAI
      const claudeApiKey = process.env.CLAUDE_API_KEY?.trim();
      const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

      const hasClaudeKey = claudeApiKey && claudeApiKey !== 'your_claude_api_key';
      const hasOpenAIKey = openaiApiKey && openaiApiKey !== 'your_openai_api_key';

      if (!hasClaudeKey && !hasOpenAIKey) {
        return { error: 'No AI API keys available for insights generation' };
      }

      const useClaude = hasClaudeKey;
      const useOpenAI = !useClaude && hasOpenAIKey;

      // Group posts by subreddit
      const postsBySubreddit = {};
      posts.forEach(post => {
        if (!postsBySubreddit[post.subreddit]) {
          postsBySubreddit[post.subreddit] = [];
        }
        postsBySubreddit[post.subreddit].push(post);
      });

      const insights = {};

      // Generate insights for each subreddit
      for (const [subreddit, subredditPosts] of Object.entries(postsBySubreddit)) {
        console.log(`Generating insights for r/${subreddit}...`);

        // Create clean data for Claude
        const cleanData = subredditPosts.map(post => ({
          title: post.title,
          content: post.selftext || '',
          score: post.score,
          comments_count: post.num_comments,
          date: new Date(post.created_utc * 1000).toISOString().split('T')[0],
          top_comments: post.comments
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(comment => ({
              text: comment.body,
              score: comment.score
            }))
        }));

        const prompt = `Analyze the sentiment and themes of these posts from r/${subreddit} and give me your take.

Look for:
- Overall community mood and attitudes
- Common themes, concerns, or topics of interest
- Any notable patterns in what gets upvoted/discussed
- Emerging trends or shifts in opinion
- Pain points or frustrations the community is experiencing
- What this tells us about the community's current state

Be insightful and specific. Give me a concise but meaningful analysis.

Data from r/${subreddit}:
${JSON.stringify(cleanData, null, 2)}`;

        try {
          let response;
          let insightText;

          if (useClaude) {
            response = await axios.post('https://api.anthropic.com/v1/messages', {
              model: 'claude-3-haiku-20240307',
              max_tokens: 1000,
              messages: [{
                role: 'user',
                content: prompt
              }]
            }, {
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeApiKey,
                'anthropic-version': '2023-06-01'
              }
            });
            insightText = response.data.content[0].text;
          } else if (useOpenAI) {
            response = await axios.post('https://api.openai.com/v1/chat/completions', {
              model: 'gpt-4',
              messages: [{
                role: 'user',
                content: prompt
              }],
              max_tokens: 1000,
              temperature: 0.3
            }, {
              headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
              }
            });
            insightText = response.data.choices[0].message.content;
          }

          insights[subreddit] = insightText;
          
          // Rate limiting between subreddits
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to generate insights for r/${subreddit}:`, error.message);
          insights[subreddit] = `Unable to generate insights for r/${subreddit} due to API error.`;
        }
      }

      return insights;
    } catch (error) {
      console.error('Error generating Claude insights:', error);
      return { error: 'Failed to generate insights' };
    }
  }

  async generateFrameworkAnalysis(posts, basicAnalysis, retryCount = 0) {
    try {
      // Use fresh API keys
      const claudeApiKey = process.env.CLAUDE_API_KEY?.trim();
      const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

      const hasClaudeKey = claudeApiKey && claudeApiKey !== 'your_claude_api_key';
      const hasOpenAIKey = openaiApiKey && openaiApiKey !== 'your_openai_api_key';

      if (!hasClaudeKey && !hasOpenAIKey) {
        return { error: 'No AI API keys available for framework analysis' };
      }

      // Prefer Claude but fall back to OpenAI
      const useClaude = hasClaudeKey;
      const useOpenAI = !useClaude && hasOpenAIKey;

      console.log('🔬 Generating advanced framework analysis...');

      // Generate cleaned data for analysis
      const cleanedData = this.generateCleanedData(posts, basicAnalysis);

      const frameworkPrompt = `Using the Reddit Sentiment Analysis Framework, analyze this subreddit data comprehensively.

IMPORTANT: Format your response with clear section headers using ** text ** for main sections and structured content.

**COMMUNITY PROFILING**

• Community Type: [dating/product/hobby/support/news]
• Demographic Indicators: [key demographics]
• Emotional Baseline: [cynical/optimistic/supportive/competitive]
• Community Character: [2-3 sentence description]

**PATTERN DISCOVERY**

🔍 Key Findings:

1. Surprising Pattern #1:
   [Description of the pattern and why it's surprising]

2. Surprising Pattern #2:
   [Description of the pattern and why it's surprising]

3. Surprising Pattern #3:
   [Description of the pattern and why it's surprising]

💬 Controversy Triggers:
• [Topic 1 that generates controversy]
• [Topic 2 that generates controversy]
• [Topic 3 that generates controversy]

📊 Success/Failure Predictors:
• Success indicators: [language choices that predict success]
• Failure indicators: [language choices that predict failure]

**TEMPORAL ANALYSIS**

⏰ Time-Based Patterns:

Daily Cycles:
• [Morning patterns]
• [Afternoon patterns]
• [Evening patterns]

Weekly Trends:
• [Weekday vs weekend differences]
• [Peak engagement times]

Sentiment Evolution:
• [How sentiment changes over time]

**KEY INSIGHTS**

⭐ Most Important Discoveries:

1. Engagement Correlation:
   [Unexpected correlation between engagement and sentiment]

2. Unspoken Rules:
   [Community's implicit rules based on voting patterns]

3. Influence Patterns:
   [How sentiment spreads through comment chains]

4. Content Predictors:
   [What makes content succeed or fail]

**ACTIONABLE RECOMMENDATIONS**

📝 Content Strategy:
• Best performing content types: [specific types]
• Optimal post structure: [format recommendations]
• Language style: [tone and style that works]

⏱️ Timing Strategy:
• Best posting times: [specific times/days]
• Avoid posting: [times to avoid]

🚫 Topics to Avoid:
• [Topic 1 - why it triggers negative reactions]
• [Topic 2 - why it triggers negative reactions]

✅ Topics that Resonate:
• [Topic 1 - why it works well]
• [Topic 2 - why it works well]

**QUESTIONS FOR DEEPER ANALYSIS**

🤔 Compelling comparison questions to explore:

1. [Thought-provoking question about the community]
2. [Question comparing different aspects of behavior]
3. [Question about unexpected patterns]
4. [Question about community evolution]
5. [Question about external influences]

**SUMMARY**

📋 Executive Summary:
[2-3 sentence high-level summary of the most important findings]

Analyze the following data:
${JSON.stringify(cleanedData, null, 2)}

Provide your analysis following the EXACT structure above, using the headers and formatting shown.`;

      let response;
      let analysisText;

      if (useClaude) {
        console.log('🤖 Using Claude for framework analysis');
        response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8000,
          messages: [{
            role: 'user',
            content: frameworkPrompt
          }]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeApiKey,
            'anthropic-version': '2023-06-01'
          }
        });
        analysisText = response.data.content[0].text;
      } else if (useOpenAI) {
        console.log('🤖 Using OpenAI GPT-4 for framework analysis');

        // Use shorter prompt for OpenAI due to context limits
        const openaiFrameworkPrompt = `Analyze this Reddit community data and provide insights.

**COMMUNITY ANALYSIS**
• Community type and characteristics
• Key behavioral patterns
• Engagement trends

**KEY FINDINGS**
• Most interesting discoveries
• Content that works/fails
• Community dynamics

**RECOMMENDATIONS**
• Best posting strategies
• Topics that resonate
• Timing recommendations

Data: ${JSON.stringify(cleanedData, null, 2).substring(0, 2000)}...

Provide structured analysis following the format above.`;

        response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: openaiFrameworkPrompt
          }],
          max_tokens: 3000,
          temperature: 0.3
        }, {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        analysisText = response.data.choices[0].message.content;
      }

      return {
        success: true,
        analysis: analysisText,
        generated_at: new Date().toISOString(),
        model_used: useClaude ? 'Claude 3.5 Sonnet' : 'OpenAI GPT-4'
      };
    } catch (error) {
      console.error('Error generating framework analysis:', error.message);
      
      const status = error.response?.status;
      const isRetryableError = status === 429 || status === 529 || status === 503 || status === 502 || status === 500;

      // Retry logic for retryable errors
      if (isRetryableError && retryCount < 2) {
        const delayMs = status === 529 ? (retryCount + 1) * 2000 : (retryCount + 1) * 5000;
        const claudeApiKey = process.env.CLAUDE_API_KEY?.trim();
        const hasClaudeKey = claudeApiKey && claudeApiKey !== 'your_claude_api_key';
        const apiName = hasClaudeKey ? 'Claude' : 'OpenAI';
        console.log(`🔄 ${apiName} ${status === 529 ? 'overloaded' : 'rate limited'}, retrying in ${delayMs/1000}s... (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.generateFrameworkAnalysis(posts, basicAnalysis, retryCount + 1);
      }

      const claudeApiKey = process.env.CLAUDE_API_KEY?.trim();
      const hasClaudeKey = claudeApiKey && claudeApiKey !== 'your_claude_api_key';
      const apiName = hasClaudeKey ? 'Claude' : 'OpenAI';
      return {
        success: false,
        error: status === 429
          ? `Rate limited by ${apiName} API. Please try again in a few minutes.`
          : status === 529
          ? `${apiName} API is currently overloaded. Please try again in a few minutes.`
          : 'Failed to generate framework analysis: ' + error.message
      };
    }
  }

  generateCleanedData(posts, basicAnalysis) {
    const subreddits = [...new Set(posts.map(p => p.subreddit))];
    
    return {
      analysis_metadata: {
        subreddits: subreddits,
        total_posts: posts.length,
        total_comments: posts.reduce((sum, post) => sum + post.comments.length, 0),
        overall_sentiment: basicAnalysis?.overall_analysis?.average_score || 0,
        dominant_themes: basicAnalysis?.overall_analysis?.dominant_themes || [],
        key_emotions: basicAnalysis?.overall_analysis?.key_emotions || []
      },
      posts_sample: posts.slice(0, 20).map(post => ({
        id: post.id,
        title: post.title,
        score: post.score,
        num_comments: post.num_comments,
        subreddit: post.subreddit,
        created_utc: post.created_utc,
        selftext: post.selftext?.substring(0, 300) + (post.selftext?.length > 300 ? '...' : ''),
        top_comments: post.comments.slice(0, 5).map(comment => ({
          id: comment.id,
          body: comment.body?.substring(0, 200) + (comment.body?.length > 200 ? '...' : ''),
          score: comment.score,
          created_utc: comment.created_utc
        }))
      })),
      sentiment_patterns: {
        by_subreddit: basicAnalysis?.by_subreddit || {},
        timeline: basicAnalysis?.timeline || [],
        score_distribution: basicAnalysis?.overall_analysis?.sentiment_distribution || {}
      },
      high_engagement_posts: posts
        .filter(post => post.score > 100 || post.num_comments > 50)
        .slice(0, 10)
        .map(post => ({
          title: post.title,
          score: post.score,
          num_comments: post.num_comments,
          subreddit: post.subreddit,
          top_comment_scores: post.comments.slice(0, 3).map(c => c.score)
        })),
      controversial_indicators: posts
        .filter(post => post.comments.length > 10)
        .slice(0, 10)
        .map(post => ({
          title: post.title,
          score: post.score,
          comment_count: post.comments.length,
          comment_score_variance: post.comments.map(c => c.score),
          subreddit: post.subreddit
        }))
    };
  }

  async testClaude() {
    try {
      // Use fresh environment variable instead of cached value
      const claudeApiKey = this.getClaudeApiKey();

      console.log('🧪 testClaude sees key:', claudeApiKey ? `"${claudeApiKey}"` : 'null');

      if (!claudeApiKey || claudeApiKey === 'your_claude_api_key') {
        return { success: false, message: 'Claude API key not set' };
      }

      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: 'Just respond with "API test successful" to confirm the connection.'
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      return {
        success: true,
        message: 'Claude API connection successful',
        details: response.data.content[0].text.trim()
      };
    } catch (error) {
      return {
        success: false,
        message: `Claude API test failed: ${error.response?.data?.error?.message || error.message}`
      };
    }
  }

  async testOpenAI() {
    try {
      // Use fresh environment variable instead of cached value
      const openaiApiKey = this.getOpenAIApiKey();

      if (!openaiApiKey || openaiApiKey === 'your_openai_api_key') {
        return { success: false, message: 'OpenAI API key not set' };
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: 'Just respond with "API test successful" to confirm the connection.'
        }],
        max_tokens: 20,
        temperature: 0
      }, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        message: 'OpenAI API connection successful',
        details: response.data.choices[0].message.content.trim()
      };
    } catch (error) {
      return {
        success: false,
        message: `OpenAI API test failed: ${error.response?.data?.error?.message || error.message}`
      };
    }
  }

  async generateSyntheticPost(prompt, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      const claudeApiKey = this.getClaudeApiKey();
      console.log(`🤖 Calling Claude for synthetic post generation (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      const responseText = response.data.content[0].text;
      
      // Try to extract JSON from the response
      try {
        // Remove any markdown code block formatting
        let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Try to find JSON in the response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
        }
        
        return JSON.parse(cleanedText);
      } catch (parseError) {
        console.log('Raw Claude response:', responseText);
        throw new Error('Claude returned invalid JSON format for synthetic post');
      }
    } catch (error) {
      const status = error.response?.status;
      const isRetryableError = status === 529 || status === 503 || status === 502 || status === 500;
      
      if (isRetryableError && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`⏳ Claude API overloaded (${status}), retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateSyntheticPost(prompt, retryCount + 1);
      }
      
      console.error('Claude API error for synthetic post:', status, error.response?.data || error.message);
      
      // For overloaded errors, provide a more user-friendly message
      if (status === 529) {
        throw new Error('Claude API is currently overloaded. Please try again in a few minutes.');
      }
      
      throw new Error('Failed to generate synthetic post with Claude: ' + (error.response?.data?.error?.message || error.message));
    }
  }
}

module.exports = new SentimentService();