// Extract LITE sample analyses - reduced size for performance
const fs = require('fs');
const path = require('path');

const serverDataPath = path.join(__dirname, 'server', 'data', 'analyses.json');
const clientDataPath = path.join(__dirname, 'client', 'src', 'data', 'sampleAnalyses.ts');

function extractSamplesLite() {
    try {
        console.log('📖 Reading server analyses...');
        const serverAnalyses = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));

        console.log(`📊 Found ${serverAnalyses.length} server analyses`);

        // Create ULTRA-LITE versions - keep stats but minimal content
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
                // Keep ALL analysis insights and statistics
                summary: analysis.data.summary || analysis.summary,
                analysis: analysis.data.analysis,
                // Keep minimal sample data for UI - just enough to show the interface works
                posts: (analysis.data.posts || []).slice(0, 1).map(post => ({
                    id: post.id,
                    title: post.title ? post.title.substring(0, 100) + '...' : 'Sample Post',
                    author: 'SampleUser',
                    subreddit: post.subreddit,
                    created: post.created,
                    url: '#',
                    score: post.score || 10,
                    num_comments: post.num_comments || 5,
                    sentiment: post.sentiment,
                    // Minimal comment sample
                    comments: [{
                        id: 'sample_comment',
                        author: 'SampleCommenter',
                        body: 'Sample comment to demonstrate the interface...',
                        created: post.created,
                        score: 5,
                        sentiment: post.sentiment
                    }]
                }))
            }
        }));

        console.log('✅ Selected analyses (LITE versions):');
        selectedAnalyses.forEach((analysis, i) => {
            console.log(`  ${i + 1}. ${analysis.name}`);
        });

        // Generate TypeScript file content
        const tsContent = `// Pre-generated sample analyses for static deployment (ULTRA-LITE VERSION)
// Minimal content size while preserving all statistics and insights

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

        console.log('💾 Writing LITE sample analyses to client...');
        fs.writeFileSync(clientDataPath, tsContent);

        // Check file size
        const stats = fs.statSync(clientDataPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('✅ Successfully created ULTRA-LITE sample analyses!');
        console.log(`📁 File: ${clientDataPath}`);
        console.log(`📊 Analyses: ${selectedAnalyses.length}`);
        console.log(`📦 File size: ${fileSizeInMB} MB (was 17 MB)`);
        console.log('✨ Preserved all statistics while reducing content!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

extractSamplesLite();