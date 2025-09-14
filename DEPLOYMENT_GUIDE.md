# 🚀 Cloudflare Deployment Guide

This guide will help you deploy your Reddit Analyzer to Cloudflare, making it accessible to anyone on the web while keeping user data private (stored in browser localStorage).

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) (free tier works)
2. **Node.js**: Ensure you have Node.js installed
3. **API Keys**: Your Reddit, Claude, and/or OpenAI API keys

## Phase 1: Deploy the Backend (Cloudflare Workers)

### Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
wrangler login
```

### Step 3: Set up the Worker
```bash
cd worker
npm install
```

### Step 4: Create KV Namespace (for future analysis storage)
```bash
wrangler kv:namespace create "ANALYSIS_STORAGE"
wrangler kv:namespace create "ANALYSIS_STORAGE" --preview
```

Copy the namespace IDs and update `worker/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "ANALYSIS_STORAGE"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
```

### Step 5: Set Environment Variables (Secrets)
```bash
# Set your API keys as secrets (more secure than environment variables)
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET
wrangler secret put REDDIT_USER_AGENT
wrangler secret put CLAUDE_API_KEY
wrangler secret put OPENAI_API_KEY
```

When prompted, enter your actual API keys.

### Step 6: Deploy the Worker
```bash
wrangler deploy
```

After deployment, you'll get a URL like: `https://reddit-analyzer-api.your-subdomain.workers.dev`

**Save this URL - you'll need it for the frontend!**

## Phase 2: Deploy the Frontend (Cloudflare Pages)

### Step 1: Update Frontend Configuration
Update `client/.env.production` with your actual Worker URL:
```env
REACT_APP_API_URL=https://reddit-analyzer-api.your-subdomain.workers.dev
```

### Step 2: Build the Frontend
```bash
cd client
npm run build
```

### Step 3: Deploy to Cloudflare Pages

**Option A: Using Wrangler (Recommended)**
```bash
# Install wrangler pages plugin if not already installed
npm install -g wrangler

# Deploy the build folder
wrangler pages deploy build --project-name reddit-analyzer
```

**Option B: Using Cloudflare Dashboard**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Pages" in the sidebar
3. Click "Create a project"
4. Choose "Upload assets"
5. Upload the entire `client/build` folder
6. Set project name: `reddit-analyzer`

### Step 4: Configure Environment Variables (Pages)
In your Cloudflare Pages project settings:
1. Go to Settings → Environment variables
2. Add production environment variable:
   - `REACT_APP_API_URL`: Your Worker URL from Phase 1

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