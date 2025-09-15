// Fix all saved analyses with local sentiment data
const fs = require('fs');
const path = require('path');

const analysesPath = path.join(__dirname, 'server', 'data', 'analyses.json');

// Simple sentiment analysis function
function analyzeSentimentLocally(texts) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 'love', 'like', 'best', 'perfect', 'happy', 'glad', 'thanks', 'thank', 'appreciate', 'brilliant', 'outstanding', 'funny', 'hilarious', 'lol', 'haha'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'sucks', 'disappointing', 'frustrated', 'angry', 'annoyed', 'stupid', 'dumb', 'ridiculous', 'pathetic', 'useless', 'garbage', 'trash'];

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const wordFrequency = {};

    texts.forEach(text => {
        const lowerText = text.toLowerCase();
        const words = lowerText.match(/\b\w+\b/g) || [];

        // Count word frequency
        words.forEach(word => {
            if (word.length > 3 && !['this', 'that', 'with', 'have', 'they', 'from', 'been', 'were', 'would', 'could', 'should'].includes(word)) {
                wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            }
        });

        // Simple sentiment scoring
        const positiveMatches = positiveWords.filter(word => lowerText.includes(word)).length;
        const negativeMatches = negativeWords.filter(word => lowerText.includes(word)).length;

        if (positiveMatches > negativeMatches) {
            positiveCount++;
        } else if (negativeMatches > positiveMatches) {
            negativeCount++;
        } else {
            neutralCount++;
        }
    });

    const total = texts.length;
    const sentimentDistribution = {
        positive: Math.round((positiveCount / total) * 100),
        neutral: Math.round((neutralCount / total) * 100),
        negative: Math.round((negativeCount / total) * 100)
    };

    // Get top words
    const sortedWords = Object.entries(wordFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([word]) => word);

    return {
        sentimentDistribution,
        averageSentiment: ((positiveCount * 1 + negativeCount * -1) / total).toFixed(2),
        topThemes: sortedWords,
        keyEmotions: ['discussion', 'engagement', 'community']
    };
}

// Extract text from analysis data
function extractTexts(analysisData) {
    const texts = [];

    // Look in data.posts (based on actual structure)
    if (analysisData.data && analysisData.data.posts) {
        analysisData.data.posts.forEach(post => {
            if (post.title) texts.push(post.title);
            if (post.selftext) texts.push(post.selftext);

            if (post.comments) {
                post.comments.forEach(comment => {
                    if (comment.body) texts.push(comment.body);
                });
            }
        });
    }

    return texts;
}

async function fixAllAnalyses() {
    try {
        console.log('📖 Reading analyses file...');
        const analysesData = JSON.parse(fs.readFileSync(analysesPath, 'utf8'));

        console.log(`📊 Found ${analysesData.length} analyses to fix`);

        let fixed = 0;

        analysesData.forEach((analysis, index) => {
            console.log(`🔍 Checking analysis ${index + 1}: ${analysis.name || 'Unknown'}`);
            console.log(`   Has data.posts: ${!!(analysis.data && analysis.data.posts)}`);
            console.log(`   Has summary: ${!!analysis.summary}`);

            // Always fix - just add better sentiment data for all analyses
            if (analysis.data && analysis.data.posts) {
                console.log(`🔧 Fixing analysis ${index + 1}: ${analysis.metadata?.name || 'Unknown'}`);

                const texts = extractTexts(analysis);
                if (texts.length > 0) {
                    const sentiment = analyzeSentimentLocally(texts);

                    // Update summary
                    if (!analysis.summary) analysis.summary = {};
                    analysis.summary.sentimentDistribution = sentiment.sentimentDistribution;
                    analysis.summary.averageSentiment = sentiment.averageSentiment;
                    analysis.summary.topThemes = sentiment.topThemes;
                    analysis.summary.keyEmotions = sentiment.keyEmotions;

                    // Update analysis section
                    if (!analysis.analysis) analysis.analysis = {};
                    if (!analysis.analysis.overall_analysis) analysis.analysis.overall_analysis = {};

                    analysis.analysis.overall_analysis.sentiment_distribution = sentiment.sentimentDistribution;
                    analysis.analysis.overall_analysis.average_score = sentiment.averageSentiment;
                    analysis.analysis.overall_analysis.dominant_themes = sentiment.topThemes;
                    analysis.analysis.overall_analysis.key_emotions = sentiment.keyEmotions;

                    fixed++;
                    console.log(`  ✅ Fixed sentiment: ${sentiment.sentimentDistribution.positive}% positive, ${sentiment.sentimentDistribution.negative}% negative`);
                    console.log(`  🏷️ Top themes: ${sentiment.topThemes.slice(0, 5).join(', ')}`);
                }
            }
        });

        console.log(`💾 Saving updated analyses (${fixed} fixed)...`);
        fs.writeFileSync(analysesPath, JSON.stringify(analysesData, null, 2));

        console.log('🎉 All analyses updated successfully!');
        console.log(`📊 Total analyses: ${analysesData.length}`);
        console.log(`🔧 Fixed analyses: ${fixed}`);

    } catch (error) {
        console.error('❌ Error fixing analyses:', error);
    }
}

fixAllAnalyses();