const redditService = require('./server/services/redditService');

async function debugRedditFetching() {
    console.log('🔍 Debug: Testing Reddit comment fetching...');

    try {
        // Test with a known active subreddit
        const subreddit = 'news';
        const posts = await redditService.fetchSubredditPosts(subreddit, 10);

        console.log(`📝 Found ${posts.length} posts in r/${subreddit}`);

        for (const post of posts.slice(0, 3)) { // Test first 3 posts only
            console.log(`\n🏷️  Post: "${post.title}"`);
            console.log(`📊 Post reports ${post.num_comments} comments`);

            const comments = await redditService.fetchPostComments(post.id, post.subreddit, 200);
            console.log(`✅ Actually fetched ${comments.length} comments`);

            if (comments.length < post.num_comments) {
                console.log(`⚠️  Missing ${post.num_comments - comments.length} comments - possible issue with 'more' fetching`);
            }
        }
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugRedditFetching();