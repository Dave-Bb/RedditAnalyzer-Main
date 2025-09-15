// Demo Analysis Generator - Creates realistic sample analyses for hackathon demo
require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Sample realistic analyses for demo
const DEMO_ANALYSES = [
    {
        name: 'Trump Election Victory Analysis',
        subreddits: ['Conservative', 'politics'],
        description: 'Sentiment analysis of election discussions',
        sampleData: {
            totalPosts: 25,
            totalComments: 847,
            averageSentiment: -0.2,
            positiveCount: 298,
            negativeCount: 423,
            neutralCount: 126,
            topThemes: ['election', 'victory', 'democracy', 'votes', 'results'],
            insights: [
                'Mixed reactions with slight negative sentiment overall',
                'Strong polarization between subreddits',
                'Election integrity themes prominent'
            ]
        }
    },
    {
        name: 'AI Technology Discussion',
        subreddits: ['MachineLearning', 'artificial'],
        description: 'Analysis of AI and ML discussions',
        sampleData: {
            totalPosts: 18,
            totalComments: 643,
            averageSentiment: 0.4,
            positiveCount: 387,
            negativeCount: 156,
            neutralCount: 100,
            topThemes: ['GPT', 'neural networks', 'automation', 'future', 'jobs'],
            insights: [
                'Generally positive sentiment about AI advances',
                'Concerns about job displacement present',
                'Technical discussions dominate'
            ]
        }
    },
    {
        name: 'Climate Change News',
        subreddits: ['worldnews', 'environment'],
        description: 'Global climate change sentiment',
        sampleData: {
            totalPosts: 32,
            totalComments: 1203,
            averageSentiment: -0.6,
            positiveCount: 241,
            negativeCount: 721,
            neutralCount: 241,
            topThemes: ['climate', 'emissions', 'temperature', 'policy', 'crisis'],
            insights: [
                'Predominantly negative sentiment reflecting urgency',
                'Policy discussions highly engaged',
                'Scientific data frequently referenced'
            ]
        }
    }
];

function generateRealisticAnalysisData(config) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
        id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subreddits: config.subreddits,
        summary: {
            totalPosts: config.sampleData.totalPosts,
            totalComments: config.sampleData.totalComments,
            averageSentiment: config.sampleData.averageSentiment,
            sentimentDistribution: {
                positive: config.sampleData.positiveCount,
                negative: config.sampleData.negativeCount,
                neutral: config.sampleData.neutralCount
            },
            dateRange: {
                startDate: weekAgo.toISOString().split('T')[0],
                endDate: now.toISOString().split('T')[0]
            },
            topThemes: config.sampleData.topThemes,
            insights: config.sampleData.insights
        },
        posts: generateSamplePosts(config),
        framework: {
            psychological: {
                emotionalTone: config.sampleData.averageSentiment > 0 ? 'Optimistic' : 'Concerned',
                cognitiveLoad: 'High engagement with complex topics',
                socialDynamics: 'Active community discussion'
            },
            sociological: {
                groupDynamics: 'Diverse perspectives represented',
                culturalContext: 'Reflects current social climate',
                powerStructures: 'Varied authority levels in discussions'
            }
        },
        createdAt: now.toISOString()
    };
}

function generateSamplePosts(config) {
    const posts = [];
    for (let i = 0; i < Math.min(config.sampleData.totalPosts, 10); i++) {
        posts.push({
            id: `demo_post_${i}`,
            title: `Sample ${config.name} Discussion ${i + 1}`,
            score: Math.floor(Math.random() * 500) + 50,
            subreddit: config.subreddits[i % config.subreddits.length],
            commentCount: Math.floor(Math.random() * 100) + 10,
            sentiment: (Math.random() - 0.5) * 2, // -1 to 1
            url: `https://reddit.com/demo_${i}`,
            created_utc: Math.floor(Date.now() / 1000) - Math.random() * 604800 // Last week
        });
    }
    return posts;
}

async function createDemoAnalysis(config) {
    console.log(`🚀 Creating demo: ${config.name}`);

    try {
        const analysisData = generateRealisticAnalysisData(config);

        const response = await axios.post(`${API_URL}/api/analyses`, {
            analysisData: analysisData,
            metadata: {
                name: config.name,
                description: config.description,
                tags: ['demo', 'hackathon', ...config.subreddits]
            }
        });

        if (response.data.success) {
            console.log(`✅ ${config.name} - Created successfully`);
            console.log(`   📊 ${config.sampleData.totalPosts} posts, ${config.sampleData.totalComments} comments`);
            console.log(`   😊 Sentiment: ${config.sampleData.averageSentiment > 0 ? 'Positive' : 'Negative'} (${config.sampleData.averageSentiment})`);
            return true;
        } else {
            console.log(`❌ ${config.name} - Failed: ${response.data.error}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${config.name} - Error: ${error.message}`);
        return false;
    }
}

async function generateAllDemos() {
    console.log('🎭 DEMO ANALYSIS GENERATOR');
    console.log('=========================');
    console.log('Creating realistic sample analyses for hackathon demo...\n');

    let successful = 0;

    for (const config of DEMO_ANALYSES) {
        const success = await createDemoAnalysis(config);
        if (success) successful++;

        // Small delay between creations
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n=========================');
    console.log(`🎉 Demo generation complete!`);
    console.log(`✅ Successfully created: ${successful}/${DEMO_ANALYSES.length} analyses`);
    console.log('🌐 Check your website history at http://localhost:3000');
    console.log('=========================');
}

// Run it
generateAllDemos().catch(error => {
    console.error('Demo generation failed:', error.message);
    process.exit(1);
});