import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { SentimentAnalysis } from '../types';

interface SentimentChartProps {
  data: SentimentAnalysis;
}

const SentimentChart: React.FC<SentimentChartProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  const chartData = [
    { name: 'Positive', value: data.overall_analysis.sentiment_distribution.positive, color: '#4CAF50', icon: '😊' },
    { name: 'Neutral', value: data.overall_analysis.sentiment_distribution.neutral, color: '#FF9800', icon: '😐' },
    { name: 'Negative', value: data.overall_analysis.sentiment_distribution.negative, color: '#f44336', icon: '😞' }
  ];

  const COLORS = ['#4CAF50', '#FF9800', '#f44336'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for very small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'white',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            {data.icon} {data.name}
          </p>
          <p style={{ margin: '4px 0 0 0', color: data.color }}>
            {data.value}% of responses
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sentiment-chart">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="chart-actions">
          <button 
            className={`chart-action-btn ${chartType === 'pie' ? 'active' : ''}`}
            onClick={() => setChartType('pie')}
          >
            🍰 Pie
          </button>
          <button 
            className={`chart-action-btn ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
          >
            📊 Bar
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={1200}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value, entry: any) => `${entry.payload.icon} ${value}`}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        ) : (
          <BarChart data={chartData}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
              label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
              animationDuration={1200}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentChart;