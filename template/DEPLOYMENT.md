# Deployment Guide

Complete step-by-step instructions for deploying your multi-tenant GitHub dashboard.

## Prerequisites

Before starting, ensure you have:

- [x] GitHub account (for OAuth App and repository hosting)
- [x] Cloudflare account (for Workers and KV storage)
- [x] Vercel account (for frontend hosting)
- [x] Git installed locally
- [x] Node.js installed (for Wrangler CLI)

## Overview

This deployment involves three main components:

1. **Frontend** → Vercel (static site hosting)
2. **Backend API** → Cloudflare Workers (serverless functions)
3. **Data Storage** → Cloudflare KV (key-value store)

## Step 1: GitHub OAuth App Setup

### 1.1 Create OAuth App

1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in the application details:

```
Application name: EOYR Dashboard (or your app name)
Homepage URL: https://your-domain.vercel.app
Authorization callback URL: https://your-worker.workers.dev/auth/github/callback
```

4. Click **Register application**
5. **Copy the Client ID** (you'll need this)
6. Click **Generate a new client secret**
7. **Copy the Client Secret** (save it securely - you won't see it again)

### 1.2 Note Your OAuth Credentials

Save these values for later:

```
GITHUB_OAUTH_CLIENT_ID=your_client_id_here
GITHUB_OAUTH_CLIENT_SECRET=your_client_secret_here
```

## Step 2: Cloudflare KV Setup

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
# Production namespace
wrangler kv:namespace create "EOYR_DATA"

# Preview namespace (for testing)
wrangler kv:namespace create "EOYR_DATA" --preview
```

**Save the namespace IDs** from the output. You'll see something like:

```
{ binding = "EOYR_DATA", id = "abc123xyz789" }
{ binding = "EOYR_DATA", preview_id = "def456uvw012" }
```

## Step 3: Cloudflare Worker Deployment

### 3.1 Update wrangler.toml

Open [`wrangler.toml`](wrangler.toml) and update:

```toml
name = "eoyr-dashboard"  # Change to your worker name
account_id = "YOUR_ACCOUNT_ID"  # Get from Cloudflare dashboard

[[kv_namespaces]]
binding = "EOYR_DATA"
id = "abc123xyz789"  # Use your production namespace ID
preview_id = "def456uvw012"  # Use your preview namespace ID
```

**To find your Account ID:**
1. Go to Cloudflare dashboard
2. Click on **Workers & Pages**
3. Your Account ID is shown on the right sidebar

### 3.2 Set Environment Variables

Create a `.dev.vars` file for local development (not committed to git):

```bash
GITHUB_OAUTH_CLIENT_ID=your_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_client_secret
SESSION_SECRET=generate_a_random_32_character_string
ENCRYPTION_KEY=generate_another_random_32_character_string
FRONTEND_URL=http://localhost:8080
```

**Generate random secrets:**

```bash
# On macOS/Linux
openssl rand -hex 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3.3 Set Production Secrets

```bash
wrangler secret put GITHUB_OAUTH_CLIENT_ID
# Paste your client ID when prompted

wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
# Paste your client secret when prompted

wrangler secret put SESSION_SECRET
# Paste a random 32+ character string

wrangler secret put ENCRYPTION_KEY
# Paste another random 32+ character string

wrangler secret put FRONTEND_URL
# Enter your Vercel URL: https://your-domain.vercel.app
```

### 3.4 Deploy Worker

```bash
cd workers
wrangler deploy
```

**Save your Worker URL** from the output:
```
https://eoyr-dashboard.your-subdomain.workers.dev
```

### 3.5 Update OAuth Callback URL

Go back to your GitHub OAuth App settings and verify the callback URL matches:
```
https://eoyr-dashboard.your-subdomain.workers.dev/auth/github/callback
```

## Step 4: Vercel Frontend Deployment

### 4.1 Push to GitHub

If you haven't already, push your template code to a GitHub repository:

```bash
git remote add origin https://github.com/yourusername/your-repo.git
git branch -M main
git push -u origin main
```

### 4.2 Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure the project:

```
Framework Preset: Other
Root Directory: . (current directory)
Build Command: (leave empty)
Output Directory: . (current directory)
Install Command: (leave empty)
```

5. Click **Deploy**

### 4.3 Set Environment Variables in Vercel

1. Go to **Project Settings** → **Environment Variables**
2. Add the following variable:

```
Name: API_BASE_URL
Value: https://eoyr-dashboard.your-subdomain.workers.dev
Environments: Production, Preview, Development
```

3. Click **Save**

### 4.4 Add Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `FRONTEND_URL` in Cloudflare Worker secrets to match your custom domain

### 4.5 Redeploy

After setting environment variables, redeploy:

1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**

## Step 5: Verification

### 5.1 Test Authentication Flow

1. Visit your Vercel URL: `https://your-domain.vercel.app`
2. You should see a **"Login with GitHub"** button
3. Click the button
4. You should be redirected to GitHub OAuth
5. Authorize the application
6. You should be redirected back to the dashboard
7. Verify you see your GitHub username/avatar in the header

### 5.2 Test Repository Selection

1. Click on **Settings** or **Select Repositories**
2. You should see a list of your GitHub repositories
3. Select a few repositories
4. Click **Save**
5. Verify the selected repositories appear in the dashboard

### 5.3 Test Commit Data

1. Select a date range (e.g., "Last 30 Days")
2. Verify commits are loaded and displayed
3. Check that filtering works
4. Verify week grouping is correct

### 5.4 Check for Errors

Open browser DevTools (F12) and check the Console for any errors.

## Troubleshooting

### OAuth Errors

**"redirect_uri_mismatch"**
- Verify OAuth callback URL in GitHub app settings matches your Worker URL exactly
- Check `FRONTEND_URL` secret in Worker matches your Vercel URL

**"Bad Credentials"**
- Verify `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` are correct
- Check secrets were set correctly: `wrangler secret list`

### Worker Errors

**"KV namespace not found"**
- Verify KV namespace IDs in `wrangler.toml` are correct
- Ensure KV namespace binding name is `EOYR_DATA`

**"Internal Server Error"**
- Check Worker logs: `wrangler tail`
- Look for specific error messages

### Frontend Errors

**"Network Error" or "Failed to Fetch"**
- Verify `API_BASE_URL` in Vercel is correct
- Check CORS headers are set in Worker
- Ensure Worker is deployed and accessible

**"Not Authenticated"**
- Check session cookies are being set (DevTools → Application → Cookies)
- Verify `FRONTEND_URL` in Worker secrets matches your Vercel domain
- Check cookie `Secure` flag (requires HTTPS)

### Local Development

To test locally:

1. **Start Worker locally:**
```bash
cd workers
wrangler dev
```

2. **Serve frontend locally:**
```bash
python3 -m http.server 8080
```

3. **Update OAuth callback:**
   - Add `http://localhost:8787/auth/github/callback` to GitHub OAuth app
   - Set `FRONTEND_URL=http://localhost:8080` in `.dev.vars`

4. Visit `http://localhost:8080`

## Monitoring and Maintenance

### Check Worker Analytics

1. Go to Cloudflare dashboard
2. Click **Workers & Pages**
3. Click on your worker
4. View **Metrics** tab for:
   - Request count
   - Error rate
   - CPU time
   - Duration

### Check KV Usage

1. Go to Cloudflare dashboard
2. Click **KV**
3. View your namespace
4. Monitor read/write operations

### Check Vercel Analytics

1. Go to Vercel project
2. Click **Analytics** tab
3. View:
   - Page views
   - Load times
   - Geographic distribution

## Scaling Considerations

### Free Tier Limits

**Cloudflare Workers:**
- 100,000 requests/day
- 10ms CPU time per request

**Cloudflare KV:**
- 100,000 reads/day
- 1,000 writes/day
- 1 GB storage

**Vercel:**
- 100 GB bandwidth/month
- Unlimited deployments

### Upgrading

When you hit limits:

1. **Cloudflare Workers Paid** ($5/month):
   - 10 million requests/month
   - 50ms CPU time per request

2. **Cloudflare KV Paid** ($0.50 per million reads):
   - Pay as you go beyond free tier

3. **Vercel Pro** ($20/month):
   - 1 TB bandwidth
   - Better performance

## Security Checklist

- [x] OAuth secrets are stored as Cloudflare secrets (not in code)
- [x] Session cookies are HTTP-only and Secure
- [x] GitHub tokens are encrypted in KV
- [x] CORS is properly configured
- [x] OAuth state parameter is validated
- [x] All environment variables are set
- [x] HTTPS is enforced on production

## Next Steps

After successful deployment:

1. **Customize branding** - See [`CUSTOMIZATION.md`](CUSTOMIZATION.md)
2. **Monitor usage** - Check Cloudflare and Vercel dashboards
3. **Add more features** - See [`ROADMAP.md`](ROADMAP.md)
4. **Share with users** - Send them your Vercel URL

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Worker logs: `wrangler tail`
3. Check browser console for frontend errors
4. Consult:
   - [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
   - [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
   - [Vercel Docs](https://vercel.com/docs)
   - [GitHub OAuth Docs](https://docs.github.com/en/developers/apps/building-oauth-apps)

