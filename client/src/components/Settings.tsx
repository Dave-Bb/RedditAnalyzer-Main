import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SettingsData {
  reddit: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    userAgent: string;
  };
  ai: {
    hasClaude: boolean;
    hasOpenAI: boolean;
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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/settings');
      setSettings(response.data);
      
      // Pre-fill user agent
      setFormData(prev => ({
        ...prev,
        redditUserAgent: response.data.reddit.userAgent
      }));
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setIsLoading(false);
    }
  };

  const testApiKey = async (keyType: string) => {
    setTestingKey(keyType);
    try {
      const response = await axios.post('http://localhost:3001/api/test-keys', { keyType });
      setTestResults(prev => ({ ...prev, [keyType]: response.data }));
    } catch (error: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [keyType]: { 
          success: false, 
          message: error.message || 'Test failed' 
        }
      }));
    }
    setTestingKey(null);
  };

  const updateSettings = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/update-settings', formData);
      if (response.data.success) {
        alert('Settings updated! They will be active for this session.');
        loadSettings(); // Refresh settings display
        setTestResults({}); // Clear test results
      }
    } catch (error: any) {
      alert('Failed to update settings: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings">
      <h2>API Configuration</h2>
      
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
              disabled={!settings?.reddit.hasClientId || testingKey === 'reddit'}
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
              disabled={!settings?.ai.hasClaude || testingKey === 'claude'}
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
              disabled={!settings?.ai.hasOpenAI || testingKey === 'openai'}
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

            <button 
              onClick={updateSettings}
              className="update-button"
            >
              Update Settings
            </button>
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
    </div>
  );
};

export default Settings;