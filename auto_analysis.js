// Fresh Auto Analysis Script - Does exactly what you want
require('dotenv').config({ path: '.env' });
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function autoAnalysis() {
    console.log('🎤 TAYLOR SWIFT SENTIMENT ANALYSIS');
    console.log('==================================');
    console.log('Target: r/TaylorSwift subreddit');
    console.log('');

    // Check if server is running
    try {
        await axios.get(`${API_URL}/api/health`);
        console.log('✅ Server is running');
    } catch (error) {
        console.log('❌ Server not running. Start with: npm run dev');
        return;
    }

    // Last week for current political discussions
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

    // Generate unique analysis ID
    const analysisId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 Analysis ID: ${analysisId}`);

    try {
        console.log('🔍 Starting analysis...');

        // Call the analyze API exactly like the website
        const analyzeResponse = await axios.post(`${API_URL}/api/analyze`, {
            analysisId: analysisId,
            subreddits: ['TaylorSwift'],
            startDate: startDateStr,
            endDate: endDateStr,
            postLimit: 20,
            apiKeys: {
                reddit: {},
                claude: {},
                openai: {}
            }
        }, {
            timeout: 120 * 60 * 1000 // 30 minutes
        });

        if (analyzeResponse.data.success) {
            const data = analyzeResponse.data.data;
            console.log('✅ Analysis completed successfully!');
            console.log(`📊 Results: ${data.summary.totalPosts} posts, ${data.summary.totalComments} comments`);
            console.log(`😊 Average sentiment: ${data.summary.averageSentiment}`);

            // Debug: Check if we actually got data
            if (data.summary.totalPosts === 0) {
                console.log('⚠️ WARNING: No posts were fetched from Reddit!');
                console.log('This might be due to date range or Reddit API issues.');
            }

            // Save the analysis
            console.log('💾 Saving analysis...');
            const saveResponse = await axios.post(`${API_URL}/api/analyses`, {
                analysisData: data,
                metadata: {
                    name: 'Taylor Swift Fan Analysis',
                    description: 'Sentiment analysis of Taylor Swift fan discussions and reactions',
                    tags: ['automated', 'taylorswift', 'music', 'entertainment', 'fanbase']
                }
            });

            if (saveResponse.data.success) {
                console.log('✅ Analysis saved to history!');

                // Generate synthetic post
                console.log('🤖 Generating synthetic post...');
                try {
                    const syntheticResponse = await axios.post(`${API_URL}/api/generate-synthetic-post`, {
                        data: {
                            subreddit: data.summary.subreddits[0] || 'worldnews',
                            sample_posts: data.posts.slice(0, 8).map(post => ({
                                title: post.title,
                                author: post.author || `user${Math.floor(Math.random() * 999)}`,
                                body: post.selftext?.substring(0, 400) || '',
                                score: post.score,
                                num_comments: post.num_comments,
                                comments: post.comments?.slice(0, 2).map(comment => ({
                                    author: comment.author || `commenter${Math.floor(Math.random() * 999)}`,
                                    body: comment.body?.substring(0, 150) || '',
                                    score: comment.score
                                })) || []
                            }))
                        }
                    });

                    console.log('✅ Synthetic post generated!');
                    console.log(`🎭 Title: "${syntheticResponse.data.title?.substring(0, 50)}..."`);
                } catch (syntheticError) {
                    console.log('⚠️ Synthetic post generation failed:', syntheticError.message);
                }

                console.log('');
                console.log('======================');
                console.log('🎉 SUCCESS! Check your website history tab');
                console.log('======================');
            } else {
                console.log('❌ Failed to save analysis:', saveResponse.data.error);
            }

        } else {
            console.log('❌ Analysis failed:', analyzeResponse.data.error);
        }

    } catch (error) {
        console.log('❌ Error occurred:', error.message);
        if (error.response?.data) {
            console.log('Server response:', error.response.data);
        }
    }
}

// Run it
autoAnalysis();