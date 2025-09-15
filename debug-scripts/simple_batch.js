// Simple Batch Analysis - Just automates what the site already does
require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Simple test analysis
const ANALYSES = [
    {
        name: 'News Test',
        subreddits: ['worldnews'],
        postLimit: 5,
        startDate: '',
        endDate: ''
    }
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function logStep(step, message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${step}: ${message}`);
}

async function runSingleAnalysis(config, index) {
    logStep('START', `Analysis ${index + 1}/${ANALYSES.length}: ${config.name}`);

    // Generate analysis ID like the site does
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    try {
        const response = await axios.post(`${API_URL}/api/analyze`, {
            analysisId: analysisId,
            subreddits: config.subreddits,
            startDate: config.startDate,
            endDate: config.endDate,
            postLimit: config.postLimit,
            // Send empty API keys so server uses its environment variables
            apiKeys: {
                reddit: {},
                claude: {},
                openai: {}
            }
        }, {
            timeout: 30 * 60 * 1000 // 30 minute timeout like the site
        });

        if (response.data.success) {
            logStep('SUCCESS', `✅ ${config.name} completed successfully`);
            logStep('STATS', `Found ${response.data.data.summary.totalPosts} posts, ${response.data.data.summary.totalComments} comments`);

            // Save the analysis to history like the website does
            try {
                const saveResponse = await axios.post(`${API_URL}/api/analyses`, {
                    analysisData: response.data.data,
                    metadata: {
                        name: config.name,
                        description: `Automated analysis for ${config.subreddits.join(', ')}`,
                        tags: ['automated', 'batch', ...config.subreddits]
                    }
                });

                if (saveResponse.data.success) {
                    logStep('SAVED', `💾 ${config.name} saved to history`);
                } else {
                    logStep('SAVE_ERROR', `⚠️ Analysis completed but failed to save: ${saveResponse.data.error}`);
                }
            } catch (saveError) {
                logStep('SAVE_ERROR', `⚠️ Analysis completed but failed to save: ${saveError.message}`);
            }

            return true;
        } else {
            logStep('ERROR', `❌ ${config.name} failed: ${response.data.error}`);
            return false;
        }
    } catch (error) {
        logStep('ERROR', `❌ ${config.name} failed: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 SIMPLE BATCH TEST');
    console.log('===================');
    console.log(`Running 1 small test analysis (worldnews, 5 posts)`);
    console.log('');

    // Check server
    try {
        await axios.get(`${API_URL}/api/health`);
        logStep('SERVER', '✅ Server is running');
    } catch (error) {
        console.log('❌ Server not running on localhost:3001');
        console.log('Please start with: npm run dev');
        return;
    }

    let successful = 0;
    const startTime = Date.now();

    for (let i = 0; i < ANALYSES.length; i++) {
        const config = ANALYSES[i];

        const success = await runSingleAnalysis(config, i);
        if (success) successful++;

        // Wait between analyses
        if (i < ANALYSES.length - 1) {
            logStep('WAIT', 'Waiting 30 seconds before next analysis...');
            await sleep(30000);
        }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);

    console.log('');
    console.log('=======================');
    logStep('COMPLETE', `Batch analysis complete!`);
    console.log(`⏱️  Total time: ${totalTime} minutes`);
    console.log(`✅ Successful: ${successful}/${ANALYSES.length}`);
    console.log('');
    console.log('Check your site history at http://localhost:3000');
    console.log('=======================');
}

main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
});