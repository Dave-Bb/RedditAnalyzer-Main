import React, { useMemo } from 'react';
import { TimelineData } from '../types';

interface SentimentHeatmapProps {
  data: TimelineData[];
}

const SentimentHeatmap: React.FC<SentimentHeatmapProps> = ({ data }) => {
  const heatmapData = useMemo(() => {
    // Create a 7x24 grid (days of week x hours of day)
    const grid = Array(7).fill(null).map(() => Array(24).fill(null).map(() => ({
      count: 0,
      totalScore: 0,
      averageScore: 0
    })));

    data.forEach(item => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const hour = date.getHours();
      
      if (grid[dayOfWeek] && grid[dayOfWeek][hour]) {
        grid[dayOfWeek][hour].count += item.total;
        grid[dayOfWeek][hour].totalScore += item.average_score * item.total;
        grid[dayOfWeek][hour].averageScore = grid[dayOfWeek][hour].totalScore / grid[dayOfWeek][hour].count;
      }
    });

    return grid;
  }, [data]);

  const getColorIntensity = (score: number, count: number) => {
    if (count === 0) return 'rgba(240, 240, 240, 0.3)';
    
    // Normalize score to 0-1 range (assuming scores are between -1 and 1)
    const normalizedScore = (score + 1) / 2;
    
    // Color based on sentiment
    if (score > 0.1) {
      return `rgba(76, 175, 80, ${0.3 + normalizedScore * 0.7})`;
    } else if (score < -0.1) {
      return `rgba(244, 67, 54, ${0.3 + (1 - normalizedScore) * 0.7})`;
    } else {
      return `rgba(255, 152, 0, ${0.3 + Math.abs(score) * 0.4})`;
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="sentiment-heatmap">
      <div className="heatmap-header">
        <h3>📅 Sentiment Activity Heatmap</h3>
        <p>Sentiment patterns by day of week and hour</p>
      </div>

      <div className="heatmap-container">
        <div className="heatmap-grid">
          {/* Hour labels */}
          <div className="hour-labels">
            <div className="corner-label"></div>
            {hours.map(hour => (
              <div key={hour} className="hour-label">
                {hour.toString().padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {dayNames.map((day, dayIndex) => (
            <div key={day} className="day-row">
              <div className="day-label">{day}</div>
              {hours.map(hour => {
                const cellData = heatmapData[dayIndex][hour];
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className="heatmap-cell"
                    style={{
                      backgroundColor: getColorIntensity(cellData.averageScore, cellData.count)
                    }}
                    title={`${day} ${hour}:00 - Score: ${cellData.averageScore.toFixed(3)}, Posts: ${cellData.count}`}
                  >
                    <div className="cell-content">
                      {cellData.count > 0 && (
                        <>
                          <div className="cell-score">{cellData.averageScore.toFixed(2)}</div>
                          <div className="cell-count">{cellData.count}</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="heatmap-legend">
          <div className="legend-title">Sentiment Scale</div>
          <div className="legend-gradient">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(244, 67, 54, 0.8)' }}></div>
              <span>Negative</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(255, 152, 0, 0.8)' }}></div>
              <span>Neutral</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(76, 175, 80, 0.8)' }}></div>
              <span>Positive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentHeatmap;