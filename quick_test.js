// Quick test script for verifying the analysis works with a smaller subreddit
require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function quickTest() {
    console.log('🧪 QUICK ANALYSIS TEST');
    console.log('====================');

    const config = {
        subreddits: ['test'], // Small, low-traffic subreddit
        startDate: '2025-09-13',
        endDate: '2025-09-14',
        postLimit: 2,
        selectedModel: 'claude'
    };

    console.log(`📊 Testing with: ${config.subreddits.join(', ')}`);
    console.log(`📅 Date range: ${config.startDate} to ${config.endDate}`);
    console.log(`📝 Post limit: ${config.postLimit}`);
    console.log('');

    try {
        const startTime = Date.now();
        console.log('[TEST] Starting analysis...');

        const response = await axios.post(`${API_URL}/api/analyze`, config, {
            timeout: 2 * 60 * 1000 // 2 minute timeout for quick test
        });

        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`[TEST] ✅ Analysis completed in ${duration}s`);

        if (response.data.success) {
            const data = response.data.data;
            console.log(`[TEST] 📊 Found ${data.summary.totalPosts} posts, ${data.summary.totalComments} comments`);
            console.log(`[TEST] 🤖 AI Model: ${data.aiModel}`);
            console.log('[TEST] ✅ Test PASSED - Analysis system is working!');
        } else {
            console.log(`[TEST] ❌ Analysis failed: ${response.data.error}`);
        }

    } catch (error) {
        console.log(`[TEST] ❌ Test failed: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
            console.log('[TEST] 💡 Make sure server is running with: npm run dev');
        } else if (error.code === 'TIMEOUT') {
            console.log('[TEST] ⏰ Analysis timed out - this is expected for large subreddits');
        }
    }
}

if (require.main === module) {
    quickTest();
}