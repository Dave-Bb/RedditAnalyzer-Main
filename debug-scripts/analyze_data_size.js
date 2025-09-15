// Analyze what's taking up space in the analysis data
const fs = require('fs');
const path = require('path');

const serverDataPath = path.join(__dirname, 'server', 'data', 'analyses.json');

function calculateSize(obj, name = '') {
    const str = JSON.stringify(obj);
    const sizeInBytes = Buffer.byteLength(str, 'utf8');
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(3);
    console.log(`${name}: ${sizeInMB} MB (${sizeInBytes} bytes)`);
    return sizeInBytes;
}

function analyzeDataSize() {
    console.log('📊 Analyzing data size breakdown...\n');

    const serverData = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));
    const serverAnalyses = Array.isArray(serverData) ? serverData : (serverData.analyses || []);

    console.log(`Total analyses: ${serverAnalyses.length}`);
    calculateSize(serverAnalyses, 'TOTAL FILE');

    if (serverAnalyses.length > 0) {
        const firstAnalysis = serverAnalyses[0];
        console.log('\n🔍 Breaking down first analysis:');

        // Analysis components
        calculateSize(firstAnalysis, 'Full first analysis');
        calculateSize(firstAnalysis.data, 'data section');
        calculateSize(firstAnalysis.data.analysis, 'analysis section');
        calculateSize(firstAnalysis.data.posts, 'posts section');
        calculateSize(firstAnalysis.data.summary, 'summary section');

        if (firstAnalysis.data.posts && firstAnalysis.data.posts.length > 0) {
            console.log('\n📝 Post analysis:');
            const firstPost = firstAnalysis.data.posts[0];
            calculateSize(firstPost, 'First post (full)');
            calculateSize(firstPost.comments, 'First post comments');
            calculateSize({...firstPost, comments: []}, 'First post (no comments)');

            if (firstPost.comments && firstPost.comments.length > 0) {
                console.log(`\n💬 Comment analysis (${firstPost.comments.length} comments):`);
                const avgCommentSize = calculateSize(firstPost.comments, 'All comments') / firstPost.comments.length;
                console.log(`Average comment size: ${(avgCommentSize / 1024).toFixed(1)} KB`);

                // Sample first few comments
                firstPost.comments.slice(0, 3).forEach((comment, i) => {
                    calculateSize(comment, `Comment ${i + 1}`);
                });
            }
        }

        // Count totals across all analyses
        console.log('\n📈 Totals across all analyses:');
        let totalPosts = 0;
        let totalComments = 0;

        serverAnalyses.forEach(analysis => {
            if (analysis.data && analysis.data.posts) {
                totalPosts += analysis.data.posts.length;
                analysis.data.posts.forEach(post => {
                    if (post.comments) {
                        totalComments += post.comments.length;
                    }
                });
            }
        });

        console.log(`Total posts across all analyses: ${totalPosts}`);
        console.log(`Total comments across all analyses: ${totalComments}`);
        console.log(`Average comments per post: ${(totalComments / totalPosts).toFixed(1)}`);
    }
}

analyzeDataSize();