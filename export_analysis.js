// Utility to export completed analyses to static data format
// Run this after completing an analysis to add it to sampleAnalyses.ts

const fs = require('fs');
const path = require('path');

function exportAnalysisToStatic(analysisData, metadata) {
    console.log('📊 Exporting analysis to static format...');

    // Create the static analysis object
    const staticAnalysis = {
        id: metadata.id || `analysis_${Date.now()}`,
        name: metadata.name || 'Unnamed Analysis',
        description: metadata.description || `Analysis of ${analysisData.summary?.subreddits?.join(', ')} with ${analysisData.summary?.totalComments || 0} comments`,
        generated_at: new Date().toISOString(),
        subreddits: analysisData.summary?.subreddits || [],
        totalPosts: analysisData.summary?.totalPosts || 0,
        totalComments: analysisData.summary?.totalComments || 0,
        dateRange: analysisData.summary?.dateRange || { startDate: '', endDate: '' },
        data: {
            // Strip out the actual post content to save space, keep just metadata
            posts: analysisData.posts?.slice(0, 10).map(post => ({
                id: post.id,
                title: post.title,
                subreddit: post.subreddit,
                score: post.score,
                num_comments: post.num_comments,
                created_utc: post.created_utc,
                comments: post.comments?.slice(0, 3).map(comment => ({
                    id: comment.id,
                    body: comment.body?.substring(0, 200) + '...', // Truncate for demo
                    score: comment.score,
                    author: comment.author
                })) || []
            })) || [],
            analysis: analysisData.analysis,
            summary: analysisData.summary,
            aiModel: analysisData.aiModel
        }
    };

    // Convert to TypeScript format
    const tsContent = `// Generated analysis: ${staticAnalysis.name}
export const ${staticAnalysis.id} = ${JSON.stringify(staticAnalysis, null, 2)};`;

    // Save to a separate file for manual inclusion
    const outputPath = path.join(__dirname, 'client', 'src', 'data', 'exported', `${staticAnalysis.id}.ts`);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, tsContent);

    console.log(`✅ Analysis exported to: ${outputPath}`);
    console.log(`📋 To add to sampleAnalyses.ts:`);
    console.log(`1. Import: import { ${staticAnalysis.id} } from './exported/${staticAnalysis.id}';`);
    console.log(`2. Add to sampleAnalyses array: ${staticAnalysis.id},`);

    return staticAnalysis;
}

// Example usage - you would call this after completing an analysis:
/*
const yourAnalysisData = {
    posts: [...], // Your complete analysis data
    analysis: {...},
    summary: {...},
    aiModel: 'claude'
};

const metadata = {
    id: 'worldnews_comprehensive_jan2024',
    name: 'WorldNews Deep Analysis - January 2024',
    description: 'Comprehensive analysis of 50 WorldNews posts with 3000+ comments examining global sentiment trends'
};

exportAnalysisToStatic(yourAnalysisData, metadata);
*/

module.exports = { exportAnalysisToStatic };