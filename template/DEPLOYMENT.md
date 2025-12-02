# Deployment Guide

This guide walks you through deploying the multi-tenant GitHub dashboard from scratch.

## Prerequisites

Before you begin, you'll need:

1. **GitHub Account** - For OAuth and repository access
2. **Cloudflare Account** - For Workers and KV storage (Free tier available)
3. **Vercel Account** - For frontend hosting (Free tier available)
4. **Git** - Installed locally
5. **Node.js** - Version 16+ (for Wrangler CLI)

## Overview

The deployment consists of three main components:

1. **GitHub OAuth App** - Handles user authentication
2. **Cloudflare Worker** - Backend API and OAuth handler
3. **Vercel** - Frontend static site hosting

## Step 1: Create GitHub OAuth App

### 1.1 Navigate to GitHub Settings
1. Go to https://github.com/settings/developers
2. Click **OAuth Apps** in the left sidebar
3. Click **New OAuth App**

### 1.2 Configure OAuth App
Fill in the following details:

- **Application name**: `GitHub Dashboard` (or your preferred name)
- **Homepage URL**: `https://your-domain.com` (or temporary placeholder)
- **Application description**: `Multi-tenant GitHub commit dashboard`
- **Authorization callback URL**: `https://your-worker-name.workers.dev/auth/github/callback`
  - Replace `your-worker-name` with your desired worker name
  - We'll create the worker in the next step

### 1.3 Generate Client Secret
1. Click **Register application**
2. On the app page, click **Generate a new client secret**
3. **Important**: Copy both the **Client ID** and **Client Secret** immediately
   - Store them securely - you'll need them for the Worker configuration
   - The secret won't be shown again

## Step 2: Deploy Cloudflare Worker

### 2.1 Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2.2 Login to Cloudflare
```bash
wrangler login
```
This will open a browser window to authenticate.

### 2.3 Create KV Namespace
```bash
wrangler kv:namespace create "EOYR_DASHBOARD"
```

Copy the namespace ID from the output. It will look like:
```
{ binding = "EOYR_DASHBOARD", id = "abc123def456" }
```

For development, also create a preview namespace:
```bash
wrangler kv:namespace create "EOYR_DASHBOARD" --preview
```

### 2.4 Configure wrangler.toml

Edit `wrangler.toml` in the template folder:

```toml
name = "your-dashboard-worker"  # Change this to your desired worker name
main = "workers/github-commits.js"
compatibility_date = "2024-01-01"

# Add your KV namespace ID here
kv_namespaces = [
  { binding = "EOYR_DASHBOARD", id = "YOUR_NAMESPACE_ID", preview_id = "YOUR_PREVIEW_NAMESPACE_ID" }
]

# Environment variables (will be set via CLI)
[vars]
OAUTH_REDIRECT_URI = "https://your-worker-name.workers.dev/auth/github/callback"
```

### 2.5 Set Environment Secrets
```bash
# Set GitHub OAuth credentials
wrangler secret put GITHUB_OAUTH_CLIENT_ID
# Paste your Client ID when prompted

wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
# Paste your Client Secret when prompted

# Generate a random session secret (use a password generator)
wrangler secret put SESSION_SECRET
# Paste a long random string (min 32 characters)

# Generate an encryption key for token storage
wrangler secret put ENCRYPTION_KEY
# Paste a long random string (min 32 characters)
```

**Tip**: Generate secure random strings using:
```bash
openssl rand -base64 32
```

### 2.6 Deploy Worker
```bash
wrangler deploy
```

The output will show your Worker URL:
```
Published your-dashboard-worker (0.xx sec)
  https://your-dashboard-worker.workers.dev
```

### 2.7 Update GitHub OAuth Callback URL
1. Go back to your GitHub OAuth App settings
2. Update the **Authorization callback URL** to match your actual Worker URL:
   ```
   https://your-dashboard-worker.workers.dev/auth/github/callback
   ```

### 2.8 Test Worker
Visit your Worker URL in a browser. You should see a response (or be redirected to login).

## Step 3: Deploy Frontend to Vercel

### 3.1 Push Code to GitHub
If you haven't already:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

### 3.2 Create Vercel Project
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (current directory if template is in repo root)
   - **Build Command**: (leave empty)
   - **Output Directory**: `.` (current directory)

### 3.3 Set Environment Variables
In Vercel project settings:
1. Go to **Settings** → **Environment Variables**
2. Add the following variable:
   - **Name**: `API_BASE_URL`
   - **Value**: `https://your-dashboard-worker.workers.dev`
   - **Environments**: Production, Preview, Development

### 3.4 Deploy
Click **Deploy**

Vercel will build and deploy your site. The deployment URL will be shown when complete.

### 3.5 Configure Custom Domain (Optional)
1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update GitHub OAuth App homepage URL to match

## Step 4: Verify Deployment

### 4.1 Test Authentication Flow
1. Visit your Vercel deployment URL
2. Click "Login with GitHub"
3. Authorize the OAuth app
4. You should be redirected back to the dashboard

### 4.2 Test Repository Selection
1. Once logged in, open the repository selector
2. Select one or more repositories
3. Save your selection

### 4.3 Test Data Display
1. Navigate to the dashboard
2. You should see commit data for your selected repositories
3. Try filtering by date range
4. Verify week grouping works correctly

### 4.4 Check Browser Console
Open browser DevTools (F12) and check for errors in the Console tab.

### 4.5 Test API Endpoints
Test your Worker endpoints:

```bash
# Check health (should return 200 or redirect)
curl https://your-dashboard-worker.workers.dev/

# Check auth endpoint (should redirect to GitHub)
curl -I https://your-dashboard-worker.workers.dev/auth/github
```

## Step 5: Configure OAuth Scopes (Optional)

By default, the app requests these GitHub OAuth scopes:
- `read:user` - Read user profile
- `repo` - Access repository data

To modify scopes, edit `workers/github-commits.js`:

```javascript
const scopes = ['read:user', 'repo'];
// Add or remove scopes as needed
```

Common scopes:
- `public_repo` - Access public repositories only (more limited)
- `read:org` - Read organization data
- `user:email` - Access user email addresses

See: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps

## Troubleshooting

### OAuth Redirect Mismatch
**Error**: "The redirect_uri MUST match the registered callback URL"

**Solution**: 
1. Check your GitHub OAuth App settings
2. Ensure callback URL exactly matches: `https://your-worker.workers.dev/auth/github/callback`
3. No trailing slashes
4. Protocol must be HTTPS

### Worker Returns 500 Error
**Solution**:
1. Check Wrangler logs: `wrangler tail`
2. Verify all environment secrets are set
3. Check KV namespace binding in `wrangler.toml`

### Session Not Persisting
**Solution**:
1. Ensure cookies are enabled in browser
2. Check Worker is setting `SameSite=Lax` or `SameSite=None; Secure`
3. Verify domain matches (no subdomain mismatches)

### No Commit Data Showing
**Solution**:
1. Verify you've selected repositories in settings
2. Check browser console for API errors
3. Verify Worker can access GitHub API (check rate limits)
4. Ensure GitHub token has correct permissions

### Rate Limit Exceeded
**Error**: "API rate limit exceeded"

**Solution**:
1. GitHub allows 5000 requests/hour for authenticated users
2. Check `X-RateLimit-Remaining` header
3. Increase cache TTL to reduce API calls
4. Wait for rate limit to reset (shown in headers)

### CORS Errors
**Solution**:
1. Ensure Worker returns correct CORS headers
2. Check `Access-Control-Allow-Origin` matches your frontend domain
3. Include `Access-Control-Allow-Credentials: true` for cookies

## Monitoring and Maintenance

### View Worker Logs
```bash
wrangler tail
```

### View Worker Analytics
1. Go to Cloudflare Dashboard
2. Navigate to **Workers & Pages**
3. Click your worker
4. View **Metrics** tab

### Update Worker
After making changes to `workers/github-commits.js`:
```bash
wrangler deploy
```

### Update Frontend
Push changes to GitHub:
```bash
git add .
git commit -m "Update frontend"
git push
```
Vercel will automatically redeploy.

### Backup KV Data
```bash
# List all keys
wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID

# Get specific key
wrangler kv:key get "user:12345:repos" --namespace-id=YOUR_NAMESPACE_ID
```

## Security Best Practices

1. **Use HTTPS Only**: Ensure all URLs use HTTPS
2. **Secure Secrets**: Never commit secrets to Git
3. **Rotate Secrets**: Periodically regenerate OAuth secrets and session keys
4. **Monitor Access**: Review Worker logs for suspicious activity
5. **Update Dependencies**: Keep Wrangler and other tools updated
6. **Scope Permissions**: Request minimal GitHub OAuth scopes needed

## Cost Estimation

### Free Tier Limits
- **Cloudflare Workers**: 100,000 requests/day
- **Cloudflare KV**: 100,000 reads/day, 1,000 writes/day, 1 GB storage
- **Vercel**: 100 GB bandwidth/month, unlimited static sites

### Paid Tier (if needed)
- **Cloudflare Workers**: $5/month for 10M requests
- **Cloudflare KV**: $0.50 per million reads
- **Vercel Pro**: $20/month for more bandwidth and features

For most personal/small team use cases, free tiers are sufficient.

## Next Steps

- Review [CUSTOMIZATION.md](CUSTOMIZATION.md) to brand your dashboard
- Check [ROADMAP.md](ROADMAP.md) for planned features
- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system

## Getting Help

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Vercel Docs**: https://vercel.com/docs
- **GitHub OAuth Docs**: https://docs.github.com/en/apps/oauth-apps
- **Issues**: Open an issue in the GitHub repository
