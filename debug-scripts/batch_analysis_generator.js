// Overnight Batch Analysis Generator
// Generates multiple comprehensive analyses automatically for static site content
// Run: node batch_analysis_generator.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// SHOWCASE MODE: TEST CONFIGURATION
// Single test analysis to verify everything works end-to-end
const ANALYSIS_CONFIG = [
    {
        id: 'worldnews_batch_test',
        name: 'WorldNews Batch Test - 5 Posts',
        description: 'Simple test of batch analysis system with 5 AskReddit posts',
        subreddits: ['AskReddit'],
        postLimit: 5,
        dateRange: {
            startDate: '2024-01-01',
            endDate: '2025-12-31'
        }
    }
    // FULL SHOWCASE ANALYSES (commented out for testing)
    // Uncomment these once test analysis passes:
    /*
    {
        id: 'trump_election_victory_comparison',
        name: 'Trump Election Victory - Conservative vs Democrat Reaction',
        description: 'Comparative sentiment analysis between Conservative and Democrat communities after Trump\'s 2024 election victory',
        subreddits: ['Conservative', 'democrats'],
        postLimit: 30,
        dateRange: {
            startDate: '2024-11-06',
            endDate: '2024-11-12'
        }
    },
    {
        id: 'got_season8_disaster',
        name: 'Game of Thrones Season 8 Meltdown',
        description: 'Community reaction to Game of Thrones Season 8 premiere',
        subreddits: ['gameofthrones'],
        postLimit: 40,
        dateRange: {
            startDate: '2019-04-10',
            endDate: '2019-04-20'
        }
    },
    {
        id: 'ukraine_invasion_worldnews',
        name: 'Ukraine Invasion - World News Reaction',
        description: 'Global community reaction to Russia\'s invasion of Ukraine',
        subreddits: ['worldnews'],
        postLimit: 50,
        dateRange: {
            startDate: '2022-02-20',
            endDate: '2022-03-05'
        }
    }
    */
];

const API_URL = 'http://localhost:3001';
const DELAY_BETWEEN_ANALYSES = 2 * 60 * 1000; // 2 minutes between analyses
const MAX_RETRIES = 3;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function logStep(step, message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${step}: ${message}`);
}

async function runSingleAnalysis(config, index) {
    logStep('START', `Starting analysis: ${config.name}`);
    console.log(`📊 Subreddits: ${config.subreddits.join(', ')}`);
    console.log(`📅 Date Range: ${config.dateRange.startDate} to ${config.dateRange.endDate}`);
    console.log(`📝 Post Limit: ${config.postLimit} per subreddit`);

    // Estimate potential data size
    const estimatedPosts = config.subreddits.length * config.postLimit;
    const estimatedComments = estimatedPosts * 20; // Rough estimate
    logStep('ESTIMATE', `📈 Expected: ~${estimatedPosts} posts, ~${estimatedComments} comments`);
    logStep('ESTIMATE', `⏱️  Estimated time: ${Math.round(estimatedComments / 100)} - ${Math.round(estimatedComments / 50)} minutes`);

    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            const startTime = Date.now();

            logStep('API_CALL', 'Sending analysis request to server...');

            // Set up progress tracking with interval logging
            const progressInterval = setInterval(() => {
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                const maxTime = 30 * 60; // 30 minutes = 1800 seconds
                const remaining = Math.max(0, maxTime - elapsed);
                const progressPercent = Math.round((elapsed / maxTime) * 100);
                const minutes = Math.round(elapsed / 60);

                if (elapsed < 120) {
                    logStep('PROGRESS', `🔄 Reddit data fetch in progress... ${minutes}m elapsed`);
                } else if (elapsed < 600) {
                    logStep('PROGRESS', `🤖 AI sentiment analysis in progress... ${minutes}m elapsed (${progressPercent}% of timeout)`);
                } else if (elapsed < 1500) {
                    logStep('PROGRESS', `⚡ Processing large dataset... ${minutes}m elapsed (${Math.round(remaining/60)}m remaining)`);
                } else {
                    logStep('WARNING', `🚨 Massive analysis in progress... ${minutes}m elapsed (${Math.round(remaining/60)}m until timeout!)`);
                }
            }, 30000); // Log every 30 seconds for long analyses

            const response = await axios.post(`${API_URL}/api/analyze`, {
                subreddits: config.subreddits,
                startDate: config.dateRange.startDate,
                endDate: config.dateRange.endDate,
                postLimit: config.postLimit,
                selectedModel: 'claude'
            }, {
                timeout: 30 * 60 * 1000 // 30 minute timeout for massive analyses
            });

            clearInterval(progressInterval);
            logStep('API_SUCCESS', 'Analysis request completed!');

            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000);

            if (response.data.success) {
                const data = response.data.data;

                logStep('ANALYSIS_COMPLETE', `Analysis completed in ${duration}s`);
                logStep('RESULTS', `Found ${data.summary.totalPosts} posts, ${data.summary.totalComments} comments`);

                if (data.summary.totalPosts === 0) {
                    logStep('WARNING', 'No posts found - check date ranges and subreddit names');
                }

                // Save the analysis
                logStep('SAVING', 'Saving analysis data...');
                await saveAnalysisAsStatic(data, config, duration);

                // Generate synthetic post
                logStep('SYNTHETIC', 'Generating synthetic post...');
                await generateSyntheticPostForAnalysis(data, config);

                logStep('SUCCESS', `Analysis "${config.name}" completed successfully!`);
                return { success: true, data, duration };
            } else {
                throw new Error(response.data.error || 'Analysis failed');
            }

        } catch (error) {
            if (typeof progressInterval !== 'undefined') {
                clearInterval(progressInterval);
            }
            retries++;
            logStep('ERROR', `Attempt ${retries} failed: ${error.message}`);

            if (retries < MAX_RETRIES) {
                logStep('RETRY', `Waiting 5s before retry...`);
                await sleep(5000);
            } else {
                logStep('FAILED', `Max retries reached for ${config.name}`);
                return { success: false, error: error.message };
            }
        }
    }
}

async function generateSyntheticPostForAnalysis(analysisData, config) {
    try {
        logStep('SYNTHETIC_START', 'Creating synthetic post with Claude AI...');

        // Prepare data for synthetic post generation
        const cleanData = {
            subreddit: analysisData.summary.subreddits[0] || 'example',
            sample_posts: analysisData.posts?.slice(0, 3).map(post => ({
                title: post.title,
                author: post.author || `user${Math.floor(Math.random() * 999)}`,
                body: post.selftext?.substring(0, 400) || '',
                score: post.score,
                num_comments: post.num_comments,
                comments: post.comments?.slice(0, 2).map(comment => ({
                    author: comment.author || `commenter${Math.floor(Math.random() * 999)}`,
                    body: comment.body?.substring(0, 150) || '',
                    score: comment.score
                })) || []
            })) || []
        };

        logStep('SYNTHETIC_API', 'Calling synthetic post generation API...');
        const response = await axios.post(`${API_URL}/api/generate-synthetic-post`, {
            data: cleanData
        });

        if (response.data) {
            // Add synthetic post to analysis data
            analysisData.analysis.synthetic_post = {
                ...response.data,
                generated_at: new Date().toISOString(),
                version: 1
            };

            // Convert overall_analysis to overall_sentiment to match client expectations
            if (analysisData.analysis.overall_analysis && !analysisData.analysis.overall_sentiment) {
                analysisData.analysis.overall_sentiment = analysisData.analysis.overall_analysis;
                delete analysisData.analysis.overall_analysis;
            }
            logStep('SYNTHETIC_SUCCESS', 'Synthetic post generated and added to analysis');
        }

    } catch (error) {
        logStep('SYNTHETIC_ERROR', `Failed to generate synthetic post: ${error.message}`);
        // Continue without synthetic post - not critical
    }
}

async function saveAnalysisAsStatic(analysisData, config, duration) {
    logStep('SAVE_START', 'Preparing analysis data for static deployment...');

    // Fix the analysis data format to match what the client expects
    let fixedAnalysis = { ...analysisData.analysis };

    // Convert overall_analysis to overall_sentiment if needed (server sometimes returns wrong format)
    if (fixedAnalysis.overall_analysis && !fixedAnalysis.overall_sentiment) {
        fixedAnalysis.overall_sentiment = fixedAnalysis.overall_analysis;
        delete fixedAnalysis.overall_analysis;
    }

    const staticAnalysis = {
        id: config.id,
        name: config.name,
        description: `${config.description} (Generated in ${duration}s with ${analysisData.summary.totalComments} comments analyzed)`,
        generated_at: new Date().toISOString(),
        subreddits: config.subreddits,
        totalPosts: analysisData.summary.totalPosts,
        totalComments: analysisData.summary.totalComments,
        dateRange: config.dateRange,
        generationTime: duration,
        data: {
            // Keep first 5 posts with full data for showcase
            posts: analysisData.posts?.slice(0, 5).map(post => ({
                id: post.id,
                title: post.title,
                subreddit: post.subreddit,
                score: post.score,
                num_comments: post.num_comments,
                created_utc: post.created_utc,
                author: post.author,
                permalink: post.permalink,
                url: post.url,
                selftext: post.selftext?.substring(0, 500) + (post.selftext?.length > 500 ? '...' : ''),
                comments: post.comments?.slice(0, 8).map(comment => ({
                    id: comment.id,
                    body: comment.body?.substring(0, 300) + (comment.body?.length > 300 ? '...' : ''),
                    score: comment.score,
                    author: comment.author,
                    created_utc: comment.created_utc
                })) || []
            })) || [],
            analysis: fixedAnalysis,  // Use the fixed analysis format
            summary: analysisData.summary,
            aiModel: analysisData.aiModel
        }
    };

    // Save individual analysis file
    const outputDir = path.join(__dirname, 'client', 'src', 'data', 'generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${config.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(staticAnalysis, null, 2));
    logStep('SAVE_FILE', `Saved to: ${outputPath}`);

    // ALSO save to server storage for backup/resume capability
    try {
        await axios.post(`${API_URL}/api/analyses`, {
            id: config.id,
            name: config.name,
            description: config.description,
            generated_at: new Date().toISOString(),
            data: analysisData
        });
        logStep('SAVE_SERVER', 'Also saved to server storage for backup');
    } catch (error) {
        logStep('SAVE_WARNING', `Server storage failed: ${error.message} (static file still saved)`);
    }
}

async function generateStaticAnalysesIndex(results) {
    logStep('INDEX_START', 'Generating static analyses index...');

    const successful = results.filter(r => r.success);

    const indexContent = `// Auto-generated static analyses
// Generated on: ${new Date().toISOString()}
// Success rate: ${successful.length}/${results.length}

import { AnalysisData } from '../types';

export interface StaticAnalysis {
  id: string;
  name: string;
  description: string;
  generated_at: string;
  subreddits: string[];
  totalPosts: number;
  totalComments: number;
  dateRange: { startDate: string; endDate: string };
  generationTime: number;
  data: AnalysisData;
}

// Import all generated analyses
${ANALYSIS_CONFIG.map(config =>
    `import ${config.id} from './generated/${config.id}.json';`
).join('\n')}

export const staticAnalyses: StaticAnalysis[] = [
${ANALYSIS_CONFIG.map(config => `  ${config.id}`).join(',\n')}
];

export const getStaticAnalysis = (id: string): StaticAnalysis | undefined => {
  return staticAnalyses.find(analysis => analysis.id === id);
};

export const getAllStaticAnalyses = () => {
  return staticAnalyses.map(({ data, ...metadata }) => metadata);
};

// Statistics
export const analysisStats = {
  totalAnalyses: ${successful.length},
  totalPosts: ${successful.reduce((sum, r) => sum + (r.data?.summary?.totalPosts || 0), 0)},
  totalComments: ${successful.reduce((sum, r) => sum + (r.data?.summary?.totalComments || 0), 0)},
  avgGenerationTime: ${Math.round(successful.reduce((sum, r) => sum + (r.duration || 0), 0) / successful.length)}
};`;

    const indexPath = path.join(__dirname, 'client', 'src', 'data', 'staticAnalyses.ts');
    fs.writeFileSync(indexPath, indexContent);

    logStep('INDEX_COMPLETE', `Index generated: ${indexPath}`);
}

async function runBatchAnalysis() {
    console.log('🚀 SHOWCASE BATCH ANALYSIS GENERATOR');
    console.log('=====================================');

    // Get completed analyses for resume capability
    const completed = await getCompletedAnalyses();
    const remaining = ANALYSIS_CONFIG.filter(config => !completed.includes(config.id));

    console.log(`📊 Total analyses configured: ${ANALYSIS_CONFIG.length}`);
    console.log(`✅ Already completed: ${completed.length}`);
    console.log(`🔄 Remaining to process: ${remaining.length}`);
    if (remaining.length > 0) {
        console.log(`⏱️  Estimated time: ${Math.round((remaining.length * 5 + (remaining.length - 1) * 2))} minutes`);
    }
    console.log('=====================================\n');

    if (remaining.length === 0) {
        logStep('COMPLETE', 'All analyses already completed!');
        return;
    }

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < remaining.length; i++) {
        const config = remaining[i];
        const originalIndex = ANALYSIS_CONFIG.findIndex(c => c.id === config.id);

        logStep('PROCESS', `[${i + 1}/${remaining.length}] Processing: ${config.name}`);
        console.log('-------------------------------------');

        const result = await runSingleAnalysis(config, originalIndex);
        results.push({ ...result, config });

        console.log('-------------------------------------');
        logStep('COMPLETE', `Analysis ${i + 1}/${remaining.length} finished`);

        // Delay between analyses (except for the last one)
        if (i < remaining.length - 1) {
            logStep('WAIT', `Waiting ${DELAY_BETWEEN_ANALYSES / 1000}s before next analysis...`);
            await sleep(DELAY_BETWEEN_ANALYSES);
            console.log('');
        }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
    const successful = results.filter(r => r.success);

    console.log('\n=====================================');
    logStep('BATCH_COMPLETE', 'BATCH ANALYSIS COMPLETE!');
    console.log(`⏱️  Total time: ${totalTime} minutes`);
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`📊 Total posts analyzed: ${successful.reduce((sum, r) => sum + (r.data?.summary?.totalPosts || 0), 0)}`);
    console.log(`💬 Total comments analyzed: ${successful.reduce((sum, r) => sum + (r.data?.summary?.totalComments || 0), 0)}`);

    if (successful.length > 0) {
        await generateStaticAnalysesIndex(results);
        logStep('DEPLOY', 'Ready for deployment! All analyses saved as static files.');
    }

    // Log any failures
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
        console.log('\n❌ Failed analyses:');
        failed.forEach(f => logStep('FAILED', `${f.config.name}: ${f.error}`));
    }
    console.log('=====================================');
}

// Check if server is running
async function checkServerStatus() {
    try {
        await axios.get(`${API_URL}/api/health`);
        return true;
    } catch (error) {
        return false;
    }
}

// Check which analyses have already been completed (for resume capability)
async function getCompletedAnalyses() {
    const completed = [];

    // Check generated files
    const outputDir = path.join(__dirname, 'client', 'src', 'data', 'generated');
    if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const analysisId = file.replace('.json', '');
                completed.push(analysisId);
            }
        }
    }

    return completed;
}

// Main execution
async function main() {
    logStep('INIT', 'Starting Showcase Batch Analysis Generator...');
    logStep('CHECK', 'Checking server status...');

    if (!(await checkServerStatus())) {
        console.log('❌ Server not running on localhost:3001');
        console.log('Please start the server with: npm run dev');
        process.exit(1);
    }

    logStep('SERVER', 'Server is running and ready');

    // Check for completed analyses (resume capability)
    const completed = await getCompletedAnalyses();
    if (completed.length > 0) {
        logStep('RESUME', `Found ${completed.length} completed analyses: ${completed.join(', ')}`);
        logStep('RESUME', 'Will skip these and continue with remaining analyses');
    }
    console.log('');

    await runBatchAnalysis();
}

// Run the batch generator
if (require.main === module) {
    main().catch(error => {
        logStep('FATAL', `Fatal error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}

module.exports = { runBatchAnalysis, ANALYSIS_CONFIG };