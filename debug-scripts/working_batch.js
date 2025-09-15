// WORKING Batch Analysis - Copy exactly what the website does
require('dotenv').config({ path: '.env' });
const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Test analysis - exactly like manual website usage
const TEST_ANALYSIS = {
    name: 'Working News Test',
    subreddits: ['AskReddit'],
    postLimit: 5,
    startDate: '',  // Empty = recent posts
    endDate: ''     // Empty = recent posts
};

async function runWorkingAnalysis() {
    console.log('🚀 WORKING BATCH ANALYSIS');
    console.log('========================');
    console.log('Copying exactly what the website does...');

    // Generate analysis ID exactly like the website
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        console.log(`📊 Starting analysis: ${analysisId}`);

        // Make the EXACT same call as the website
        const response = await axios.post(`${API_URL}/api/analyze`, {
            analysisId: analysisId,
            subreddits: TEST_ANALYSIS.subreddits,
            startDate: TEST_ANALYSIS.startDate,
            endDate: TEST_ANALYSIS.endDate,
            postLimit: TEST_ANALYSIS.postLimit,
            // Exactly like the website - empty API keys
            apiKeys: {
                reddit: {},
                claude: {},
                openai: {}
            }
        }, {
            timeout: 30 * 60 * 1000
        });

        if (response.data.success) {
            console.log('✅ Analysis completed successfully!');
            console.log(`📊 Found ${response.data.data.summary.totalPosts} posts, ${response.data.data.summary.totalComments} comments`);

            // Save it exactly like the website does
            console.log('💾 Saving analysis...');
            const saveResponse = await axios.post(`${API_URL}/api/analyses`, {
                analysisData: response.data.data,
                metadata: {
                    name: TEST_ANALYSIS.name,
                    description: `Automated analysis for ${TEST_ANALYSIS.subreddits.join(', ')}`,
                    tags: ['automated', ...TEST_ANALYSIS.subreddits]
                }
            });

            if (saveResponse.data.success) {
                console.log('✅ Analysis saved to history!');
                console.log('🎉 Check your website history tab');
            } else {
                console.log('❌ Failed to save:', saveResponse.data.error);
            }
        } else {
            console.log('❌ Analysis failed:', response.data.error);
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response?.data) {
            console.log('Server error:', error.response.data);
        }
    }
}

// Just run it
runWorkingAnalysis();