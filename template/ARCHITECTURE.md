# Architecture Documentation

## System Overview

This is a multi-tenant SaaS GitHub dashboard that allows users to authenticate with their GitHub account, select repositories to track, and view personalized commit reports organized by ISO week.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Cloudflare Workers (Serverless API)
- **Storage**: Cloudflare KV (Key-Value store)
- **Hosting**: Vercel (Frontend), Cloudflare Workers (Backend)
- **Authentication**: GitHub OAuth 2.0

## System Architecture

```
┌─────────────┐
│   Browser   │
│  (Vercel)   │
└──────┬──────┘
       │
       │ HTTPS
             │
┌──────▼──────────────────┐
│  Cloudflare Worker      │
│  - OAuth Handler        │
│  - Session Manager      │
│  - GitHub API Proxy     │
└──────┬──────────────────┘
       │
       ├─────────────┬─────────────┐
       │             │             │
┌──────▼──────┐ ┌───▼────────┐ ┌──▼──────────┐
│ Cloudflare  │ │   GitHub   │ │   Session   │
│     KV      │ │    API     │ │   Cookies   │
│ (User Data) │ │            │ │             │
└─────────────┘ └────────────┘ └─────────────┘
```

## Authentication Flow

### 1. Initial Login
```
User clicks "Login with GitHub"
  ↓
Redirect to /auth/github
  ↓
Worker generates state token (CSRF protection)
  ↓
Redirect to GitHub OAuth authorize URL
  ↓
User authorizes app on GitHub
  ↓
GitHub redirects to /auth/github/callback?code=XXX&state=YYY
  ↓
Worker validates state token
  ↓
Worker exchanges code for access token
  ↓
Worker stores encrypted token in KV
  ↓
Worker creates session token
  ↓
Set HTTP-only cookie with session token
  ↓
Redirect to dashboard
```

### 2. Authenticated Requests
```
Browser sends request with session cookie
  ↓
Worker validates session token
  ↓
Worker retrieves userId from session
  ↓
Worker retrieves user's GitHub token from KV
  ↓
Worker makes GitHub API request with user's token
  ↓
Return user-scoped data
```

### 3. Logout
```
User clicks logout
  ↓
Worker deletes session from KV
  ↓
Clear session cookie
  ↓
Redirect to login page
```

## Data Storage Schema

### Cloudflare KV Structure

All user data is isolated by userId to ensure multi-tenant security.

#### User Authentication
```javascript
// Key: user:{userId}:token
// Value: Encrypted GitHub access token
{
  "token": "gho_encrypted...",
  "encryptedAt": "2025-12-02T10:30:00Z"
}

// Key: user:{userId}:profile
// Value: User profile information
{
  "id": 12345,
  "login": "username",
  "name": "User Name",
  "avatar_url": "https://avatars.githubusercontent.com/...",
  "email": "user@example.com"
}
```

#### Session Management
```javascript
// Key: session:{sessionToken}
// Value: Session data
{
  "userId": "12345",
  "createdAt": "2025-12-02T10:30:00Z",
  "expiresAt": "2026-01-01T10:30:00Z"
}
// TTL: 30 days (configurable)
```

#### Repository Selection
```javascript
// Key: user:{userId}:repos
// Value: Selected repositories
{
  "repos": [
    "owner/repo1",
    "owner/repo2"
  ],
  "updatedAt": "2025-12-02T10:30:00Z"
}
```

#### User Preferences
```javascript
// Key: user:{userId}:preferences
// Value: User settings
{
  "defaultDateRange": "last3Months",
  "weekStartDay": "monday",
  "timezone": "America/New_York"
}
```

#### Cache Data (User-Scoped)
```javascript
// Key: cache:{userId}:commits:{repoOwner}:{repoName}:{startDate}:{endDate}
// Value: Cached commit data
{
  "data": [...],
  "cachedAt": "2025-12-02T10:30:00Z"
}
// TTL: 1 hour (configurable)
```

## API Endpoints

### Authentication Endpoints

**GET /auth/github**
     - Initiates OAuth flow
- Generates CSRF state token
- Redirects to GitHub authorization URL

**GET /auth/github/callback**
     - Handles OAuth callback
- Validates state token
- Exchanges code for access token
     - Creates session
- Stores user data in KV

**GET /auth/logout**
- Deletes session from KV
- Clears session cookie
- Redirects to home

**GET /auth/me**
- Returns current user profile
- Requires authentication

### Data Endpoints (All require authentication)

**GET /api/user/repos/available**
- Lists all repos user has access to on GitHub
- Uses user's GitHub token

**GET /api/user/repos**
- Returns user's selected repositories

**POST /api/user/repos**
- Saves user's repository selection
- Body: `{ "repos": ["owner/repo1", "owner/repo2"] }`

**GET /api/commits**
- Returns commits for user's selected repos
- Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- User-scoped and cached

**GET /api/weeks**
- Returns commit data grouped by ISO week
- Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- User-scoped and cached

## Frontend Architecture

### File Structure
```
template/
├── index.html          # Main dashboard
├── analytics.html      # Analytics view
├── stories.html        # Stories/timeline view
├── css/
│   ├── eoyr.css       # Dashboard-specific styles
│   └── *.css          # Base Webflow styles
└── js/
    ├── auth.js        # Authentication module
    ├── repo-selector.js   # Repository selection
    ├── eoyr.js        # Main dashboard logic
    ├── eoyr-filters.js    # Filtering/sorting
    └── *.js           # Supporting modules
```

### JavaScript Modules

**auth.js**
- `checkAuth()` - Verifies user is logged in
- `redirectToLogin()` - Redirects to OAuth flow
- `getCurrentUser()` - Fetches user profile
- `logout()` - Logs out user

**repo-selector.js**
- `fetchAvailableRepos()` - Gets user's GitHub repos
- `loadSelectedRepos()` - Loads saved selection
- `saveRepos(repos)` - Persists repo selection
- `renderRepoList()` - Renders UI

**eoyr.js**
- `fetchCommits()` - Gets commit data
- `renderWeekView()` - Displays week grid
- `renderDayView()` - Displays daily commits
- User-scoped data handling

## Security Considerations

### Token Encryption
- GitHub access tokens are encrypted before storing in KV
- Uses Web Crypto API (SubtleCrypto)
- Encryption key stored in Worker environment variables

### Session Security
- HTTP-only cookies (prevent XSS attacks)
- Secure flag (HTTPS only)
- SameSite=Lax (CSRF protection)
- 30-day expiration with sliding window

### CSRF Protection
- State parameter in OAuth flow
- Validated on callback
- Prevents authorization code interception

### Data Isolation
- All KV keys include userId
- Worker validates session on every request
- No cross-user data access

### Rate Limiting
- Respect GitHub API rate limits (5000/hour for authenticated users)
- Cache responses to reduce API calls
- Per-user rate limiting (optional implementation)

## Caching Strategy

### Cache Keys
All cache keys include userId for isolation:
```
cache:{userId}:{endpoint}:{params}
```

### Cache TTLs
- Commit data: 1 hour
- User profile: 24 hours
- Repository list: 1 hour
- Session data: 30 days

### Cache Invalidation
- Automatic expiration via TTL
- Manual invalidation on webhook events (optional)
- User can refresh via UI

## GitHub API Integration

### Rate Limiting
- Authenticated requests: 5000/hour per user
- Uses user's personal token (not shared app token)
- Check `X-RateLimit-Remaining` header
- Display warning when low

### Pagination
- GitHub returns max 100 items per page
- Worker handles pagination automatically
- Fetches all pages for complete data

### Endpoints Used
- `GET /user/repos` - List user's repositories
- `GET /repos/{owner}/{repo}/commits` - Get commits
- `GET /user` - Get user profile

## Scalability Considerations

### Cloudflare Workers
- Auto-scales globally
- Edge computing (low latency)
- No cold starts

### Cloudflare KV
- Eventually consistent
- Global replication
- Suitable for user preferences and cache
- Not suitable for real-time transactions

### Performance
- Cached responses reduce API calls
- Edge caching reduces latency
- Lazy loading for large datasets

## Future Enhancements

### Planned Features
- Team dashboards (multi-user organizations)
- Webhook integration for real-time updates
- Advanced analytics and insights
- Export reports (PDF, CSV)
- Custom commit categorization
- Integration with other Git platforms (GitLab, Bitbucket)

### Technical Debt
- Add comprehensive error handling
- Implement retry logic for failed API calls
- Add monitoring and logging
- Performance optimization for large datasets
- Add automated tests
