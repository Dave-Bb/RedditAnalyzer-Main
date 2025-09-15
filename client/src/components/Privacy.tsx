import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="about">
      <div className="about-header">
        <div className="about-hero">
          <h2>Privacy & Legal</h2>
          <p>Your privacy and data security are our priority</p>
        </div>
      </div>

      <div className="about-content">
        <div className="about-section">
          <h3>🔐 API Key Security</h3>
          <p>
            <strong>We do NOT store your API keys.</strong> All API keys (Reddit, Claude, OpenAI) are:
          </p>
          <ul>
            <li>Stored locally in your browser only</li>
            <li>Never transmitted to our servers</li>
            <li>Automatically cleared when you close your browser</li>
            <li>Used only for direct API calls from your browser</li>
          </ul>
        </div>

        <div className="about-section">
          <h3>📊 Data Processing</h3>
          <p>
            Your analysis data is processed as follows:
          </p>
          <ul>
            <li><strong>Reddit Data:</strong> Fetched directly from Reddit's public API using your credentials</li>
            <li><strong>AI Analysis:</strong> Sent directly to AI providers (Claude/OpenAI) from your browser</li>
            <li><strong>Results:</strong> Temporarily stored on our servers only during analysis processing</li>
            <li><strong>Local Storage:</strong> Analysis results are saved locally in your browser</li>
          </ul>
        </div>

        <div className="about-section">
          <h3>🚫 Reddit Disclaimer</h3>
          <p>
            <strong>We are not affiliated with Reddit Inc.</strong>
          </p>
          <ul>
            <li>This tool uses Reddit's public API for data analysis</li>
            <li>We are an independent third-party application</li>
            <li>Reddit is a trademark of Reddit Inc.</li>
            <li>All Reddit data belongs to Reddit Inc. and respective users</li>
          </ul>
        </div>

        <div className="about-section">
          <h3>⚖️ Limitation of Liability</h3>
          <p>
            <strong>This tool is provided "as-is" without warranties.</strong>
          </p>
          <ul>
            <li>We are not responsible for the accuracy of AI-generated analysis</li>
            <li>Sentiment analysis results are computational estimates, not facts</li>
            <li>Users are responsible for their own API usage and costs</li>
            <li>We are not liable for any API rate limits or service disruptions</li>
            <li>Analysis results should not be used for making important decisions without human verification</li>
          </ul>
        </div>

        <div className="about-section">
          <h3>🛡️ Data Retention</h3>
          <p>
            Our data retention practices:
          </p>
          <ul>
            <li><strong>API Keys:</strong> Never stored on our servers</li>
            <li><strong>Analysis Data:</strong> Temporarily cached during processing, then deleted</li>
            <li><strong>Sample Analyses:</strong> Pre-generated examples that contain no personal data</li>
            <li><strong>Server Logs:</strong> Basic access logs retained for security purposes only</li>
          </ul>
        </div>

        <div className="about-section">
          <h3>🌐 Third-Party Services</h3>
          <p>
            This application interacts with:
          </p>
          <ul>
            <li><strong>Reddit API:</strong> Subject to Reddit's Terms of Service and Privacy Policy</li>
            <li><strong>OpenAI API:</strong> Subject to OpenAI's Terms of Use and Privacy Policy</li>
            <li><strong>Anthropic Claude API:</strong> Subject to Anthropic's Terms of Service and Privacy Policy</li>
          </ul>
          <p>
            Please review the privacy policies of these services for their data handling practices.
          </p>
        </div>

        <div className="about-section about-tech">
          <h3>📧 Contact</h3>
          <p>
            If you have questions about privacy or data handling, please contact us through our GitHub repository issues page.
          </p>
          <p>
            <strong>Remember:</strong> Never share your API keys with anyone. We will never ask for them.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;