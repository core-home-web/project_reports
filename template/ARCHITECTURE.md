# Architecture Overview

## System Design

This multi-tenant GitHub dashboard is built as a serverless SaaS application with clear separation between frontend, backend, and storage layers.

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Auth UI   │  │  Dashboard   │  │  Repo Selector   │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │ HTTPS + Session Cookies
             │
┌────────────▼────────────────────────────────────────────────┐
│              Cloudflare Worker (API Layer)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ OAuth Routes │  │  User APIs   │  │  Commit APIs     │  │
│  │ /auth/*      │  │ /api/user/*  │  │  /api/commits    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────┬───────────────────────────────────────┬────────────┘
         │                                       │
         │ Store/Retrieve                        │ Fetch
         │                                       │
┌────────▼────────────────────┐      ┌──────────▼──────────┐
│   Cloudflare KV Storage     │      │   GitHub REST API   │
│  ┌─────────────────────┐    │      │                     │
│  │ User Tokens         │    │      │  • Repos            │
│  │ User Profiles       │    │      │  • Commits          │
│  │ Repo Selections     │    │      │  • Contributors     │
│  │ Sessions            │    │      │                     │
│  │ Cached Data         │    │      └─────────────────────┘
│  └─────────────────────┘    │
└─────────────────────────────┘
```

## Authentication Flow

### Initial Login

1. **User clicks "Login with GitHub"**
   - Frontend redirects to `/auth/github`
   
2. **Worker generates OAuth state**
   - Creates random CSRF token
   - Stores state in KV with 10-minute TTL
   - Redirects to GitHub OAuth authorize URL

3. **User authorizes on GitHub**
   - GitHub redirects back to `/auth/github/callback?code=XXX&state=YYY`

4. **Worker exchanges code for token**
   - Validates state matches stored value
   - Exchanges code for access token via GitHub API
   - Creates user record in KV
   - Generates session token
   - Sets HTTP-only secure cookie
   - Redirects to dashboard

### Authenticated Requests

1. **Browser sends request with session cookie**
2. **Worker validates session**
   - Extracts session token from cookie
   - Looks up session in KV: `session:${token}`
   - Retrieves userId from session
3. **Worker retrieves user's GitHub token**
   - Fetches from KV: `user:${userId}:token`
   - Decrypts token
4. **Worker makes GitHub API request**
   - Uses user's token (not a global token)
   - Respects user's permissions
5. **Response returned to user**

## Data Storage Schema

### Cloudflare KV Namespaces

**Primary Namespace: `EOYR_DATA`**

```
Key Pattern                           | Value                      | TTL
--------------------------------------|----------------------------|--------
user:${userId}:token                  | Encrypted GitHub token     | Never
user:${userId}:profile                | {username, avatar, email}  | Never
user:${userId}:repos                  | [repo1, repo2, ...]        | Never
user:${userId}:preferences            | {dateRange, weekStart}     | Never
session:${sessionToken}               | {userId, createdAt}        | 30 days
cache:${userId}:repos                 | GitHub repos response      | 1 hour
cache:${userId}:commits:${params}     | Commits data               | 1 hour
oauth:state:${stateToken}             | {createdAt}                | 10 min
```

### User Data Isolation

- **Every user has unique keys** prefixed with their userId
- **Sessions map to userId** for user identification
- **Cached data is user-scoped** preventing data leaks
- **GitHub tokens are encrypted** using Worker secrets
- **No cross-user data access** enforced at KV key level

### Example User Record

```javascript
// user:github123:profile
{
  "userId": "github123",
  "username": "johndoe",
  "avatarUrl": "https://avatars.githubusercontent.com/u/123",
  "email": "john@example.com",
  "createdAt": "2025-01-15T10:30:00Z"
}

// user:github123:repos
[
  "johndoe/my-project",
  "company/shared-repo",
  "johndoe/another-project"
]

// user:github123:preferences
{
  "defaultDateRange": "last-year",
  "weekStartDay": "monday",
  "theme": "dark"
}
```

## Frontend Architecture

### Page Structure

```
/index.html              - Main dashboard (requires auth)
/auth/callback.html      - OAuth callback handler (optional SPA route)
/analytics.html          - Analytics view
/stories.html            - Stories view
```

### JavaScript Modules

```
js/
├── auth.js              - Authentication logic
│   ├── checkAuth()
│   ├── redirectToLogin()
│   ├── handleCallback()
│   └── logout()
│
├── eoyr.js              - Core dashboard logic
│   ├── fetchCommits()
│   ├── renderWeeks()
│   └── updateStats()
│
├── repo-selector.js     - Repository selection UI
│   ├── fetchAvailableRepos()
│   ├── loadSelectedRepos()
│   └── saveRepos()
│
├── eoyr-filters.js      - Filtering and sorting
│   ├── applyFilters()
│   └── sortData()
│
└── nav-menu.js          - Navigation and UI
```

### State Management

- **Session state**: Stored in HTTP-only cookies (managed by Worker)
- **User state**: Fetched from `/api/user/me` on page load
- **Dashboard state**: In-memory (repos, commits, filters)
- **URL state**: Query parameters for sharing (dates, repos, filters)

## Backend API Endpoints

### Authentication Endpoints

```
GET  /auth/github
     - Initiates OAuth flow
     - Redirects to GitHub

GET  /auth/github/callback?code=XXX&state=YYY
     - Handles OAuth callback
     - Creates session
     - Returns: Redirect to dashboard

GET  /auth/logout
     - Clears session
     - Returns: Redirect to login

GET  /auth/me
     - Returns current user info
     - Returns: {userId, username, avatar}
```

### User Data Endpoints

```
GET  /api/user/repos/available
     - Lists all repos user can access from GitHub
     - Returns: [{fullName, description, language, stars}]

GET  /api/user/repos
     - Gets user's selected repos
     - Returns: [repo1, repo2, ...]

POST /api/user/repos
     - Saves user's repo selection
     - Body: {repos: [repo1, repo2, ...]}
     - Returns: {success: true}

GET  /api/user/preferences
     - Gets user preferences
     - Returns: {dateRange, weekStart, ...}

POST /api/user/preferences
     - Updates user preferences
     - Body: {dateRange, weekStart, ...}
     - Returns: {success: true}
```

### Commit Data Endpoints

```
GET  /api/commits?start=YYYY-MM-DD&end=YYYY-MM-DD&repos=repo1,repo2
     - Fetches commits for user's selected repos
     - Automatically scoped to authenticated user
     - Returns: [{sha, message, author, date, repo}, ...]

GET  /api/weeks?year=2025
     - Groups commits by ISO week
     - Returns: [{weekNum, start, end, commits: [...]}]

GET  /api/stats?start=YYYY-MM-DD&end=YYYY-MM-DD
     - Aggregate statistics
     - Returns: {totalCommits, activeRepos, topLanguages}
```

## Security Considerations

### Token Security

- **GitHub tokens encrypted at rest** using Web Crypto API
- **Encryption key stored in Worker env vars** (not in code)
- **Tokens never exposed to frontend** (used only in Worker)
- **Session tokens are cryptographically random** (32+ bytes)

### Session Security

- **HTTP-only cookies** prevent XSS attacks
- **Secure flag** requires HTTPS
- **SameSite=Strict** prevents CSRF
- **30-day expiration** with automatic cleanup

### OAuth Security

- **State parameter** prevents CSRF attacks
- **State tokens stored with TTL** (10 minutes)
- **Callback URL validated** against registered URL
- **Code exchange happens server-side** (not in browser)

### Data Isolation

- **Every KV key includes userId** preventing cross-user access
- **Worker validates session on every request**
- **No shared caches** between users
- **GitHub API calls use user's token** (not admin token)

### Rate Limiting (Future Enhancement)

- Track requests per user per minute
- Store counters in KV with TTL
- Return 429 when limit exceeded
- Protect both Worker and GitHub API

## Caching Strategy

### Cache Layers

1. **Browser Cache**
   - Static assets (CSS, JS, images)
   - Cache-Control headers set by Vercel

2. **Worker Cache (KV)**
   - User repo lists (1 hour TTL)
   - Commit data (1 hour TTL)
   - User profiles (indefinite, invalidated on update)

3. **GitHub API Rate Limiting**
   - 5,000 requests/hour per user token
   - Cache reduces API calls significantly

### Cache Invalidation

- **On user logout**: Clear all user caches
- **On repo selection change**: Clear commit caches
- **On webhook event** (future): Clear specific repo cache
- **Automatic TTL expiry**: Caches refresh hourly

## Scalability

### Current Limits

- **Cloudflare Workers**: 100,000 requests/day (free tier)
- **Cloudflare KV**: 100,000 reads/day, 1,000 writes/day (free tier)
- **GitHub API**: 5,000 requests/hour per user

### Scaling Strategy

1. **More users**: Upgrade to Workers Paid plan
2. **More data**: KV scales automatically
3. **More requests**: Increase cache TTLs
4. **Heavy users**: Implement per-user rate limiting

### Performance Optimization

- User-scoped caching reduces redundant API calls
- KV reads are globally distributed (fast)
- Worker runs at edge (low latency)
- Static frontend on CDN (Vercel)

## Monitoring (Recommended)

- **Worker Analytics**: Track request counts, errors, latency
- **KV Metrics**: Monitor read/write usage
- **GitHub API Usage**: Track rate limit remaining
- **Error Logging**: Send errors to external service (Sentry, Datadog)

## Future Enhancements

1. **Webhooks**: Real-time cache updates on push events
2. **Teams**: Share dashboards across organization
3. **Custom Metrics**: User-defined commit categories
4. **Export**: PDF/CSV report generation
5. **Notifications**: Weekly email summaries

