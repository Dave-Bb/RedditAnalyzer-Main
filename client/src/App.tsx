import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import AnalysisForm from './components/AnalysisForm';
import Results from './components/Results';
import Settings from './components/Settings';
import History from './components/History';
import About from './components/About';
import { AnalysisData } from './types';
import { API_ENDPOINTS } from './config';
import axios from 'axios';

// Simple hardcoded API URL for now
const API_URL = 'https://reddit-analyzer-api.fridayfeelingdev.workers.dev';

function App() {
  const [currentView, setCurrentView] = useState<'analysis' | 'settings' | 'history' | 'about'>('analysis');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{timestamp: string, message: string, type: string}>>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [aiModel, setAiModel] = useState<{name: string, icon: string} | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
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
  const [startTime, setStartTime] = useState<number | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const elapsedInterval = useRef<NodeJS.Timeout | null>(null);

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
    }
  };

  // Start progress polling
  const startProgressPolling = (id: string) => {
    const now = Date.now();
    setStartTime(now);
    setAnalysisProgress(null);

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
    setStartTime(null);
  };

  const handleAnalysisStart = (analysisId?: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisData(null);
    setLogs([]); // Clear previous logs
    setCurrentAnalysisId(analysisId || null);
    connectToLogs(); // Start log streaming

    // Start progress polling if we have an analysisId
    if (analysisId) {
      startProgressPolling(analysisId);
    }
  };

  const handleReanalysisStart = (analysisId?: string) => {
    setIsLoading(true);
    setError(null);
    setLogs([]); // Clear previous logs
    setCurrentAnalysisId(analysisId || null);
    connectToLogs(); // Start log streaming
    // Keep analysisData so we can show progress overlay
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
    setCurrentAnalysisId(null);
    stopProgressPolling();
    disconnectFromLogs();
  };

  const handleCancelAnalysis = async () => {
    if (!currentAnalysisId) {
      console.warn('No active analysis to cancel');
      return;
    }

    try {
      console.log('Cancelling analysis:', currentAnalysisId);
      const response = await axios.post(API_ENDPOINTS.CANCEL_ANALYSIS, {
        analysisId: currentAnalysisId
      });

      if (response.data.success) {
        handleError('Analysis cancelled by user');
      } else {
        console.error('Failed to cancel analysis:', response.data.error);
        handleError('Failed to cancel analysis: ' + response.data.error);
      }
    } catch (error: any) {
      console.error('Error cancelling analysis:', error);
      handleError('Error cancelling analysis: ' + (error.response?.data?.error || error.message));
    }
  };

  const eventSourceRef = useRef<EventSource | null>(null);

  const connectToLogs = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource(`${API_URL}/api/logs`);
    
    eventSourceRef.current.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data);
        setLogs(prev => [...prev, logEntry].slice(-10)); // Keep last 10 logs
      } catch (error) {
        console.error('Error parsing log:', error);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('Log stream error:', error);
    };
  };

  const disconnectFromLogs = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const handleAnalysisComplete = (data: AnalysisData) => {
    setAnalysisData(data);
    setIsLoading(false);
    setCurrentAnalysisId(null);
    setCurrentView('analysis'); // Switch to analysis view when loading from history
    stopProgressPolling();
    disconnectFromLogs(); // Stop log streaming when analysis completes
    loadAiModel(); // Refresh AI model info in case it changed
  };

  useEffect(() => {
    return () => {
      disconnectFromLogs(); // Cleanup on unmount
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    loadAiModel();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const loadAiModel = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.SETTINGS);
      const { ai } = response.data;

      if (ai.hasClaude && ai.hasOpenAI) {
        const preferredModel = ai.preferredModel || 'claude';
        setAiModel({
          name: preferredModel === 'claude' ? 'Claude 3.5 Sonnet' : 'OpenAI GPT-4',
          icon: preferredModel === 'claude' ? '🤖' : '🚀'
        });
      } else if (ai.hasClaude) {
        setAiModel({
          name: 'Claude 3.5 Sonnet',
          icon: '🤖'
        });
      } else if (ai.hasOpenAI) {
        setAiModel({
          name: 'OpenAI GPT-4',
          icon: '🚀'
        });
      } else {
        setAiModel(null);
      }
    } catch (error) {
      console.error('Failed to load AI model info:', error);
      setAiModel(null);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-title">
            <div className="site-logo-title">
              <img
                src={darkMode ? "/RedditBrainLogo_White.png" : "/RedditBrainLogo.png"}
                alt="Reddit Brain AI"
                className="site-logo"
              />
              <div className="title-text">
                <h1>Reddit Brain AI</h1>
                <p>Intelligent sentiment analysis for Reddit communities</p>
              </div>
            </div>
          </div>
          <nav className="header-nav">
            <button 
              className="nav-btn primary-action"
              onClick={() => setShowConfigModal(true)}
              disabled={isLoading}
            >
              ➕ New Analysis
            </button>
            <button 
              className={currentView === 'analysis' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setCurrentView('analysis')}
            >
              📊 Dashboard
            </button>
            <button 
              className={currentView === 'history' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setCurrentView('history')}
            >
              📚 History
            </button>
            <button
              className={currentView === 'settings' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => {
                setCurrentView('settings');
                if (currentView !== 'settings') {
                  loadAiModel(); // Refresh when navigating to settings
                }
              }}
            >
              ⚙️ Settings
            </button>
            <button
              className={currentView === 'about' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setCurrentView('about')}
            >
              About
            </button>
            <button 
              className="nav-btn theme-toggle"
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </nav>
        </div>
      </header>

      <main className="main-content">
        {currentView === 'settings' ? (
          <Settings />
        ) : currentView === 'history' ? (
          <History onLoadAnalysis={handleAnalysisComplete} />
        ) : currentView === 'about' ? (
          <About />
        ) : (
          <div className="dashboard-layout">
            {!analysisData && !isLoading ? (
              <div className="welcome-state">
                <div className="welcome-content">
                  <div className="welcome-logo">
                    <img
                      src={darkMode ? "/RedditBrainLogo_White.png" : "/RedditBrainLogo.png"}
                      alt="Reddit Brain AI"
                      className="welcome-logo-image"
                    />
                  </div>
                  <h2>Welcome to Reddit Brain AI</h2>
                  <p>Start your analysis journey by clicking "New Analysis" to configure and run sentiment analysis on Reddit communities.</p>
                  <button
                    className="cta-button"
                    onClick={() => setShowConfigModal(true)}
                  >
                    🚀 Get Started
                  </button>
                </div>
              </div>
            ) : null}

            {error && (
              <div className="error-message">
                <h3>Analysis Error</h3>
                <p>{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="loading-message">
                <h3>🔬 Analysis in Progress</h3>
                <div className="loading-spinner"></div>
                <div className="analysis-logs">
                  <div className="logs-container">
                    {logs.length === 0 ? (
                      <div className="log-line">📡 Starting analysis...</div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="log-line">
                          {log.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {currentAnalysisId && (
                  <div className="cancel-section">
                    <button
                      onClick={handleCancelAnalysis}
                      className="cancel-analysis-btn"
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        marginTop: '16px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f44336'}
                    >
                      🛑 Cancel Analysis
                    </button>
                  </div>
                )}
              </div>
            )}

            {analysisData && (
              <Results
                data={analysisData}
                onReanalysisStart={handleReanalysisStart}
                onReanalysisComplete={(newData) => {
                  setAnalysisData(newData);
                  setIsLoading(false);
                  disconnectFromLogs();
                }}
                onReanalysisError={handleError}
                isReanalyzing={isLoading}
              />
            )}
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && (
          <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Configure New Analysis</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowConfigModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {!isLoading && !analysisData ? (
                  <AnalysisForm
                    onAnalysisComplete={(data) => {
                      handleAnalysisComplete(data);
                      setShowConfigModal(false);
                    }}
                    onAnalysisStart={(analysisId) => {
                      handleAnalysisStart(analysisId);
                      // Don't close modal here - keep it open to show progress
                    }}
                    onError={(error) => {
                      handleError(error);
                      // Modal stays open to show error
                    }}
                    onNavigateToSettings={() => {
                      setShowConfigModal(false);
                      setCurrentView('settings');
                    }}
                    isLoading={isLoading}
                  />
                ) : isLoading ? (
                  <div className="modal-progress">
                    <h3>🔬 Analysis in Progress</h3>
                    <div className="loading-spinner"></div>

                    {/* Progress Tracking UI */}
                    {analysisProgress && (
                      <div className="progress-tracking">
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
                            {analysisProgress.stage === 'initializing' && '🔄 Initializing'}
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

                    <div className="analysis-logs">
                      <div className="logs-container">
                        {logs.length === 0 ? (
                          <div className="log-line">📡 Starting analysis...</div>
                        ) : (
                          logs.map((log, index) => (
                            <div key={index} className="log-line">
                              {log.message}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="modal-actions" style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                      {currentAnalysisId && (
                        <button
                          onClick={handleCancelAnalysis}
                          className="cancel-analysis-btn"
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f44336'}
                        >
                          🛑 Cancel Analysis
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowConfigModal(false)}
                        className="modal-minimize-btn"
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#757575',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#616161'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#757575'}
                      >
                        Minimize (continue in background)
                      </button>
                    </div>
                  </div>
                ) : error ? (
                  <div className="modal-error">
                    <h3>Analysis Error</h3>
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setShowConfigModal(false);
                      }}
                      className="modal-close-btn"
                    >
                      Close
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
