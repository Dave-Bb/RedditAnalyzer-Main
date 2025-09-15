// Extract MINIMAL sample analyses - keep stats but remove bulk data
const fs = require('fs');
const path = require('path');

const serverDataPath = path.join(__dirname, 'server', 'data', 'analyses.json');
const clientDataPath = path.join(__dirname, 'client', 'src', 'data', 'sampleAnalyses.ts');

function extractMinimalSamples() {
    try {
        console.log('📖 Reading server analyses...');
        const serverAnalyses = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));

        console.log(`📊 Found ${serverAnalyses.length} server analyses`);

        // Create MINIMAL versions - keep only what's needed for UI display
        const selectedAnalyses = serverAnalyses.map(analysis => ({
            id: analysis.id,
            name: analysis.name,
            description: analysis.description,
            generated_at: analysis.timestamp,
            subreddits: analysis.subreddits,
            totalPosts: analysis.summary.totalPosts,
            totalComments: analysis.summary.totalComments,
            dateRange: analysis.dateRange,
            data: {
                summary: analysis.data.summary || analysis.summary,
                analysis: {
                    // Match the correct TypeScript interface structure
                    overall_sentiment: {
                        average_score: analysis.data.analysis?.overall_analysis?.average_score || analysis.data.analysis?.overall_sentiment?.average_score || 0,
                        sentiment_distribution: analysis.data.analysis?.overall_analysis?.sentiment_distribution || analysis.data.analysis?.overall_sentiment?.sentiment_distribution || {
                            positive: 50, neutral: 30, negative: 20
                        },
                        dominant_themes: (analysis.data.analysis?.overall_analysis?.dominant_themes || analysis.data.analysis?.overall_sentiment?.dominant_themes || []).slice(0, 10),
                        key_emotions: (analysis.data.analysis?.overall_analysis?.key_emotions || analysis.data.analysis?.overall_sentiment?.key_emotions || []).slice(0, 8),
                        summary: analysis.data.analysis?.overall_sentiment?.summary || 'Sample analysis showing community sentiment patterns'
                    },
                    // Minimal required data for TypeScript compliance
                    individual_scores: [],
                    by_subreddit: {},
                    timeline: []
                },
                // Keep up to 10 sample posts for better UI display
                posts: (analysis.data.posts || []).slice(0, 10).map((post, i) => ({
                    id: post.id || `sample_post_${i}`,
                    title: post.title ? (post.title.length > 100 ? post.title.substring(0, 100) + '...' : post.title) : `Sample Post ${i + 1}`,
                    selftext: post.selftext ? (post.selftext.length > 200 ? post.selftext.substring(0, 200) + '...' : post.selftext) : '',
                    author: post.author || 'SampleUser',
                    subreddit: analysis.subreddits[0],
                    created_utc: post.created_utc || Math.floor(Date.now() / 1000),
                    permalink: post.permalink || `/r/${analysis.subreddits[0]}/comments/sample_${i}`,
                    url: post.url || '#',
                    score: post.score || (Math.floor(Math.random() * 100) + 10),
                    num_comments: post.num_comments || (Math.floor(Math.random() * 20) + 5),
                    // Keep 1-2 sample comments per post
                    comments: (post.comments || []).slice(0, 2).map((comment, ci) => ({
                        id: comment.id || `sample_comment_${i}_${ci}`,
                        author: comment.author || 'SampleCommenter',
                        body: comment.body ? (comment.body.length > 150 ? comment.body.substring(0, 150) + '...' : comment.body) : 'Sample comment text...',
                        created_utc: comment.created_utc || Math.floor(Date.now() / 1000),
                        score: comment.score || (Math.floor(Math.random() * 20) + 1)
                    }))
                }))
            }
        }));

        console.log('✅ Selected analyses (MINIMAL versions):');
        selectedAnalyses.forEach((analysis, i) => {
            console.log(`  ${i + 1}. ${analysis.name} (${analysis.totalPosts} posts, ${analysis.totalComments} comments)`);
        });

        // Generate TypeScript file content
        const tsContent = `// Pre-generated sample analyses for static deployment (MINIMAL VERSION)
// Optimized for Cloudflare - preserves statistics but minimal content

import { AnalysisData } from '../types';

export const sampleAnalyses: Array<{
  id: string;
  name: string;
  description: string;
  generated_at: string;
  subreddits: string[];
  totalPosts: number;
  totalComments: number;
  dateRange: { startDate: string; endDate: string };
  data: AnalysisData;
}> = ${JSON.stringify(selectedAnalyses, null, 2)};

export const getSampleAnalysis = (id: string) => {
  return sampleAnalyses.find(analysis => analysis.id === id);
};

export const getAllSampleAnalyses = () => {
  return sampleAnalyses.map(({ data, ...metadata }) => metadata);
};
`;

        console.log('💾 Writing MINIMAL sample analyses to client...');
        fs.writeFileSync(clientDataPath, tsContent);

        // Check file size
        const stats = fs.statSync(clientDataPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('✅ Successfully created MINIMAL sample analyses!');
        console.log(`📁 File: ${clientDataPath}`);
        console.log(`📊 Analyses: ${selectedAnalyses.length}`);
        console.log(`📦 File size: ${fileSizeInMB} MB (was 17 MB)`);
        console.log('🎯 Perfect for Cloudflare deployment!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

extractMinimalSamples();