#!/usr/bin/env node

/**
 * Deployment script for Reddit Analyzer to Cloudflare
 * This script automates the deployment process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Reddit Analyzer Deployment Script');
console.log('=====================================\n');

// Check if wrangler is installed
try {
  execSync('wrangler --version', { stdio: 'ignore' });
  console.log('✅ Wrangler CLI found');
} catch (error) {
  console.log('❌ Wrangler CLI not found. Installing...');
  execSync('npm install -g wrangler', { stdio: 'inherit' });
  console.log('✅ Wrangler CLI installed');
}

// Function to run command with error handling
function runCommand(command, description, cwd = process.cwd()) {
  console.log(`\n📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

// Check if user is logged in to Cloudflare
try {
  execSync('wrangler whoami', { stdio: 'ignore' });
  console.log('✅ Logged in to Cloudflare');
} catch (error) {
  console.log('❌ Not logged in to Cloudflare. Please run: wrangler login');
  process.exit(1);
}

// Step 1: Install worker dependencies
if (fs.existsSync('./worker')) {
  runCommand('npm install', 'Installing worker dependencies', './worker');
} else {
  console.log('❌ Worker directory not found. Please ensure you have the worker folder.');
  process.exit(1);
}

// Step 2: Deploy the worker
runCommand('wrangler deploy', 'Deploying Cloudflare Worker', './worker');

// Step 3: Install client dependencies and build
if (fs.existsSync('./client')) {
  runCommand('npm install', 'Installing client dependencies', './client');
  runCommand('npm run build', 'Building React application', './client');
} else {
  console.log('❌ Client directory not found. Please ensure you have the client folder.');
  process.exit(1);
}

// Step 4: Deploy to Cloudflare Pages
try {
  runCommand('wrangler pages deploy build --project-name reddit-analyzer', 'Deploying to Cloudflare Pages', './client');
} catch (error) {
  console.log('\n⚠️  Pages deployment failed. You can deploy manually:');
  console.log('1. Go to https://dash.cloudflare.com');
  console.log('2. Click Pages → Create a project → Upload assets');
  console.log('3. Upload the client/build folder');
}

console.log('\n🎉 Deployment completed!');
console.log('\n📋 Next Steps:');
console.log('1. Set your API keys as Worker secrets:');
console.log('   wrangler secret put REDDIT_CLIENT_ID');
console.log('   wrangler secret put REDDIT_CLIENT_SECRET');
console.log('   wrangler secret put CLAUDE_API_KEY');
console.log('   wrangler secret put OPENAI_API_KEY');
console.log('\n2. Update your frontend environment variables with the Worker URL');
console.log('\n3. Test your deployment by visiting your Cloudflare Pages URL');
console.log('\n📖 See DEPLOYMENT_GUIDE.md for detailed instructions');