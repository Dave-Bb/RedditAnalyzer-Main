// API Configuration - automatically detects environment
const getServerUrl = () => {
  // In production, use Cloudflare Workers API
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || 'https://your-worker-name.your-subdomain.workers.dev';
  }
  
  // In development, use local server
  const defaultPort = process.env.REACT_APP_SERVER_PORT || '3001';
  return `http://localhost:${defaultPort}`;
};

export const API_BASE_URL = getServerUrl();
export const API_ENDPOINTS = {
  SETTINGS: `${API_BASE_URL}/api/settings`,
  ANALYZE: `${API_BASE_URL}/api/analyze`,
  HEALTH: `${API_BASE_URL}/api/health`,
  ANALYSES: `${API_BASE_URL}/api/analyses`,
  LOGS: `${API_BASE_URL}/api/logs`,
  REANALYZE_CURRENT: `${API_BASE_URL}/api/reanalyze-current`,
  TEST_KEYS: `${API_BASE_URL}/api/test-keys`,
  UPDATE_SETTINGS: `${API_BASE_URL}/api/update-settings`,
  REGENERATE_INSIGHTS: `${API_BASE_URL}/api/regenerate-claude-insights`,
  CANCEL_ANALYSIS: `${API_BASE_URL}/api/cancel-analysis`,
  ACTIVE_ANALYSES: `${API_BASE_URL}/api/active-analyses`,
};