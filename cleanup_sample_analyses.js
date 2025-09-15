// Clean up the 10 sample analyses with proper titles, descriptions, and tags
const fs = require('fs');
const path = require('path');

const analysesPath = path.join(__dirname, 'server', 'data', 'analyses.json');

// Define the proper metadata for each sample analysis
const sampleAnalysisUpdates = {
    'baseball - 2025/09/15': {
        name: 'r/baseball Community Analysis',
        description: 'Sentiment analysis of baseball fans discussing games, players, and controversies on Reddit\'s premier baseball community.',
        tags: ['sample', 'sports', 'baseball', 'fans', 'community', 'discussion'],
        isSample: true
    },
    'teenagers - 2025/09/15': {
        name: 'r/teenagers Discussion Analysis',
        description: 'Analysis of teenage conversations covering school, relationships, social anxiety, and life challenges in this youth-focused community.',
        tags: ['sample', 'teenagers', 'youth', 'social', 'school', 'relationships'],
        isSample: true
    },
    'Jokes - 2025/09/15': {
        name: 'r/Jokes Humor Analysis',
        description: 'Sentiment analysis of humor content and audience reactions to jokes, puns, and comedy on Reddit\'s largest joke community.',
        tags: ['sample', 'humor', 'comedy', 'jokes', 'entertainment', 'positive'],
        isSample: true
    },
    'popculturechat - 2025/09/15': {
        name: 'r/popculturechat Celebrity Discussion',
        description: 'Analysis of celebrity gossip, entertainment news discussions, and pop culture commentary from engaged fans.',
        tags: ['sample', 'celebrities', 'entertainment', 'gossip', 'pop-culture', 'discussion'],
        isSample: true
    },
    'OpenAI - 2025/09/15': {
        name: 'r/OpenAI Technology Discussion',
        description: 'Sentiment analysis of AI technology discussions, ChatGPT experiences, and artificial intelligence developments.',
        tags: ['sample', 'technology', 'AI', 'OpenAI', 'ChatGPT', 'innovation'],
        isSample: true
    },
    'kiroIDE - 2025/09/15': {
        name: 'r/kiroIDE Developer Community',
        description: 'Analysis of developer discussions, IDE feedback, and programming tool conversations in the KiroIDE community.',
        tags: ['sample', 'programming', 'developers', 'IDE', 'tools', 'technology'],
        isSample: true
    },
    'TaylorSwift - 2025/09/15': {
        name: 'r/TaylorSwift Fan Community',
        description: 'Sentiment analysis of passionate fan discussions about Taylor Swift\'s music, concerts, and latest releases.',
        tags: ['sample', 'music', 'taylor-swift', 'fans', 'fandom', 'positive'],
        isSample: true
    },
    'formula1 - 2025/09/15': {
        name: 'r/formula1 Racing Discussion',
        description: 'Analysis of Formula 1 racing fans discussing races, drivers, team strategies, and championship battles.',
        tags: ['sample', 'sports', 'racing', 'formula1', 'competition', 'fans'],
        isSample: true
    },
    'democrats, Conservative, politics - 2025/09/15': {
        name: 'Political Subreddits Analysis',
        description: 'Cross-subreddit analysis of political discussions covering democratic, conservative, and general political discourse.',
        tags: ['sample', 'politics', 'debate', 'democracy', 'conservative', 'discussion'],
        isSample: true
    },
    'worldnews - 2025/09/15': {
        name: 'r/worldnews Global Events',
        description: 'Sentiment analysis of global news discussions, international events, and world affairs commentary.',
        tags: ['sample', 'news', 'global', 'world-events', 'current-affairs', 'international'],
        isSample: true
    }
};

async function cleanupSampleAnalyses() {
    try {
        console.log('📖 Reading analyses file...');
        const analysesData = JSON.parse(fs.readFileSync(analysesPath, 'utf8'));

        console.log(`📊 Found ${analysesData.length} total analyses`);

        let updated = 0;

        analysesData.forEach((analysis, index) => {
            if (sampleAnalysisUpdates[analysis.name]) {
                const updates = sampleAnalysisUpdates[analysis.name];

                console.log(`🔧 Cleaning up: "${analysis.name}"`);
                console.log(`   ➜ New name: "${updates.name}"`);

                // Update the analysis metadata
                analysis.name = updates.name;
                analysis.description = updates.description;
                analysis.tags = updates.tags;
                analysis.isSample = updates.isSample;

                updated++;
            }
        });

        console.log(`💾 Saving cleaned up analyses (${updated} updated)...`);
        fs.writeFileSync(analysesPath, JSON.stringify(analysesData, null, 2));

        console.log('✅ Sample analyses cleanup completed!');
        console.log(`🎉 Updated ${updated} out of ${analysesData.length} analyses`);

        console.log('\n📋 Updated Sample Analyses:');
        Object.values(sampleAnalysisUpdates).forEach(update => {
            console.log(`  • ${update.name}`);
            console.log(`    ${update.description}`);
            console.log(`    Tags: ${update.tags.join(', ')}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error cleaning up analyses:', error);
    }
}

cleanupSampleAnalyses();