import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { response } from 'express';
import { response } from 'express';
import { response } from 'express';

// Simple hardcoded API URL for now
const API_URL = 'https://reddit-analyzer-api.fridayfeelingdev.workers.dev';

interface SettingsData {
  reddit: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    userAgent: string;
  };
  ai: {
    hasClaude: boolean;
    hasOpenAI: boolean;
    preferredModel: string;
  };
}

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testResults, setTestResults] = useState<{ [key: string]: TestResult }>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    redditClientId: '',
    redditClientSecret: '',
    redditUserAgent: '',
    claudeApiKey: '',
    openaiApiKey: ''
  });

  const [preferredModel, setPreferredModel] = useState<'claude' | 'openai'>('claude');
  const [analysisTimeout, setAnalysisTimeout] = useState<number>(30); // Default 30 minutes
  const [showCostWarningModal, setShowCostWarningModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleTimeoutChange = (value: number) => {
    setAnalysisTimeout(value);
    // Save to localStorage in milliseconds
    localStorage.setItem('analysisTimeout', String(value * 60000));
  };

  const loadSettings = async () => {
    try {
      // Check localStorage for saved API keys instead of server
      const redditKeys = localStorage.getItem('reddit_keys');
      const claudeKeys = localStorage.getItem('claude_keys');
      const openaiKeys = localStorage.getItem('openai_keys');
      const preferredModel = localStorage.getItem('preferred_model') || 'claude';

      // Create settings object based on localStorage
      const localSettings = {
        reddit: {
          hasClientId: !!redditKeys,
          hasClientSecret: !!redditKeys,
          userAgent: 'RedditSentimentAnalyzer/1.0'
        },
        ai: {
          hasClaude: !!claudeKeys,
          hasOpenAI: !!openaiKeys,
          preferredModel: preferredModel
        }
      };

      console.log('🔥 Settings loaded from localStorage:', {
        redditKeys: !!redditKeys,
        claudeKeys: !!claudeKeys,
        openaiKeys: !!openaiKeys,
        localSettings
      });

      setSettings(localSettings);

      // Load persisted form data from localStorage, or use empty defaults
      const savedFormData = localStorage.getItem('apiFormData');
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          setFormData(prev => ({
            ...prev,
            ...parsedData,
            redditUserAgent: response.data.reddit.userAgent // Always use server's user agent
          }));
        } catch (e) {
          console.error('Error parsing saved form data:', e);
        }
      } else {
        // Pre-fill user agent only
        setFormData(prev => ({
          ...prev,
          redditUserAgent: response.data.reddit.userAgent
        }));
      }

      setPreferredModel(response.data.ai.preferredModel || 'claude');

      // Load saved timeout setting
      const savedTimeout = localStorage.getItem('analysisTimeout');
      if (savedTimeout) {
        setAnalysisTimeout(parseInt(savedTimeout) / 60000); // Convert ms to minutes
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setIsLoading(false);
    }
  };

  const testApiKey = async (keyType: string) => {
    setTestingKey(keyType);
    try {
      // Test API keys by sending them directly (not storing on server)
      const testData = {
        keyType,
        // Send only the specific key being tested
        ...(keyType === 'reddit' && {
          redditClientId: formData.redditClientId,
          redditClientSecret: formData.redditClientSecret,
          redditUserAgent: formData.redditUserAgent
        }),
        ...(keyType === 'claude' && {
          claudeApiKey: formData.claudeApiKey
        }),
        ...(keyType === 'openai' && {
          openaiApiKey: formData.openaiApiKey
        })
      };

      const response = await axios.post(`${API_URL}/api/test-keys`, testData);
      setTestResults(prev => ({ ...prev, [keyType]: response.data }));

      // Save to localStorage if test successful (client-side only)
      if (response.data.success) {
        localStorage.setItem(`${keyType}_keys`, JSON.stringify(testData));
        alert(`${keyType.toUpperCase()} API key test successful! Keys saved locally.`);
        // Refresh settings display to show updated status
        loadSettings();
      }
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [keyType]: {
          success: false,
          message: error.response?.data?.message || error.message || 'Test failed'
        }
      }));
    }
    setTestingKey(null);
  };

  const updateSettings = async () => {
    setShowCostWarningModal(true);
  };

  const confirmUpdateSettings = async () => {
    setShowCostWarningModal(false);

    // Save settings to localStorage only (no server storage)
    localStorage.setItem('user_settings', JSON.stringify({
      ...formData,
      preferredModel
    }));

    alert('Settings saved locally! Your API keys stay private in your browser.');
    setTestResults({}); // Clear test results
  };

  const clearAllSettings = async () => {
    if (window.confirm('Are you sure you want to clear all API keys? This will remove all current settings from your browser.')) {
      const clearedData = {
        redditClientId: '',
        redditClientSecret: '',
        redditUserAgent: 'RedditSentimentAnalyzer/1.0',
        claudeApiKey: '',
        openaiApiKey: ''
      };

      // Clear everything from localStorage only (no server storage)
      setFormData(clearedData);
      setPreferredModel('claude');
      setTestResults({});

      localStorage.removeItem('apiFormData');
      localStorage.removeItem('user_settings');
      localStorage.removeItem('reddit_keys');
      localStorage.removeItem('claude_keys');
      localStorage.removeItem('openai_keys');
      localStorage.removeItem('preferred_model');

      alert('All settings cleared from your browser! Your privacy is protected.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Persist form data to localStorage (excluding empty values to save space)
    const dataToSave = Object.fromEntries(
      Object.entries(newFormData).filter(([, v]) => v.trim() !== '')
    );
    localStorage.setItem('apiFormData', JSON.stringify(dataToSave));
  };

  if (isLoading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings">
      <h2>API Configuration</h2>

      {/* Cost Warning */}
      <div className="cost-warning">
        <h3>⚠️ IMPORTANT: API Usage Costs</h3>
        <p>
          <strong>Using these API keys will incur costs from your AI providers (Claude/OpenAI).</strong>
          Each analysis processes text through paid AI APIs. Costs vary based on the amount of data analyzed
          (number of posts, comments, and text length). Please monitor your API usage and billing to avoid unexpected charges.
        </p>
      </div>

      <div className="settings-section">
        <h3>Current Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Reddit Client ID:</span>
            <span className={`status-value ${settings?.reddit.hasClientId ? 'active' : 'inactive'}`}>
              {settings?.reddit.hasClientId ? '✅ Set' : '❌ Not Set'}
            </span>
            <button
              onClick={() => testApiKey('reddit')}
              disabled={testingKey === 'reddit'}
              className="test-button"
            >
              {testingKey === 'reddit' ? 'Testing...' : 'Test'}
            </button>
          </div>

          <div className="status-item">
            <span className="status-label">Reddit Client Secret:</span>
            <span className={`status-value ${settings?.reddit.hasClientSecret ? 'active' : 'inactive'}`}>
              {settings?.reddit.hasClientSecret ? '✅ Set' : '❌ Not Set'}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">Claude API:</span>
            <span className={`status-value ${settings?.ai.hasClaude ? 'active' : 'inactive'}`}>
              {settings?.ai.hasClaude ? '✅ Active' : '❌ Not Set'}
            </span>
            <button
              onClick={() => testApiKey('claude')}
              disabled={testingKey === 'claude'}
              className="test-button"
            >
              {testingKey === 'claude' ? 'Testing...' : 'Test'}
            </button>
          </div>

          <div className="status-item">
            <span className="status-label">OpenAI API:</span>
            <span className={`status-value ${settings?.ai.hasOpenAI ? 'active' : 'inactive'}`}>
              {settings?.ai.hasOpenAI ? '✅ Active' : '❌ Not Set'}
            </span>
            <button
              onClick={() => testApiKey('openai')}
              disabled={testingKey === 'openai'}
              className="test-button"
            >
              {testingKey === 'openai' ? 'Testing...' : 'Test'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="test-results">
            <h4>Test Results</h4>
            {Object.entries(testResults).map(([key, result]) => (
              <div key={key} className={`test-result ${result.success ? 'success' : 'error'}`}>
                <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {result.message}
                {result.details && <div className="test-details">{result.details}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Model Selection */}
        {settings?.ai.hasClaude && settings?.ai.hasOpenAI && (
          <div className="model-selection">
            <h4>AI Model Preference</h4>
            <p>Both Claude and OpenAI are configured. Choose your preferred model:</p>
            <div className="model-options">
              <label className="model-option">
                <input
                  type="radio"
                  name="preferredModel"
                  value="claude"
                  checked={preferredModel === 'claude'}
                  onChange={async (e) => {
                    const newModel = e.target.value as 'claude';
                    setPreferredModel(newModel);

                    // Update localStorage immediately
                    const dataToSave = { ...formData, preferredModel: newModel };
                    const filteredData = Object.fromEntries(
                      Object.entries(dataToSave).filter(([, v]) => v && v.toString().trim() !== '')
                    );
                    localStorage.setItem('apiFormData', JSON.stringify(filteredData));

                    // Auto-save preference to localStorage only (privacy-first)
                    localStorage.setItem('preferred_model', newModel);
                    console.log('✅ Auto-saved Claude preference to localStorage only');
                  }}
                />
                <div className="model-info">
                  <div className="model-name">🤖 Claude 3.5 Sonnet</div>
                  <div className="model-description">Advanced reasoning, larger context, better JSON parsing</div>
                </div>
              </label>
              <label className="model-option">
                <input
                  type="radio"
                  name="preferredModel"
                  value="openai"
                  checked={preferredModel === 'openai'}
                  onChange={async (e) => {
                    const newModel = e.target.value as 'openai';
                    setPreferredModel(newModel);

                    // Update localStorage immediately
                    const dataToSave = { ...formData, preferredModel: newModel };
                    const filteredData = Object.fromEntries(
                      Object.entries(dataToSave).filter(([, v]) => v && v.toString().trim() !== '')
                    );
                    localStorage.setItem('apiFormData', JSON.stringify(filteredData));

                    // Auto-save preference to localStorage only (privacy-first)
                    localStorage.setItem('preferred_model', newModel);
                    console.log('✅ Auto-saved OpenAI preference to localStorage only');
                  }}
                />
                <div className="model-info">
                  <div className="model-name">🚀 OpenAI GPT-4</div>
                  <div className="model-description">Fast processing, good general performance</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Timeout Configuration */}
        <div className="timeout-configuration">
          <h4>⏱️ Analysis Timeout</h4>
          <p>Set the maximum time allowed for analysis before timeout (in minutes):</p>
          <div className="timeout-input-group">
            <input
              type="number"
              min="5"
              max="120"
              value={analysisTimeout}
              onChange={(e) => handleTimeoutChange(parseInt(e.target.value) || 30)}
              className="timeout-input"
            />
            <span className="timeout-label">minutes</span>
          </div>
          <div className="timeout-info">
            <small>Default: 30 minutes | Recommended: 30-60 minutes for large analyses</small>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Update Configuration</h3>
        <p className="settings-note">
          Changes will be applied for this session only. To persist changes, update your .env file manually.
        </p>

        <div className="settings-form">
          <div className="form-group">
            <label>Reddit Client ID:</label>
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={formData.redditClientId}
              onChange={(e) => handleInputChange('redditClientId', e.target.value)}
              placeholder="Enter Reddit Client ID"
            />
          </div>

          <div className="form-group">
            <label>Reddit Client Secret:</label>
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={formData.redditClientSecret}
              onChange={(e) => handleInputChange('redditClientSecret', e.target.value)}
              placeholder="Enter Reddit Client Secret"
            />
          </div>

          <div className="form-group">
            <label>Reddit User Agent:</label>
            <input
              type="text"
              value={formData.redditUserAgent}
              onChange={(e) => handleInputChange('redditUserAgent', e.target.value)}
              placeholder="RedditSentimentAnalyzer/1.0"
            />
          </div>

          <div className="form-group">
            <label>Claude API Key:</label>
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={formData.claudeApiKey}
              onChange={(e) => handleInputChange('claudeApiKey', e.target.value)}
              placeholder="sk-ant-api..."
            />
          </div>

          <div className="form-group">
            <label>OpenAI API Key:</label>
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={formData.openaiApiKey}
              onChange={(e) => handleInputChange('openaiApiKey', e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="form-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showApiKeys}
                onChange={(e) => setShowApiKeys(e.target.checked)}
              />
              Show API Keys
            </label>

            <div className="settings-buttons">
              <button
                onClick={updateSettings}
                className="update-button"
              >
                Update Settings
              </button>
              <button
                onClick={clearAllSettings}
                className="clear-button"
              >
                Clear All Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Setup Instructions</h3>
        <div className="instructions">
          <div className="instruction-item">
            <h4>Reddit API Setup:</h4>
            <ol>
              <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer">Reddit Apps</a></li>
              <li>Click "Create App" or "Create Another App"</li>
              <li>Choose "script" as the app type</li>
              <li>Copy the Client ID (string under your app name) and Client Secret</li>
            </ol>
          </div>

          <div className="instruction-item">
            <h4>Claude API Setup:</h4>
            <ol>
              <li>Go to <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></li>
              <li>Create an account and add billing information</li>
              <li>Go to API Keys section</li>
              <li>Create a new key and copy it (starts with sk-ant-api...)</li>
            </ol>
          </div>

          <div className="instruction-item">
            <h4>OpenAI API Setup:</h4>
            <ol>
              <li>Go to <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
              <li>Create an account and add billing information</li>
              <li>Go to API Keys section</li>
              <li>Create a new key and copy it (starts with sk-...)</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Cost Warning Confirmation Modal */}
      {showCostWarningModal && (
        <div className="modal-overlay">
          <div className="modal-content cost-warning-modal">
            <div className="modal-header">
              <h3>⚠️ API Cost Warning</h3>
              <button
                className="modal-close"
                onClick={() => setShowCostWarningModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-content">
                <p><strong>These API keys will be used for analysis requests that incur costs from Claude/OpenAI.</strong></p>

                <p>Costs depend on the amount of text analyzed:</p>
                <ul>
                  <li>Number of posts and comments processed</li>
                  <li>Length of text content</li>
                  <li>AI model used (Claude vs OpenAI)</li>
                </ul>

                <p><strong>Please monitor your API provider billing to avoid unexpected charges.</strong></p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => setShowCostWarningModal(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                onClick={confirmUpdateSettings}
              >
                I Understand - Update Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;