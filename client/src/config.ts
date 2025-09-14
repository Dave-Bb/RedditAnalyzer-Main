// API Configuration - FORCE production URL
export const API_BASE_URL = 'https://reddit-analyzer-api.fridayfeelingdev.workers.dev';

// Add a comment to force rebuild
// Build timestamp: ${new Date().toISOString()}
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