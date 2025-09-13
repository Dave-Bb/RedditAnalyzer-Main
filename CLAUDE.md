# Reddit Sentiment Analyzer

A full-stack web application for analyzing sentiment trends from Reddit posts and comments using AI/ML APIs.

## Project Overview
This is a React TypeScript frontend + Node.js Express backend application that:
- Fetches Reddit data from specified subreddits
- Performs sentiment analysis using Claude AI or OpenAI APIs
- Provides visualizations and insights
- Stores analysis history locally

## Architecture

### Frontend (`/client`)
- **Framework**: React 18 + TypeScript
- **UI Components**: Custom components with CSS
- **Charting**: Recharts library
- **Build Tool**: Create React App
- **Port**: 3000 (development)

### Backend (`/server`) 
- **Framework**: Express.js + Node.js
- **APIs**: Reddit OAuth, Claude API, OpenAI API
- **Storage**: Local JSON file storage
- **Port**: 3001

## Key Files & Components

### Server Files
- `server/index.js` - Main Express server with API routes
- `server/services/redditService.js` - Reddit API integration and data fetching
- `server/services/sentimentService.js` - AI sentiment analysis (Claude/OpenAI)
- `server/services/storageService.js` - Local data persistence

### Client Files  
- `client/src/App.tsx` - Main React app with navigation
- `client/src/components/AnalysisForm.tsx` - Form for starting analysis
- `client/src/components/Results.tsx` - Display analysis results
- `client/src/components/Settings.tsx` - API key configuration
- `client/src/components/History.tsx` - Saved analysis history

## API Endpoints

### Analysis
- `POST /api/analyze` - Start new sentiment analysis
- `GET /api/health` - Health check
- `GET /api/settings` - Check API key status
- `POST /api/test-keys` - Test API connections

### Analysis Storage
- `GET /api/analyses` - List saved analyses
- `GET /api/analyses/:id` - Get specific analysis
- `POST /api/analyses` - Save analysis
- `DELETE /api/analyses/:id` - Delete analysis

## Environment Variables (.env)
```
# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret  
REDDIT_USER_AGENT=YourAppName/1.0

# AI APIs (at least one required)
CLAUDE_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=3001
```

## Scripts
- `npm run dev` - Start both server and client in development
- `npm run server` - Start server only (nodemon)
- `npm run client` - Start client only  
- `npm run build` - Build client for production
- `npm run install-all` - Install dependencies for both server and client

## Current Performance Issue
The app currently makes many individual API requests during analysis ("Making API request with key length 108" logs), causing slow performance. The sentiment analysis service has been optimized to use batch processing (100 texts per Claude API call), but there may still be inefficiencies.

## Development Notes

### AI Service Optimization
- Uses Claude 3.5 Sonnet for better performance with larger batches
- Implements batch processing (100 items for Claude, 50 for OpenAI)
- Parallel processing for Reddit data fetching
- Rate limiting between API calls

### Reddit Integration  
- OAuth 2.0 authentication with Reddit API
- Parallel subreddit fetching
- Batch comment retrieval with controlled concurrency
- Date range filtering

### Data Flow
1. User inputs subreddits and date range
2. Server fetches Reddit data in parallel
3. Text content sent to AI service in batches
4. Results aggregated and analyzed
5. Response includes sentiment scores, themes, insights
6. Optional local storage of analysis

## Dependencies

### Server
- express, cors, dotenv - Web server
- axios - HTTP client
- node-cron - Scheduling (if needed)
- nodemon, concurrently - Development

### Client  
- react, react-dom - UI framework
- typescript - Type safety
- recharts - Data visualization
- axios - API client
- date-fns - Date utilities
- @testing-library/* - Testing

## Storage
- Analysis history stored in `server/data/analyses.json`
- Keeps last 100 analyses maximum
- No database required - uses local file system

## Testing
- Standard React Testing Library setup
- API key testing endpoints available
- Health check endpoint for monitoring

## Common Issues
1. **Slow Analysis**: Ensure batch processing is working correctly in sentimentService.js
2. **API Rate Limits**: Built-in delays and batch sizing to respect limits  
3. **Missing API Keys**: Settings page allows runtime configuration
4. **CORS Issues**: Properly configured for development ports

## Development Workflow
1. Set up environment variables
2. Run `npm run install-all` to install dependencies
3. Run `npm run dev` to start both server and client
4. Configure API keys via Settings page or .env file
5. Test with small subreddit/date ranges first