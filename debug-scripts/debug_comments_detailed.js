require('dotenv').config();
const redditService = require('./server/services/redditService');

async function debugCommentFetching() {
    console.log('🔍 DETAILED COMMENT DEBUG TEST');
    console.log('================================');

    try {
        // Get WorldNews posts
        console.log('\n📝 Step 1: Fetching WorldNews posts...');
        const posts = await redditService.fetchSubredditPosts('worldnews', 5);
        console.log(`✅ Found ${posts.length} posts`);

        if (posts.length === 0) {
            console.log('❌ No posts found! Authentication or API issue.');
            return;
        }

        // Test the first few posts
        for (let i = 0; i < Math.min(3, posts.length); i++) {
            const post = posts[i];
            console.log(`\n🏷️  POST ${i+1}: "${post.title.substring(0, 50)}..."`);
            console.log(`📊 Reddit reports: ${post.num_comments} comments`);

            // Manually fetch comments with detailed logging
            console.log(`🔍 Fetching comments for post ID: ${post.id}...`);

            const startTime = Date.now();
            const comments = await redditService.fetchPostComments(post.id, post.subreddit, 200);
            const endTime = Date.now();

            console.log(`✅ Actually fetched: ${comments.length} comments (took ${endTime - startTime}ms)`);

            if (comments.length === 0) {
                console.log('❌ NO COMMENTS FETCHED! This is the problem.');
            } else if (comments.length < post.num_comments / 2) {
                console.log(`⚠️  MISSING COMMENTS: Got ${comments.length} but expected ~${post.num_comments}`);
                console.log(`📋 Sample comment: "${comments[0]?.body?.substring(0, 100)}..."`);
            } else {
                console.log('✅ Good comment fetch ratio');
            }

            // Small delay between posts
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n🎯 SUMMARY:');
        console.log('If you see "NO COMMENTS FETCHED" or very low numbers,');
        console.log('the issue is in fetchPostComments() method.');

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.status, error.response.data);
        }
    }
}

// Run the debug
debugCommentFetching().catch(console.error);