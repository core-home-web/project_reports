# Customization Guide

This guide shows you how to customize the dashboard to match your brand and requirements.

## Table of Contents

1. [Branding & Visual Identity](#branding--visual-identity)
2. [Color Scheme](#color-scheme)
3. [Typography](#typography)
4. [Logo & Favicon](#logo--favicon)
5. [Layout Modifications](#layout-modifications)
6. [Custom Filters](#custom-filters)
7. [Date Range Options](#date-range-options)
8. [API Extensions](#api-extensions)
9. [Advanced Customizations](#advanced-customizations)

---

## Branding & Visual Identity

### Update Page Title

**File:** [`index.html`](index.html)

```html
<title>Your Company Name - GitHub Dashboard</title>
```

### Update Header Text

**File:** [`index.html`](index.html)

Look for the header section and update:

```html
<h1 class="heading">Your Company GitHub Activity</h1>
<p class="paragraph">Track your team's commits and contributions</p>
```

### Update Meta Tags

**File:** [`index.html`](index.html)

```html
<meta name="description" content="Your custom description here">
<meta property="og:title" content="Your Dashboard Name">
<meta property="og:description" content="Your description">
<meta property="og:image" content="/images/your-og-image.png">
```

---

## Color Scheme

The dashboard uses CSS custom properties (variables) for easy theme customization.

### Primary Color Palette

**File:** [`css/eoyr.css`](css/eoyr.css)

Add or modify CSS variables:

```css
:root {
  /* Primary brand color */
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-primary-light: #818cf8;
  
  /* Background colors */
  --color-bg: #0f0f23;
  --color-bg-card: #1a1a2e;
  --color-bg-hover: #252540;
  
  /* Text colors */
  --color-text: #e0e0e0;
  --color-text-muted: #9ca3af;
  --color-text-bright: #ffffff;
  
  /* Border colors */
  --color-border: #2d2d44;
  --color-border-light: #3d3d5c;
  
  /* Accent colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;
}
```

### Dark/Light Mode Toggle

To add a light mode, create an alternate theme:

```css
[data-theme="light"] {
  --color-bg: #ffffff;
  --color-bg-card: #f9fafb;
  --color-bg-hover: #f3f4f6;
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
}
```

**File:** [`js/eoyr.js`](js/eoyr.js)

Add theme toggle logic:

```javascript
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Load saved theme on page load
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
```

### Week Card Colors

**File:** [`css/eoyr.css`](css/eoyr.css)

Customize commit count badges:

```css
.commit-count {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
}

/* Different colors for different commit counts */
.commit-count[data-level="low"] {
  background: var(--color-warning);
}

.commit-count[data-level="medium"] {
  background: var(--color-info);
}

.commit-count[data-level="high"] {
  background: var(--color-success);
}
```

**File:** [`js/eoyr.js`](js/eoyr.js)

Add logic to set data-level attribute:

```javascript
function getCommitLevel(count) {
  if (count < 5) return 'low';
  if (count < 20) return 'medium';
  return 'high';
}

// When rendering commit count:
element.setAttribute('data-level', getCommitLevel(commitCount));
```

---

## Typography

### Change Fonts

**File:** [`index.html`](index.html)

Replace Google Fonts in the `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

**File:** [`css/eoyr.css`](css/eoyr.css)

Update font families:

```css
:root {
  --font-primary: 'Inter', sans-serif;
  --font-heading: 'Inter', sans-serif;
  --font-mono: 'Fira Code', 'Courier New', monospace;
}

body {
  font-family: var(--font-primary);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

code, pre {
  font-family: var(--font-mono);
}
```

### Font Sizes

```css
:root {
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
}

.heading {
  font-size: var(--text-4xl);
}

.paragraph {
  font-size: var(--text-base);
}
```

---

## Logo & Favicon

### Replace Logo

1. **Add your logo image** to `/images/your-logo.png`

2. **Update logo in header**

**File:** [`index.html`](index.html)

```html
<div class="logo-container">
  <img src="/images/your-logo.png" alt="Your Company" class="logo">
</div>
```

3. **Style the logo**

**File:** [`css/eoyr.css`](css/eoyr.css)

```css
.logo {
  max-width: 200px;
  height: auto;
}
```

### Replace Favicon

1. **Generate favicons** using a tool like [RealFaviconGenerator](https://realfavicongenerator.net/)

2. **Add favicon files** to `/images/`

3. **Update favicon links**

**File:** [`index.html`](index.html)

```html
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
```

### Remove 3D Spline Logo

If you want to remove the animated 3D logo:

**File:** [`index.html`](index.html)

Remove this script tag:

```html
<script src="/js/spline-logo.js"></script>
```

And remove the canvas element where the logo renders.

---

## Layout Modifications

### Change Grid Layout

**File:** [`css/eoyr.css`](css/eoyr.css)

Modify the week cards grid:

```css
.week-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

/* For a 2-column layout: */
.week-grid {
  grid-template-columns: repeat(2, 1fr);
}

/* For a 3-column layout: */
.week-grid {
  grid-template-columns: repeat(3, 1fr);
}
```

### Sidebar Navigation

To add a persistent sidebar:

**File:** [`css/eoyr.css`](css/eoyr.css)

```css
.dashboard-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: var(--color-bg-card);
  padding: 2rem 1rem;
  border-right: 1px solid var(--color-border);
}

.main-content {
  padding: 2rem;
}
```

### Card Styles

Customize week cards:

**File:** [`css/eoyr.css`](css/eoyr.css)

```css
.week-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.week-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  border-color: var(--color-primary);
}
```

---

## Custom Filters

### Add New Filter Options

**File:** [`js/eoyr-filters.js`](js/eoyr-filters.js)

Add a filter by commit message pattern:

```javascript
function filterByMessage(commits, pattern) {
  if (!pattern) return commits;
  
  const regex = new RegExp(pattern, 'i');
  return commits.filter(commit => regex.test(commit.message));
}

// Add to your filter UI
function applyFilters() {
  let filteredCommits = allCommits;
  
  const messagePattern = document.getElementById('message-filter').value;
  if (messagePattern) {
    filteredCommits = filterByMessage(filteredCommits, messagePattern);
  }
  
  // ... other filters
  
  renderCommits(filteredCommits);
}
```

**File:** [`index.html`](index.html)

Add the filter input:

```html
<div class="filter-group">
  <label for="message-filter">Filter by message</label>
  <input 
    type="text" 
    id="message-filter" 
    placeholder="e.g., fix, feature, bug"
    oninput="applyFilters()"
  >
</div>
```

### Filter by File Type

```javascript
function filterByFileType(commits, fileExtension) {
  return commits.filter(commit => 
    commit.files && commit.files.some(file => 
      file.endsWith(fileExtension)
    )
  );
}
```

### Filter by Author

```javascript
function filterByAuthor(commits, authorName) {
  if (!authorName) return commits;
  
  return commits.filter(commit => 
    commit.author.toLowerCase().includes(authorName.toLowerCase())
  );
}
```

---

## Date Range Options

### Add Custom Date Ranges

**File:** [`js/eoyr.js`](js/eoyr.js)

```javascript
const dateRangePresets = {
  'last-7-days': { days: 7, label: 'Last 7 Days' },
  'last-30-days': { days: 30, label: 'Last 30 Days' },
  'last-90-days': { days: 90, label: 'Last 90 Days' },
  'this-month': { label: 'This Month', custom: true },
  'last-month': { label: 'Last Month', custom: true },
  'this-quarter': { label: 'This Quarter', custom: true },
  'this-year': { label: 'This Year', custom: true },
  'last-year': { label: 'Last Year', custom: true },
};

function getDateRange(preset) {
  const now = new Date();
  let start, end;
  
  switch(preset) {
    case 'this-month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
    
    case 'last-month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    
    case 'this-quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = now;
      break;
    
    case 'this-year':
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
      break;
    
    default:
      const days = dateRangePresets[preset]?.days || 30;
      start = new Date(now - days * 24 * 60 * 60 * 1000);
      end = now;
  }
  
  return { start, end };
}
```

---

## API Extensions

### Add New Endpoints

**File:** [`workers/github-commits.js`](workers/github-commits.js)

Example: Add an endpoint for pull requests:

```javascript
async function handlePullRequests(request, env) {
  const { userId, repos, startDate, endDate } = await validateAndParse(request);
  
  const pullRequests = [];
  
  for (const repo of repos) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/pulls?state=all&since=${startDate}`,
      {
        headers: {
          'Authorization': `token ${await getUserToken(env, userId)}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );
    
    const prs = await response.json();
    pullRequests.push(...prs);
  }
  
  return new Response(JSON.stringify(pullRequests), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Add to router:
if (url.pathname === '/api/pull-requests') {
  return handlePullRequests(request, env);
}
```

### Add Webhook Endpoint

```javascript
async function handleWebhook(request, env) {
  // Verify GitHub webhook signature
  const signature = request.headers.get('X-Hub-Signature-256');
  const payload = await request.text();
  
  const isValid = await verifySignature(payload, signature, env.WEBHOOK_SECRET);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const event = JSON.parse(payload);
  
  // Invalidate cache for affected repo
  if (event.repository) {
    await invalidateRepoCache(env, event.repository.full_name);
  }
  
  return new Response('OK', { status: 200 });
}
```

---

## Advanced Customizations

### Add Statistics Dashboard

Create a new stats section:

**File:** [`index.html`](index.html)

```html
<div class="stats-grid">
  <div class="stat-card">
    <h3 class="stat-value" id="total-commits">0</h3>
    <p class="stat-label">Total Commits</p>
  </div>
  
  <div class="stat-card">
    <h3 class="stat-value" id="active-days">0</h3>
    <p class="stat-label">Active Days</p>
  </div>
  
  <div class="stat-card">
    <h3 class="stat-value" id="avg-per-day">0</h3>
    <p class="stat-label">Avg Commits/Day</p>
  </div>
</div>
```

**File:** [`js/eoyr.js`](js/eoyr.js)

```javascript
function calculateStats(commits) {
  const totalCommits = commits.length;
  const uniqueDays = new Set(commits.map(c => c.date.split('T')[0])).size;
  const avgPerDay = (totalCommits / uniqueDays).toFixed(1);
  
  document.getElementById('total-commits').textContent = totalCommits;
  document.getElementById('active-days').textContent = uniqueDays;
  document.getElementById('avg-per-day').textContent = avgPerDay;
}
```

### Add Export Functionality

```javascript
function exportToCSV(commits) {
  const csv = [
    ['Date', 'Repository', 'Message', 'Author', 'SHA'],
    ...commits.map(c => [
      c.date,
      c.repo,
      c.message.replace(/,/g, ';'),
      c.author,
      c.sha
    ])
  ].map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commits-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}
```

### Add Charts/Visualizations

Using Chart.js:

**File:** [`index.html`](index.html)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<canvas id="commits-chart"></canvas>
```

**File:** [`js/eoyr.js`](js/eoyr.js)

```javascript
function renderCommitChart(commits) {
  const ctx = document.getElementById('commits-chart').getContext('2d');
  
  // Group commits by date
  const commitsByDate = commits.reduce((acc, commit) => {
    const date = commit.date.split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  
  const dates = Object.keys(commitsByDate).sort();
  const counts = dates.map(date => commitsByDate[date]);
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Commits',
        data: counts,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}
```

---

## Testing Your Customizations

1. **Test locally** before deploying:
```bash
python3 -m http.server 8080
```

2. **Check responsive design** at different screen sizes

3. **Verify accessibility** with browser DevTools

4. **Test in multiple browsers** (Chrome, Firefox, Safari)

5. **Check console** for errors

---

## Need Help?

- Review [`ARCHITECTURE.md`](ARCHITECTURE.md) for system design
- Check [`DEPLOYMENT.md`](DEPLOYMENT.md) for setup help
- See [`ROADMAP.md`](ROADMAP.md) for planned features

Happy customizing! 🎨

