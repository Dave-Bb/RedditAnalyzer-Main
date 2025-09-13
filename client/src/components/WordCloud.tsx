import React, { useMemo } from 'react';

interface WordCloudProps {
  themes: string[];
  emotions?: string[];
}

const WordCloud: React.FC<WordCloudProps> = ({ themes, emotions = [] }) => {
  const allWords = useMemo(() => {
    const words = [...themes, ...emotions];
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Show top 20 words
  }, [themes, emotions]);

  const getWordSize = (count: number, maxCount: number) => {
    const minSize = 0.8;
    const maxSize = 2.5;
    const ratio = count / maxCount;
    return minSize + (ratio * (maxSize - minSize));
  };

  const getWordColor = (index: number) => {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c', 
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3',
      '#d299c2', '#fef9d7', '#dee5ff', '#b7f8db'
    ];
    return colors[index % colors.length];
  };

  const maxCount = allWords.length > 0 ? allWords[0].count : 1;

  return (
    <div className="word-cloud">
      <div className="word-cloud-header">
        <h3>🏷️ Theme & Emotion Cloud</h3>
        <p>Most mentioned themes and emotions</p>
      </div>
      
      <div className="word-cloud-container">
        {allWords.map((item, index) => (
          <div
            key={item.word}
            className="word-cloud-item"
            style={{
              fontSize: `${getWordSize(item.count, maxCount)}rem`,
              color: getWordColor(index),
              '--delay': `${index * 0.1}s`
            } as React.CSSProperties}
          >
            {item.word}
            {item.count > 1 && (
              <span className="word-count">×{item.count}</span>
            )}
          </div>
        ))}
      </div>
      
      {allWords.length === 0 && (
        <div className="no-words">
          <p>No themes or emotions to display</p>
        </div>
      )}
    </div>
  );
};

export default WordCloud;