import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnalysisData } from '../types';
import { sampleAnalyses } from '../data/sampleAnalyses';

// Generated analysis file names (will be loaded dynamically)
// Temporarily empty to prevent build errors - will be populated by batch script
const generatedFiles: string[] = [
  // Files will be added here by the batch analysis generator
];

// Auto-detect API URL based on environment
const API_URL = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost'
  ? 'https://reddit-analyzer-api.fridayfeelingdev.workers.dev'
  : 'http://localhost:3001';

interface SavedAnalysis {
  id: string;
  timestamp: string;
  name: string;
  description: string;
  tags: string[];
  subreddits: string[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalPosts: number;
    totalComments: number;
    overallSentiment: number;
    dominantSentiment: string;
    topThemes: string[];
  };
  isSample?: boolean;
}

interface HistoryProps {
  onLoadAnalysis: (data: AnalysisData) => void;
}

const History: React.FC<HistoryProps> = ({ onLoadAnalysis }) => {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [generatingFrameworkId, setGeneratingFrameworkId] = useState<string | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState({ hasClaude: false, hasOpenAI: false });
  const [showModelSelector, setShowModelSelector] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyses();
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings`);
      if (response.data.success) {
        setApiStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to check API status:', error);
    }
  };

  const loadAnalyses = async () => {
    try {
      // Load sample analyses (always available)
      const samples = sampleAnalyses.map(sample => ({
        id: sample.id,
        timestamp: sample.generated_at,
        name: sample.name,
        description: sample.description,
        tags: ['sample', 'comprehensive', ...sample.subreddits],
        subreddits: sample.subreddits,
        dateRange: sample.dateRange,
        isSample: true, // Mark all built-in samples as non-deletable
        summary: {
          totalPosts: sample.totalPosts,
          totalComments: sample.totalComments,
          overallSentiment: sample.data.analysis.overall_sentiment.average_score,
          dominantSentiment: sample.data.analysis.overall_sentiment.average_score > 0.1 ? 'positive' :
                            sample.data.analysis.overall_sentiment.average_score < -0.1 ? 'negative' : 'neutral',
          topThemes: sample.data.analysis.overall_sentiment.dominant_themes || []
        }
      }));

      // Try to load API analyses (may not be available)
      let apiAnalyses: SavedAnalysis[] = [];
      try {
        const response = await axios.get(`${API_URL}/api/analyses`);
        if (response.data.success) {
          apiAnalyses = response.data.analyses;
        }
      } catch (error) {
        console.log('API analyses not available:', error instanceof Error ? error.message : String(error));
      }

      // Load generated batch analyses dynamically (when files exist)
      const generated: any[] = [];
      // Skip loading when generatedFiles is empty to prevent build errors
      // TODO: Add files to generatedFiles array after batch generation completes

      // If API analyses are available (our updated ones with proper titles and isSample), use them
      // Otherwise, fall back to built-in samples
      const finalAnalyses = apiAnalyses.length > 0 ? apiAnalyses : samples;
      setAnalyses([...finalAnalyses, ...generated]);
    } catch (error) {
      console.error('Failed to load analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalysis = async (id: string) => {
    setLoadingId(id);
    try {
      // First check if it's a sample analysis
      const sampleAnalysis = sampleAnalyses.find(sample => sample.id === id);
      if (sampleAnalysis) {
        onLoadAnalysis(sampleAnalysis.data);
        setLoadingId(null);
        return;
      }

      // Check if it's a generated analysis (skip when no generated files exist)
      if (generatedFiles.length > 0) {
        for (const fileName of generatedFiles) {
          if (fileName === id) {
            try {
              const response = await import(`../data/generated/${fileName}.json`);
              const analysis = response.default || response;
              onLoadAnalysis(analysis.data);
              setLoadingId(null);
              return;
            } catch (error) {
              break; // File doesn't exist, continue to API call
            }
          }
        }
      }

      // If not found in samples or generated, try API
      const response = await axios.get(`${API_URL}/api/analyses/${id}`);
      if (response.data.success) {
        onLoadAnalysis(response.data.analysis.data);
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
      alert('Failed to load analysis');
    } finally {
      setLoadingId(null);
    }
  };

  const deleteAnalysis = async (id: string, name: string) => {
    // Check if it's a sample analysis (can't be deleted)
    const isSampleAnalysis = sampleAnalyses.some(sample => sample.id === id) ||
                             analyses.find(a => a.id === id)?.isSample;
    if (isSampleAnalysis) {
      alert('Sample analyses cannot be deleted. They are provided as examples to showcase the analysis capabilities.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/api/analyses/${id}`);
      if (response.data.success) {
        setAnalyses(prev => prev.filter(analysis => analysis.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete analysis:', error);
      alert('Failed to delete analysis');
    }
  };

  const generateFrameworkAnalysis = async (id: string, name: string) => {
    if (!window.confirm(`Generate framework analysis for "${name}"? This may take a minute.`)) {
      return;
    }

    setGeneratingFrameworkId(id);
    try {
      const response = await axios.post(`${API_URL}/api/analyses/${id}/generate-framework`);
      if (response.data.success) {
        alert('Framework analysis generated successfully! Load the analysis to see the results.');
      } else {
        alert('Failed to generate framework analysis: ' + response.data.error);
      }
    } catch (error) {
      console.error('Failed to generate framework analysis:', error);
      alert('Failed to generate framework analysis. Please try again.');
    } finally {
      setGeneratingFrameworkId(null);
    }
  };

  const reanalyzeWithModel = async (id: string, name: string, model?: string) => {
    if (!model && apiStatus.hasClaude && apiStatus.hasOpenAI) {
      setShowModelSelector(id);
      return;
    }

    const selectedModel = model || (apiStatus.hasClaude ? 'claude' : 'openai');
    const modelName = selectedModel === 'claude' ? 'Claude 3.5 Sonnet' : 'OpenAI GPT-4';

    if (!window.confirm(`Reanalyze "${name}" using ${modelName}? This will update the analysis results.`)) {
      setShowModelSelector(null);
      return;
    }

    setReanalyzingId(id);
    setShowModelSelector(null);
    try {
      const response = await axios.post(`${API_URL}/api/analyses/${id}/reanalyze`, {
        preferredModel: selectedModel
      });
      if (response.data.success) {
        alert('Analysis updated successfully! The results now reflect the latest AI insights.');
        loadAnalyses(); // Refresh the list
      } else {
        alert('Failed to reanalyze: ' + response.data.error);
      }
    } catch (error) {
      console.error('Failed to reanalyze:', error);
      alert('Failed to reanalyze. Please try again.');
    } finally {
      setReanalyzingId(null);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return '#4CAF50';
    if (sentiment < -0.1) return '#f44336';
    return '#FF9800';
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  // Get all unique tags for filtering
  const allTags = Array.from(new Set(analyses.flatMap(analysis => analysis.tags)));

  // Filter analyses
  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = !searchTerm ||
      analysis.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.subreddits.some(sub => sub.toLowerCase().includes(searchTerm.toLowerCase())) ||
      analysis.summary.topThemes.some(theme => theme.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = !filterTag || analysis.tags.includes(filterTag);

    return matchesSearch && matchesTag;
  });

  if (isLoading) {
    return (
      <div className="history-loading">
        <div className="loading-spinner"></div>
        <p>Loading your saved analyses...</p>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="history-header">
        <h2>Analysis History</h2>
        <p>Your saved Reddit sentiment analyses</p>
      </div>

      {analyses.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">📊</div>
          <h3>No Saved Analyses Yet</h3>
          <p>Run an analysis and save it to see it here!</p>
        </div>
      ) : (
        <>
          <div className="history-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search analyses, subreddits, themes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>

            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="filter-select"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
          </div>

          <div className="analyses-stats">
            <div className="stat">
              <span className="stat-number">{analyses.length}</span>
              <span className="stat-label">Total Analyses</span>
            </div>
            <div className="stat">
              <span className="stat-number">{filteredAnalyses.length}</span>
              <span className="stat-label">Showing</span>
            </div>
          </div>

          <div className="analyses-grid">
            {filteredAnalyses.map(analysis => (
              <div key={analysis.id} className="analysis-card">
                <div className="card-header">
                  <div className="card-title">
                    <h3>{analysis.name}</h3>
                    <span className="card-date">{formatDate(analysis.timestamp)}</span>
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => loadAnalysis(analysis.id)}
                      disabled={loadingId === analysis.id}
                      className="load-btn"
                    >
                      {loadingId === analysis.id ? 'Loading...' : 'Load'}
                    </button>
                    <button
                      onClick={() => generateFrameworkAnalysis(analysis.id, analysis.name)}
                      disabled={generatingFrameworkId === analysis.id}
                      className="framework-btn"
                      title="Generate framework analysis"
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: generatingFrameworkId === analysis.id ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {generatingFrameworkId === analysis.id ? '🔬...' : '🔬'}
                    </button>
                    <button
                      onClick={() => reanalyzeWithModel(analysis.id, analysis.name)}
                      disabled={reanalyzingId === analysis.id || (!apiStatus.hasClaude && !apiStatus.hasOpenAI)}
                      className="reanalyze-btn"
                      title="Reanalyze with current AI model"
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#9C27B0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: reanalyzingId === analysis.id || (!apiStatus.hasClaude && !apiStatus.hasOpenAI) ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {reanalyzingId === analysis.id ? '🔄...' : '🔄'}
                    </button>
                    <button
                      onClick={() => deleteAnalysis(analysis.id, analysis.name)}
                      className="delete-btn"
                      title={analysis.isSample ? "Sample analyses cannot be deleted" : "Delete analysis"}
                      style={{
                        opacity: analysis.isSample ? 0.3 : 1,
                        cursor: analysis.isSample ? 'not-allowed' : 'pointer'
                      }}
                      disabled={analysis.isSample}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {analysis.description && (
                  <div className="card-description">
                    {analysis.description}
                  </div>
                )}

                <div className="card-subreddits">
                  {analysis.subreddits.map(subreddit => (
                    <span key={subreddit} className="subreddit-tag">
                      r/{subreddit}
                    </span>
                  ))}
                </div>

                <div className="card-stats">
                  <div className="stat-item">
                    <span className="stat-icon">📝</span>
                    <span>{analysis.summary.totalPosts} posts</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">💬</span>
                    <span>{analysis.summary.totalComments} comments</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">📅</span>
                    <span>
                      {new Date(analysis.dateRange.startDate).toLocaleDateString()} - {' '}
                      {new Date(analysis.dateRange.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="card-sentiment">
                  <div className="sentiment-score">
                    <div
                      className="sentiment-circle"
                      style={{
                        backgroundColor: getSentimentColor(analysis.summary.overallSentiment),
                        boxShadow: `0 0 20px ${getSentimentColor(analysis.summary.overallSentiment)}40`
                      }}
                    >
                      <span className="sentiment-icon">
                        {getSentimentIcon(analysis.summary.dominantSentiment)}
                      </span>
                    </div>
                    <div className="sentiment-details">
                      <span className="sentiment-label">
                        {analysis.summary.dominantSentiment}
                      </span>
                      <span className="sentiment-value">
                        {analysis.summary.overallSentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {analysis.summary.topThemes.length > 0 && (
                  <div className="card-themes">
                    <span className="themes-label">Top themes:</span>
                    <div className="themes-list">
                      {analysis.summary.topThemes.map((theme, index) => (
                        <span key={index} className="theme-tag">{theme}</span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.tags.length > 0 && (
                  <div className="card-tags">
                    {analysis.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredAnalyses.length === 0 && searchTerm && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No Results Found</h3>
              <p>Try adjusting your search terms or filters</p>
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
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Choose AI Model</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Both Claude and OpenAI are available. Which model would you like to use for reanalysis?
                </p>
                <div className="model-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {apiStatus.hasClaude && (
                    <button
                      onClick={() => {
                        const analysis = analyses.find(a => a.id === showModelSelector);
                        if (analysis) reanalyzeWithModel(showModelSelector, analysis.name, 'claude');
                      }}
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
                      onClick={() => {
                        const analysis = analyses.find(a => a.id === showModelSelector);
                        if (analysis) reanalyzeWithModel(showModelSelector, analysis.name, 'openai');
                      }}
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
                    onClick={() => setShowModelSelector(null)}
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
        </>
      )}
    </div>
  );
};

export default History;