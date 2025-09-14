import React, { useState, useEffect } from 'react';
import { AnalysisData, SyntheticPostData, SyntheticComment } from '../types';

// Simple hardcoded API URL for now
const API_URL = 'https://reddit-analyzer-api.fridayfeelingdev.workers.dev';

interface SyntheticPostProps {
  data: AnalysisData;
}



const SyntheticPost: React.FC<SyntheticPostProps> = ({ data }) => {
  const [syntheticPost, setSyntheticPost] = useState<SyntheticPostData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const extractVocabulary = (posts: any[]) => {
    const words = new Set<string>();
    const phrases = new Set<string>();
    
    posts.forEach(post => {
      // Extract key words from titles and content
      const text = (post.title + ' ' + post.selftext).toLowerCase();
      const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
      
      // Get meaningful words (longer than 3 chars, not common words)
      const meaningfulWords = cleanText.split(' ').filter(word => 
        word.length > 3 && 
        !['this', 'that', 'with', 'they', 'them', 'have', 'been', 'were', 'will', 'what', 'when', 'where', 'just', 'like', 'more', 'some', 'other'].includes(word)
      );
      
      meaningfulWords.forEach(word => words.add(word));
      
      // Extract 2-word phrases
      for (let i = 0; i < meaningfulWords.length - 1; i++) {
        phrases.add(meaningfulWords[i] + ' ' + meaningfulWords[i + 1]);
      }
    });
    
    return { words: Array.from(words), phrases: Array.from(phrases) };
  };

  const generateUsername = (vocabulary: any, sentiment: string) => {
    const prefixes = vocabulary.words.filter((w: string) => w.length < 8).slice(0, 10);
    const suffixes = ['2024', '2023', 'Fan', 'Guy', 'User', '_' + Math.floor(Math.random() * 999)];
    
    if (prefixes.length === 0) {
      return `User${Math.floor(Math.random() * 9999)}`;
    }
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return prefix.charAt(0).toUpperCase() + prefix.slice(1) + suffix;
  };





  const generateComment = (vocabulary: any, parentSentiment: string, level: number = 0, realComments: any[] = []): SyntheticComment => {
    const sentiments: ('positive' | 'negative' | 'neutral')[] = ['positive', 'negative', 'neutral'];
    const commentSentiment = level === 0 ? 
      (Math.random() > 0.3 ? parentSentiment : sentiments[Math.floor(Math.random() * sentiments.length)]) :
      sentiments[Math.floor(Math.random() * sentiments.length)];
    
    const keyWords = vocabulary.words.slice(0, 8);
    const phrases = vocabulary.phrases.slice(0, 5);
    
    const commentPatterns = {
      positive: [
        () => `Finally someone who actually gets it! The ${keyWords[0] || 'technical aspects'} are ${['brilliant', 'game-changing', 'revolutionary'][Math.floor(Math.random() * 3)]} and people are missing the bigger picture here.`,
        () => `This ${['completely changed my mind', 'is exactly what I needed to see', 'deserves way more attention'][Math.floor(Math.random() * 3)]}. ${phrases[0] || keyWords[1]} ${['makes perfect sense now', 'is actually genius', 'was ahead of its time'][Math.floor(Math.random() * 3)]}.`,
        () => `${['Absolutely this', 'Thank you', 'Finally'][Math.floor(Math.random() * 3)]}! I've been saying ${keyWords[0] || 'this'} for ${['months', 'years', 'forever'][Math.floor(Math.random() * 3)]}. The ${phrases[0] || keyWords[1]} really ${['separates the pros from amateurs', 'makes all the difference', 'is where the magic happens'][Math.floor(Math.random() * 3)]}.`
      ],
      negative: [
        () => `I have to ${['respectfully disagree', 'push back on this', 'call bullshit'][Math.floor(Math.random() * 3)]}. ${phrases[0] || keyWords[0]} ${['has major flaws', 'isn\'t as simple as that', 'completely ignores the real issues'][Math.floor(Math.random() * 3)]}.`,
        () => `This take is ${['way off', 'missing the point', 'frustratingly naive'][Math.floor(Math.random() * 3)]}. ${keyWords[0] || 'The reality'} is much more ${['complicated', 'problematic', 'concerning'][Math.floor(Math.random() * 3)]} than you're making it seem.`,
        () => `Nah, ${keyWords[0] || 'this'} is ${['overrated', 'overhyped', 'problematic'][Math.floor(Math.random() * 3)]}. ${phrases[0] || keyWords[1]} ${['creates more problems than it solves', 'is getting worse every year', 'needs a complete overhaul'][Math.floor(Math.random() * 3)]}.`
      ],
      neutral: [
        () => `Interesting perspective. Can you elaborate on ${phrases[0] || keyWords[0]}? I'm ${['genuinely curious', 'trying to understand', 'looking for more details'][Math.floor(Math.random() * 3)]} about the ${keyWords[1] || 'technical side'}.`,
        () => `I've seen ${keyWords[0] || 'this argument'} before but ${phrases[0] || keyWords[1]} ${['adds a new dimension', 'is worth considering', 'raises good questions'][Math.floor(Math.random() * 3)]}. What's your experience been with ${keyWords[2] || 'implementation'}?`,
        () => `Fair point about ${keyWords[0] || 'the issues'}. Though I think ${phrases[0] || keyWords[1]} ${['depends on the context', 'varies by situation', 'has other factors to consider'][Math.floor(Math.random() * 3)]}.`
      ]
    };
    
    const patterns = commentPatterns[commentSentiment as keyof typeof commentPatterns] || commentPatterns.neutral;
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      author: generateUsername(vocabulary, commentSentiment),
      body: selectedPattern(),
      score: commentSentiment === 'positive' ? Math.floor(Math.random() * 200) + 10 :
             commentSentiment === 'negative' ? Math.floor(Math.random() * 20) - 8 :
             Math.floor(Math.random() * 50) + 2,
      replies: [],
      level,
      sentiment: commentSentiment as 'positive' | 'negative' | 'neutral'
    };
  };

  const generateSyntheticPostWithAI = async () => {
    setIsGenerating(true);
    
    try {
      console.log('🤖 Starting synthetic post generation...');
      
      // Prepare clean data for AI - just like you did manually  
      const cleanData = {
        subreddit: data.summary.subreddits[0] || 'example',
        sample_posts: data.posts.slice(0, 8).map(post => ({
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
        }))
      };

      console.log(`📊 Prepared clean data: ${cleanData.sample_posts.length} posts from r/${cleanData.subreddit}`);
      console.log('🔗 Sending request to Claude API...');

      const response = await fetch(`${API_URL}/api/generate-synthetic-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: cleanData })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      console.log('✅ Received response from Claude API');
      const syntheticData = await response.json();
      console.log(`🎭 Generated synthetic post: "${syntheticData.title?.substring(0, 50)}..."`);
      
      // Save the synthetic post to the analysis data
      if (data.analysis) {
        data.analysis.synthetic_post = {
          ...syntheticData,
          generated_at: new Date().toISOString(),
          version: 1
        };
      }
      
      setSyntheticPost(syntheticData);
      console.log('💾 Synthetic post saved to analysis data');
      
    } catch (error) {
      console.error('❌ Failed to generate synthetic post:', error);
      
      // Check if it's an overloaded error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('overloaded') || errorMessage.includes('529')) {
        console.log('⏳ Claude API is overloaded, will retry automatically...');
        // Show a user-friendly message but still fall back
        setTimeout(() => {
          console.log('🔄 Retrying synthetic post generation...');
          generateSyntheticPostWithAI();
        }, 5000); // Retry after 5 seconds
      } else {
        console.log('🔄 Falling back to simple generation...');
        // Fall back to simple generation for other errors
        generateSimpleSyntheticPost();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSimpleSyntheticPost = () => {
    const themes = data.analysis.overall_analysis.dominant_themes;
    const avgSentiment = data.analysis.overall_analysis.average_score;
    const sentiment: 'positive' | 'negative' | 'neutral' = 
      avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral';
    
    const subreddit = data.summary.subreddits[0] || 'example';
    
    // Simple but effective generation
    const post: SyntheticPostData = {
      title: `Discussion: ${themes[0] || 'Community topic'} - what are your thoughts?`,
      author: `${themes[0]?.replace(/\s+/g, '')}Fan${Math.floor(Math.random() * 999)}`,
      body: `I've been thinking about ${themes[0] || 'this topic'} lately and wanted to get everyone's perspective. \n\nBased on recent ${themes[1] || 'developments'}, it seems like ${sentiment === 'positive' ? 'things are heading in a good direction' : sentiment === 'negative' ? 'there are some concerns' : 'the situation is complex'}.\n\nWhat has your experience been?`,
      score: Math.floor(Math.random() * 500) + 50,
      upvoteRatio: 0.7 + Math.random() * 0.2,
      comments: [],
      subreddit,
      timeAgo: `${Math.floor(Math.random() * 12) + 1} hours ago`,
      sentiment
    };
    
    // Generate simple comments
    const vocabulary = extractVocabulary(data.posts);
    const numComments = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < numComments; i++) {
      post.comments.push(generateComment(vocabulary, sentiment, 0, []));
    }
    
    // Save to analysis data
    if (data.analysis) {
      data.analysis.synthetic_post = {
        ...post,
        generated_at: new Date().toISOString(),
        version: 1
      };
    }
    
    setSyntheticPost(post);
  };

  const generateSyntheticPost = () => {
    // Try AI generation first, fall back to simple if it fails
    generateSyntheticPostWithAI();
  };

  const generateMoreComments = () => {
    if (!syntheticPost) return;
    
    setIsGenerating(true);
    setTimeout(() => {
      const vocabulary = extractVocabulary(data.posts);
      const realComments = data.posts.flatMap(p => p.comments || []);
      const newComments: SyntheticComment[] = [];
      const numNew = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < numNew; i++) {
        newComments.push(generateComment(vocabulary, syntheticPost.sentiment, 0, realComments));
      }
      
      setSyntheticPost(prev => prev ? {
        ...prev,
        comments: [...prev.comments, ...newComments]
      } : null);
      setIsGenerating(false);
    }, 800);
  };

  const generateReply = (parentId: string) => {
    if (!syntheticPost) return;
    
    const vocabulary = extractVocabulary(data.posts);
    const realComments = data.posts.flatMap(p => p.comments || []);
    
    const addReplyToComment = (comments: SyntheticComment[]): SyntheticComment[] => {
      return comments.map(comment => {
        if (comment.id === parentId) {
          const newReply = generateComment(vocabulary, comment.sentiment, comment.level + 1, realComments);
          return {
            ...comment,
            replies: [...comment.replies, newReply]
          };
        }
        return {
          ...comment,
          replies: addReplyToComment(comment.replies)
        };
      });
    };
    
    setSyntheticPost(prev => prev ? {
      ...prev,
      comments: addReplyToComment(prev.comments)
    } : null);
  };

  const toggleExpanded = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  useEffect(() => {
    // Check if synthetic post already exists in the analysis data
    if (data.analysis?.synthetic_post) {
      console.log('📄 Found existing synthetic post, loading...');
      setSyntheticPost(data.analysis.synthetic_post);
    } else {
      console.log('🆕 No existing synthetic post found, generating new one...');
      generateSyntheticPost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderComment = (comment: SyntheticComment) => (
    <div key={comment.id} className={`thread-comment level-${comment.level}`}>
      <div className="comment-voting">
        <div className="vote-arrow upvote small"></div>
        <div className="comment-score">{comment.score}</div>
        <div className="vote-arrow downvote small"></div>
      </div>
      
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-author">{comment.author}</span>
          <span className="comment-score-text">{comment.score} points</span>
          <span className="comment-time">{Math.floor(Math.random() * 6) + 1} hours ago</span>
        </div>
        
        <div className="comment-body">{comment.body}</div>
        
        <div className="comment-actions">
          <span className="action-link">permalink</span>
          <span className="action-link">save</span>
          <span className="action-link">parent</span>
          <span className="action-link">report</span>
          <span className="action-link">give gold</span>
          <button 
            className="action-link reply-btn"
            onClick={() => generateReply(comment.id)}
          >
            reply
          </button>
        </div>
        
        {comment.replies.length > 0 && (
          <div className="comment-replies">
            <button 
              className="toggle-replies"
              onClick={() => toggleExpanded(comment.id)}
            >
              {expandedComments.has(comment.id) ? '[-]' : '[+]'} {comment.replies.length} {comment.replies.length === 1 ? 'child' : 'children'}
            </button>
            {expandedComments.has(comment.id) && (
              <div className="replies-container">
                {comment.replies.map(renderComment)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!syntheticPost) {
    return (
      <div className="synthetic-post-container">
        <div className="synthetic-loading">
          <div className="loading-spinner"></div>
          <p>Generating synthetic post based on analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="synthetic-post-container">
      <div className="synthetic-header">
        <h3>🤖 Synthetic Reddit Thread</h3>
        <div className="synthetic-meta">
          <p>AI-generated typical discussion based on the analyzed community style and sentiment</p>
          {syntheticPost?.generated_at && (
            <p className="generation-time">
              Generated: {new Date(syntheticPost.generated_at).toLocaleString()}
            </p>
          )}
        </div>
        <button 
          className="regenerate-btn"
          onClick={generateSyntheticPost}
          disabled={isGenerating}
        >
          {data.analysis?.synthetic_post ? '🎲 Generate New Thread' : '🤖 Generate Thread'}
        </button>
      </div>

      <div className="reddit-thread old-reddit">
        {/* Post */}
        <div className="thread-post">
          <div className="post-voting">
            <div className="vote-arrow upvote"></div>
            <div className="post-score">{syntheticPost.score}</div>
            <div className="vote-arrow downvote"></div>
          </div>
          
          <div className="post-content">
            <div className="post-header">
              <span className="post-title">{syntheticPost.title}</span>
              <span className="post-meta">
                submitted {syntheticPost.timeAgo} by <span className="author">{syntheticPost.author}</span> to <span className="subreddit">r/{syntheticPost.subreddit}</span>
              </span>
            </div>
            
            <div className="post-body">
              {syntheticPost.body.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            
            <div className="post-actions">
              <span className="action-link">{syntheticPost.comments.length} comments</span>
              <span className="action-link">share</span>
              <span className="action-link">save</span>
              <span className="action-link">hide</span>
              <span className="action-link">report</span>
              <span className="upvote-ratio">{Math.round(syntheticPost.upvoteRatio * 100)}% upvoted</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="thread-comments">
          <div className="comments-sort">
            <span className="sort-label">sorted by:</span>
            <span className="sort-option active">best</span>
            <span className="sort-option">top</span>
            <span className="sort-option">new</span>
            <span className="sort-option">controversial</span>
            <span className="sort-option">old</span>
            <span className="sort-option">q&a</span>
            <button 
              className="generate-more-comments"
              onClick={generateMoreComments}
              disabled={isGenerating}
            >
              {isGenerating ? '⏳' : '💬+'}
            </button>
          </div>
          
          <div className="comments-list">
            {syntheticPost.comments.map(renderComment)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyntheticPost;