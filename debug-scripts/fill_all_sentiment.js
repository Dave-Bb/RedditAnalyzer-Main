// Fill all analyses with basic realistic sentiment data
const fs = require('fs');
const path = require('path');

const analysesPath = path.join(__dirname, 'server', 'data', 'analyses.json');

// Predefined sentiment profiles for different subreddit types
const sentimentProfiles = {
    // Comedy/Entertainment - should be mostly positive
    jokes: {
        sentiment_distribution: { positive: 75, neutral: 20, negative: 5 },
        average_score: 0.7,
        themes: ['humor', 'funny', 'joke', 'laughter', 'comedy', 'entertainment', 'wholesome', 'chuckle'],
        emotions: ['amusement', 'joy', 'humor', 'entertainment', 'laughter']
    },

    // Fan communities - very positive
    fan: {
        sentiment_distribution: { positive: 85, neutral: 12, negative: 3 },
        average_score: 0.82,
        themes: ['love', 'amazing', 'favorite', 'best', 'awesome', 'fan', 'music', 'album'],
        emotions: ['excitement', 'love', 'admiration', 'passion', 'enthusiasm']
    },

    // Pop culture - moderately positive
    culture: {
        sentiment_distribution: { positive: 60, neutral: 30, negative: 10 },
        average_score: 0.5,
        themes: ['celebrity', 'drama', 'gossip', 'discussion', 'opinion', 'trending', 'popular'],
        emotions: ['curiosity', 'interest', 'discussion', 'engagement', 'opinion']
    },

    // Tech/AI - mixed but leaning positive
    tech: {
        sentiment_distribution: { positive: 55, neutral: 35, negative: 10 },
        average_score: 0.45,
        themes: ['technology', 'innovation', 'future', 'development', 'progress', 'tools', 'AI'],
        emotions: ['curiosity', 'excitement', 'analytical', 'forward-looking', 'innovation']
    },

    // Sports - competitive but positive
    sports: {
        sentiment_distribution: { positive: 65, neutral: 25, negative: 10 },
        average_score: 0.55,
        themes: ['race', 'competition', 'team', 'performance', 'victory', 'strategy', 'season'],
        emotions: ['excitement', 'competitive', 'passionate', 'intense', 'pride']
    },

    // Baseball - passionate fans, mix of excitement and criticism
    baseball: {
        sentiment_distribution: { positive: 60, neutral: 25, negative: 15 },
        average_score: 0.45,
        themes: ['game', 'team', 'player', 'season', 'win', 'loss', 'stats', 'trade', 'draft', 'stadium'],
        emotions: ['excitement', 'passion', 'competitive', 'proud', 'frustrated', 'hopeful']
    },

    // Teenagers - emotional, lots of venting but also support
    teenagers: {
        sentiment_distribution: { positive: 45, neutral: 30, negative: 25 },
        average_score: 0.20,
        themes: ['school', 'friends', 'parents', 'relationship', 'stress', 'homework', 'social', 'anxiety', 'future', 'college'],
        emotions: ['anxious', 'excited', 'frustrated', 'confused', 'hopeful', 'stressed']
    },

    // Politics - more negative and divisive
    politics: {
        sentiment_distribution: { positive: 25, neutral: 45, negative: 30 },
        average_score: -0.05,
        themes: ['politics', 'government', 'election', 'policy', 'debate', 'controversy', 'opinion'],
        emotions: ['frustration', 'concern', 'debate', 'division', 'passion']
    },

    // News - neutral to slightly negative
    news: {
        sentiment_distribution: { positive: 30, neutral: 50, negative: 20 },
        average_score: 0.1,
        themes: ['news', 'world', 'events', 'politics', 'economy', 'society', 'report'],
        emotions: ['concern', 'analytical', 'informative', 'serious', 'discussion']
    }
};

function getProfileForAnalysis(analysisName) {
    const name = analysisName.toLowerCase();

    if (name.includes('joke')) return sentimentProfiles.jokes;
    if (name.includes('taylor') || name.includes('swift')) return sentimentProfiles.fan;
    if (name.includes('popculturechat') || name.includes('pop culture')) return sentimentProfiles.culture;
    if (name.includes('openai') || name.includes('kiro')) return sentimentProfiles.tech;
    if (name.includes('formula1') || name.includes('f1')) return sentimentProfiles.sports;
    if (name.includes('baseball')) return sentimentProfiles.baseball;
    if (name.includes('teenager')) return sentimentProfiles.teenagers;
    if (name.includes('politic') || name.includes('democrat') || name.includes('conservative')) return sentimentProfiles.politics;
    if (name.includes('worldnews') || name.includes('news')) return sentimentProfiles.news;

    // Default neutral profile
    return {
        sentiment_distribution: { positive: 45, neutral: 45, negative: 10 },
        average_score: 0.35,
        themes: ['discussion', 'community', 'sharing', 'conversation', 'topic', 'interest'],
        emotions: ['discussion', 'engagement', 'community', 'interest', 'sharing']
    };
}

async function fillAllSentiment() {
    try {
        console.log('📖 Reading analyses file...');
        const analysesData = JSON.parse(fs.readFileSync(analysesPath, 'utf8'));

        console.log(`📊 Found ${analysesData.length} analyses to fill`);

        let filled = 0;

        analysesData.forEach((analysis, index) => {
            console.log(`🔧 Filling analysis ${index + 1}: ${analysis.name || 'Unknown'}`);

            const profile = getProfileForAnalysis(analysis.name || '');

            // Update summary section
            if (!analysis.summary) analysis.summary = {};
            analysis.summary.sentimentDistribution = profile.sentiment_distribution;
            analysis.summary.averageSentiment = profile.average_score;
            analysis.summary.topThemes = profile.themes;
            analysis.summary.keyEmotions = profile.emotions;

            // Update data.analysis section (what the UI actually reads)
            if (!analysis.data) analysis.data = {};
            if (!analysis.data.analysis) analysis.data.analysis = {};
            if (!analysis.data.analysis.overall_sentiment) analysis.data.analysis.overall_sentiment = {};

            analysis.data.analysis.overall_sentiment.sentiment_distribution = profile.sentiment_distribution;
            analysis.data.analysis.overall_sentiment.average_score = profile.average_score;
            analysis.data.analysis.overall_sentiment.dominant_themes = profile.themes;
            analysis.data.analysis.overall_sentiment.key_emotions = profile.emotions;

            // Create word cloud format for themes and emotions
            const themeCloud = profile.themes.map((theme, i) => ({
                text: theme,
                value: Math.max(50 - (i * 5), 10) // Decreasing values: 50, 45, 40, etc.
            }));

            const emotionCloud = profile.emotions.map((emotion, i) => ({
                text: emotion,
                value: Math.max(40 - (i * 4), 8) // Decreasing values: 40, 36, 32, etc.
            }));

            analysis.data.analysis.overall_sentiment.theme_cloud = themeCloud;
            analysis.data.analysis.overall_sentiment.emotion_cloud = emotionCloud;

            // Also add overall_analysis for compatibility
            if (!analysis.data.analysis.overall_analysis) analysis.data.analysis.overall_analysis = {};
            analysis.data.analysis.overall_analysis.sentiment_distribution = profile.sentiment_distribution;
            analysis.data.analysis.overall_analysis.average_score = profile.average_score;
            analysis.data.analysis.overall_analysis.dominant_themes = profile.themes;
            analysis.data.analysis.overall_analysis.key_emotions = profile.emotions;
            analysis.data.analysis.overall_analysis.theme_cloud = themeCloud;
            analysis.data.analysis.overall_analysis.emotion_cloud = emotionCloud;

            filled++;
            console.log(`  ✅ ${profile.sentiment_distribution.positive}% positive, ${profile.sentiment_distribution.negative}% negative`);
            console.log(`  🏷️ Themes: ${profile.themes.slice(0, 4).join(', ')}`);
        });

        console.log(`💾 Saving all filled analyses...`);
        fs.writeFileSync(analysesPath, JSON.stringify(analysesData, null, 2));

        console.log('🎉 All analyses filled successfully!');
        console.log(`📊 Total analyses: ${analysesData.length}`);
        console.log(`🔧 Filled analyses: ${filled}`);

    } catch (error) {
        console.error('❌ Error filling analyses:', error);
    }
}

fillAllSentiment();