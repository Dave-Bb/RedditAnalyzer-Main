// Simple test that mimics exactly what the working site does
require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:30011';

async function testLikeWebsite() {
    console.log('🧪 Testing exactly like the website does...');

    // Create API keys object like the website
    const apiKeys = {
        reddit: {
            clientId: process.env.REDDIT_CLIENT_ID,
            clientSecret: process.env.REDDIT_CLIENT_SECRET,
            userAgent: process.env.REDDIT_USER_AGENT || 'RedditSentimentAnalyzer/1.0'
        },
        claude: {
            apiKey: process.env.CLAUDE_API_KEY
        },
        openai: null // Not using OpenAI
    };

    // Generate temp ID like website
    const tempAnalysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const requestData = {
        analysisId: tempAnalysisId,
        subreddits: ['AskReddit'],
        startDate: '2025-09-13',  // Use today's date
        endDate: '2025-09-14',    // Use tomorrow's date
        postLimit: 5,
        apiKeys: apiKeys  // This is what the batch script was missing!
    };

    console.log('📤 Sending request with API keys included...');
    console.log('📊 Subreddit: AskReddit');
    console.log('📅 Date: 2025-09-13 to 2025-09-14');
    console.log('📝 Limit: 5 posts');

    try {
        const startTime = Date.now();

        const response = await axios.post(`${API_URL}/api/analyze`, requestData, {
            timeout: 120000 // 2 minutes
        });

        const duration = Math.round((Date.now() - startTime) / 1000);

        if (response.data.success) {
            const data = response.data.data;
            console.log(`✅ SUCCESS in ${duration}s!`);
            console.log(`📊 Found: ${data.summary.totalPosts} posts, ${data.summary.totalComments} comments`);
            console.log(`🤖 AI Model: ${data.aiModel}`);

            if (data.summary.totalPosts > 0) {
                console.log('🎉 REDDIT DATA FETCHING WORKS!');
                console.log('✨ The issue was missing API keys in the request body');
            } else {
                console.log('⚠️  Still getting 0 posts - date range issue?');
            }
        } else {
            console.log('❌ Analysis failed:', response.data.error);
        }

    } catch (error) {
        console.log('❌ Request failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure server is running on port 30011');
        }
    }
}

if (require.main === module) {
    testLikeWebsite();
}