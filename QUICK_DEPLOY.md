# 🚀 GitHub → Cloudflare Quick Deploy

Get your Reddit Analyzer live in 3 steps using GitHub!

## Prerequisites
- GitHub account
- Cloudflare account (free)
- Your API keys (Reddit, Claude/OpenAI)

## Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Reddit Analyzer - ready for deployment"
git branch -M main
git remote add origin https://github.com/yourusername/reddit-analyzer.git
git push -u origin main
```

## Step 2: Connect to Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Connect to Git" → GitHub
3. Select your `reddit-analyzer` repo
4. Build settings:
   - **Build command**: `cd client && npm install && npm run build`
   - **Build output**: `client/build`
5. Click "Save and Deploy"

## Step 3: Set Up the API Worker
1. Cloudflare Dashboard → Workers & Pages → Create Worker
2. Name: `reddit-analyzer-api`
3. Copy/paste code from `worker/src/index.js`
4. Add your API keys in Settings → Variables:
   - `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `CLAUDE_API_KEY`, etc.
5. Copy the Worker URL

## Step 4: Connect Frontend to Backend
1. In your Pages project → Settings → Environment variables
2. Add: `REACT_APP_API_URL` = your Worker URL
3. Trigger a new deployment (push to GitHub or redeploy)

## That's It! 🎉

Every time you push to GitHub, your site auto-updates!

**Your URLs:**
- Frontend: `https://reddit-analyzer.pages.dev`
- API: `https://reddit-analyzer-api.your-subdomain.workers.dev`

## Benefits of GitHub Deployment
- ✅ Auto-deploy on every push
- ✅ Preview deployments for PRs
- ✅ Version history and rollbacks
- ✅ No CLI tools needed after initial setup
- ✅ Free hosting and global CDN

Users can set their own API keys and everything stays private in their browser!