import React from 'react';

const About: React.FC = () => {
  return (
    <div className="about">
      <div className="about-header">
        <h3 className="about-subtitle">Intelligent sentiment analysis for Reddit communities</h3>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h3>What is Bacon Brain AI?</h3>
          <p>
            Bacon Brain AI is a powerful sentiment analysis tool that helps you understand the emotional tone
            and opinions within Reddit communities. By analyzing posts and comments from specified subreddits,
            it provides detailed insights into community sentiment, trending topics, and emotional patterns.
          </p>
        </section>

        <section className="about-section">
          <h3>Key Features</h3>
          <ul>
            <li><strong>Multi-Subreddit Analysis:</strong> Analyze sentiment across multiple Reddit communities simultaneously</li>
            <li><strong>AI-Powered Insights:</strong> Uses advanced AI models (Claude 3.5 Sonnet and OpenAI GPT-4) for accurate sentiment analysis</li>
            <li><strong>Comprehensive Data:</strong> Processes both posts and comments for thorough community understanding</li>
            <li><strong>Visual Analytics:</strong> Interactive charts and graphs to visualize sentiment trends</li>
            <li><strong>Historical Tracking:</strong> Save and revisit past analyses to track sentiment changes over time</li>
            <li><strong>Flexible Date Ranges:</strong> Analyze sentiment for specific time periods</li>
            <li><strong>Real-time Progress:</strong> Monitor analysis progress with live updates and token usage tracking</li>
          </ul>
        </section>

        <section className="about-section">
          <h3>How It Works</h3>
          <ol>
            <li><strong>Data Collection:</strong> Fetches posts and comments from specified subreddits using Reddit's API</li>
            <li><strong>Text Processing:</strong> Cleans and prepares text content for analysis</li>
            <li><strong>AI Analysis:</strong> Uses state-of-the-art language models to determine sentiment scores, themes, and emotions</li>
            <li><strong>Data Aggregation:</strong> Combines individual results into comprehensive community insights</li>
            <li><strong>Visualization:</strong> Presents findings through intuitive charts and summaries</li>
          </ol>
        </section>

        <section className="about-section">
          <h3>What You Get</h3>
          <div className="feature-grid">
            <div className="feature-item">
              <h4>Sentiment Scores</h4>
              <p>Overall positive, negative, and neutral sentiment percentages for the community</p>
            </div>
            <div className="feature-item">
              <h4>Trending Topics</h4>
              <p>Dominant themes and topics being discussed within the analyzed timeframe</p>
            </div>
            <div className="feature-item">
              <h4>Emotional Analysis</h4>
              <p>Key emotions detected in the community conversations</p>
            </div>
            <div className="feature-item">
              <h4>Individual Post Analysis</h4>
              <p>Detailed sentiment breakdown for each post and comment</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h3>API Requirements</h3>
          <p>
            To use Bacon Brain AI, you'll need API keys from:
          </p>
          <ul>
            <li><strong>Reddit API:</strong> For accessing Reddit posts and comments</li>
            <li><strong>AI Provider:</strong> Either Claude (Anthropic) or OpenAI for sentiment analysis</li>
          </ul>
          <p>
            <strong>Important:</strong> Using this tool will incur costs from your AI provider based on the amount
            of text analyzed. Costs vary depending on the number of posts, comments, and text length processed.
          </p>
        </section>

        <section className="about-section">
          <h3>Perfect For</h3>
          <ul>
            <li>Community managers understanding their audience</li>
            <li>Researchers studying online sentiment and trends</li>
            <li>Marketers analyzing brand perception</li>
            <li>Content creators understanding community reactions</li>
            <li>Anyone curious about the emotional pulse of Reddit communities</li>
          </ul>
        </section>

        <section className="about-section about-tech">
          <h3>Built With</h3>
          <p>Built with Kiro and Claude</p>
          <div className="tech-stack">
            <div className="tech-category">
              <h4>Frontend</h4>
              <ul>
                <li>React 18 with TypeScript</li>
                <li>Recharts for data visualization</li>
                <li>Custom CSS for styling</li>
              </ul>
            </div>
            <div className="tech-category">
              <h4>Backend</h4>
              <ul>
                <li>Node.js with Express</li>
                <li>Reddit OAuth 2.0 API</li>
                <li>Claude & OpenAI APIs</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="about-section about-tech">
          <h3>🔗 Source Code</h3>
          <p>
            Bacon Brain AI is open source! You can view the complete source code, contribute to the project,
            or report issues on GitHub.
          </p>
          <div className="github-link-container">
            <a
              href="https://github.com/Dave-Bb/RedditAnalyzer-Main"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
            >
              <span className="github-icon">🔗</span>
              <div className="github-text">
                <strong>View on GitHub</strong>
                <span className="github-desc">Dave-Bb/RedditAnalyzer-Main</span>
              </div>
              <span className="external-icon">↗</span>
            </a>
          </div>
          <p className="github-note">
            Found a bug or have a feature request? Feel free to open an issue or submit a pull request!
          </p>
        </section>
      </div>
    </div>
  );
};

export default About;