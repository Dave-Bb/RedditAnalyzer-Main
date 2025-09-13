import React, { useState } from 'react';
import axios from 'axios';
import { AnalysisData } from '../types';

interface AnalysisFormProps {
  onAnalysisComplete: (data: AnalysisData) => void;
  onAnalysisStart: () => void;
  onError: (error: string) => void;
  isLoading: boolean;
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({
  onAnalysisComplete,
  onAnalysisStart,
  onError,
  isLoading
}) => {
  const [subreddits, setSubreddits] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [postLimit, setPostLimit] = useState(25);

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

    const subredditList = subreddits
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    onAnalysisStart();

    try {
      const response = await axios.post('http://localhost:3001/api/analyze', {
        subreddits: subredditList,
        startDate,
        endDate,
        postLimit
      });

      if (response.data.success) {
        onAnalysisComplete(response.data.data);
      } else {
        onError(response.data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      onError(
        error.response?.data?.error || 
        error.message || 
        'Failed to connect to server. Make sure the backend is running.'
      );
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
  }, []);

  return (
    <div className="analysis-form">
      <h2>Configure Analysis</h2>
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

        <button 
          type="submit" 
          disabled={isLoading}
          className="analyze-button"
        >
          {isLoading ? 'Analyzing...' : 'Start Analysis'}
        </button>
      </form>

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