# End of Year Review GitHub Dashboard - Setup Instructions

This guide will walk you through setting up the End of Year Review GitHub Dashboard for your project.

## Prerequisites

Before you begin, ensure you have:

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com) (free tier works)
2. **GitHub Personal Access Token** - With `repo` scope
3. **GitHub Organization/Repos** - Repositories you want to track
4. **Basic knowledge** of:
   - GitHub API
   - Cloudflare Workers
   - HTML/CSS/JavaScript

## Step 1: Create GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "EOYR Dashboard")
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** - you won't be able to see it again!

## Step 2: Configure Repositories

Edit `config/repos.json` to include your repositories:

```json
{
  "organization": "your-org-name",
  "repos": [
    {
      "name": "repo-name",
      "displayName": "Display Name"
    }
  ],
  "defaultDateRange": "3months",
  "weekStartDay": "monday"
}
```

## Step 3: Set Up Cloudflare KV Namespace

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Go to **Workers & Pages** → **KV**
4. Click **Create a namespace**
5. Name it `EOYR_CACHE`
6. Click **Add**
7. **Note the namespace ID** - you'll need it in Step 5

## Step 4: Create Cloudflare Worker

1. In Cloudflare Dashboard, go to **Workers & Pages** → **Workers**
2. Click **Create a Worker**
3. Name it `eoyr-github-commits` (or your preferred name)
4. Click **Deploy**
5. Click **Edit code**
6. Replace the default code with the contents of `workers/github-commits.js`
7. Click **Save and deploy**

## Step 5: Configure Worker Environment Variables

1. In your Worker, go to **Settings** → **Variables**
2. Add the following environment variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `GITHUB_TOKEN` | Your GitHub token | Personal access token from Step 1 |
| `GITHUB_ORG` | Your org name | GitHub organization (or username) |
| `WEBHOOK_SECRET` | Random string | Secret for webhook validation (generate a random string) |
| `REPOS_CONFIG` | JSON string | Copy contents of `config/repos.json` as a single-line JSON string |

3. Go to **Settings** → **Variables** → **KV Namespace Bindings**
4. Click **Add binding**
5. Set:
   - **Variable name**: `EOYR_CACHE`
   - **KV namespace**: Select `EOYR_CACHE` from Step 3
6. Click **Save**

## Step 6: Set Up GitHub Webhook (Optional but Recommended)

This enables automatic cache invalidation when new commits are pushed.

1. Go to your GitHub organization settings (or individual repo)
2. Navigate to **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `https://your-worker-name.your-subdomain.workers.dev/webhook`
   - **Content type**: `application/json`
   - **Secret**: The same `WEBHOOK_SECRET` from Step 5
   - **Events**: Select "Just the push event"
4. Click **Add webhook**

## Step 7: Deploy Frontend to Cloudflare Pages

### Option A: Deploy from GitHub (Recommended)

1. Push your code to a GitHub repository
2. In Cloudflare Dashboard, go to **Workers & Pages** → **Pages**
3. Click **Create a project** → **Connect to Git**
4. Select your repository
5. Configure build settings:
   - **Build command**: (leave empty - static site)
   - **Build output directory**: `/` (root)
6. Click **Save and Deploy**

### Option B: Deploy via Wrangler CLI

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Deploy: `wrangler pages deploy . --project-name=eoyr-dashboard`

## Step 8: Configure API Base URL

Update `js/eoyr.js` to point to your Worker:

```javascript
const API_BASE_URL = 'https://your-worker-name.your-subdomain.workers.dev';
```

Or set it via environment variable in Cloudflare Pages:
- Variable name: `API_BASE_URL`
- Value: Your Worker URL

## Step 9: Test the Setup

1. Visit your Cloudflare Pages URL
2. You should see:
   - Filter controls at the top
   - Week listing below
3. Click on a week row to see detailed commits
4. Test filters:
   - Date range presets
   - Custom date range
   - Project filter
   - Sort options

## Troubleshooting

### Worker Returns 500 Error

- Check that `GITHUB_TOKEN` is set correctly
- Verify token has `repo` scope
- Check Worker logs in Cloudflare Dashboard

### No Weeks Showing

- Verify repos exist and are accessible with your token
- Check date range - commits might be outside selected range
- Look at browser console for API errors

### Cache Not Updating

- Webhook might not be configured correctly
- Check webhook secret matches in GitHub and Worker
- Manually clear cache by redeploying Worker

### CORS Errors

- Ensure Worker includes CORS headers (already in code)
- Check that API_BASE_URL is correct

## Environment Variables Reference

### Cloudflare Worker

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub personal access token |
| `GITHUB_ORG` | Yes | GitHub organization/username |
| `WEBHOOK_SECRET` | Yes | Secret for webhook validation |
| `REPOS_CONFIG` | No | JSON config (can use file instead) |
| `EOYR_CACHE` | Yes | KV namespace binding |

### Cloudflare Pages

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | No | Worker URL (defaults to same origin) |

## Local Development

To test locally:

1. Use a local proxy to forward API requests to your Worker
2. Or use `wrangler dev` to run Worker locally:
   ```bash
   wrangler dev workers/github-commits.js
   ```
3. Update `API_BASE_URL` in `js/eoyr.js` to `http://localhost:8787`

## Next Steps

- Customize the UI in `css/eoyr.css`
- Add more repos to `config/repos.json`
- Configure default date ranges
- Set up custom domain for Pages

## Support

For issues or questions:
- Check Cloudflare Worker logs
- Review browser console for errors
- Verify GitHub API rate limits (5000 requests/hour for authenticated requests)

---

**Last Updated**: December 2025

