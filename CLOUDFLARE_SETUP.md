# Cloudflare Worker Environment Variables Setup

## Required Environment Variables

Set these in your Cloudflare Worker dashboard for `eoyr-dashboard`:

### 1. GITHUB_TOKEN
**Value:** `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`
**Type:** Secret (encrypted)
**Description:** GitHub personal access token with `repo` scope

### 2. GITHUB_ORG
**Value:** `core-home-web`
**Type:** Plain text
**Description:** GitHub organization name

### 3. WEBHOOK_SECRET
**Value:** Generate a random string (e.g., use: `openssl rand -hex 32`)
**Type:** Secret (encrypted)
**Description:** Secret for validating GitHub webhook signatures

**To generate a secure secret, run:**
```bash
openssl rand -hex 32
```

### 4. REPOS_CONFIG (Optional but Recommended)
**Value:** Copy the JSON below as a single line (no line breaks):
```json
{"organization":"core-home-web","repos":[{"name":"hydragearbottle_website","displayName":"Hydragear Bottle"},{"name":"core_render_portal","displayName":"Core Render Portal"},{"name":"outlaw_spice","displayName":"Outlaw Spice"},{"name":"people_of_spice","displayName":"People of Spice"},{"name":"spice-st-market","displayName":"Spice St Market"}],"defaultDateRange":"3months","weekStartDay":"monday"}
```
**Type:** Plain text
**Description:** Repository configuration as JSON string

## KV Namespace Binding

1. Go to **Settings** → **Variables** → **KV Namespace Bindings**
2. Click **Add binding**
3. Set:
   - **Variable name:** `EOYR_CACHE`
   - **KV namespace:** Select or create `EOYR_CACHE` namespace
4. Click **Save**

## Steps to Configure in Cloudflare Dashboard

1. Navigate to: Workers & Pages → Workers → `eoyr-dashboard`
2. Go to **Settings** tab
3. Scroll to **Variables and Secrets** section
4. Click **Configure API tokens and other runtime variables**
5. Add each variable:
   - Click **Add variable**
   - Enter variable name
   - Enter value
   - For secrets (GITHUB_TOKEN, WEBHOOK_SECRET), check "Encrypt" or use "Add secret"
   - Click **Save**
6. After adding all variables, the Worker should automatically redeploy

## Verify Configuration

After setting up variables, test the Worker:
1. Go to **Overview** tab
2. Click on the Worker URL: `eoyr-dashboard.corehomeweb2.workers.dev`
3. Test endpoints:
   - `https://eoyr-dashboard.corehomeweb2.workers.dev/api/repos`
   - `https://eoyr-dashboard.corehomeweb2.workers.dev/api/weeks?from=2025-01-01&to=2025-12-31`

## Troubleshooting Build Failures

If the build is failing:
1. Check **Deployments** tab for error messages
2. Verify all environment variables are set correctly
3. Ensure KV namespace is bound
4. Check Worker logs in **Observability** section

## Next Steps

1. Set up the environment variables above
2. Bind the KV namespace
3. Test the Worker endpoints
4. Update `js/eoyr.js` with the Worker URL (already done)
5. Deploy your Pages site to connect to the Worker

