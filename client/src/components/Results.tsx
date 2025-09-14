import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnalysisData } from '../types';
import { API_ENDPOINTS } from '../config';
import SentimentChart from './SentimentChart';
import TimelineChart from './TimelineChart';
import SubredditComparison from './SubredditComparison';
import PostsList from './PostsList';
import SentimentHeatmap from './SentimentHeatmap';
import WordCloud from './WordCloud';
import SyntheticPost from './SyntheticPost';

interface ResultsProps {
  data: AnalysisData;
  onReanalysisStart?: (analysisId?: string) => void;
  onReanalysisComplete?: (data: AnalysisData) => void;
  onReanalysisError?: (error: string) => void;
  isReanalyzing?: boolean;
}


// Animated Counter Component
const AnimatedCounter: React.FC<{ value: number; duration?: number; decimals?: number; prefix?: string; suffix?: string }> = ({ 
  value, 
  duration = 2000, 
  decimals = 0, 
  prefix = '', 
  suffix = '' 
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentCount = easeOut * value;
      
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  const formatValue = (num: number) => {
    if (decimals === 0) {
      return Math.floor(num).toLocaleString();
    }
    return num.toFixed(decimals);
  };

  return <span>{prefix}{formatValue(count)}{suffix}</span>;
};

const Results: React.FC<ResultsProps> = ({
  data,
  onReanalysisStart,
  onReanalysisComplete,
  onReanalysisError,
  isReanalyzing = false
}) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    tags: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingFramework, setIsGeneratingFramework] = useState(false);
  const [isRegeneratingInsights, setIsRegeneratingInsights] = useState(false);
  const [apiStatus, setApiStatus] = useState({ hasClaude: false, hasOpenAI: false });
  const [showModelSelector, setShowModelSelector] = useState(false);

  const generateCleanedData = (data: AnalysisData) => {
    return {
      analysis_metadata: {
        subreddits: data.summary.subreddits,
        date_range: data.summary.dateRange,
        total_posts: data.summary.totalPosts,
        total_comments: data.summary.totalComments,
        overall_sentiment: data.analysis.overall_analysis.average_score,
        dominant_themes: data.analysis.overall_analysis.dominant_themes,
        key_emotions: data.analysis.overall_analysis.key_emotions
      },
      posts_sample: data.posts.slice(0, 20).map(post => ({
        id: post.id,
        title: post.title,
        score: post.score,
        num_comments: post.num_comments,
        subreddit: post.subreddit,
        created_utc: post.created_utc,
        selftext: post.selftext.substring(0, 300) + (post.selftext.length > 300 ? '...' : ''),
        top_comments: post.comments.slice(0, 5).map(comment => ({
          id: comment.id,
          body: comment.body.substring(0, 200) + (comment.body.length > 200 ? '...' : ''),
          score: comment.score,
          created_utc: comment.created_utc
        }))
      })),
      sentiment_patterns: {
        by_subreddit: data.analysis.by_subreddit,
        timeline: data.analysis.timeline,
        score_distribution: data.analysis.overall_analysis.sentiment_distribution
      },
      high_engagement_posts: data.posts
        .filter(post => post.score > 100 || post.num_comments > 50)
        .slice(0, 10)
        .map(post => ({
          title: post.title,
          score: post.score,
          num_comments: post.num_comments,
          subreddit: post.subreddit,
          top_comment_scores: post.comments.slice(0, 3).map(c => c.score)
        })),
      controversial_indicators: data.posts
        .filter(post => post.comments.length > 10)
        .slice(0, 10)
        .map(post => ({
          title: post.title,
          score: post.score,
          comment_count: post.comments.length,
          comment_score_variance: post.comments.map(c => c.score),
          subreddit: post.subreddit
        }))
    };
  };

  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `reddit_analysis_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const exportCSV = () => {
    const csvContent = [
      ['Date', 'Subreddit', 'Post Title', 'Sentiment Score', 'Sentiment', 'Post Score', 'Comments Count'],
      ...data.posts.map(post => [
        new Date(post.created_utc * 1000).toISOString().split('T')[0],
        post.subreddit,
        post.title.replace(/,/g, ';'),
        '',
        '',
        post.score,
        post.num_comments
      ])
    ].map(row => row.join(',')).join('\n');

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileDefaultName = `reddit_analysis_${new Date().toISOString().split('T')[0]}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSaveAnalysis = () => {
    const defaultName = `${data.summary.subreddits.join(', ')} - ${new Date().toLocaleDateString()}`;
    setSaveForm({
      name: defaultName,
      description: '',
      tags: ''
    });
    setShowSaveDialog(true);
  };

  const saveAnalysis = async () => {
    setIsSaving(true);
    try {
      const metadata = {
        name: saveForm.name.trim(),
        description: saveForm.description.trim(),
        tags: saveForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      };

      const response = await axios.post('http://localhost:3001/api/analyses', {
        analysisData: data,
        metadata
      });

      if (response.data.success) {
        setShowSaveDialog(false);
        alert('Analysis saved successfully!');
      }
    } catch (error: any) {
      console.error('Failed to save analysis:', error);
      alert('Failed to save analysis. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const retryFrameworkAnalysis = async () => {
    setIsGeneratingFramework(true);
    try {
      const response = await axios.post('http://localhost:3001/api/generate-framework-analysis', {
        analysisData: data
      });

      if (response.data.success) {
        // Update the data with the new framework analysis
        data.analysis.framework_analysis = response.data.framework_analysis;
        alert('Framework analysis generated successfully! The page will refresh to show the results.');
        window.location.reload();
      } else {
        alert('Failed to generate framework analysis: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Failed to retry framework analysis:', error);
      let errorMessage = 'Failed to generate framework analysis. ';

      if (error.response) {
        // Server responded with error status
        errorMessage += `Server error (${error.response.status}): ${error.response.data?.error || error.response.data?.message || 'Unknown server error'}`;
      } else if (error.request) {
        // Network error
        errorMessage += 'Network error - unable to reach server. Check if the server is running.';
      } else {
        // Other error
        errorMessage += `Error: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setIsGeneratingFramework(false);
    }
  };

  const retryAIInsights = async () => {
    setIsRegeneratingInsights(true);
    try {
      const response = await axios.post('http://localhost:3001/api/regenerate-claude-insights', {
        analysisData: data
      });

      if (response.data.success) {
        // Update the data with the new AI insights
        data.analysis.ai_insights = response.data.ai_insights;
        alert('Basic Subreddit Insights regenerated successfully! The page will refresh to show the results.');
        window.location.reload();
      } else {
        alert('Failed to regenerate insights: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Failed to retry claude insights:', error);
      let errorMessage = 'Failed to regenerate insights. ';

      if (error.response) {
        // Server responded with error status
        errorMessage += `Server error (${error.response.status}): ${error.response.data?.error || error.response.data?.message || 'Unknown server error'}`;
      } else if (error.request) {
        // Network error
        errorMessage += 'Network error - unable to reach server. Check if the server is running.';
      } else {
        // Other error
        errorMessage += `Error: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setIsRegeneratingInsights(false);
    }
  };

  // Check API status on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.SETTINGS);
        if (response.data.success) {
          setApiStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to check API status:', error);
      }
    };
    checkApiStatus();
  }, []);

  const handleReanalyze = () => {
    // Get user's preferred model from localStorage (same place Settings stores it)
    let preferredModel = 'claude'; // default
    try {
      const savedFormData = localStorage.getItem('apiFormData');
      if (savedFormData) {
        const parsedData = JSON.parse(savedFormData);
        // Check if there's a saved preferred model
        if (parsedData.preferredModel) {
          preferredModel = parsedData.preferredModel;
        }
      }
    } catch (e) {
      console.error('Error reading preferred model from localStorage:', e);
    }

    console.log(`🎯 User's saved preference: "${preferredModel}"`);

    if (preferredModel === 'claude' && apiStatus.hasClaude) {
      startReanalysis('claude');
    } else if (preferredModel === 'openai' && apiStatus.hasOpenAI) {
      startReanalysis('openai');
    } else if (apiStatus.hasClaude && apiStatus.hasOpenAI) {
      // Only show selector if preferred model isn't available
      setShowModelSelector(true);
    } else {
      // Fallback to whatever is available
      const model = apiStatus.hasClaude ? 'claude' : 'openai';
      startReanalysis(model);
    }
  };

  const startReanalysis = (model: string) => {
    const modelName = model === 'claude' ? 'Claude 3.5 Sonnet' : 'OpenAI GPT-4';

    if (!window.confirm(`Reanalyze this data using ${modelName}? This will regenerate all AI insights.`)) {
      setShowModelSelector(false);
      return;
    }

    setShowModelSelector(false);

    // Start performing reanalysis and notify parent with analysis ID
    performReanalysisWithId(model);
  };

  const performReanalysisWithId = async (model: string) => {
    // Call the parent's reanalysis start handler first
    if (onReanalysisStart) {
      onReanalysisStart();
    }

    await performReanalysis(model);
  };

  const performReanalysis = async (model: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let analysisId: string | null = null;
    try {
      // Get API keys from localStorage (same place Settings stores them)
      const savedFormData = localStorage.getItem('apiFormData');
      let apiKeys = {};
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          apiKeys = {
            claudeApiKey: parsedData.claudeApiKey,
            openaiApiKey: parsedData.openaiApiKey
          };
        } catch (e) {
          console.error('Error parsing saved form data:', e);
        }
      }

      const reanalysisRequest = {
        posts: data.posts,
        preferredModel: model,
        ...apiKeys // Include the API keys from localStorage
      };

      const response = await axios.post(API_ENDPOINTS.REANALYZE_CURRENT, reanalysisRequest);

      // Extract analysis ID from response if available
      if (response.data.analysisId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        analysisId = response.data.analysisId;
      }

      if (response.data.success) {
        // Call the parent's completion handler
        if (onReanalysisComplete) {
          onReanalysisComplete({
            ...data,
            analysis: response.data.analysis
          });
        }
      } else {
        if (onReanalysisError) {
          onReanalysisError('Failed to reanalyze: ' + (response.data.error || 'Unknown error'));
        }
      }
    } catch (error: any) {
      console.error('Failed to reanalyze:', error);
      let errorMessage = 'Failed to reanalyze. ';

      if (error.response) {
        errorMessage += `Server error (${error.response.status}): ${error.response.data?.error || 'Unknown server error'}`;
      } else if (error.request) {
        errorMessage += 'Network error - unable to reach server.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }

      if (onReanalysisError) {
        onReanalysisError(errorMessage);
      }
    }
  };


  return (
    <div className="results">
      {/* Hero Header */}
      <div className="hero-header">
        <div className="hero-left">
          <h2>📊 Analysis Results</h2>
          <div className="analyzed-subreddits" style={{textAlign: 'right'}}>
            <span className="subreddits-label">Analyzing:</span>
            <div className="subreddits-list">
              {data.summary.subreddits.map((subreddit, index) => (
                <span key={index} className="subreddit-badge">r/{subreddit}</span>
              ))}
            </div>
          </div>
          <p>Comprehensive sentiment analysis across {data.summary.subreddits.length} subreddit{data.summary.subreddits.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="hero-center">
          <div className="hero-metrics-grid">
            <div className="hero-metric">
              <div className="hero-metric-icon">🎯</div>
              <div className="hero-metric-content">
                <div className="hero-metric-value">
                  <AnimatedCounter
                    value={data.analysis.overall_analysis.average_score}
                    decimals={2}
                    duration={1500}
                  />
                </div>
                <div className="hero-metric-label">Sentiment</div>
              </div>
              <div className={`hero-metric-trend ${
                data.analysis.overall_analysis.average_score > 0.1 ? 'trend-positive' :
                data.analysis.overall_analysis.average_score < -0.1 ? 'trend-negative' : ''
              }`}>
                {data.analysis.overall_analysis.average_score > 0.1 ? '📈' :
                 data.analysis.overall_analysis.average_score < -0.1 ? '📉' : '➡️'}
              </div>
            </div>

            <div className="hero-metric">
              <div className="hero-metric-icon">📝</div>
              <div className="hero-metric-content">
                <div className="hero-metric-value">
                  <AnimatedCounter
                    value={data.summary.totalPosts}
                    duration={2000}
                  />
                </div>
                <div className="hero-metric-label">Posts</div>
              </div>
            </div>

            <div className="hero-metric">
              <div className="hero-metric-icon">💬</div>
              <div className="hero-metric-content">
                <div className="hero-metric-value">
                  <AnimatedCounter
                    value={data.summary.totalComments}
                    duration={2500}
                  />
                </div>
                <div className="hero-metric-label">Comments</div>
              </div>
            </div>

            <div className="hero-metric">
              <div className="hero-metric-icon">🏷️</div>
              <div className="hero-metric-content">
                <div className="hero-metric-value">
                  <AnimatedCounter
                    value={data.analysis.overall_analysis.dominant_themes.length}
                    duration={1000}
                  />
                </div>
                <div className="hero-metric-label">Themes</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="export-buttons">
            <button onClick={handleSaveAnalysis} className="save-btn">
              💾 Save Analysis
            </button>
            <button onClick={exportData} className="export-btn">
              📤 JSON
            </button>
            <button onClick={exportCSV} className="export-btn">
              📊 CSV
            </button>
            {!isReanalyzing ? (
              <button
                onClick={handleReanalyze}
                className="reanalyze-btn"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
                  transition: 'all 0.2s ease',
                  marginLeft: '8px'
                }}
              >
                🔄 Reanalyze with AI
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                <button
                  disabled
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'not-allowed',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  ⏳ Reanalyzing...
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Cancel the ongoing analysis? This will stop all AI API calls.')) {
                      try {
                        // Get active analyses and cancel them
                        const activeResponse = await axios.get('http://localhost:3001/api/active-analyses');
                        if (activeResponse.data.success && activeResponse.data.activeAnalyses.length > 0) {
                          // Cancel the most recent analysis (likely the reanalysis we started)
                          const mostRecent = activeResponse.data.activeAnalyses[0];
                          await axios.post('http://localhost:3001/api/cancel-analysis', {
                            analysisId: mostRecent.id
                          });

                          // Reset UI state
                          if (onReanalysisError) {
                            onReanalysisError('Analysis cancelled by user');
                          }

                          console.log('✅ Analysis cancelled successfully');
                        }
                      } catch (error) {
                        console.error('Failed to cancel analysis:', error);
                        alert('Failed to cancel analysis. Please try refreshing the page.');
                      }
                    }
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🛑 CANCEL
                </button>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Two-Column Grid Layout */}
      <div className="results-grid-layout">
        {/* Main Content (70% width) */}
        <div className="results-main-content">
          <div className="analysis-summary">
            <h3>📝 Summary</h3>
            <p>{data.analysis.overall_analysis.summary}</p>
          </div>

          <div className="tabs">
            <button
              className={activeTab === 'insights' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('insights')}
            >
              🔬 Framework Analysis
            </button>
            <button
              className={activeTab === 'overview' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('overview')}
            >
              📊 Charts & Metrics
            </button>
            <button
              className={activeTab === 'posts' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('posts')}
            >
              📝 Posts & Data
            </button>
            <button
              className={activeTab === 'synthetic' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('synthetic')}
            >
              🤖 AI Post
            </button>
          </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="tab-content-grid">
            <div className="charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <div>
                    <h3 className="chart-title">Sentiment Distribution</h3>
                    <p className="chart-subtitle">Overall community mood breakdown</p>
                  </div>
                </div>
                <SentimentChart data={data.analysis} />
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <div>
                    <h3 className="chart-title">Sentiment Over Time</h3>
                    <p className="chart-subtitle">How sentiment evolved during the analysis period</p>
                  </div>
                </div>
                <TimelineChart data={data.analysis.timeline} />
              </div>

              {data.summary.subreddits.length > 1 && (
                <div className="chart-container">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Community Comparison</h3>
                      <p className="chart-subtitle">How sentiment varies across different subreddits</p>
                    </div>
                  </div>
                  <SubredditComparison data={data.analysis.by_subreddit} />
                </div>
              )}

              <div className="chart-container">
                <SentimentHeatmap data={data.analysis.timeline} />
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="card-icon">🏷️</div>
                <h3 style={{margin: '0 0 1rem 0', color: '#333'}}>Dominant Themes</h3>
                <div className="tag-cloud">
                  {data.analysis.overall_analysis.dominant_themes.map((theme, index) => (
                    <span key={index} className="theme-tag large">{theme}</span>
                  ))}
                </div>
              </div>

              <div className="dashboard-card">
                <div className="card-icon">😊</div>
                <h3 style={{margin: '0 0 1rem 0', color: '#333'}}>Key Emotions</h3>
                <div className="tag-cloud">
                  {data.analysis.overall_analysis.key_emotions.map((emotion, index) => (
                    <span key={index} className="emotion-tag">{emotion}</span>
                  ))}
                </div>
              </div>
            </div>

            <WordCloud
              themes={data.analysis.overall_analysis.dominant_themes}
              emotions={data.analysis.overall_analysis.key_emotions}
            />
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="chart-container">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Actual Posts & Comments</h3>
                <p className="chart-subtitle">Real content from your analysis</p>
              </div>
            </div>
            <PostsList posts={data.posts} />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="framework-analysis">
            <div className="framework-intro">
              <h3>🔬 Advanced Framework Analysis</h3>
              <p>Deep community insights using the Reddit Sentiment Analysis Framework</p>
            </div>
            
            <div className="framework-sections">
              {data.analysis.framework_analysis?.success ? (
                <div className="framework-section">
                  <h4>🎯 Automated Framework Analysis</h4>
                  <div className="automated-analysis">
                    <div className="analysis-meta">
                      <span className="analysis-status success">✅ Analysis Complete</span>
                      <span className="analysis-time">
                        Generated: {new Date(data.analysis.framework_analysis.generated_at || '').toLocaleString()}
                      </span>
                    </div>
                    <div className="analysis-content">
                      {data.analysis.framework_analysis.analysis?.split('\n\n').map((section, index) => (
                        <div key={index} className="analysis-section">
                          {section.startsWith('**') ? (
                            <h5>{section.replace(/\*\*/g, '')}</h5>
                          ) : (
                            <p>{section}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="framework-section">
                  <h4>⚠️ Framework Analysis Unavailable</h4>
                  <div className="analysis-error">
                    <p>{data.analysis.framework_analysis?.error || 'This analysis was created before automatic framework analysis was available.'}</p>
                    <div className="framework-suggestion">
                      <p><strong>To get framework analysis for this data:</strong></p>
                      <ol>
                        <li>Save this analysis (if not already saved)</li>
                        <li>Go to the History tab and reload it</li>
                        <li>The "Generate Framework Analysis" button will be available</li>
                      </ol>
                    </div>
                    <div className="retry-section">
                      <button
                        className="retry-framework-btn"
                        onClick={retryFrameworkAnalysis}
                        disabled={isGeneratingFramework}
                      >
                        {isGeneratingFramework ? '🔄 Generating...' : '🔄 Retry Framework Analysis'}
                      </button>
                    </div>
                    <p>Or you can use the manual framework below:</p>
                  </div>
                </div>
              )}

              <details className="manual-framework">
                <summary>
                  <h4>📋 Manual Framework (Click to expand)</h4>
                </summary>
                <div className="framework-section">
                  <div className="framework-prompt">
                    <p><strong>Copy this prompt to Claude along with the cleaned data below:</strong></p>
                    <div className="prompt-box">
                      <p>"Using the Reddit Sentiment Analysis Framework, analyze this subreddit data comprehensively:</p>
                      <p><strong>1. COMMUNITY PROFILING:</strong><br/>
                      - What type of community is this? (dating/product/hobby/support/news)<br/>
                      - What are the main demographic indicators?<br/>
                      - What's the emotional baseline (cynical/optimistic/supportive/competitive)?</p>
                      <p><strong>2. PATTERN DISCOVERY:</strong><br/>
                      - What are the 3 most surprising sentiment patterns?<br/>
                      - Which topics generate the most controversy?<br/>
                      - What language choices predict success vs failure?</p>
                      <p><strong>3. TEMPORAL ANALYSIS:</strong><br/>
                      - How does sentiment change over time periods?<br/>
                      - Are there weekly/daily emotional cycles?<br/>
                      - What timing factors affect engagement?</p>
                      <p><strong>4. QUESTION GENERATION:</strong><br/>
                      Based on the analysis, generate 5 compelling comparison questions that would reveal unexpected insights about this community's dynamics."</p>
                    </div>
                  </div>

                  <div className="framework-section">
                    <h5>🧹 Cleaned Raw Data</h5>
                    <p>Essential data for analysis - copy this along with the framework prompt above:</p>
                    <div className="cleaned-data-container">
                      <button 
                        className="copy-data-btn"
                        onClick={() => {
                          const cleanedData = generateCleanedData(data);
                          navigator.clipboard.writeText(JSON.stringify(cleanedData, null, 2));
                          alert('Cleaned data copied to clipboard!');
                        }}
                      >
                        📋 Copy Cleaned Data
                      </button>
                      <pre className="cleaned-data-preview">
                        {JSON.stringify(generateCleanedData(data), null, 2).substring(0, 1500)}...
                        <span className="preview-note">[Click "Copy Cleaned Data" for full dataset]</span>
                      </pre>
                    </div>
                  </div>
                </div>
              </details>

              {data.analysis.ai_insights && (
                <div className="framework-section">
                  <h4>🤖 Basic Subreddit Insights</h4>
                  <div className="insights-grid">
                    {Object.entries(data.analysis.ai_insights).map(([subreddit, insight]) => {
                      const hasError = (insight as string).includes('Unable to generate insights') || (insight as string).includes('due to API error');

                      return (
                        <div key={subreddit} className="insight-section">
                          <h5>r/{subreddit}</h5>
                          <div className="insight-content">
                            {hasError ? (
                              <div className="insight-error">
                                <p className="error-message">{insight as string}</p>
                                <div className="retry-section">
                                  <button
                                    className="retry-insights-btn"
                                    onClick={retryAIInsights}
                                    disabled={isRegeneratingInsights}
                                  >
                                    {isRegeneratingInsights ? '🔄 Regenerating...' : '🔄 Retry Insights'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              (insight as string).split('\n').map((paragraph, index) => (
                                <p key={index}>{paragraph}</p>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'synthetic' && (
          <div className="chart-container">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Synthetic Reddit Thread</h3>
                <p className="chart-subtitle">AI-generated discussion based on community patterns</p>
              </div>
            </div>
            <SyntheticPost data={data} />
          </div>
        )}
          </div>
        </div>

        {/* Sidebar (30% width) */}
        <div className="results-sidebar">
          <div className="sidebar-section">
            <h4>🤖 AI Agent</h4>
            <div className="ai-agent-indicator">
              <div className="agent-info">
                <span className="agent-icon">
                  {(data.aiModel || 'Unknown').includes('Claude') ? '🤖' :
                   (data.aiModel || 'Unknown').includes('OpenAI') ? '🚀' : '❓'}
                </span>
                <span className="agent-name">
                  Analysed by {data.aiModel || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>🎯 Key Metrics</h4>
            <div className="sidebar-metrics">
              <div className="sidebar-metric">
                <div className="metric-icon">📊</div>
                <div className="metric-info">
                  <div className="metric-value">{data.analysis.overall_analysis.average_score.toFixed(3)}</div>
                  <div className="metric-label">Avg Sentiment</div>
                </div>
              </div>
              <div className="sidebar-metric">
                <div className="metric-icon">💬</div>
                <div className="metric-info">
                  <div className="metric-value">{data.summary.totalComments.toLocaleString()}</div>
                  <div className="metric-label">Comments</div>
                </div>
              </div>
              <div className="sidebar-metric">
                <div className="metric-icon">📝</div>
                <div className="metric-info">
                  <div className="metric-value">{data.summary.totalPosts.toLocaleString()}</div>
                  <div className="metric-label">Posts</div>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>🏷️ Top Themes</h4>
            <div className="sidebar-themes">
              {data.analysis.overall_analysis.dominant_themes.slice(0, 5).map((theme, index) => (
                <div key={index} className="sidebar-theme">
                  <span className="theme-indicator">#{index + 1}</span>
                  <span className="theme-name">{theme}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>😊 Emotions</h4>
            <div className="sidebar-emotions">
              {data.analysis.overall_analysis.key_emotions.slice(0, 5).map((emotion, index) => (
                <span key={index} className="emotion-chip">{emotion}</span>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>🏘️ Communities</h4>
            <div className="sidebar-subreddits">
              {data.summary.subreddits.map((subreddit, index) => (
                <div key={index} className="sidebar-subreddit">
                  <span className="subreddit-name">r/{subreddit}</span>
                  {data.analysis.by_subreddit[subreddit] && (
                    <span className="subreddit-sentiment">
                      {data.analysis.by_subreddit[subreddit].average_score.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>📈 Analysis Info</h4>
            <div className="analysis-info">
              <div className="info-item">
                <span className="info-label">Date Range:</span>
                <span className="info-value">
                  {new Date(data.summary.dateRange.startDate).toLocaleDateString()} - {new Date(data.summary.dateRange.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Items:</span>
                <span className="info-value">{data.analysis.individual_scores.length.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Analysis Dialog */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <div className="save-dialog-header">
              <h3>Save Analysis</h3>
              <button 
                onClick={() => setShowSaveDialog(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="save-dialog-content">
              <div className="form-group">
                <label htmlFor="analysisName">Analysis Name</label>
                <input
                  id="analysisName"
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Give your analysis a name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="analysisDescription">Description (Optional)</label>
                <textarea
                  id="analysisDescription"
                  value={saveForm.description}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add notes about this analysis..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="analysisTags">Tags (Optional)</label>
                <input
                  id="analysisTags"
                  type="text"
                  value={saveForm.tags}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="work, research, trending (comma separated)"
                />
              </div>

              <div className="save-dialog-preview">
                <h4>Analysis Summary</h4>
                <div className="preview-stats">
                  <span>📊 {data.summary.subreddits.join(', ')}</span>
                  <span>📝 {data.summary.totalPosts} posts</span>
                  <span>💬 {data.summary.totalComments} comments</span>
                  <span>📅 {data.summary.dateRange.startDate} to {data.summary.dateRange.endDate}</span>
                </div>
              </div>
            </div>

            <div className="save-dialog-footer">
              <button 
                onClick={() => setShowSaveDialog(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={saveAnalysis}
                disabled={isSaving || !saveForm.name.trim()}
                className="save-confirm-btn"
              >
                {isSaving ? 'Saving...' : 'Save Analysis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModelSelector && (
        <div className="model-selector-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="model-selector-dialog" style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Choose AI Model for Reanalysis</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Both Claude and OpenAI are available. Which model would you like to use to reanalyze this data?
            </p>
            <div className="model-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {apiStatus.hasClaude && (
                <button
                  onClick={() => startReanalysis('claude')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  🧠 Claude 3.5 Sonnet
                </button>
              )}
              {apiStatus.hasOpenAI && (
                <button
                  onClick={() => startReanalysis('openai')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  🚀 OpenAI GPT-4
                </button>
              )}
              <button
                onClick={() => setShowModelSelector(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;