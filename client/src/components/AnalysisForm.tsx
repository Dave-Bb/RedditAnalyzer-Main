import React, { useState, useRef } from 'react';
import axios from 'axios';
import { AnalysisData } from '../types';

// Simple hardcoded API URL for now
const API_URL = 'https://reddit-analyzer-api.fridayfeelingdev.workers.dev';

interface AnalysisFormProps {
  onAnalysisComplete: (data: AnalysisData) => void;
  onAnalysisStart: (analysisId?: string) => void;
  onError: (error: string) => void;
  onNavigateToSettings: () => void;
  isLoading: boolean;
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({
  onAnalysisComplete,
  onAnalysisStart,
  onError,
  onNavigateToSettings,
  isLoading
}) => {
  const [subreddits, setSubreddits] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [postLimit, setPostLimit] = useState(25);
  const [apiStatus, setApiStatus] = useState<{
    reddit: boolean;
    ai: boolean;
    checking: boolean;
    hasClaude: boolean;
    hasOpenAI: boolean;
    preferredModel: string;
  }>({ reddit: false, ai: false, checking: true, hasClaude: false, hasOpenAI: false, preferredModel: 'claude' });
  const [selectedModel, setSelectedModel] = useState<'claude' | 'openai'>('claude');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{
    stage: string;
    percentage: number;
    tokenCount: number;
    postsProcessed: number;
    totalPosts: number;
    subredditsProcessed: number;
    totalSubreddits: number;
    elapsedTime: number;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [startTime, setStartTime] = useState<number | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const elapsedInterval = useRef<NodeJS.Timeout | null>(null);

  const checkApiStatus = async () => {
    try {
      setApiStatus(prev => ({ ...prev, checking: true }));
      
      // Check localStorage for saved API keys (client-side only)
      const redditKeys = localStorage.getItem('reddit_keys');
      const claudeKeys = localStorage.getItem('claude_keys');
      const openaiKeys = localStorage.getItem('openai_keys');
      const preferredModel = localStorage.getItem('preferred_model') || 'claude';

      const hasReddit = !!redditKeys;
      const hasClaude = !!claudeKeys;
      const hasOpenAI = !!openaiKeys;
      const hasAi = hasClaude || hasOpenAI;

      setApiStatus({
        reddit: hasReddit,
        ai: hasAi,
        checking: false,
        hasClaude: hasClaude,
        hasOpenAI: hasOpenAI,
        preferredModel: preferredModel
      });

      // Set initial selected model based on preference and availability
      if (preferredModel === 'openai' && hasOpenAI) {
        setSelectedModel('openai');
      } else if (hasClaude) {
        setSelectedModel('claude');
      } else if (hasOpenAI) {
        setSelectedModel('openai');
      }
    } catch (error) {
      console.error('Failed to check API status:', error);
      setApiStatus({ reddit: false, ai: false, checking: false, hasClaude: false, hasOpenAI: false, preferredModel: 'claude' });
    }
  };

  // Poll for progress updates
  const pollProgress = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/progress/${id}`);
      const progress = response.data;

      setAnalysisProgress(prev => ({
        ...progress,
        elapsedTime: prev?.elapsedTime || 0
      }));

      // Stop polling if complete or error
      if (progress.stage === 'complete' || progress.stage === 'error') {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
      }
    } catch (error: any) {
      // Only log error if it's not a 404 (which is expected initially)
      if (error.response?.status !== 404) {
        console.error('Failed to fetch progress:', error);
      }
      // For 404, we'll just keep polling until the server creates the progress entry
    }
  };

  // Start progress polling
  const startProgressPolling = (id: string) => {
    setAnalysisId(id);
    const now = Date.now();
    setStartTime(now);

    // Initial poll immediately
    pollProgress(id);

    // Poll every 500ms
    progressInterval.current = setInterval(() => {
      pollProgress(id);
    }, 500);

    // Update elapsed time every second
    elapsedInterval.current = setInterval(() => {
      setAnalysisProgress(prev => {
        if (!prev) return null;
        return {
          ...prev,
          elapsedTime: Math.floor((Date.now() - now) / 1000)
        };
      });
    }, 1000);
  };

  // Stop progress polling
  const stopProgressPolling = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (elapsedInterval.current) {
      clearInterval(elapsedInterval.current);
      elapsedInterval.current = null;
    }
    setAnalysisProgress(null);
    setAnalysisId(null);
    setStartTime(null);
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      stopProgressPolling();
      onError('Analysis cancelled by user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subreddits.trim()) {
      onError('Please enter at least one subreddit');
      return;
    }

    if (!startDate || !endDate) {
      onError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      onError('Start date must be before end date');
      return;
    }

    // Check API keys before starting analysis
    await checkApiStatus();
    if (!apiStatus.reddit || !apiStatus.ai) {
      return; // Don't start analysis if keys are missing
    }

    const subredditList = subreddits
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Generate a temporary ID for progress tracking
    const tempAnalysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    onAnalysisStart(tempAnalysisId);
    startProgressPolling(tempAnalysisId);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Update model preference before analysis
      if (selectedModel !== apiStatus.preferredModel) {
        // Skip server update - we use localStorage now
        localStorage.setItem('preferred_model', selectedModel);
        // await axios.post(`${API_URL}/api/update-settings`, {
          preferredModel: selectedModel
        });
      }

      // Get timeout from localStorage or use default
      const timeout = parseInt(localStorage.getItem('analysisTimeout') || '1800000'); // Default 30 minutes

      // Get API keys from localStorage
      const redditKeys = JSON.parse(localStorage.getItem('reddit_keys') || '{}');
      const claudeKeys = JSON.parse(localStorage.getItem('claude_keys') || '{}');
      const openaiKeys = JSON.parse(localStorage.getItem('openai_keys') || '{}');

      const response = await axios.post(`${API_URL}/api/analyze`, {
        analysisId: tempAnalysisId,
        subreddits: subredditList,
        startDate,
        endDate,
        postLimit,
        // Include API keys for the Worker to use
        apiKeys: {
          reddit: redditKeys,
          claude: claudeKeys,
          openai: openaiKeys
        }
      }, {
        signal: controller.signal,
        timeout: timeout
      });

      if (response.data.success) {
        stopProgressPolling();
        onAnalysisComplete(response.data.data);
      } else {
        stopProgressPolling();
        onError(response.data.error || 'Analysis failed');
      }
    } catch (error: any) {
      stopProgressPolling();
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        // Check if we have partial results
        if (error.response?.data?.partialResults) {
          onAnalysisComplete(error.response.data.partialResults);
          onError('Analysis was cancelled but partial results are available');
        } else {
          onError('Analysis was cancelled');
        }
      } else {
        console.error('Analysis error:', error);
        onError(
          error.response?.data?.error ||
          error.message ||
          'Failed to connect to server. Make sure the backend is running.'
        );
      }
    } finally {
      setAbortController(null);
    }
  };

  const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7); // Default to last 7 days
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };


  React.useEffect(() => {
    const { start, end } = getDefaultDateRange();
    setStartDate(start);
    setEndDate(end);
    checkApiStatus();
  }, []);

  return (
    <div className="analysis-form">
      <h2>Configure Analysis</h2>

      {/* API Status Check */}
      {apiStatus.checking ? (
        <div className="api-status checking">
          <div className="status-indicator">🔍 Checking API configuration...</div>
        </div>
      ) : !apiStatus.reddit || !apiStatus.ai ? (
        <div className="api-status error">
          <div className="status-indicator">❌ Missing API Configuration</div>
          <div className="missing-apis">
            {!apiStatus.reddit && <div>• Reddit API keys not configured</div>}
            {!apiStatus.ai && <div>• AI API keys not configured (Claude or OpenAI)</div>}
          </div>
          <div className="api-actions">
            <button
              type="button"
              className="settings-link-button"
              onClick={onNavigateToSettings}
            >
              ⚙️ Configure API Keys
            </button>
          </div>
        </div>
      ) : (
        <div className="api-status success">
          <div className="status-indicator">✅ API configuration ready</div>
        </div>
      )}

      {/* AI Model Selection */}
      {apiStatus.hasClaude && apiStatus.hasOpenAI && !isLoading && (
        <div className="model-selection-form">
          <h3>🤖 Choose AI Model for Analysis</h3>
          <div className="model-options">
            <label className={`model-option ${selectedModel === 'claude' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="analysisModel"
                value="claude"
                checked={selectedModel === 'claude'}
                onChange={(e) => setSelectedModel(e.target.value as 'claude')}
                disabled={isLoading}
              />
              <div className="model-info">
                <div className="model-name">🧠 Claude 3.5 Sonnet</div>
                <div className="model-description">Advanced reasoning • Larger context • Better for complex analysis</div>
              </div>
            </label>
            <label className={`model-option ${selectedModel === 'openai' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="analysisModel"
                value="openai"
                checked={selectedModel === 'openai'}
                onChange={(e) => setSelectedModel(e.target.value as 'openai')}
                disabled={isLoading}
              />
              <div className="model-info">
                <div className="model-name">🚀 OpenAI GPT-4</div>
                <div className="model-description">Fast processing • Reliable performance • Good for general analysis</div>
              </div>
            </label>
          </div>
          {selectedModel !== apiStatus.preferredModel && (
            <div className="model-change-notice">
              💡 This will override your preference in Settings for this analysis
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="subreddits">
            Subreddits (comma-separated, without r/)
          </label>
          <input
            id="subreddits"
            type="text"
            value={subreddits}
            onChange={(e) => setSubreddits(e.target.value)}
            placeholder="e.g., technology, gaming, movies"
            disabled={isLoading}
          />
          <small>Enter subreddit names separated by commas</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="postLimit">
            Posts per Subreddit (max 100)
          </label>
          <input
            id="postLimit"
            type="number"
            min="5"
            max="100"
            value={postLimit}
            onChange={(e) => setPostLimit(Number(e.target.value))}
            disabled={isLoading}
          />
          <small>Fewer posts = faster analysis, more posts = better insights</small>
        </div>

        <div className="form-buttons">
          <button
            type="submit"
            disabled={isLoading || !apiStatus.reddit || !apiStatus.ai || apiStatus.checking}
            className="analyze-button"
          >
            {isLoading ? 'Analyzing...' : 'Start Analysis'}
          </button>

          {(isLoading || abortController) && (
            <button
              type="button"
              onClick={handleCancel}
              className="cancel-button"
              disabled={!abortController}
            >
              Cancel Analysis
            </button>
          )}
        </div>
      </form>

      {/* Progress Display */}
      {isLoading && analysisProgress && (
        <div className="analysis-progress">
          <h3>Analysis Progress</h3>

          {/* Timer */}
          <div className="progress-timer">
            <span className="timer-label">Elapsed Time:</span>
            <span className="timer-value">
              {Math.floor(analysisProgress.elapsedTime / 60)}:
              {(analysisProgress.elapsedTime % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${analysisProgress.percentage}%` }}
              />
            </div>
            <span className="progress-percentage">{analysisProgress.percentage}%</span>
          </div>

          {/* Stage Info */}
          <div className="progress-stage">
            <span className="stage-label">Current Stage:</span>
            <span className="stage-value">
              {analysisProgress.stage === 'fetching_reddit_data' && '📡 Fetching Reddit Data'}
              {analysisProgress.stage === 'analyzing_sentiment' && '🧠 Analyzing Sentiment'}
              {analysisProgress.stage === 'generating_insights' && '🔬 Generating Insights'}
              {analysisProgress.stage === 'complete' && '✅ Complete'}
            </span>
          </div>

          {/* Stats */}
          <div className="progress-stats">
            {analysisProgress.totalSubreddits > 0 && (
              <div className="stat-item">
                <span className="stat-label">Subreddits:</span>
                <span className="stat-value">
                  {analysisProgress.subredditsProcessed} / {analysisProgress.totalSubreddits}
                </span>
              </div>
            )}
            {analysisProgress.totalPosts > 0 && (
              <div className="stat-item">
                <span className="stat-label">Posts Analyzed:</span>
                <span className="stat-value">
                  {analysisProgress.postsProcessed} / {analysisProgress.totalPosts}
                </span>
              </div>
            )}
            {analysisProgress.tokenCount > 0 && (
              <div className="stat-item">
                <span className="stat-label">Tokens Used:</span>
                <span className="stat-value">
                  {analysisProgress.tokenCount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="form-info">
        <h3>How it works:</h3>
        <ol>
          <li>Enter subreddits you want to analyze</li>
          <li>Select a date range (recent dates work best)</li>
          <li>Choose how many posts to analyze per subreddit</li>
          <li>Click "Start Analysis" and wait for results</li>
        </ol>
        <p><strong>Note:</strong> Analysis can take 1-5 minutes depending on the amount of data.</p>
      </div>
    </div>
  );
};

export default AnalysisForm;