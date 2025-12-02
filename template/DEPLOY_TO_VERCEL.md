# Deploy Template Version to Vercel

## Quick Setup Steps

### 1. Configure Vercel Project Settings

Go to: https://vercel.com/core-home-webs-projects/core-home-web-reports/settings

#### Set Root Directory
1. Navigate to **General** → **Root Directory**
2. Set Root Directory to: `template`
3. Click **Save**

#### Configure Git Branch (Optional)
1. Navigate to **Git** → **Production Branch**
2. You can either:
   - Keep `main` and Vercel will deploy from `main` branch but serve from `template/` directory
   - OR create a separate project for `template-version` branch

### 2. Set Environment Variables

1. Navigate to **Settings** → **Environment Variables**
2. Add the following variable:
   - **Name**: `API_BASE_URL`
   - **Value**: `https://eoyr-dashboard.corehomeweb2.workers.dev` (or your Cloudflare Worker URL)
   - **Environments**: Select all (Production, Preview, Development)
3. Click **Save**

**Note**: If you're deploying the multi-tenant template, you'll need a separate Cloudflare Worker with OAuth configured. The current Worker is for single-tenant use.

### 3. Redeploy

1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## Alternative: Create Separate Project

If you want to keep both versions running:

1. Create a new Vercel project
2. Import the same GitHub repository
3. Configure:
   - **Root Directory**: `template`
   - **Production Branch**: `template-version`
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: `.` (current directory)
4. Set `API_BASE_URL` environment variable

## Current Status

- **Template branch**: `template-version` (pushed to GitHub)
- **Template directory**: `template/`
- **Vercel project**: core-home-web-reports
- **Current deployment**: Original dashboard (main branch, root directory)

## After Deployment

Once deployed, the template version will:
- Show "Login with GitHub" button
- Require OAuth authentication
- Allow users to select their repositories
- Display user-scoped commit data

Make sure your Cloudflare Worker is configured for multi-tenant use with OAuth before deploying!





