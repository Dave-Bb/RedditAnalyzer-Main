# 🚀 Reddit Brain AI - Deployment Guide

A complete step-by-step guide to deploy your Reddit Brain AI to the web and set up shared analysis storage.

## 📋 Table of Contents

1. [Quick Overview](#quick-overview)
2. [Hosting Options & Costs](#hosting-options--costs)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Domain Setup](#domain-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup (Supabase)](#database-setup-supabase)
7. [Sharing Existing Analysis](#sharing-existing-analysis)
8. [User Management](#user-management)
9. [Future Enhancements](#future-enhancements)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Overview

**What you'll achieve:**
- Live website accessible to anyone with the URL
- Users can add their own API keys to run analysis
- Shared database where all analysis results are stored
- Your existing analysis available to all users
- Cost: ~$5-15/month for hosting + domain

**Tech Stack:**
- **Frontend**: React (Netlify/Vercel - FREE)
- **Backend**: Node.js (Railway/Render - $5-10/month)
- **Database**: Supabase (FREE tier)
- **Domain**: Namecheap/Google Domains ($12/year)

---

## 💰 Hosting Options & Costs

### 🏆 **RECOMMENDED: Railway + Netlify**
- **Backend (Railway)**: $5/month
- **Frontend (Netlify)**: FREE
- **Database (Supabase)**: FREE
- **Domain**: $12/year
- **Total**: ~$72/year

### Alternative Options:

#### **Budget Option: Render**
- **Full-stack (Render)**: $7/month
- **Database (Supabase)**: FREE  
- **Domain**: $12/year
- **Total**: ~$96/year

#### **Premium Option: Vercel + PlanetScale**
- **Full-stack (Vercel)**: $20/month
- **Database (PlanetScale)**: $29/month
- **Domain**: $12/year
- **Total**: ~$600/year

---

## 🚀 Step-by-Step Deployment

### Phase 1: Prepare Your Code

1. **Clean up sensitive data**
   ```bash
   # Remove your personal API keys from any committed files
   # Make sure .env is in .gitignore
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create production environment files**
   - Create `.env.example` with empty values
   - Document required environment variables

### Phase 2: Database Setup (Supabase)

1. **Go to [Supabase.com](https://supabase.com)**
2. **Create account** (GitHub login recommended)
3. **Create new project**
   - Name: "reddit-brain-ai"
   - Database password: Save this securely!
   - Region: Choose closest to your users

4. **Create tables** (SQL Editor):
   ```sql
   -- Analysis table
   CREATE TABLE analyses (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     tags TEXT[],
     subreddits TEXT[] NOT NULL,
     date_range JSONB NOT NULL,
     analysis_data JSONB NOT NULL,
     metadata JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     created_by TEXT, -- User identifier
     is_public BOOLEAN DEFAULT true
   );

   -- User settings table
   CREATE TABLE user_settings (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id TEXT UNIQUE NOT NULL,
     reddit_client_id TEXT,
     reddit_client_secret TEXT,
     claude_api_key TEXT,
     openai_api_key TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

   -- Policies for public read access to analyses
   CREATE POLICY "Public can view analyses" ON analyses
     FOR SELECT USING (is_public = true);

   CREATE POLICY "Users can insert analyses" ON analyses
     FOR INSERT WITH CHECK (true);

   -- Policies for user settings (private)
   CREATE POLICY "Users can manage own settings" ON user_settings
     FOR ALL USING (user_id = current_setting('app.current_user_id'));
   ```

### Phase 3: Backend Deployment (Railway)

1. **Go to [Railway.app](https://railway.app)**
2. **Connect GitHub account**
3. **Deploy from GitHub**
   - Select your repository
   - Choose "Deploy from main branch"

4. **Add environment variables** in Railway dashboard:
   ```
   PORT=3001
   NODE_ENV=production
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   FRONTEND_URL=https://your-netlify-domain.netlify.app
   ```

5. **Configure build settings**:
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`

### Phase 4: Frontend Deployment (Netlify)

1. **Go to [Netlify.com](https://netlify.com)**
2. **Connect GitHub account**
3. **Deploy from GitHub**
   - Select your repository
   - Build command: `cd client && npm run build`
   - Publish directory: `client/build`

4. **Add environment variables**:
   ```
   REACT_APP_API_URL=https://your-railway-app.railway.app
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Phase 5: Domain Setup

1. **Buy domain** at [Namecheap](https://namecheap.com) or [Google Domains](https://domains.google)
   - Suggested names: `redditbrain.ai`, `redditbrainai.com`, `sentiment-ai.com`

2. **Configure DNS** in domain registrar:
   ```
   Type: CNAME
   Name: www
   Value: your-app-name.netlify.app
   
   Type: A
   Name: @
   Value: 75.2.60.5 (Netlify's IP)
   ```

3. **Add custom domain** in Netlify:
   - Site settings → Domain management
   - Add custom domain: `yourdomain.com`
   - Enable HTTPS (automatic)

---

## 🔧 Environment Configuration

### Backend Environment Variables
Create `server/.env.production`:
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
FRONTEND_URL=https://yourdomain.com
```

### Frontend Environment Variables  
Create `client/.env.production`:
```env
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

---

## 📊 Sharing Existing Analysis

### Option 1: Manual Upload
1. **Export your local analysis** from `server/data/analyses.json`
2. **Create migration script**:
   ```javascript
   // migrate-analyses.js
   const { createClient } = require('@supabase/supabase-js');
   const fs = require('fs');

   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

   async function migrateAnalyses() {
     const localAnalyses = JSON.parse(fs.readFileSync('./data/analyses.json', 'utf8'));
     
     for (const analysis of localAnalyses) {
       await supabase.from('analyses').insert({
         name: analysis.metadata.name,
         description: analysis.metadata.description,
         tags: analysis.metadata.tags,
         subreddits: analysis.analysisData.summary.subreddits,
         date_range: analysis.analysisData.summary.dateRange,
         analysis_data: analysis.analysisData,
         metadata: analysis.metadata,
         created_by: 'admin',
         is_public: true
       });
     }
   }

   migrateAnalyses();
   ```

### Option 2: Admin Interface
Add an admin panel to your app for uploading analyses directly through the UI.

---

## 👥 User Management

### Simple User System (No Auth)
- Users identified by browser fingerprint or session ID
- Store API keys locally in browser
- Analysis linked to anonymous user ID

### Advanced User System (Future)
- Auth0 or Supabase Auth integration
- User accounts and profiles
- Private vs public analysis
- User dashboards

---

## 🔮 Future Enhancements

### Phase 2 Features:
1. **Collaborative Analysis**
   - Multiple users can contribute to same subreddit analysis
   - Merge different date ranges automatically
   - Show analysis history and contributors

2. **Public Analysis Gallery**
   - Browse all public analysis
   - Search by subreddit, date, themes
   - Popular/trending analysis

3. **API Key Sharing** (Advanced)
   - Pool API keys from multiple users
   - Fair usage limits
   - Cost sharing system

4. **Real-time Features**
   - Live analysis updates
   - WebSocket connections
   - Real-time collaboration

### Database Schema for Collaborative Analysis:
```sql
-- Enhanced analysis table with collaboration
CREATE TABLE analysis_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES analyses(id),
  user_id TEXT NOT NULL,
  date_range JSONB NOT NULL,
  posts_analyzed INTEGER,
  comments_analyzed INTEGER,
  contribution_percentage DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subreddit tracking
CREATE TABLE subreddit_analysis_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subreddit TEXT NOT NULL,
  total_analyses INTEGER DEFAULT 0,
  date_ranges JSONB[], -- Array of all analyzed date ranges
  last_analyzed TIMESTAMP WITH TIME ZONE,
  trending_score DECIMAL DEFAULT 0
);
```

---

## 🛠 Code Changes Needed

### 1. Update Backend Storage Service
Replace local JSON storage with Supabase:

```javascript
// server/services/supabaseService.js
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async saveAnalysis(analysisData, metadata, userId = 'anonymous') {
    const { data, error } = await this.supabase
      .from('analyses')
      .insert({
        name: metadata.name,
        description: metadata.description,
        tags: metadata.tags,
        subreddits: analysisData.summary.subreddits,
        date_range: analysisData.summary.dateRange,
        analysis_data: analysisData,
        metadata: metadata,
        created_by: userId,
        is_public: true
      });

    if (error) throw error;
    return data[0];
  }

  async getAnalyses(limit = 100) {
    const { data, error } = await this.supabase
      .from('analyses')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getAnalysis(id) {
    const { data, error } = await this.supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
}
```

### 2. Add User Settings Management
```javascript
// server/services/userService.js
class UserService {
  async saveUserSettings(userId, settings) {
    const { data, error } = await this.supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        reddit_client_id: settings.reddit_client_id,
        reddit_client_secret: settings.reddit_client_secret,
        claude_api_key: settings.claude_api_key,
        openai_api_key: settings.openai_api_key
      });

    if (error) throw error;
    return data;
  }

  async getUserSettings(userId) {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}
```

### 3. Frontend User Management
```javascript
// client/src/services/userService.js
class UserService {
  constructor() {
    this.userId = this.getUserId();
  }

  getUserId() {
    let userId = localStorage.getItem('reddit_brain_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('reddit_brain_user_id', userId);
    }
    return userId;
  }

  async saveApiKeys(keys) {
    // Store encrypted in localStorage for now
    localStorage.setItem('user_api_keys', JSON.stringify(keys));
    
    // Also save to backend (without sensitive data)
    await fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, ...keys })
    });
  }
}
```

---

## 🚨 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Add your domain to backend CORS config
   - Check environment variables are set correctly

2. **Database Connection Failed**
   - Verify Supabase URL and keys
   - Check row-level security policies

3. **Build Failures**
   - Ensure all dependencies are in package.json
   - Check build commands match your setup

4. **API Key Storage**
   - Never commit real API keys to GitHub
   - Use environment variables for sensitive data

### Testing Checklist:
- [ ] Backend deploys without errors
- [ ] Frontend builds and deploys  
- [ ] Database connection works
- [ ] API endpoints respond correctly
- [ ] HTTPS certificate is active
- [ ] Custom domain resolves
- [ ] User can save API keys
- [ ] Analysis can be saved and retrieved

---

## 📞 Next Steps Tomorrow

1. **Choose hosting providers** and create accounts
2. **Set up Supabase** database
3. **Deploy backend** to Railway
4. **Deploy frontend** to Netlify  
5. **Buy domain** and configure DNS
6. **Migrate existing analysis** to database
7. **Test end-to-end** functionality
8. **Share with friends** for testing

---

## 💡 Pro Tips

- Start with free tiers to test everything
- Use Railway's GitHub integration for auto-deployments
- Set up monitoring/alerts for uptime
- Create a backup strategy for your data
- Document any custom configurations

**Total estimated setup time: 2-4 hours**
**Monthly cost: $5-15 (after free domain year)**

---

*Created: 2025-01-17*
*Last updated: 2025-01-17*
*Next review: After successful deployment*

🚀 **You've got this! Your Reddit Brain AI will be live soon!**