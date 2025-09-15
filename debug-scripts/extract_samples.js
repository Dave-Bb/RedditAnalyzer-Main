// Extract sample analyses from server data for static deployment
const fs = require('fs');
const path = require('path');

const serverDataPath = path.join(__dirname, 'server', 'data', 'analyses.json');
const clientDataPath = path.join(__dirname, 'client', 'src', 'data', 'sampleAnalyses.ts');

function extractSamples() {
    try {
        console.log('📖 Reading server analyses...');
        const serverAnalyses = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));

        console.log(`📊 Found ${serverAnalyses.length} server analyses`);

        // Select ALL analyses for static deployment
        const selectedAnalyses = serverAnalyses.map(analysis => ({
            id: analysis.id,
            name: analysis.name,
            description: analysis.description,
            generated_at: analysis.timestamp,
            subreddits: analysis.subreddits,
            totalPosts: analysis.summary.totalPosts,
            totalComments: analysis.summary.totalComments,
            dateRange: analysis.dateRange,
            data: analysis.data
        }));

        console.log('✅ Selected analyses:');
        selectedAnalyses.forEach((analysis, i) => {
            console.log(`  ${i + 1}. ${analysis.name}`);
        });

        // Generate TypeScript file content
        const tsContent = `// Pre-generated sample analyses for static deployment
// These are real analyses that showcase the tool's capabilities

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

        console.log('💾 Writing sample analyses to client...');
        fs.writeFileSync(clientDataPath, tsContent);

        console.log('✅ Successfully created sample analyses for static deployment!');
        console.log(`📁 File: ${clientDataPath}`);
        console.log(`📊 Analyses: ${selectedAnalyses.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

extractSamples();