// Pre-generated comprehensive analyses for demo purposes
// Generated locally with full comment fetching and deep analysis

import { AnalysisData } from '../types';

export const sampleAnalyses: Array<{
  id: string;
  name: string;
  description: string;
  generated_at: string;
  subreddits: string[];
  totalPosts: number;
  totalComments: number;
  dateRange: { startDate: string; endDate: string };
  data: AnalysisData;
}> = [];

export const getSampleAnalysis = (id: string) => {
  return sampleAnalyses.find(analysis => analysis.id === id);
};

export const getAllSampleAnalyses = () => {
  return sampleAnalyses.map(({ data, ...metadata }) => metadata);
};