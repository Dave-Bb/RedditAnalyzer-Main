# 🚀 GitHub → Cloudflare Deployment Guide

Deploy your Reddit Analyzer using GitHub integration with Cloudflare Pages - the easiest way to go live!

## Prerequisites

1. **GitHub Account**: Your code repository
2. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) (free tier works)
3. **API Keys**: Your Reddit, Claude, and/or OpenAI API keys

## Phase 1: GitHub Setup

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - Reddit Analyzer"
git branch -M main
git remote add origin https://github.com/yourusername/reddit-analyzer.git
git push -u origin main
```

## Phase 2: Cloudflare Setup

### Step 1: Connect GitHub to Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Pages" in the sidebar
3. Click "Connect to Git"
4. Choose "GitHub" and authorize Cloudflare
5. Select your `reddit-analyzer` repository
6. Configure build settings:
   - **Framework preset**: Create React App
   - **Build command**: `cd client && npm install && npm run build`
   - **Build output directory**: `client/build`
   - **Root directory**: `/` (leave empty)

### Step 2: Set Up Cloudflare Worker
1. In Cloudflare Dashboard, go to "Workers & Pages"
2. Click "Create application" → "Create Worker"
3. Name it `reddit-analyzer-api`
4. Replace the default code with the content from `worker/src/index.js`
5. Click "Save and Deploy"
 
### Step 3: Configure Environment Variables

**For the Worker (API Backend):**
1. In your Worker dashboard, go to "Settings" → "Variables"
2. Add these as **Environment Variables** (encrypted):
   - `REDDIT_CLIENT_ID`: Your Reddit app client ID
   - `REDDIT_CLIENT_SECRET`: Your Reddit app client secret  
   - `REDDIT_USER_AGENT`: `RedditSentimentAnalyzer/1.0`
   - `CLAUDE_API_KEY`: Your Claude API key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PREFERRED_MODEL`: `claude` or `openai`

**For Pages (Frontend):**
1. In your Pages project, go to "Settings" → "Environment variables"
2. Add **Production** environment variable:
   - `REACT_APP_API_URL`: `https://reddit-analyzer-api.your-subdomain.workers.dev`

### Step 4: Get Your Worker URL
After deploying your Worker, copy the URL (something like `https://reddit-analyzer-api.your-subdomain.workers.dev`) and update your Pages environment variable.

## Phase 3: Custom Domain (Optional)

### Step 1: Add Custom Domain to Pages
1. In your Pages project, go to "Custom domains"
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `reddit-analyzer.yourdomain.com`)
4. Follow DNS setup instructions

### Step 2: Update Worker CORS (if using custom domain)
Update `worker/src/index.js` CORS headers:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://reddit-analyzer.yourdomain.com', // Your custom domain
  // ... rest of headers
};
```

Redeploy the worker:
```bash
cd worker
wrangler deploy
```

## Testing Your Deployment

1. **Visit your site**: Go to your Cloudflare Pages URL or custom domain
2. **Test API connection**: Go to Settings and test your API keys
3. **Run an analysis**: Try analyzing a small subreddit with 10-25 posts
4. **Check browser storage**: Your settings and analysis history should persist in localStorage

## Cost Estimation

### Cloudflare Costs (Free Tier Limits)
- **Pages**: 500 builds/month, unlimited bandwidth (FREE)
- **Workers**: 100,000 requests/day (FREE)
- **KV Storage**: 1GB storage, 100,000 reads/day (FREE)

### API Costs (Pay-per-use)
- **Reddit API**: Free with rate limits
- **Claude API**: ~$0.003/1K tokens (very cost-effective)
- **OpenAI API**: ~$0.03/1K tokens

**Typical analysis cost**: $0.01-0.08 depending on size

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check that your Worker URL is correct in `client/.env.production`
   - Ensure CORS headers are properly set in the Worker

2. **API Key Issues**
   - Verify secrets are set correctly: `wrangler secret list`
   - Test individual APIs using the Settings page

3. **Worker Timeout**
   - Large analyses might timeout (Workers have 30s limit)
   - Consider reducing post limits for initial deployment

4. **Build Errors**
   - Ensure all dependencies are installed: `npm install`
   - Check that environment variables are set correctly

### Monitoring

- **Worker Logs**: `wrangler tail` to see real-time logs
- **Pages Analytics**: Available in Cloudflare dashboard
- **Error Tracking**: Check Cloudflare dashboard for error rates

## Security Notes

✅ **What's Secure:**
- API keys are stored as Cloudflare secrets (encrypted)
- User data stays in browser localStorage (never sent to server)
- HTTPS encryption for all communications

✅ **User Privacy:**
- No user data is stored on your servers
- Each user's API keys and analysis history stay local
- No tracking or analytics beyond Cloudflare's basic metrics

## Scaling Considerations

As your app grows:
- **Paid Workers**: $5/month for 10M requests
- **Paid KV**: $0.50/GB/month for storage
- **Custom domains**: Free with Cloudflare Pages
- **Analytics**: Cloudflare Web Analytics (free)

## Next Steps

1. **Monitor Usage**: Check Cloudflare dashboard for traffic and errors
2. **User Feedback**: Share your live site and gather feedback
3. **Feature Additions**: Consider adding more analysis features
4. **Performance**: Monitor API costs and optimize as needed

Your Reddit Analyzer is now live and accessible to anyone! 🎉

## Support

If you encounter issues:
1. Check Cloudflare dashboard for error logs
2. Use `wrangler tail` for real-time Worker debugging
3. Test API endpoints individually using browser dev tools
4. Verify environment variables are set correctly

Remember: Users will need to set their own API keys in the Settings page when they first visit your site.