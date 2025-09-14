# Reddit Brain AI

A powerful full-stack web application that provides intelligent sentiment analysis for Reddit communities using advanced AI models. Get deep insights into community sentiment, trending topics, and emotional patterns across different subreddits with real-time progress tracking and comprehensive analytics.

## ✨ Key Features

### Core Analysis
- **Multi-subreddit Analysis**: Analyze sentiment across multiple Reddit communities simultaneously
- **AI-Powered Insights**: Uses Claude 3.5 Sonnet and OpenAI GPT-4 for accurate sentiment analysis
- **Comprehensive Data Processing**: Analyzes both posts and comments for thorough community understanding
- **Flexible Date Ranges**: Focus on specific time periods for targeted analysis

### User Experience
- **Real-time Progress Tracking**: Monitor analysis progress with live updates and token usage
- **Interactive Dashboard**: Modern, responsive interface with dark/light mode support
- **Analysis History**: Save and revisit past analyses to track sentiment changes over time
- **Cancellable Operations**: Stop running analyses at any time
- **Modal-based Workflow**: Streamlined analysis configuration and monitoring

### Advanced Analytics
- **Framework Analysis**: Deep-dive analytical insights using structured frameworks
- **Synthetic Post Generation**: AI-generated realistic posts based on community patterns
- **Model Comparison**: Switch between Claude and OpenAI models for different perspectives
- **Re-analysis Capability**: Re-run analyses with different AI models on saved data
- **Export Functionality**: Export results as JSON or CSV files

### Developer Features
- **Automated Hooks**: Kiro-powered automation for development workflows
- **API Health Monitoring**: Real-time server status and connection testing
- **Comprehensive Logging**: Detailed analysis logs with real-time streaming
- **Progress API**: RESTful endpoints for monitoring analysis progress

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Recharts** for interactive data visualizations
- **Axios** for API communication with progress tracking
- **Custom CSS** with dark/light theme support
- **Real-time EventSource** for live log streaming

### Backend
- **Node.js** with Express framework
- **Reddit OAuth 2.0 API** for data fetching
- **Claude 3.5 Sonnet & OpenAI GPT-4** APIs for AI analysis
- **Server-Sent Events (SSE)** for real-time updates
- **JSON file storage** for analysis persistence
- **AbortController** for cancellable operations

### Development Tools
- **Kiro Hooks** for automated development workflows
- **Concurrently** for running multiple servers
- **Nodemon** for development hot-reloading
- **TypeScript** for enhanced code quality

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

1. **Start both frontend and backend** (recommended):
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

### 🚀 Quick Start with Kiro Hooks

If you're using Kiro IDE, you can use the automated hooks:
- **Start Dev Servers**: Automatically starts both frontend and backend
- **Build Production**: Creates optimized production build
- **Stop Dev Servers**: Cleanly stops all running servers

Access these through the Kiro Hook UI or command palette.

## 📊 How to Use

### Getting Started
1. **Configure API Keys**: Go to Settings and enter your Reddit and AI API credentials
2. **Test Connections**: Use the built-in key testing to verify your setup
3. **Start New Analysis**: Click "➕ New Analysis" to begin

### Running Analysis
1. **Configure Parameters**:
   - **Subreddits**: Enter names without "r/" (e.g., `technology, gaming, movies`)
   - **Date Range**: Select start and end dates (recent dates work best)
   - **Post Limit**: Choose posts per subreddit (10-50 recommended for speed)

2. **Monitor Progress**: 
   - Real-time progress bar with percentage completion
   - Live log streaming showing current operations
   - Token usage tracking for cost monitoring
   - Elapsed time counter

3. **Cancel if Needed**: Stop analysis at any time using the cancel button

### Exploring Results
Navigate through comprehensive analytics:
- **📊 Dashboard**: Main analysis view with sentiment overview
- **📈 Timeline**: Sentiment trends over time with interactive charts
- **🏘️ Subreddits**: Community-by-community comparison
- **📝 Posts**: Individual post and comment analysis
- **🤖 AI Insights**: Deep analytical insights from AI models
- **🔬 Framework Analysis**: Structured analytical frameworks
- **🎭 Synthetic Posts**: AI-generated realistic community posts

### Advanced Features
- **Re-analysis**: Run the same data through different AI models
- **History Management**: Save, load, and organize past analyses
- **Export Options**: Download results as JSON or CSV
- **Dark/Light Mode**: Toggle between themes for comfort

## 💰 API Usage & Costs

### API Requirements
- **Reddit API**: Free with rate limits (required for data fetching)
- **AI Provider**: Choose one or both:
  - **Claude 3.5 Sonnet**: Pay-per-use, very cost-effective (~$0.003/1K tokens)
  - **OpenAI GPT-4**: Pay-per-use, slightly more expensive (~$0.03/1K tokens)

### Cost Estimation
- **Small Analysis** (10-25 posts): $0.01-0.03
- **Medium Analysis** (25-50 posts): $0.03-0.08
- **Large Analysis** (50+ posts): $0.08-0.20

The app provides real-time token usage tracking so you can monitor costs during analysis. Framework analysis and synthetic post generation incur additional small costs.

## 🔧 Troubleshooting

### API Connection Issues

1. **"No valid AI API keys found"**:
   - Go to Settings and enter your API keys
   - Use the "Test Connection" buttons to verify keys
   - Check your `.env` file for proper key formatting

2. **"Failed to authenticate with Reddit API"**:
   - Verify Reddit Client ID and Secret in Settings
   - Ensure User Agent is set (e.g., "RedditBrainAI/1.0")
   - Check Reddit app configuration at reddit.com/prefs/apps

3. **Server connection errors**:
   - Ensure backend is running on port 3001
   - Check firewall settings
   - Try restarting both servers with `npm run dev`

### Analysis Issues

4. **Analysis gets stuck or fails**:
   - Use the cancel button to stop stuck analyses
   - Check real-time logs for specific error messages
   - Try reducing post limit or date range
   - Verify sufficient API credits

5. **No posts found**:
   - Expand date range (Reddit API has limitations)
   - Check subreddit name spelling (no "r/" prefix)
   - Some subreddits may have low activity

6. **High API costs**:
   - Monitor token usage in real-time progress
   - Start with smaller post limits (10-25 posts)
   - Use Claude instead of OpenAI for cost efficiency

### Performance Optimization

- **Quick Analysis**: 10-25 posts, 1-2 subreddits, recent dates
- **Comprehensive Analysis**: 25-50 posts, 2-4 subreddits
- **Deep Dive**: 50+ posts, but expect longer processing time
- **Use Progress Tracking**: Monitor and cancel if needed

## 📈 Features Explained

### Sentiment Analysis
- **Scoring Range**: -1 (very negative) to +1 (very positive)
- **Classification**: Positive, Neutral, Negative with confidence scores
- **Multi-level Analysis**: Posts, comments, and overall community sentiment
- **AI Model Tracking**: Know which model (Claude/OpenAI) generated each result

### Advanced Analytics
- **Framework Analysis**: Structured analytical insights using proven frameworks
- **Synthetic Post Generation**: AI creates realistic posts matching community style
- **Timeline Analysis**: Track sentiment changes over time periods
- **Comparative Analysis**: Side-by-side subreddit comparisons

### Visualizations
- **Interactive Charts**: Recharts-powered responsive visualizations
- **Sentiment Distribution**: Pie charts showing positive/neutral/negative breakdown
- **Timeline Graphs**: Line charts tracking sentiment over time
- **Subreddit Comparisons**: Bar charts comparing communities
- **Detailed Tables**: Sortable data with individual post/comment scores

### Real-time Features
- **Progress Tracking**: Live updates on analysis progress
- **Token Monitoring**: Real-time API usage and cost tracking
- **Log Streaming**: See exactly what the system is doing
- **Cancellation**: Stop analyses at any point

### Data Management
- **Analysis History**: Persistent storage of all analyses
- **Re-analysis**: Run saved data through different AI models
- **Export Options**: JSON and CSV download formats
- **Metadata Tracking**: Analysis dates, models used, performance metrics

## 📁 Project Structure

```
Reddit Brain AI/
├── .kiro/                     # Kiro IDE configuration
│   ├── hooks/                # Automated development workflows
│   └── specs/                # Feature specifications
├── server/                   # Backend Node.js application
│   ├── data/                # Analysis storage (JSON files)
│   ├── services/            # Core services
│   │   ├── redditService.js    # Reddit API integration
│   │   ├── sentimentService.js # AI analysis logic
│   │   └── storageService.js   # Data persistence
│   └── index.js            # Main server with SSE support
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── About.tsx      # About page component
│   │   │   ├── AnalysisForm.tsx # Analysis configuration
│   │   │   ├── Results.tsx     # Results dashboard
│   │   │   ├── Settings.tsx    # API key management
│   │   │   └── History.tsx     # Analysis history
│   │   ├── config.ts       # API endpoint configuration
│   │   ├── types.ts        # TypeScript definitions
│   │   └── App.tsx         # Main application with modal system
│   └── public/             # Static assets and logos
├── .env.example            # Environment template
├── package.json           # Root dependencies and scripts
└── README.md             # This documentation
```

### Key Components
- **Real-time Communication**: Server-Sent Events for live updates
- **Progress Tracking**: Comprehensive analysis monitoring
- **Modal System**: Streamlined user workflow
- **Theme Support**: Dark/light mode throughout
- **Automated Hooks**: Kiro-powered development automation

## 🚀 Recent Updates

### Version 2.0 Features
- **Real-time Progress Tracking**: Live analysis monitoring with progress bars and token counting
- **Analysis Cancellation**: Stop running analyses at any time
- **Modal-based Workflow**: Streamlined analysis configuration and monitoring
- **Framework Analysis**: Deep analytical insights using structured frameworks
- **Synthetic Post Generation**: AI-generated realistic posts based on community patterns
- **Re-analysis Capability**: Run saved data through different AI models
- **Enhanced UI/UX**: Dark/light mode, improved navigation, better error handling
- **Kiro Integration**: Automated development workflows and hooks
- **Advanced API Management**: Robust key validation and model switching

### API Enhancements
- **Server-Sent Events**: Real-time log streaming and progress updates
- **Analysis History**: Persistent storage and management of past analyses
- **Health Monitoring**: Comprehensive API status checking
- **Cancellable Operations**: AbortController integration for all long-running tasks

## 🤝 Contributing

This project showcases modern full-stack development practices:
- **Real-time Web Applications**: SSE, progress tracking, cancellable operations
- **AI Integration**: Multiple model support, cost tracking, robust error handling
- **TypeScript Development**: Type-safe React and Node.js applications
- **Modern UI/UX**: Modal workflows, theme support, responsive design
- **API Design**: RESTful endpoints with real-time capabilities
- **Development Automation**: Kiro hooks for streamlined workflows

Feel free to submit issues and enhancement requests!

## 📄 License

This project is for educational and personal use. Please respect:
- Reddit's API Terms of Service
- Anthropic's Claude API Usage Policies  
- OpenAI's API Usage Policies
- Rate limits and fair usage guidelines

Built with ❤️ using Kiro and Claude