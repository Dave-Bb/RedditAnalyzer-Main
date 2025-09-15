// Script to run a real analysis and save it as sample data
require('dotenv').config();
const fs = require('fs');

async function runAndSaveRealAnalysis() {
    try {
        console.log('🔍 Running real analysis via UI...');
        console.log('Please run an analysis through your UI, then I\'ll help you save it.');
        console.log('');
        console.log('INSTRUCTIONS:');
        console.log('1. Go to your browser');
        console.log('2. Run a WorldNews analysis with 5 posts');
        console.log('3. Let it complete with real data');
        console.log('4. When done, go to browser dev tools (F12)');
        console.log('5. In Console, paste this code:');
        console.log('');
        console.log('// Copy the current analysis data');
        console.log('console.log("COPY_ANALYSIS_START");');
        console.log('console.log(JSON.stringify({');
        console.log('  posts: window.currentAnalysisData?.posts || [],');
        console.log('  analysis: window.currentAnalysisData?.analysis || {},');
        console.log('  summary: window.currentAnalysisData?.summary || {},');
        console.log('  aiModel: window.currentAnalysisData?.aiModel || "claude"');
        console.log('}, null, 2));');
        console.log('console.log("COPY_ANALYSIS_END");');
        console.log('');
        console.log('6. Copy the JSON output and save it to a file');
        console.log('7. I can then help you format it for the sample data');

    } catch (error) {
        console.error('Error:', error);
    }
}

runAndSaveRealAnalysis();