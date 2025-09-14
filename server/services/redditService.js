const axios = require('axios');

class RedditService {
  constructor() {
    this.baseURL = 'https://www.reddit.com';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');
      
      const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'User-Agent': process.env.REDDIT_USER_AGENT,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Reddit authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Reddit API');
    }
  }

  async fetchSubredditPosts(subreddit, limit = 50, timeframe = 'week') {
    await this.authenticate();

    try {
      const response = await axios.get(`https://oauth.reddit.com/r/${subreddit}/top`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': process.env.REDDIT_USER_AGENT
        },
        params: {
          limit: limit,
          t: timeframe,
          raw_json: 1
        }
      });

      return response.data.data.children.map(child => ({
        id: child.data.id,
        title: child.data.title,
        selftext: child.data.selftext,
        score: child.data.score,
        num_comments: child.data.num_comments,
        created_utc: child.data.created_utc,
        subreddit: child.data.subreddit,
        permalink: child.data.permalink,
        url: child.data.url,
        author: child.data.author
      }));
    } catch (error) {
      console.error(`Error fetching posts from r/${subreddit}:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch posts from r/${subreddit}`);
    }
  }

  async fetchPostComments(postId, subreddit, limit = 50) {
    await this.authenticate();

    try {
      const response = await axios.get(`https://oauth.reddit.com/r/${subreddit}/comments/${postId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': process.env.REDDIT_USER_AGENT
        },
        params: {
          limit: limit,
          raw_json: 1,
          sort: 'top'
        }
      });

      const comments = [];
      
      function extractComments(commentData) {
        if (commentData && commentData.data && commentData.data.body) {
          comments.push({
            id: commentData.data.id,
            body: commentData.data.body,
            score: commentData.data.score,
            created_utc: commentData.data.created_utc,
            author: commentData.data.author
          });
        }

        if (commentData.data && commentData.data.replies && commentData.data.replies.data) {
          commentData.data.replies.data.children.forEach(reply => {
            if (reply.kind === 't1') {
              extractComments(reply);
            }
          });
        }
      }

      if (response.data && response.data[1] && response.data[1].data) {
        response.data[1].data.children.forEach(comment => {
          if (comment.kind === 't1') {
            extractComments(comment);
          }
        });
      }

      return comments;
    } catch (error) {
      console.error(`Error fetching comments for post ${postId}:`, error.response?.data || error.message);
      return [];
    }
  }

  async fetchSubredditData(subreddits, startDate, endDate, postLimit = 50, progressCallback = null) {
    console.log(`Fetching posts from ${subreddits.length} subreddit(s) in parallel...`);

    let completedSubreddits = 0;

    // Fetch all subreddit posts in parallel with progress tracking
    const subredditPromises = subreddits.map(async (subreddit) => {
      try {
        console.log(`Fetching posts from r/${subreddit}...`);
        const posts = await this.fetchSubredditPosts(subreddit, postLimit);

        // Filter posts by date range
        const filteredPosts = posts.filter(post => {
          const postDate = new Date(post.created_utc * 1000);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return postDate >= start && postDate <= end;
        });

        // Update progress
        completedSubreddits++;
        if (progressCallback) {
          progressCallback({
            percentage: Math.floor((completedSubreddits / subreddits.length) * 50), // 0-50% for subreddit fetching
            subredditsProcessed: completedSubreddits,
            postsCollected: 0 // Will be updated later
          });
        }

        return { subreddit, posts: filteredPosts };
      } catch (error) {
        console.error(`Error processing subreddit r/${subreddit}:`, error.message);
        completedSubreddits++;
        if (progressCallback) {
          progressCallback({
            percentage: Math.floor((completedSubreddits / subreddits.length) * 50),
            subredditsProcessed: completedSubreddits,
            postsCollected: 0
          });
        }
        return { subreddit, posts: [] };
      }
    });

    const subredditResults = await Promise.all(subredditPromises);
    const allPosts = subredditResults.flatMap(result => result.posts);

    console.log(`Fetched ${allPosts.length} posts total. Now fetching comments in parallel...`);

    // Update progress after fetching posts
    if (progressCallback) {
      progressCallback({
        percentage: 50, // Posts fetched, now starting comments
        subredditsProcessed: subreddits.length,
        postsCollected: allPosts.length
      });
    }

    // Fetch comments for all posts in parallel with optimized concurrency
    const BATCH_SIZE = 10; // Increased from 5 to 10 for better speed
    const allPostsWithComments = [];

    for (let i = 0; i < allPosts.length; i += BATCH_SIZE) {
      const batch = allPosts.slice(i, i + BATCH_SIZE);

      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allPosts.length/BATCH_SIZE)} (${batch.length} posts)`);

      const batchPromises = batch.map(async (post) => {
        try {
          post.comments = await this.fetchPostComments(post.id, post.subreddit, 50); // Increased from 25 to 50
          return post;
        } catch (error) {
          console.error(`Error fetching comments for post ${post.id}:`, error.message);
          post.comments = [];
          return post;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allPostsWithComments.push(...batchResults);

      // Update progress after each batch
      if (progressCallback) {
        const commentsProgress = Math.floor((allPostsWithComments.length / allPosts.length) * 50); // 50-100% for comments
        progressCallback({
          percentage: 50 + commentsProgress,
          subredditsProcessed: subreddits.length,
          postsCollected: allPostsWithComments.length
        });
      }

      // Minimal delay only for very large batches to avoid overwhelming Reddit
      if (i + BATCH_SIZE < allPosts.length && allPosts.length > 20) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 500ms to 200ms
      }
    }

    console.log(`Completed fetching comments for ${allPostsWithComments.length} posts`);

    // Final progress update
    if (progressCallback) {
      progressCallback({
        percentage: 100,
        subredditsProcessed: subreddits.length,
        postsCollected: allPostsWithComments.length
      });
    }

    return { posts: allPostsWithComments };
  }

  async testConnection() {
    try {
      if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
        return { success: false, message: 'Reddit API credentials not set' };
      }

      await this.authenticate();
      
      // Test with a simple request to r/test
      const response = await axios.get('https://oauth.reddit.com/r/test/hot', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': process.env.REDDIT_USER_AGENT
        },
        params: { limit: 1 }
      });

      return { 
        success: true, 
        message: 'Reddit API connection successful',
        details: `Retrieved ${response.data.data.children.length} posts from r/test`
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Reddit API test failed: ${error.response?.data?.message || error.message}`
      };
    }
  }
}

module.exports = new RedditService();