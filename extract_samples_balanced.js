// Balanced extraction - Keep analysis insights but reduce both analysis text and comments
const fs = require('fs');
const path = require('path');

const serverDataPath = path.join(__dirname, 'server', 'data', 'analyses.json');
const clientDataPath = path.join(__dirname, 'client', 'src', 'data', 'sampleAnalyses.ts');

function extractBalancedSamples() {
    try {
        console.log('📖 Reading server analyses...');

        if (!fs.existsSync(serverDataPath)) {
            console.log('❌ Server analyses file not found');
            return;
        }

        const serverData = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));
        const serverAnalyses = Array.isArray(serverData) ? serverData : (serverData.analyses || []);

        console.log(`📊 Found ${serverAnalyses.length} server analyses`);

        // Balance optimization - keep essence but reduce bulk
        const balancedAnalyses = serverAnalyses.map((analysis, index) => {
            // Helper to truncate long text but preserve structure
            const smartTruncate = (obj, maxStringLength = 500) => {
                if (typeof obj === 'string') {
                    return obj.length > maxStringLength ?
                        obj.substring(0, maxStringLength) + '...' : obj;
                }
                if (Array.isArray(obj)) {
                    return obj.slice(0, 10); // Keep max 10 items in arrays
                }
                if (typeof obj === 'object' && obj !== null) {
                    const truncated = {};
                    for (const [key, value] of Object.entries(obj)) {
                        truncated[key] = smartTruncate(value, maxStringLength);
                    }
                    return truncated;
                }
                return obj;
            };

            // Fix analysis structure to match TypeScript interface
            const fixAnalysisStructure = (analysis) => {
                if (!analysis) return {};

                // Convert overall_analysis to overall_sentiment if needed
                const overall = analysis.overall_analysis || analysis.overall_sentiment || {};

                return {
                    ...analysis,
                    overall_sentiment: {
                        average_score: overall.average_score || 0,
                        sentiment_distribution: overall.sentiment_distribution || {
                            positive: 50, neutral: 30, negative: 20
                        },
                        dominant_themes: overall.dominant_themes || [],
                        key_emotions: overall.key_emotions || [],
                        summary: overall.summary || 'Sample analysis showing sentiment patterns'
                    },
                    individual_scores: analysis.individual_scores || [],
                    by_subreddit: analysis.by_subreddit || {},
                    timeline: analysis.timeline || []
                };
            };

            return {
                id: analysis.id,
                generated_at: analysis.timestamp, // Fix TypeScript structure
                name: analysis.name,
                description: analysis.description || `Analysis of ${analysis.subreddits.join(', ')} subreddit discussion`,
                subreddits: analysis.subreddits,
                dateRange: analysis.dateRange,
                totalPosts: analysis.summary.totalPosts,
                totalComments: analysis.summary.totalComments, // Keep original counts!
                data: {
                    summary: analysis.data.summary || analysis.summary,
                    // Fix and truncate analysis to match TypeScript interface
                    analysis: fixAnalysisStructure(smartTruncate(analysis.data.analysis, 400)),

                    // Keep reasonable sample of posts (10) with few comments (3 each)
                    posts: (analysis.data.posts || []).slice(0, 10).map(post => ({
                        ...post,
                        // Truncate very long post content
                        selftext: post.selftext && post.selftext.length > 300 ?
                            post.selftext.substring(0, 300) + '...' : post.selftext,
                        // Keep only 3 comments per post, truncate long ones
                        comments: (post.comments || []).slice(0, 3).map(comment => ({
                            ...comment,
                            body: comment.body && comment.body.length > 200 ?
                                comment.body.substring(0, 200) + '...' : comment.body
                        }))
                    }))
                }
            };
        });

        // Generate TypeScript file content with proper structure
        const tsContent = `// Pre-generated sample analyses for static deployment (BALANCED)
// Preserves analysis insights and reasonable sample data

import { AnalysisData } from '../types';

// Sample analysis metadata for History component
export const sampleAnalyses = ${JSON.stringify(balancedAnalyses, null, 2)};
`;

        // Write the TypeScript file
        fs.writeFileSync(clientDataPath, tsContent, 'utf8');

        // Check file size
        const stats = fs.statSync(clientDataPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('✅ Successfully created BALANCED sample analyses!');
        console.log(`📁 File: ${clientDataPath}`);
        console.log(`📊 Analyses: ${balancedAnalyses.length}`);
        console.log(`📦 File size: ${fileSizeInMB} MB (was ~17 MB)`);

        // Calculate what we kept
        const totalComments = balancedAnalyses.reduce((total, analysis) => {
            return total + (analysis.data.posts || []).reduce((postTotal, post) => {
                return postTotal + (post.comments || []).length;
            }, 0);
        }, 0);

        const totalPosts = balancedAnalyses.reduce((total, analysis) => {
            return total + (analysis.data.posts || []).length;
        }, 0);

        console.log(`📝 Kept ${totalPosts} posts and ${totalComments} comments for display`);
        console.log('✨ Analysis insights preserved with smart truncation!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the extraction
extractBalancedSamples();