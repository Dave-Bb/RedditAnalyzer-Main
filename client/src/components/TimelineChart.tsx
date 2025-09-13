import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area } from 'recharts';
import { TimelineData } from '../types';
import { format, parseISO } from 'date-fns';

interface TimelineChartProps {
  data: TimelineData[];
}

const TimelineChart: React.FC<TimelineChartProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd');
    } catch {
      return dateString;
    }
  };

  const chartData = data.map(item => ({
    ...item,
    formattedDate: formatDate(item.date),
    positive_pct: item.total > 0 ? Number(((item.positive / item.total) * 100).toFixed(1)) : 0,
    neutral_pct: item.total > 0 ? Number(((item.neutral / item.total) * 100).toFixed(1)) : 0,
    negative_pct: item.total > 0 ? Number(((item.negative / item.total) * 100).toFixed(1)) : 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'white',
          padding: '16px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          minWidth: '200px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px' }}>
            📅 {label}
          </p>
          <div style={{ fontSize: '12px' }}>
            <p style={{ margin: '4px 0', color: '#2196F3' }}>
              📊 Avg Score: {data.average_score?.toFixed(3)}
            </p>
            <p style={{ margin: '4px 0', color: '#4CAF50' }}>
              😊 Positive: {data.positive} ({data.positive_pct}%)
            </p>
            <p style={{ margin: '4px 0', color: '#FF9800' }}>
              😐 Neutral: {data.neutral} ({data.neutral_pct}%)
            </p>
            <p style={{ margin: '4px 0', color: '#f44336' }}>
              😞 Negative: {data.negative} ({data.negative_pct}%)
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              📈 Total: {data.total} items
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    const commonElements = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="formattedDate" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#666' }}
        />
        <YAxis 
          domain={[-1, 1]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#666' }}
          label={{ value: 'Sentiment Score', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
      </>
    );

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {commonElements}
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="average_score" 
              stroke="#2196F3" 
              strokeWidth={3}
              fill="url(#colorScore)"
              animationDuration={1200}
            />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
              label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="positive" stackId="a" fill="#4CAF50" name="😊 Positive" radius={[2, 2, 0, 0]} />
            <Bar dataKey="neutral" stackId="a" fill="#FF9800" name="😐 Neutral" radius={[2, 2, 0, 0]} />
            <Bar dataKey="negative" stackId="a" fill="#f44336" name="😞 Negative" radius={[2, 2, 0, 0]} />
          </BarChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            {commonElements}
            <Line 
              type="monotone" 
              dataKey="average_score" 
              stroke="#2196F3" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#2196F3', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#2196F3', strokeWidth: 2, stroke: '#fff' }}
              animationDuration={1200}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="timeline-charts">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ margin: 0, color: '#333' }}>Sentiment Timeline</h3>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
            Track how sentiment evolved over time
          </p>
        </div>
        <div className="chart-actions">
          <button 
            className={`chart-action-btn ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => setChartType('line')}
          >
            📈 Line
          </button>
          <button 
            className={`chart-action-btn ${chartType === 'area' ? 'active' : ''}`}
            onClick={() => setChartType('area')}
          >
            🏔️ Area
          </button>
          <button 
            className={`chart-action-btn ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
          >
            📊 Stacked
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default TimelineChart;