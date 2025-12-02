# Implementation Roadmap

## Current Status

This template provides the **foundation** for a multi-tenant GitHub dashboard. The basic structure is in place, but key features require implementation.

### What's Included

✅ **Frontend Structure**
- HTML layout with authentication UI placeholders
- Dashboard components (filters, date picker, week views)
- CSS styling from parent project
- JavaScript modules (auth.js, repo-selector.js, eoyr.js)

✅ **Backend Structure**
- Cloudflare Worker skeleton (`workers/github-commits.js`)
- Wrangler configuration (`wrangler.toml`)
- KV namespace setup guide

✅ **Documentation**
- Architecture overview
- Deployment guide
- This roadmap
- Customization guide

### What Needs Implementation

❌ **OAuth Authentication** (Phase 1)
- GitHub OAuth endpoints in Worker
- Session management with KV
- Token encryption/decryption
- Frontend auth UI integration

❌ **User Data Storage** (Phase 2)
- User profile storage
- Repository selection storage
- User preferences
- Cache isolation per user

❌ **Multi-Tenant APIs** (Phase 3)
- User-scoped API endpoints
- Repository selection APIs
- User-specific GitHub API calls

❌ **Repository Selector UI** (Phase 3)
- Fetch available repos from GitHub
- Display repo list with checkboxes
- Save/load user selections
- Integrate with dashboard

## Implementation Phases

### Phase 1: OAuth Foundation (Est. 8-12 hours)

Build the authentication system to allow users to login with GitHub.

#### 1.1 Worker OAuth Endpoints

**File:** [`workers/github-commits.js`](workers/github-commits.js)

```javascript
// Implement these endpoints:
GET  /auth/github
     - Generate state token (CSRF protection)
     - Store state in KV with 10-min TTL
     - Redirect to GitHub OAuth authorize URL

GET  /auth/github/callback?code=XXX&state=YYY
     - Validate state parameter
     - Exchange code for access token
     - Create user profile in KV
     - Generate session token
     - Set HTTP-only session cookie
     - Redirect to dashboard

GET  /auth/logout
     - Delete session from KV
     - Clear session cookie
     - Redirect to login page

GET  /auth/me
     - Validate session cookie
     - Return user profile
     - Returns: {userId, username, avatarUrl}
```

**Helper Functions Needed:**
- `generateState()` - Create random CSRF token
- `validateState(state)` - Verify state exists in KV
- `exchangeCodeForToken(code)` - Call GitHub OAuth token endpoint
- `createSession(userId)` - Generate session token, store in KV
- `validateSession(request)` - Extract and validate session cookie
- `encryptToken(token)` - Encrypt GitHub token before storage
- `decryptToken(encrypted)` - Decrypt GitHub token

#### 1.2 Frontend Auth Integration

**File:** [`js/auth.js`](js/auth.js)

```javascript
// Implement these functions:
async function checkAuth()
     - Fetch /auth/me
     - If 401, redirect to login page
     - If 200, return user info

function redirectToLogin()
     - Redirect to /auth/github

async function logout()
     - Fetch /auth/logout
     - Clear local state
     - Redirect to login page

async function getCurrentUser()
     - Return cached user info from checkAuth()
```

**File:** [`index.html`](index.html)

- Add login button (shown when not authenticated)
- Add user profile display in header (username, avatar)
- Add logout button in dropdown menu
- Call `checkAuth()` on page load

#### 1.3 Session Management

**Storage Schema:**
```
session:${token} → {userId, createdAt, expiresAt}
oauth:state:${state} → {createdAt}
```

**Security Requirements:**
- Session tokens: 32+ random bytes (hex encoded)
- HTTP-only cookies with Secure and SameSite=Strict
- 30-day session expiration
- State tokens expire after 10 minutes

#### 1.4 Testing Phase 1

- [ ] Can click "Login with GitHub"
- [ ] Redirected to GitHub OAuth
- [ ] After authorization, redirected back to dashboard
- [ ] See username/avatar in header
- [ ] Session persists after page reload
- [ ] Can logout successfully

---

### Phase 2: User Data Storage (Est. 6-8 hours)

Implement user-specific data storage and retrieval.

#### 2.1 User Profile Management

**File:** [`workers/github-commits.js`](workers/github-commits.js)

```javascript
// Add helper functions:
async function createUserProfile(env, userId, githubData)
     - Store user:${userId}:profile
     - Store user:${userId}:token (encrypted)

async function getUserProfile(env, userId)
     - Fetch user:${userId}:profile

async function getUserToken(env, userId)
     - Fetch user:${userId}:token
     - Decrypt and return
```

**Storage Schema:**
```
user:${userId}:profile → {userId, username, avatarUrl, email, createdAt}
user:${userId}:token → encrypted_github_token
user:${userId}:repos → [repo1, repo2, ...]
user:${userId}:preferences → {defaultDateRange, weekStartDay}
```

#### 2.2 Preferences API

**File:** [`workers/github-commits.js`](workers/github-commits.js)

```javascript
// Implement endpoints:
GET  /api/user/preferences
     - Return user preferences or defaults

POST /api/user/preferences
     - Save user preferences
     - Body: {defaultDateRange, weekStartDay, theme}
```

#### 2.3 Cache Isolation

Update all caching to include userId in key:

```javascript
// Old: cache:repos
// New: cache:${userId}:repos

// Old: cache:commits:${params}
// New: cache:${userId}:commits:${params}
```

#### 2.4 Testing Phase 2

- [ ] User profile stored on first login
- [ ] User profile retrieved on subsequent visits
- [ ] GitHub token stored encrypted
- [ ] Preferences can be saved and loaded
- [ ] Different users have isolated data

---

### Phase 3: Repository Selection (Est. 8-10 hours)

Allow users to select which repositories to track.

#### 3.1 Repository APIs

**File:** [`workers/github-commits.js`](workers/github-commits.js)

```javascript
// Implement endpoints:
GET  /api/user/repos/available
     - Use user's GitHub token
     - Fetch all repos from GitHub API
     - Return: [{fullName, description, language, stars, private}]

GET  /api/user/repos
     - Fetch user:${userId}:repos from KV
     - Return selected repo list

POST /api/user/repos
     - Save repos to user:${userId}:repos
     - Clear cached commit data
     - Body: {repos: [repo1, repo2, ...]}
```

#### 3.2 Repository Selector UI

**File:** [`js/repo-selector.js`](js/repo-selector.js)

```javascript
async function fetchAvailableRepos()
     - Call /api/user/repos/available
     - Return list of all accessible repos

async function loadSelectedRepos()
     - Call /api/user/repos
     - Return user's selected repos

async function saveRepos(repos)
     - Call POST /api/user/repos
     - Update dashboard with new selection

function renderRepoList(allRepos, selectedRepos)
     - Display searchable list
     - Checkboxes for selection
     - Save button
```

**File:** [`index.html`](index.html)

Add repository selector modal/page:
- "Select Repositories" button in settings
- Modal with searchable repo list
- Checkboxes to select/deselect
- Search/filter functionality
- "Select All" / "Deselect All" buttons
- Save button

#### 3.3 Update Commit Fetching

**File:** [`workers/github-commits.js`](workers/github-commits.js)

Update `/api/commits` endpoint:
- Get user from session
- Load user's selected repos
- If no repos selected, use all available repos
- Fetch commits using user's GitHub token
- Cache with user-scoped key

#### 3.4 Testing Phase 3

- [ ] Can view list of available repos
- [ ] Can select/deselect repos
- [ ] Selection is saved and persists
- [ ] Dashboard shows commits from selected repos only
- [ ] Changing selection updates dashboard

---

### Phase 4: Polish & Security (Est. 6-8 hours)

Improve UX, add error handling, and enhance security.

#### 4.1 Error Handling

**Worker:**
- Catch and log all errors
- Return user-friendly error messages
- Handle GitHub API rate limits gracefully
- Handle expired/invalid tokens

**Frontend:**
- Display error messages to users
- Loading states during API calls
- Retry logic for transient failures
- Graceful degradation

#### 4.2 Loading States

Add loading indicators:
- During authentication
- While fetching repos
- While loading commit data
- During repo selection save

#### 4.3 Security Enhancements

- [ ] Validate all user inputs
- [ ] Sanitize data before displaying
- [ ] Implement rate limiting per user
- [ ] Add CORS headers properly
- [ ] Review token encryption implementation
- [ ] Audit session management
- [ ] Test for XSS vulnerabilities
- [ ] Test for CSRF vulnerabilities

#### 4.4 Performance Optimization

- [ ] Optimize cache TTLs
- [ ] Reduce unnecessary API calls
- [ ] Minimize KV read/write operations
- [ ] Lazy load repository list
- [ ] Paginate large commit lists

#### 4.5 UX Improvements

- [ ] Better empty states (no repos selected, no commits)
- [ ] Helpful onboarding for first-time users
- [ ] Keyboard shortcuts
- [ ] Mobile responsiveness
- [ ] Accessibility audit (WCAG compliance)

#### 4.6 Testing Phase 4

- [ ] All error cases handled gracefully
- [ ] Loading states work correctly
- [ ] Performance is acceptable with large datasets
- [ ] Works on mobile devices
- [ ] Accessible to screen readers

---

## Future Enhancements (Post-Launch)

### Webhooks Integration

Real-time updates when commits are pushed:

```javascript
POST /webhook/github
     - Validate webhook signature
     - Extract repo and commit info
     - Invalidate cache for affected users
     - Optionally trigger notifications
```

**Benefit:** Reduces GitHub API calls, provides real-time updates

### Team Dashboards

Allow users to create shared dashboards for teams:

```javascript
team:${teamId}:members → [userId1, userId2, ...]
team:${teamId}:repos → [repo1, repo2, ...]
```

**Features:**
- Invite team members
- Aggregate commits across team
- Team-wide statistics
- Shared date ranges and filters

### Custom Metrics

Let users define custom commit categories:

```javascript
user:${userId}:categories → [
  {name: "Bug Fixes", pattern: "fix:|bug:"},
  {name: "Features", pattern: "feat:|feature:"}
]
```

**Features:**
- Tag commits by category
- Category-based filtering
- Category statistics

### Export & Reports

Generate downloadable reports:

```javascript
GET /api/export/pdf?start=...&end=...
GET /api/export/csv?start=...&end=...
```

**Formats:**
- PDF summary report
- CSV data export
- Weekly email summaries

### Advanced Analytics

More insights from commit data:

- Code churn analysis (lines added/removed)
- Contribution patterns (time of day, day of week)
- Language breakdown
- Commit message sentiment analysis
- Productivity trends

### Integrations

Connect with other tools:

- Slack notifications
- Discord webhooks
- Email digests
- Calendar integration (time tracking)
- Jira/Linear issue linking

---

## Success Metrics

### Technical Metrics

- **Response Time:** < 200ms for cached requests
- **Error Rate:** < 1% of requests
- **Uptime:** > 99.9%
- **GitHub API Usage:** < 50% of rate limit

### User Metrics

- **Time to First Value:** < 2 minutes from signup to seeing data
- **Daily Active Users:** Track retention
- **Repositories per User:** Average selection size
- **Feature Usage:** Which features are used most

### Business Metrics (if applicable)

- **User Signups:** Growth rate
- **Upgrade Rate:** Free to paid conversion (if offering paid tiers)
- **Churn Rate:** User retention
- **Support Tickets:** Measure product quality

---

## Contribution Guidelines

Want to implement features from this roadmap?

1. **Choose a phase** - Start with Phase 1 if OAuth isn't done
2. **Read the architecture** - Understand system design first
3. **Make a branch** - Create a feature branch
4. **Implement & test** - Build and test the feature
5. **Document changes** - Update relevant docs
6. **Submit PR** - Include tests and documentation

### Code Quality Standards

- Write clear, commented code
- Follow existing naming conventions
- Add error handling
- Include loading states
- Test on multiple browsers
- Verify mobile responsiveness
- Check accessibility

---

## Questions or Issues?

- Review [`ARCHITECTURE.md`](ARCHITECTURE.md) for system design
- Check [`DEPLOYMENT.md`](DEPLOYMENT.md) for setup help
- See [`CUSTOMIZATION.md`](CUSTOMIZATION.md) for branding changes

This is an open roadmap - adapt it to your needs!

