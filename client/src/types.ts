export interface AnalysisData {
  posts: RedditPost[];
  analysis: SentimentAnalysis;
  summary: {
    totalPosts: number;
    totalComments: number;
    subreddits: string[];
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  aiModel?: string; // Track which AI model was used for the analysis
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  permalink: string;
  url: string;
  author: string;
  comments: RedditComment[];
}

export interface RedditComment {
  id: string;
  body: string;
  score: number;
  created_utc: number;
  author: string;
}

export interface SentimentAnalysis {
  overall_sentiment: {
    average_score: number;
    sentiment_distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    dominant_themes: string[];
    key_emotions: string[];
    summary: string;
  };
  individual_scores: SentimentScore[];
  by_subreddit: {
    [subreddit: string]: {
      scores: number[];
      positive: number;
      neutral: number;
      negative: number;
      average_score: number;
      total_analyzed: number;
    };
  };
  timeline: TimelineData[];
  ai_insights?: {
    [subreddit: string]: string;
  };
  framework_analysis?: {
    success: boolean;
    analysis?: string;
    generated_at?: string;
    error?: string;
  };
  synthetic_post?: SyntheticPostData;
}

export interface SentimentScore {
  index: number;
  score: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  themes?: string[];
  emotions?: string[];
  source: {
    type: 'post_title' | 'post_body' | 'comment';
    postId: string;
    commentId?: string;
    subreddit: string;
  };
}

export interface TimelineData {
  date: string;
  average_score: number;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface SyntheticPostData {
  title: string;
  author: string;
  body: string;
  score: number;
  upvoteRatio: number;
  comments: SyntheticComment[];
  subreddit: string;
  timeAgo: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  generated_at?: string;
  version?: number;
}

export interface SyntheticComment {
  id: string;
  author: string;
  body: string;
  score: number;
  replies: SyntheticComment[];
  level: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}