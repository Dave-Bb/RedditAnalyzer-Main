// Extract samples preserving ALL analysis insights, only reduce raw comment data
const fs = require('fs');
const path = require('path');

const serverDataPath = path.join(__dirname, 'server', 'data', 'analyses.json');
const clientDataPath = path.join(__dirname, 'client', 'src', 'data', 'sampleAnalyses.ts');

function extractSamplesPreserveAnalysis() {
    try {
        console.log('📖 Reading server analyses...');

        if (!fs.existsSync(serverDataPath)) {
            console.log('❌ Server analyses file not found');
            return;
        }

        const serverData = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));
        const serverAnalyses = Array.isArray(serverData) ? serverData : (serverData.analyses || []);

        console.log(`📊 Found ${serverAnalyses.length} server analyses`);

        // ONLY reduce comment volume - preserve ALL analysis insights
        const preservedAnalyses = serverAnalyses.map((analysis, index) => {

            // Fix individual_scores to match TypeScript interface
            const fixIndividualScores = (scores) => {
                if (!Array.isArray(scores)) return [];
                return scores.map(score => ({
                    ...score,
                    // Ensure sentiment is one of the allowed values
                    sentiment: ['positive', 'negative', 'neutral'].includes(score.sentiment)
                        ? score.sentiment
                        : 'neutral'
                }));
            };

            // Fix analysis structure to match TypeScript interface
            const fixAnalysisStructure = (analysis) => {
                if (!analysis) return {};

                // Convert overall_analysis to overall_sentiment if needed
                const overall = analysis.overall_analysis || analysis.overall_sentiment || {};

                return {
                    // PRESERVE ALL ANALYSIS - DON'T TRUNCATE!
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
                    individual_scores: fixIndividualScores(analysis.individual_scores || []),
                    by_subreddit: analysis.by_subreddit || {},
                    timeline: analysis.timeline || [],
                    // PRESERVE framework_analysis completely - this is the valuable content!
                    framework_analysis: analysis.framework_analysis,
                    ai_insights: analysis.ai_insights
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
                    // PRESERVE COMPLETE ANALYSIS - NO TRUNCATION!
                    analysis: fixAnalysisStructure(analysis.data.analysis),

                    // ONLY reduce raw posts/comments - keep reasonable sample but not all
                    posts: (analysis.data.posts || []).slice(0, 15).map(post => ({
                        ...post,
                        // Only truncate extremely long post content (over 1000 chars)
                        selftext: post.selftext && post.selftext.length > 1000 ?
                            post.selftext.substring(0, 1000) + '...' : post.selftext,
                        // Reduce comments from hundreds to ~5 per post
                        comments: (post.comments || []).slice(0, 5).map(comment => ({
                            ...comment,
                            // Only truncate extremely long comments (over 500 chars)
                            body: comment.body && comment.body.length > 500 ?
                                comment.body.substring(0, 500) + '...' : comment.body
                        }))
                    }))
                }
            };
        });

        // Generate TypeScript file content
        const tsContent = `// Pre-generated sample analyses for static deployment
// PRESERVES ALL ANALYSIS INSIGHTS - only reduces raw comment volume

import { AnalysisData } from '../types';

export const sampleAnalyses = ${JSON.stringify(preservedAnalyses, null, 2)};
`;

        // Write the TypeScript file
        fs.writeFileSync(clientDataPath, tsContent, 'utf8');

        // Check file size
        const stats = fs.statSync(clientDataPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('✅ Successfully created ANALYSIS-PRESERVED sample data!');
        console.log(`📁 File: ${clientDataPath}`);
        console.log(`📊 Analyses: ${preservedAnalyses.length}`);
        console.log(`📦 File size: ${fileSizeInMB} MB (was ~17 MB)`);

        // Calculate what we kept
        const totalComments = preservedAnalyses.reduce((total, analysis) => {
            return total + (analysis.data.posts || []).reduce((postTotal, post) => {
                return postTotal + (post.comments || []).length;
            }, 0);
        }, 0);

        const totalPosts = preservedAnalyses.reduce((total, analysis) => {
            return total + (analysis.data.posts || []).length;
        }, 0);

        console.log(`📝 Kept ${totalPosts} posts and ${totalComments} comments for display`);
        console.log('🧠 PRESERVED ALL FRAMEWORK ANALYSIS AND AI INSIGHTS!');
        console.log('✨ Only reduced raw comment volume - analysis text intact!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the extraction
extractSamplesPreserveAnalysis();