# Multi-Tenant GitHub Dashboard

A beautiful, serverless SaaS dashboard for tracking GitHub commits and contributions across your repositories. Users authenticate with GitHub OAuth, select repositories to monitor, and view personalized commit reports with weekly summaries.

![Dashboard Preview](https://via.placeholder.com/800x400/0f0f23/818cf8?text=GitHub+Dashboard)

## ✨ Features

- **🔐 GitHub OAuth Authentication** - Secure login with GitHub accounts
- **📊 Repository Selection** - Users choose which repos to track
- **🔒 User Data Isolation** - Complete privacy with user-scoped data storage
- **📅 Weekly Summaries** - Commits organized by ISO week (Monday-Sunday)
- **🎨 Beautiful UI** - Modern, responsive design with dark theme
- **⚡ Serverless Architecture** - Built on Cloudflare Workers + KV
- **💰 Cost-Effective** - Free tier supports thousands of users
- **🚀 Fast Performance** - Edge computing with global CDN

## 🏗️ Architecture

```
Frontend (Vercel/Cloudflare Pages)
         ↓
Cloudflare Worker API
         ↓
    ┌────┴────┐
    ↓         ↓
GitHub API   KV Storage
```

- **Frontend**: HTML, CSS, vanilla JavaScript
- **Backend**: Cloudflare Workers (serverless functions)
- **Storage**: Cloudflare KV (key-value store)
- **Hosting**: Vercel or Cloudflare Pages

## 🚀 Quick Start

### Prerequisites

- GitHub account (for OAuth app)
- Cloudflare account (free tier is fine)
- Vercel account (optional, for hosting)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd template/
```

### 2. Create GitHub OAuth App

1. Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: Your Dashboard Name
   - **Homepage URL**: `https://your-domain.vercel.app`
   - **Authorization callback URL**: `https://your-worker.workers.dev/auth/github/callback`
4. Save the **Client ID** and **Client Secret**

### 3. Deploy Cloudflare Worker

```bash
cd workers/
npm install -g wrangler
wrangler login
wrangler kv:namespace create "EOYR_DATA"
```

Update `wrangler.toml` with your namespace ID, then:

```bash
wrangler secret put GITHUB_OAUTH_CLIENT_ID
wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
wrangler secret put SESSION_SECRET
wrangler secret put ENCRYPTION_KEY
wrangler deploy
```

### 4. Deploy Frontend

**Option A: Vercel**
1. Import your repo to Vercel
2. Set `API_BASE_URL` environment variable
3. Deploy

**Option B: Cloudflare Pages**
1. Connect your GitHub repo
2. Set root directory to `template/`
3. Deploy

### 5. Test It Out!

Visit your deployed URL, click "Login with GitHub", and start tracking commits!

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and data flow
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step deployment guide
- **[ROADMAP.md](ROADMAP.md)** - Implementation phases and future features
- **[CUSTOMIZATION.md](CUSTOMIZATION.md)** - Branding and UI customization

## 📁 Project Structure

```
template/
├── index.html              # Main dashboard page
├── analytics.html          # Analytics page
├── stories.html            # Stories page
├── css/
│   ├── eoyr.css            # Dashboard-specific styles
│   ├── normalize.css       # CSS reset
│   └── wanderlostgalaxy.webflow.css  # Base theme
├── js/
│   ├── auth.js             # Authentication logic
│   ├── repo-selector.js    # Repository selection UI
│   ├── eoyr.js             # Core dashboard logic
│   ├── eoyr-filters.js     # Filtering and sorting
│   └── nav-menu.js         # Navigation handlers
├── workers/
│   └── github-commits.js   # Cloudflare Worker (API)
├── wrangler.toml           # Worker configuration
├── vercel.json             # Vercel deployment config
└── config/
    └── repos.example.json  # Example repo configuration
```

## 🔌 API Endpoints

### Authentication
```
GET  /auth/github              # Initiate OAuth flow
GET  /auth/github/callback     # OAuth callback handler
GET  /auth/logout              # End user session
GET  /auth/me                  # Get current user info
```

### User Management
```
GET  /api/user/repos/available # List all accessible repos
GET  /api/user/repos           # Get selected repos
POST /api/user/repos           # Update repo selection
GET  /api/user/preferences     # Get user preferences
POST /api/user/preferences     # Update preferences
```

### Commit Data (User-Scoped)
```
GET  /api/commits?start=YYYY-MM-DD&end=YYYY-MM-DD
GET  /api/weeks?year=2025
GET  /api/stats?start=YYYY-MM-DD&end=YYYY-MM-DD
```

## 🔒 Security

- **Token Encryption**: GitHub tokens encrypted at rest using Web Crypto API
- **Session Security**: HTTP-only, secure, SameSite=Strict cookies
- **CSRF Protection**: State parameter validation in OAuth flow
- **Data Isolation**: User-scoped KV keys prevent cross-user access
- **No Token Exposure**: Tokens never sent to frontend

## 💡 Implementation Status

This template provides the **foundation** for a multi-tenant dashboard. Key features require implementation:

### ✅ Completed
- Project structure and file organization
- Frontend UI components and styling
- Documentation (architecture, deployment, customization)
- Worker configuration and KV setup

### 🚧 To Be Implemented
- OAuth authentication endpoints (Phase 1)
- User data storage in KV (Phase 2)
- Repository selection UI and APIs (Phase 3)
- Error handling and polish (Phase 4)

See **[ROADMAP.md](ROADMAP.md)** for detailed implementation phases.

## 🎨 Customization

Easily customize the dashboard to match your brand:

- **Colors**: Update CSS variables in `css/eoyr.css`
- **Logo**: Replace images in `/images/` directory
- **Fonts**: Change font imports in `index.html`
- **Layout**: Modify grid layouts and card styles
- **Filters**: Add custom filtering logic in `js/eoyr-filters.js`

See **[CUSTOMIZATION.md](CUSTOMIZATION.md)** for detailed guides.

## 📊 Scaling & Costs

### Free Tier Limits
- **Cloudflare Workers**: 100,000 requests/day
- **Cloudflare KV**: 100,000 reads/day, 1,000 writes/day
- **Vercel**: 100 GB bandwidth/month

### Estimated Costs
- **0-100 users**: Free
- **100-1,000 users**: ~$5-10/month
- **1,000+ users**: ~$20-50/month

Caching significantly reduces API calls and costs.

## 🛠️ Development

### Local Development

```bash
# Start Worker locally
cd workers/
wrangler dev

# Serve frontend
python3 -m http.server 8080
```

### Environment Variables

Create `.dev.vars` in `workers/`:

```
GITHUB_OAUTH_CLIENT_ID=your_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_client_secret
SESSION_SECRET=random_32_char_string
ENCRYPTION_KEY=random_32_char_string
FRONTEND_URL=http://localhost:8080
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Styled with [Webflow](https://webflow.com/) base theme
- Powered by [GitHub API](https://docs.github.com/en/rest)

## 🐛 Troubleshooting

### "Unauthorized" errors
- Verify OAuth callback URL matches exactly
- Check Worker environment variables
- Ensure GitHub OAuth app is active

### No repositories showing
- User must select repositories in settings
- Verify GitHub token permissions
- Check Worker logs: `wrangler tail`

### Session expires quickly
- Adjust `SESSION_TTL` in worker code (default: 30 days)
- Check cookie settings (Secure, HttpOnly)

### More help?
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for setup details
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Open an issue on GitHub

## 📬 Support

For questions or issues:
- Check documentation files in this directory
- Review Cloudflare Workers docs
- Check GitHub API documentation
- Open an issue in the repository

---

**Ready to deploy?** Start with [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.

**Want to customize?** See [CUSTOMIZATION.md](CUSTOMIZATION.md) for branding guides.

**Understanding the system?** Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.
