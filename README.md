# Reddit Sentiment Analyzer

A full-stack web application that analyzes sentiment from Reddit posts and comments using AI APIs (Claude/ChatGPT). Get insights into community sentiment, trending topics, and emotional patterns across different subreddits.

## Features

- **Multi-subreddit Analysis**: Analyze sentiment across multiple subreddits simultaneously
- **Date Range Selection**: Focus on specific time periods for targeted analysis
- **AI-Powered Sentiment Analysis**: Uses Claude or ChatGPT APIs for accurate sentiment scoring
- **Interactive Visualizations**: Charts and graphs showing sentiment trends over time
- **Subreddit Comparison**: Compare sentiment across different communities
- **Post & Comment Analysis**: Detailed breakdown of individual posts and comments
- **Export Functionality**: Export results as JSON or CSV files
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React with TypeScript, Recharts for visualizations
- **Backend**: Node.js with Express
- **APIs**: Reddit API, Claude API, OpenAI API
- **Styling**: Custom CSS with responsive design

## Setup Instructions

### Prerequisites

1. **Reddit API Credentials**:
   - Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
   - Create a new application (script type)
   - Note your Client ID and Client Secret

2. **AI API Key** (choose one or both):
   - **Claude API**: Get key from [Anthropic Console](https://console.anthropic.com/)
   - **OpenAI API**: Get key from [OpenAI Platform](https://platform.openai.com/)

### Installation

1. **Clone or download** this project to your local machine

2. **Install backend dependencies**:
   ```bash
   cd "Reddit analyzer"
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Create environment file**:
   - Copy `.env.example` to `.env`
   - Fill in your API credentials:
   ```env
   # Reddit API credentials
   REDDIT_CLIENT_ID=your_reddit_client_id
   REDDIT_CLIENT_SECRET=your_reddit_client_secret
   REDDIT_USER_AGENT=RedditSentimentAnalyzer/1.0

   # AI API keys (you need at least one)
   CLAUDE_API_KEY=your_claude_api_key
   OPENAI_API_KEY=your_openai_api_key

   # Server configuration
   PORT=3001
   ```

### Running the Application

1. **Start both frontend and backend**:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3001`
   - Frontend React app on `http://localhost:3000`

2. **Or run them separately**:
   ```bash
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run client
   ```

3. **Open your browser** and go to `http://localhost:3000`

## How to Use

1. **Enter Subreddits**: Type subreddit names (without "r/") separated by commas
   - Example: `technology, gaming, movies`

2. **Select Date Range**: Choose start and end dates for analysis
   - Recent dates work best (Reddit API limitations)

3. **Set Post Limit**: Choose how many posts per subreddit to analyze
   - More posts = better insights but slower analysis

4. **Start Analysis**: Click "Start Analysis" and wait for results
   - Analysis typically takes 1-5 minutes depending on data volume

5. **Explore Results**: Use the tabs to view:
   - **Overview**: Overall sentiment and key themes
   - **Timeline**: Sentiment trends over time
   - **Subreddits**: Comparison between communities
   - **Posts**: Individual post details and comments

6. **Export Data**: Use export buttons to download results as JSON or CSV

## API Usage & Costs

- **Reddit API**: Free with rate limits
- **Claude API**: Pay-per-use, very cost-effective
- **OpenAI API**: Pay-per-use, slightly more expensive

Typical cost for analyzing 50 posts with comments: $0.01-0.05

## Troubleshooting

### Common Issues

1. **"Failed to authenticate with Reddit API"**:
   - Check your Reddit Client ID and Secret
   - Ensure your User Agent is properly set

2. **"Failed to connect to server"**:
   - Make sure the backend is running on port 3001
   - Check if your firewall is blocking the connection

3. **AI Analysis fails**:
   - Verify your Claude/OpenAI API key is correct
   - Check if you have sufficient API credits
   - Try with fewer posts to reduce API load

4. **No posts found in date range**:
   - Try a wider date range
   - Some subreddits may have less activity
   - Ensure subreddit names are spelled correctly

### Performance Tips

- Start with 10-25 posts per subreddit for faster results
- Use recent date ranges (last 1-2 weeks work best)
- Analyze 1-3 subreddits at a time initially

## Features Explained

### Sentiment Scoring
- **Range**: -1 (very negative) to +1 (very positive)
- **Classification**: Positive, Neutral, Negative
- **Confidence**: AI model's confidence in the score

### Visualizations
- **Pie Chart**: Overall sentiment distribution
- **Line Chart**: Sentiment trends over time
- **Bar Charts**: Subreddit comparisons
- **Tables**: Detailed statistics

### Themes & Emotions
- **Themes**: Topics and subjects discussed
- **Emotions**: Emotional tones detected in content
- **Frequency**: How often themes/emotions appear

## Project Structure

```
Reddit analyzer/
├── server/                 # Backend Node.js application
│   ├── services/          # Reddit and sentiment analysis services
│   └── index.js          # Main server file
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   └── types.ts      # TypeScript type definitions
│   └── public/
├── package.json          # Root package configuration
└── README.md            # This file
```

## Contributing

Feel free to submit issues and enhancement requests! This is a learning project showcasing:
- Full-stack development
- API integration
- Data visualization
- AI/ML integration
- Modern web development practices

## License

This project is for educational and personal use. Please respect Reddit's API terms of service and the AI providers' usage policies.