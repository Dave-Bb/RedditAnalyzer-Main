// Smart extraction - Keep ALL analysis data but limit raw comments to 5-10 per post
const fs = require('fs');
const path = require('path');

const serverDataPath = path.join(__dirname, 'server', 'data', 'analyses.json');
const clientDataPath = path.join(__dirname, 'client', 'src', 'data', 'sampleAnalyses.ts');

function extractSmartSamples() {
    try {
        console.log('📖 Reading server analyses...');

        if (!fs.existsSync(serverDataPath)) {
            console.log('❌ Server analyses file not found');
            return;
        }

        const serverData = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));
        const serverAnalyses = Array.isArray(serverData) ? serverData : (serverData.analyses || []);

        console.log(`📊 Found ${serverAnalyses.length} server analyses`);

        // Keep ALL analysis data but reduce raw comment volume
        const optimizedAnalyses = serverAnalyses.map(analysis => {
            const optimized = {
                id: analysis.id,
                name: analysis.name,
                subreddits: analysis.subreddits,
                totalPosts: analysis.summary.totalPosts,
                totalComments: analysis.summary.totalComments, // Keep original counts!
                dateRange: analysis.dateRange,
                data: {
                    // Keep ALL the analysis insights - this is the valuable stuff
                    summary: analysis.data.summary || analysis.summary,
                    analysis: analysis.data.analysis, // Keep complete analysis

                    // Only reduce the raw posts/comments data
                    posts: (analysis.data.posts || []).map(post => ({
                        ...post, // Keep all post data
                        // Truncate post text if very long
                        selftext: post.selftext && post.selftext.length > 500 ? post.selftext.substring(0, 500) + '...' : post.selftext,
                        // But limit comments to just 5 per post instead of hundreds AND truncate long comments
                        comments: (post.comments || []).slice(0, 5).map(comment => ({
                            ...comment,
                            // Truncate very long comments to save space
                            body: comment.body && comment.body.length > 300 ? comment.body.substring(0, 300) + '...' : comment.body
                        }))
                    }))
                }
            };

            return optimized;
        });

        // Generate TypeScript file content
        const tsContent = `// Pre-generated sample analyses for static deployment (SMART OPTIMIZED)
// Keeps ALL analysis insights but limits raw comments to 5-10 per post

import { AnalysisData } from '../types';

export const sampleAnalyses: AnalysisData[] = ${JSON.stringify(optimizedAnalyses, null, 2)};
`;

        // Write the TypeScript file
        fs.writeFileSync(clientDataPath, tsContent, 'utf8');

        // Check file size
        const stats = fs.statSync(clientDataPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('✅ Successfully created SMART optimized sample analyses!');
        console.log(`📁 File: ${clientDataPath}`);
        console.log(`📊 Analyses: ${optimizedAnalyses.length}`);
        console.log(`📦 File size: ${fileSizeInMB} MB (was ~17 MB)`);
        console.log('✨ Preserved ALL analysis data, just reduced raw comment volume!');

        // Show what we kept vs reduced
        const originalCommentCount = serverAnalyses.reduce((total, analysis) => {
            return total + (analysis.data.posts || []).reduce((postTotal, post) => {
                return postTotal + (post.comments || []).length;
            }, 0);
        }, 0);

        const optimizedCommentCount = optimizedAnalyses.reduce((total, analysis) => {
            return total + (analysis.data.posts || []).reduce((postTotal, post) => {
                return postTotal + (post.comments || []).length;
            }, 0);
        }, 0);

        console.log(`📝 Comments: ${originalCommentCount} → ${optimizedCommentCount} (kept ${((optimizedCommentCount/originalCommentCount)*100).toFixed(1)}%)`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the extraction
extractSmartSamples();