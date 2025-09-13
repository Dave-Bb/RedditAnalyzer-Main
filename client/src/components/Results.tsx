import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnalysisData } from '../types';
import SentimentChart from './SentimentChart';
import TimelineChart from './TimelineChart';
import SubredditComparison from './SubredditComparison';
import PostsList from './PostsList';
import SentimentHeatmap from './SentimentHeatmap';
import WordCloud from './WordCloud';
import SyntheticPost from './SyntheticPost';

interface ResultsProps {
  data: AnalysisData;
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

const Results: React.FC<ResultsProps> = ({ data }) => {
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

  const retryClaudeInsights = async () => {
    setIsRegeneratingInsights(true);
    try {
      const response = await axios.post('http://localhost:3001/api/regenerate-claude-insights', {
        analysisData: data
      });

      if (response.data.success) {
        // Update the data with the new claude insights
        data.analysis.claude_insights = response.data.claude_insights;
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

  return (
    <div className="results">
      {/* Hero Header */}
      <div className="hero-header">
        <div className="hero-left">
          <h2>📊 Analysis Results</h2>
          <div className="analyzed-subreddits">
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

              {data.analysis.claude_insights && (
                <div className="framework-section">
                  <h4>🤖 Basic Subreddit Insights</h4>
                  <div className="insights-grid">
                    {Object.entries(data.analysis.claude_insights).map(([subreddit, insight]) => {
                      const hasError = insight.includes('Unable to generate insights') || insight.includes('due to API error');

                      return (
                        <div key={subreddit} className="insight-section">
                          <h5>r/{subreddit}</h5>
                          <div className="insight-content">
                            {hasError ? (
                              <div className="insight-error">
                                <p className="error-message">{insight}</p>
                                <div className="retry-section">
                                  <button
                                    className="retry-insights-btn"
                                    onClick={retryClaudeInsights}
                                    disabled={isRegeneratingInsights}
                                  >
                                    {isRegeneratingInsights ? '🔄 Regenerating...' : '🔄 Retry Insights'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              insight.split('\n').map((paragraph, index) => (
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
    </div>
  );
};

export default Results;