import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import AnalysisForm from './components/AnalysisForm';
import Results from './components/Results';
import Settings from './components/Settings';
import History from './components/History';
import { AnalysisData } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'analysis' | 'settings' | 'history'>('analysis');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{timestamp: string, message: string, type: string}>>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const handleAnalysisStart = () => {
    setIsLoading(true);
    setError(null);
    setAnalysisData(null);
    setLogs([]); // Clear previous logs
    connectToLogs(); // Start log streaming
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
    disconnectFromLogs();
  };

  const eventSourceRef = useRef<EventSource | null>(null);

  const connectToLogs = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource('http://localhost:3001/api/logs');
    
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
    setCurrentView('analysis'); // Switch to analysis view when loading from history
    disconnectFromLogs(); // Stop log streaming when analysis completes
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
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
              onClick={() => setCurrentView('settings')}
            >
              ⚙️ Settings
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
              </div>
            )}

            {analysisData && !isLoading && (
              <Results data={analysisData} />
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
                <AnalysisForm
                  onAnalysisComplete={(data) => {
                    handleAnalysisComplete(data);
                    setShowConfigModal(false);
                  }}
                  onAnalysisStart={() => {
                    handleAnalysisStart();
                    setShowConfigModal(false);
                  }}
                  onError={handleError}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
