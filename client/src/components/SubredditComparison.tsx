import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SubredditData {
  [subreddit: string]: {
    scores: number[];
    positive: number;
    neutral: number;
    negative: number;
    average_score: number;
    total_analyzed: number;
  };
}

interface SubredditComparisonProps {
  data: SubredditData;
}

const SubredditComparison: React.FC<SubredditComparisonProps> = ({ data }) => {
  const chartData = Object.entries(data).map(([subreddit, stats]) => ({
    subreddit: `r/${subreddit}`,
    'Average Score': Number(stats.average_score.toFixed(3)),
    'Positive %': Number(((stats.positive / stats.total_analyzed) * 100).toFixed(1)),
    'Neutral %': Number(((stats.neutral / stats.total_analyzed) * 100).toFixed(1)),
    'Negative %': Number(((stats.negative / stats.total_analyzed) * 100).toFixed(1)),
    'Total Items': stats.total_analyzed
  }));

  const sortedData = [...chartData].sort((a, b) => b['Average Score'] - a['Average Score']);

  return (
    <div className="subreddit-comparison">
      <h3>Subreddit Comparison</h3>
      
      <div className="chart-section">
        <h4>Average Sentiment Scores</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="subreddit" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              domain={[-1, 1]}
              tick={{ fontSize: 12 }}
              label={{ value: 'Sentiment Score', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value, name) => [value, name]}
              labelFormatter={(label) => `Subreddit: ${label}`}
            />
            <Bar 
              dataKey="Average Score" 
              fill="#2196F3"
              name="Average Sentiment Score"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-section">
        <h4>Sentiment Distribution by Subreddit</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="subreddit"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value, name) => [`${value}%`, name]}
              labelFormatter={(label) => `Subreddit: ${label}`}
            />
            <Legend />
            <Bar dataKey="Positive %" stackId="a" fill="#4CAF50" name="Positive %" />
            <Bar dataKey="Neutral %" stackId="a" fill="#FFC107" name="Neutral %" />
            <Bar dataKey="Negative %" stackId="a" fill="#F44336" name="Negative %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="subreddit-table">
        <h4>Detailed Statistics</h4>
        <table>
          <thead>
            <tr>
              <th>Subreddit</th>
              <th>Avg Score</th>
              <th>Positive</th>
              <th>Neutral</th>
              <th>Negative</th>
              <th>Total Items</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr key={index}>
                <td>{row.subreddit}</td>
                <td className={`score-cell ${
                  row['Average Score'] > 0.1 ? 'positive' :
                  row['Average Score'] < -0.1 ? 'negative' : 'neutral'
                }`}>
                  {row['Average Score']}
                </td>
                <td>{row['Positive %']}%</td>
                <td>{row['Neutral %']}%</td>
                <td>{row['Negative %']}%</td>
                <td>{row['Total Items']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="subreddit-insights">
        <h4>Key Insights</h4>
        <div className="insights-grid">
          <div className="insight-card">
            <h5>Most Positive</h5>
            <p>{sortedData[0]?.subreddit} ({sortedData[0]?.['Average Score']})</p>
          </div>
          <div className="insight-card">
            <h5>Most Negative</h5>
            <p>{sortedData[sortedData.length - 1]?.subreddit} ({sortedData[sortedData.length - 1]?.['Average Score']})</p>
          </div>
          <div className="insight-card">
            <h5>Most Active</h5>
            <p>{[...sortedData].sort((a, b) => b['Total Items'] - a['Total Items'])[0]?.subreddit}</p>
          </div>
          <div className="insight-card">
            <h5>Most Balanced</h5>
            <p>{[...sortedData].sort((a, b) => Math.abs(a['Average Score']) - Math.abs(b['Average Score']))[0]?.subreddit}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubredditComparison;