const fs = require('fs').promises;
const path = require('path');

class StorageService {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.analysesFile = path.join(this.dataDir, 'analyses.json');
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  async loadAnalyses() {
    try {
      const data = await fs.readFile(this.analysesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // File doesn't exist yet
      }
      throw error;
    }
  }

  async saveAnalyses(analyses) {
    await this.ensureDataDir();
    await fs.writeFile(this.analysesFile, JSON.stringify(analyses, null, 2));
  }

  async saveAnalysis(analysisData, metadata) {
    const analyses = await this.loadAnalyses();
    
    const newAnalysis = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      name: metadata.name || this.generateDefaultName(analysisData),
      description: metadata.description || '',
      tags: metadata.tags || [],
      subreddits: analysisData.summary.subreddits,
      dateRange: analysisData.summary.dateRange,
      summary: {
        totalPosts: analysisData.summary.totalPosts,
        totalComments: analysisData.summary.totalComments,
        overallSentiment: analysisData.analysis.overall_analysis.average_score,
        dominantSentiment: this.getDominantSentiment(analysisData.analysis.overall_analysis.sentiment_distribution),
        topThemes: analysisData.analysis.overall_analysis.dominant_themes.slice(0, 3)
      },
      data: analysisData
    };

    analyses.unshift(newAnalysis); // Add to beginning
    
    // Keep only the last 100 analyses to prevent file from getting too large
    if (analyses.length > 100) {
      analyses.splice(100);
    }

    await this.saveAnalyses(analyses);
    return newAnalysis;
  }

  async getAnalysis(id) {
    const analyses = await this.loadAnalyses();
    return analyses.find(analysis => analysis.id === id);
  }

  async deleteAnalysis(id) {
    const analyses = await this.loadAnalyses();
    const filteredAnalyses = analyses.filter(analysis => analysis.id !== id);
    await this.saveAnalyses(filteredAnalyses);
    return { success: true, deleted: analyses.length !== filteredAnalyses.length };
  }

  async updateAnalysis(id, updatedAnalysis) {
    const analyses = await this.loadAnalyses();
    const index = analyses.findIndex(analysis => analysis.id === id);
    
    if (index === -1) {
      throw new Error('Analysis not found');
    }

    analyses[index] = updatedAnalysis;
    await this.saveAnalyses(analyses);
    return updatedAnalysis;
  }

  async getAnalysesList() {
    const analyses = await this.loadAnalyses();
    // Return only metadata, not full data
    return analyses.map(analysis => {
      const { data, ...metadata } = analysis;
      return metadata;
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  generateDefaultName(analysisData) {
    const subreddits = analysisData.summary.subreddits.join(', ');
    const date = new Date().toLocaleDateString();
    return `${subreddits} - ${date}`;
  }

  getDominantSentiment(distribution) {
    const entries = Object.entries(distribution);
    entries.sort(([,a], [,b]) => b - a);
    return entries[0][0];
  }
}

module.exports = new StorageService();