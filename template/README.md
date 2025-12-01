# Multi-Tenant GitHub Dashboard Template

This is a multi-tenant template version of the End of Year Review GitHub Dashboard. Users authenticate with GitHub OAuth and can select their own repositories to track.

## Features

- **GitHub OAuth Authentication** - Users sign in with their GitHub account
- **Repository Selection** - Users choose which repositories to track
- **User-Scoped Data** - Each user's data is isolated and secure
- **Session Management** - Secure session handling with HTTP-only cookies
- **Real-time Updates** - Automatic cache invalidation via webhooks

## Setup Instructions

### 1. Create GitHub OAuth App

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Your dashboard name
   - **Homepage URL**: Your dashboard URL (e.g., `https://your-dashboard.pages.dev`)
   - **Authorization callback URL**: `https://your-worker.workers.dev/auth/github/callback`
4. Click "Register application"
5. **Copy the Client ID and generate a Client Secret**

### 2. Set Up Cloudflare Worker

1. Create a new Cloudflare Worker
2. Copy the contents of `template/workers/github-commits.js` to your Worker
3. Set up KV Namespace:
   - Create a KV namespace named `EOYR_CACHE`
   - Bind it to your Worker with variable name `EOYR_CACHE`

### 3. Configure Environment Variables

In your Cloudflare Worker, set these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_OAUTH_CLIENT_ID` | Your OAuth app Client ID | `abc123def456` |
| `GITHUB_OAUTH_CLIENT_SECRET` | Your OAuth app Client Secret | `secret_xyz789` |
| `OAUTH_REDIRECT_URI` | Full callback URL | `https://your-worker.workers.dev/auth/github/callback` |
| `SESSION_SECRET` | Random string for session encryption | `your-random-secret-key` |

**Note:** `GITHUB_TOKEN` is no longer needed - users provide their own tokens via OAuth.

### 4. Deploy Frontend

1. Deploy the `template/` directory to Cloudflare Pages
2. Set environment variable `API_BASE_URL` to your Worker URL (optional, defaults to same origin)
3. Or update `API_BASE_URL` in `template/js/eoyr.js` directly

### 5. Test the Setup

1. Visit your deployed dashboard
2. Click "Login with GitHub"
3. Authorize the application
4. Select repositories in settings
5. View your commit reports!

## File Structure

```
template/
├── index.html          # Main dashboard page
├── analytics.html      # Analytics page
├── stories.html        # Stories page
├── js/
│   ├── auth.js         # Authentication module
│   ├── repo-selector.js # Repository selection module
│   ├── eoyr.js         # Main dashboard logic
│   └── ...
├── css/
│   └── eoyr.css        # Dashboard styles (includes auth/repo selector styles)
└── workers/
    └── github-commits.js # Cloudflare Worker with OAuth support
```

## API Endpoints

### Authentication
- `GET /auth/github` - Initiate OAuth flow
- `GET /auth/github/callback` - OAuth callback handler
- `GET /auth/logout` - Logout
- `GET /auth/me` - Get current user info

### Repository Management
- `GET /api/user/repos/available` - Get all repos user has access to
- `GET /api/user/repos` - Get user's selected repos
- `POST /api/user/repos` - Save user's repo selection

### Data (User-Scoped)
- `GET /api/repos` - Get user's selected repos
- `GET /api/commits` - Get commits (filtered by user's repos)
- `GET /api/weeks` - Get week summaries
- `GET /api/weeks/:weekId` - Get week details

## Security Notes

- GitHub tokens are stored in KV (consider encryption for production)
- Sessions use HTTP-only cookies
- CSRF protection via state parameter in OAuth flow
- User data is isolated by userId in cache keys

## Migration from Single-Tenant

If you have an existing single-tenant deployment:

1. Keep your existing deployment on the `main` branch
2. Use this template on a separate branch (`template-version`)
3. Deploy to a separate Cloudflare Worker and Pages project
4. Users can use either version independently

## Troubleshooting

### "Unauthorized" errors
- Check that OAuth callback URL matches exactly
- Verify environment variables are set correctly
- Check browser console for detailed errors

### No repositories showing
- User needs to select repositories in settings
- Check that user has access to repositories on GitHub
- Verify GitHub token is valid (user may need to re-authenticate)

### Session expires quickly
- Adjust `SESSION_TTL` in `github-commits.js` (default: 30 days)

## Support

For issues or questions, please check the main project documentation or open an issue.

