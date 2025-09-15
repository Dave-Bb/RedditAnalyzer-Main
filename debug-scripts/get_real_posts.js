// Quick script to get real Reddit posts for sample data
require('dotenv').config();
const redditService = require('./server/services/redditService');

async function getRealPosts() {
    try {
        console.log('🔍 Fetching real WorldNews posts...');

        // Get recent top posts from worldnews
        const posts = await redditService.fetchSubredditPosts('worldnews', 5, 'day');

        console.log(`📊 Found ${posts.length} posts`);

        if (posts.length > 0) {
            // Get comments for first few posts
            for (let i = 0; i < Math.min(3, posts.length); i++) {
                const post = posts[i];
                console.log(`🔍 Fetching comments for: "${post.title.substring(0, 50)}..."`);

                const comments = await redditService.fetchPostComments(post.id, post.subreddit, 50);
                post.comments = comments;

                console.log(`✅ Got ${comments.length} comments`);
            }

            // Output the posts in a format ready for copy-paste
            console.log('\n📋 COPY THIS INTO sampleAnalyses.ts:');
            console.log('posts: [');

            posts.slice(0, 3).forEach((post, index) => {
                console.log(`  {
    id: '${post.id}',
    title: ${JSON.stringify(post.title)},
    selftext: ${JSON.stringify(post.selftext || '')},
    score: ${post.score},
    num_comments: ${post.num_comments},
    created_utc: ${post.created_utc},
    subreddit: '${post.subreddit}',
    permalink: '${post.permalink}',
    url: ${JSON.stringify(post.url)},
    author: '${post.author}',
    comments: [`);

                (post.comments || []).slice(0, 3).forEach((comment, cIndex) => {
                    console.log(`      {
        id: '${comment.id}',
        body: ${JSON.stringify(comment.body)},
        score: ${comment.score},
        created_utc: ${comment.created_utc},
        author: '${comment.author}'
      }${cIndex < Math.min(2, post.comments.length - 1) ? ',' : ''}`);
                });

                console.log(`    ]
  }${index < Math.min(2, posts.length - 1) ? ',' : ''}`);
            });

            console.log('],');

        } else {
            console.log('❌ No posts found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

getRealPosts();