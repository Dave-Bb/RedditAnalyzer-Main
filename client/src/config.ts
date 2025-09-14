// API Configuration - automatically detects server port
const getServerUrl = () => {
  // Try common ports in order
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const possiblePorts = [3001, 3002, 3003, 3004];

  // In development, try to detect the actual server port
  // For now, default to 3001 but allow override
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