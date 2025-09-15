// Game of Thrones Season 8 Analysis - The controversial finale
require('dotenv').config({ path: '.env' });
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function gotAnalysis() {
    console.log('🐉 GAME OF THRONES SEASON 8 ANALYSIS');
    console.log('=====================================');
    console.log('Analyzing the most controversial season finale ever...');
    console.log('');

    // Check if server is running
    try {
        await axios.get(`${API_URL}/api/health`);
        console.log('✅ Server is running');
    } catch (error) {
        console.log('❌ Server not running. Start with: npm run dev');
        return;
    }

    // Season 8 finale period - May 19, 2019 was the final episode
    // Let's get the week after the finale for maximum reactions
    const startDate = new Date('2019-05-19');  // Finale date
    const endDate = new Date('2019-05-26');    // Week after finale

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);
    console.log('🎬 This covers the finale "The Iron Throne" and immediate reactions');

    // Generate unique analysis ID
    const analysisId = `got_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 Analysis ID: ${analysisId}`);

    try {
        console.log('🔍 Starting analysis of r/gameofthrones...');

        // Call the analyze API
        const analyzeResponse = await axios.post(`${API_URL}/api/analyze`, {
            analysisId: analysisId,
            subreddits: ['gameofthrones'],
            startDate: startDateStr,
            endDate: endDateStr,
            postLimit: 10,  // More posts for this important event
            apiKeys: {
                reddit: {},
                claude: {},
                openai: {}
            }
        }, {
            timeout: 30 * 60 * 1000 // 30 minutes
        });

        if (analyzeResponse.data.success) {
            const data = analyzeResponse.data.data;
            console.log('✅ Analysis completed successfully!');
            console.log(`📊 Results: ${data.summary.totalPosts} posts, ${data.summary.totalComments} comments`);
            console.log(`😊 Average sentiment: ${data.summary.averageSentiment}`);
            console.log('🔥 Expected: Highly negative sentiment about D&D ruining the show!');

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
                    name: 'Game of Thrones Season 8 Finale',
                    description: 'Analysis of fan reactions to the controversial series finale',
                    tags: ['gameofthrones', 'finale', 'season8', 'controversial', 'automated']
                }
            });

            if (saveResponse.data.success) {
                console.log('✅ Analysis saved to history!');

                // Generate synthetic post
                console.log('🤖 Generating synthetic post (probably very angry)...');
                try {
                    const syntheticResponse = await axios.post(`${API_URL}/api/generate-synthetic-post`, {
                        data: {
                            subreddit: 'gameofthrones',
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
                    console.log(`🎭 Title: "${syntheticResponse.data.title?.substring(0, 60)}..."`);
                } catch (syntheticError) {
                    console.log('⚠️ Synthetic post generation failed:', syntheticError.message);
                }

                console.log('');
                console.log('=====================================');
                console.log('🎉 SUCCESS! GoT Season 8 analysis complete!');
                console.log('💔 Check your website to see the fan disappointment');
                console.log('=====================================');
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
gotAnalysis();