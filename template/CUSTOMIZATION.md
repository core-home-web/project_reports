# Customization Guide

This guide explains how to customize the dashboard to match your brand, add new features, and extend functionality.

## Table of Contents
1. [Branding & UI](#branding--ui)
2. [Color Scheme](#color-scheme)
3. [Logo & Assets](#logo--assets)
4. [Layout Modifications](#layout-modifications)
5. [Adding Custom Filters](#adding-custom-filters)
6. [Extending API Endpoints](#extending-api-endpoints)
7. [Custom Commit Categorization](#custom-commit-categorization)
8. [Email Notifications](#email-notifications)

---

## Branding & UI

### Change Site Title and Metadata

**File**: [`index.html`](index.html)

Update the `<head>` section:

```html
<title>Your Dashboard Name</title>
<meta name="description" content="Your custom description">
```

### Update Favicon

Replace these files with your own:
- `images/favicon.ico` - Browser favicon (32x32 or 64x64)
- `images/webclip.png` - iOS home screen icon (180x180)

**Tip**: Use a tool like https://realfavicongenerator.net/ to generate all sizes.

### Footer & Header Text

**File**: [`index.html`](index.html)

Search for footer/header sections and update:

```html
<div class="footer-text">© 2025 Your Company Name</div>
```

---

## Color Scheme

### Primary Colors

**File**: [`css/eoyr.css`](css/eoyr.css)

Define custom CSS variables:

```css
:root {
  /* Primary brand colors */
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --primary-dark: #4338ca;
  
  /* Background colors */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: #334155;
  
  /* Text colors */
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  
  /* Accent colors */
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-error: #ef4444;
  
  /* Border colors */
  --border-color: #475569;
  --border-hover: #64748b;
}
```

### Apply Colors to Components

Update existing classes or create new ones:

```css
/* Buttons */
.button-primary {
  background-color: var(--primary-color);
  color: var(--text-primary);
}

.button-primary:hover {
  background-color: var(--primary-hover);
}

/* Cards */
.week-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
}

/* Text */
.heading {
  color: var(--text-primary);
}

.subheading {
  color: var(--text-secondary);
}
```

### Commit Heatmap Colors

**File**: [`css/eoyr.css`](css/eoyr.css)

Customize the commit intensity colors:

```css
.commit-cell-0 { background-color: #1e293b; } /* No commits */
.commit-cell-1 { background-color: #22c55e; opacity: 0.3; } /* 1-2 commits */
.commit-cell-2 { background-color: #22c55e; opacity: 0.5; } /* 3-5 commits */
.commit-cell-3 { background-color: #22c55e; opacity: 0.7; } /* 6-9 commits */
.commit-cell-4 { background-color: #22c55e; opacity: 1.0; } /* 10+ commits */
```

---

## Logo & Assets

### Replace the Spline 3D Logo

**Current**: The dashboard uses a 3D Spline logo

**Option 1 - Use an Image Logo**:

**File**: [`index.html`](index.html)

Replace the Spline canvas with an image:

```html
<!-- Find the Spline logo section and replace with: -->
<div class="logo-container">
  <img src="/images/your-logo.png" alt="Your Logo" class="logo-image">
</div>
```

**File**: [`css/eoyr.css`](css/eoyr.css)

Add styling:

```css
.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.logo-image {
  max-width: 200px;
  height: auto;
}
```

**Option 2 - Use Your Own Spline Scene**:

1. Create your scene at https://spline.design
2. Export and get the embed URL
3. Update `js/spline-logo.js` with your Spline URL

**Option 3 - Use Text Logo**:

```html
<div class="text-logo">
  <h1 class="logo-text">YourBrand</h1>
</div>
```

### Background Images/Videos

**File**: [`index.html`](index.html)

Replace the background video:

```html
<video autoplay muted loop playsinline class="background-video">
  <source src="/videos/your-background.mp4" type="video/mp4">
  <source src="/videos/your-background.webm" type="video/webm">
</video>
```

Or use a static background:

```css
body {
  background-image: url('/images/your-background.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}
```

---

## Layout Modifications

### Change Grid Layout

**File**: [`css/eoyr.css`](css/eoyr.css)

Modify the week grid columns:

```css
/* Default: 7 columns (one per day) */
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

/* Change to 5 columns (weekdays only) */
.week-grid.weekdays-only {
  grid-template-columns: repeat(5, 1fr);
}
```

**File**: [`js/eoyr.js`](js/eoyr.js)

Filter out weekends:

```javascript
function renderWeekGrid(commits) {
  const weekdaysOnly = commits.filter(day => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
  });
  // ... render weekdaysOnly
}
```

### Add Sidebar Navigation

**File**: [`index.html`](index.html)

Add a sidebar structure:

```html
<div class="dashboard-layout">
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <a href="#overview" class="nav-item active">Overview</a>
      <a href="#analytics" class="nav-item">Analytics</a>
      <a href="#settings" class="nav-item">Settings</a>
    </nav>
  </aside>
  
  <main class="main-content">
    <!-- Existing dashboard content -->
  </main>
</div>
```

**File**: [`css/eoyr.css`](css/eoyr.css)

Style the sidebar:

```css
.dashboard-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background-color: var(--bg-secondary);
  padding: 20px;
  border-right: 1px solid var(--border-color);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  padding: 12px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.nav-item:hover,
.nav-item.active {
  background-color: var(--primary-color);
  color: var(--text-primary);
}

.main-content {
  flex: 1;
  padding: 20px;
}
```

---

## Adding Custom Filters

### Add Author Filter

**File**: [`js/eoyr-filters.js`](js/eoyr-filters.js)

Add filter function:

```javascript
function filterByAuthor(commits, authorName) {
  if (!authorName || authorName === 'all') {
    return commits;
  }
  
  return commits.filter(commit => 
    commit.commit.author.name.toLowerCase().includes(authorName.toLowerCase())
  );
}
```

**File**: [`index.html`](index.html)

Add UI element:

```html
<div class="filter-group">
  <label for="author-filter">Filter by Author:</label>
  <input 
    type="text" 
    id="author-filter" 
    placeholder="Enter author name"
    class="filter-input"
  >
</div>
```

**File**: [`js/eoyr.js`](js/eoyr.js)

Connect to main logic:

```javascript
document.getElementById('author-filter').addEventListener('input', (e) => {
  const author = e.target.value;
  const filtered = filterByAuthor(allCommits, author);
  renderCommits(filtered);
});
```

### Add Commit Message Search

**File**: [`js/eoyr-filters.js`](js/eoyr-filters.js)

```javascript
function searchCommitMessages(commits, searchTerm) {
  if (!searchTerm) return commits;
  
  const term = searchTerm.toLowerCase();
  return commits.filter(commit =>
    commit.commit.message.toLowerCase().includes(term)
  );
}
```

### Add File Type Filter

```javascript
function filterByFileType(commits, fileExtension) {
  if (!fileExtension || fileExtension === 'all') {
    return commits;
  }
  
  return commits.filter(commit => {
    // Assuming commit has files array
    return commit.files.some(file => 
      file.filename.endsWith(`.${fileExtension}`)
    );
  });
}
```

---

## Extending API Endpoints

### Add Custom Endpoint to Worker

**File**: [`workers/github-commits.js`](workers/github-commits.js)

Add a new route:

```javascript
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // ... existing routes ...
  
  // New custom endpoint
  if (path === '/api/custom/statistics') {
    return handleStatistics(request, env);
  }
  
  return new Response('Not Found', { status: 404 });
}

async function handleStatistics(request, env) {
  // Validate session
  const user = await getUserFromSession(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Fetch user's commit data
  const commits = await fetchUserCommits(env, user.id);
  
  // Calculate statistics
  const stats = {
    totalCommits: commits.length,
    averageCommitsPerDay: calculateAverage(commits),
    mostActiveDay: findMostActiveDay(commits),
    longestStreak: calculateStreak(commits)
  };
  
  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Call Custom Endpoint from Frontend

**File**: [`js/eoyr.js`](js/eoyr.js)

```javascript
async function fetchStatistics() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/custom/statistics`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }
    
    const stats = await response.json();
    displayStatistics(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
}

function displayStatistics(stats) {
  const statsContainer = document.getElementById('statistics');
  statsContainer.innerHTML = `
    <div class="stat-card">
      <h3>Total Commits</h3>
      <p class="stat-value">${stats.totalCommits}</p>
    </div>
    <div class="stat-card">
      <h3>Daily Average</h3>
      <p class="stat-value">${stats.averageCommitsPerDay.toFixed(1)}</p>
    </div>
  `;
}
```

---

## Custom Commit Categorization

### Categorize by Commit Message Patterns

**File**: [`js/eoyr.js`](js/eoyr.js)

```javascript
function categorizeCommit(commit) {
  const message = commit.commit.message.toLowerCase();
  
  // Define categories
  if (message.startsWith('fix') || message.includes('bug')) {
    return { category: 'bugfix', icon: '🐛', color: '#ef4444' };
  }
  if (message.startsWith('feat') || message.includes('feature')) {
    return { category: 'feature', icon: '✨', color: '#10b981' };
  }
  if (message.startsWith('docs') || message.includes('documentation')) {
    return { category: 'docs', icon: '📝', color: '#3b82f6' };
  }
  if (message.startsWith('refactor')) {
    return { category: 'refactor', icon: '♻️', color: '#f59e0b' };
  }
  if (message.startsWith('test')) {
    return { category: 'test', icon: '✅', color: '#8b5cf6' };
  }
  
  return { category: 'other', icon: '📦', color: '#6b7280' };
}

function renderCommitWithCategory(commit) {
  const { category, icon, color } = categorizeCommit(commit);
  
  return `
    <div class="commit-item" style="border-left: 4px solid ${color}">
      <span class="commit-icon">${icon}</span>
      <span class="commit-category">${category}</span>
      <span class="commit-message">${commit.commit.message}</span>
    </div>
  `;
}
```

### Group Commits by Category

```javascript
function groupByCategory(commits) {
  const grouped = {};
  
  commits.forEach(commit => {
    const { category } = categorizeCommit(commit);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(commit);
  });
  
  return grouped;
}

function renderCategoryView(commits) {
  const grouped = groupByCategory(commits);
  const container = document.getElementById('category-view');
  
  Object.entries(grouped).forEach(([category, commits]) => {
    const section = document.createElement('div');
    section.className = 'category-section';
    section.innerHTML = `
      <h3>${category} (${commits.length})</h3>
      <div class="commits-list">
        ${commits.map(c => renderCommitWithCategory(c)).join('')}
      </div>
    `;
    container.appendChild(section);
  });
}
```

---

## Email Notifications

### Add Email Notification Endpoint

**File**: [`workers/github-commits.js`](workers/github-commits.js)

```javascript
async function sendWeeklySummary(env, userId) {
  const user = await env.EOYR_DASHBOARD.get(`user:${userId}:profile`, 'json');
  const commits = await fetchUserCommits(env, userId);
  
  // Calculate summary
  const summary = {
    totalCommits: commits.length,
    repositories: [...new Set(commits.map(c => c.repository.full_name))],
    topDay: findMostActiveDay(commits)
  };
  
  // Send email via your email service (e.g., SendGrid, Mailgun)
  const emailHtml = generateEmailTemplate(summary);
  
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: user.email }]
      }],
      from: { email: 'notifications@yourdomain.com' },
      subject: 'Your Weekly GitHub Summary',
      content: [{ type: 'text/html', value: emailHtml }]
    })
  });
}
```

### Schedule Weekly Emails with Cron Triggers

**File**: [`wrangler.toml`](wrangler.toml)

```toml
[triggers]
crons = ["0 9 * * MON"] # Every Monday at 9 AM
```

**File**: [`workers/github-commits.js`](workers/github-commits.js)

```javascript
export default {
  async scheduled(event, env, ctx) {
    // Get all users
    const userKeys = await env.EOYR_DASHBOARD.list({ prefix: 'user:' });
    
    for (const key of userKeys.keys) {
      if (key.name.endsWith(':profile')) {
        const userId = key.name.split(':')[1];
        await sendWeeklySummary(env, userId);
      }
    }
  }
}
```

---

## Best Practices

### Keep It Modular
- Create separate files for major features
- Use clear naming conventions
- Document your customizations

### Test Thoroughly
- Test in multiple browsers
- Check mobile responsiveness
- Verify API changes don't break existing features

### Version Control
- Create a new git branch for customizations
- Commit frequently with clear messages
- Tag stable releases

### Performance
- Minimize API calls where possible
- Use caching strategically
- Optimize images and assets
- Lazy load heavy components

### Security
- Validate all user inputs
- Sanitize data before rendering
- Never expose API keys in frontend
- Use HTTPS for all endpoints

---

## Need Help?

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for setup issues
- See [ROADMAP.md](ROADMAP.md) for planned features
- Open an issue on GitHub for questions
