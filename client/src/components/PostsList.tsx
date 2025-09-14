import React, { useState } from 'react';
import { RedditPost } from '../types';

interface PostsListProps {
  posts: RedditPost[];
}

const PostsList: React.FC<PostsListProps> = ({ posts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [filterSubreddit, setFilterSubreddit] = useState('');

  const subreddits = Array.from(new Set((posts || []).map(post => post.subreddit))).sort();

  const filteredAndSortedPosts = (posts || [])
    .filter(post => {
      const matchesSearch = !searchTerm || 
        post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.selftext || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubreddit = !filterSubreddit || post.subreddit === filterSubreddit;
      
      return matchesSearch && matchesSubreddit;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'comments':
          return b.num_comments - a.num_comments;
        case 'date':
          return b.created_utc - a.created_utc;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="posts-list">
      <div className="posts-controls">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={filterSubreddit}
            onChange={(e) => setFilterSubreddit(e.target.value)}
            className="filter-select"
          >
            <option value="">All Subreddits</option>
            {subreddits.map(subreddit => (
              <option key={subreddit} value={subreddit}>r/{subreddit}</option>
            ))}
          </select>
        </div>

        <div className="sort-controls">
          <label>Sort by: </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="score">Score (High to Low)</option>
            <option value="comments">Comments (High to Low)</option>
            <option value="date">Date (Newest First)</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="posts-stats">
        <p>Showing {filteredAndSortedPosts.length} of {posts.length} posts</p>
      </div>

      <div className="posts-grid">
        {filteredAndSortedPosts.map(post => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <div className="post-meta">
                <span className="subreddit-badge">r/{post.subreddit}</span>
                <span className="post-date">{formatDate(post.created_utc)}</span>
              </div>
              <div className="post-stats">
                <span className="score">↑ {post.score}</span>
                <span className="comments">💬 {post.num_comments}</span>
              </div>
            </div>

            <h3 className="post-title">
              <a 
                href={`https://reddit.com${post.permalink}`} 
                target="_blank" 
                rel="noopener noreferrer"
                title={post.title}
              >
                {truncateText(post.title, 120)}
              </a>
            </h3>

            {post.selftext && (
              <div className="post-content">
                <p>{truncateText(post.selftext, 200)}</p>
              </div>
            )}

            <div className="post-footer">
              <span className="author">by u/{post.author}</span>
              <span className="comments-count">
                {post.comments?.length || 0} comments analyzed
              </span>
            </div>

            {(post.comments?.length || 0) > 0 && (
              <div className="comments-preview">
                <h4>Top Comments:</h4>
                <div className="comments-list">
                  {(post.comments || [])
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(comment => (
                    <div key={comment.id} className="comment-preview">
                      <div className="comment-meta">
                        <span className="comment-score">↑ {comment.score}</span>
                        <span className="comment-author">u/{comment.author}</span>
                      </div>
                      <p className="comment-body">
                        {truncateText(comment.body, 150)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredAndSortedPosts.length === 0 && (
        <div className="no-posts">
          <p>No posts found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default PostsList;