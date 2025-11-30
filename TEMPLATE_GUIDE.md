# End of Year Review Dashboard - Plug & Play Guide

This guide will help you set up your own End of Year Review GitHub Dashboard for any GitHub organization or user account.

## What This System Does

The End of Year Review Dashboard:
- Fetches commits from multiple GitHub repositories
- Groups commits by week (Monday-Sunday)
- Displays a clean, filterable interface
- Shows detailed commit information per week
- Auto-updates when new commits are pushed (via webhooks)

## Quick Start (5-Minute Setup)

### 1. Get Your GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token with `repo` scope
3. Copy the token

### 2. Configure Your Repositories

Edit `config/repos.json`:

```json
{
  "organization": "your-username-or-org",
  "repos": [
    {
      "name": "my-project",
      "displayName": "My Project"
    },
    {
      "name": "another-project",
      "displayName": "Another Project"
    }
  ],
  "defaultDateRange": "3months",
  "weekStartDay": "monday"
}
```

**Notes:**
- `organization`: Your GitHub username or organization name
- `repos`: Array of repositories to track
  - `name`: Repository name (exact name from GitHub)
  - `displayName`: How it appears in the UI
- `defaultDateRange`: Initial date range when page loads
  - Options: `thisWeek`, `lastWeek`, `lastMonth`, `last3Months`, `yearToDate`
- `weekStartDay`: Day of week that starts a new week
  - Options: `monday`, `sunday`

### 3. Set Up Cloudflare

Follow the detailed instructions in `INSTRUCTIONS.md`, but here's the quick version:

1. **Create KV Namespace**: `EOYR_CACHE`
2. **Create Worker**: Copy `workers/github-commits.js` code
3. **Set Environment Variables**:
   - `GITHUB_TOKEN`: Your token from step 1
   - `GITHUB_ORG`: Your org/username
   - `WEBHOOK_SECRET`: Random string
   - `REPOS_CONFIG`: Your `config/repos.json` as single-line JSON
4. **Bind KV**: Link `EOYR_CACHE` namespace
5. **Deploy Pages**: Upload this project

### 4. Update API URL

In `js/eoyr.js`, set:

```javascript
const API_BASE_URL = 'https://your-worker-name.workers.dev';
```

Or set it as an environment variable in Cloudflare Pages.

## Customizing the UI

### Colors and Branding

Edit `css/eoyr.css`:

```css
/* Primary color (used for buttons, links, highlights) */
.eoyr-filter-button {
  background: #007bff; /* Change this */
}

/* Week row hover color */
.eoyr-week-row:hover {
  background: rgba(0, 123, 255, 0.05); /* Change this */
}
```

### Fonts

The dashboard uses fonts from `wanderlostgalaxy.webflow.css`. To change:

1. Update font imports in `index.html`
2. Modify font-family in `css/eoyr.css`:

```css
.eoyr-week-date {
  font-family: 'Your Font', sans-serif;
}
```

### Layout

The layout uses CSS Grid. To adjust column widths in `css/eoyr.css`:

```css
.eoyr-week-header,
.eoyr-week-row {
  grid-template-columns: 2fr 2fr 1fr 1fr; /* Adjust these */
}
```

## Setting Default Date Ranges

### Change Initial Date Range

In `config/repos.json`:

```json
{
  "defaultDateRange": "lastMonth"  // Change this
}
```

### Add Custom Presets

Edit `js/eoyr-filters.js`:

1. Add preset to `DATE_PRESETS` object
2. Add case in `getDateRangeForPreset()` function
3. Add button in `index.html`:

```html
<button type="button" class="eoyr-date-preset" data-preset="yourPreset">Your Preset</button>
```

## Filtering and Sorting

### Available Filters

- **Date Range**: Preset buttons or custom date pickers
- **Projects**: Multi-select dropdown
- **Sort By**: Date or Commit Count
- **Sort Order**: Ascending or Descending

### URL Parameters

Filters are saved in URL for sharing:

- `?from=2025-01-01&to=2025-12-31` - Date range
- `?repo=project1,project2` - Filter by repos
- `?sortBy=commits&sortOrder=desc` - Sort options
- `?preset=last3Months` - Date preset

## Adding More Repositories

1. Edit `config/repos.json`
2. Add new repo object:

```json
{
  "name": "new-repo",
  "displayName": "New Repository"
}
```

3. Update `REPOS_CONFIG` in Cloudflare Worker (or redeploy with updated file)
4. Clear cache (redeploy Worker or wait 1 hour)

## Troubleshooting

### No Commits Showing

**Check:**
1. Repo names are correct in `config/repos.json`
2. Token has access to repos (if private)
3. Date range includes commit dates
4. Browser console for API errors

**Solution:**
- Verify repo names match GitHub exactly
- Check token permissions
- Widen date range
- Check Worker logs in Cloudflare

### Slow Loading

**Causes:**
- Many repos with many commits
- First load (no cache)
- GitHub API rate limits

**Solutions:**
- Reduce number of repos
- Narrow date range
- Wait for cache to populate
- Use authenticated requests (higher rate limit)

### Webhook Not Working

**Check:**
1. Webhook URL is correct
2. Secret matches in GitHub and Worker
3. Webhook is receiving events (check GitHub webhook logs)

**Solution:**
- Verify webhook URL format
- Regenerate secret and update both places
- Check Worker logs for webhook errors

### Styling Issues

**Check:**
1. `css/eoyr.css` is loaded
2. No CSS conflicts with existing styles
3. Browser developer tools for errors

**Solution:**
- Verify CSS file path in HTML
- Check for conflicting class names
- Use browser inspector to debug

## Advanced Customization

### Custom Week Grouping

Edit `workers/github-commits.js`:

```javascript
function getWeekStart(date) {
  // Customize week start logic here
  // Default: Monday
}
```

### Custom Date Formatting

Edit `js/eoyr.js`:

```javascript
function formatDateRange(startDate, endDate) {
  // Customize date format here
}
```

### Additional Filters

1. Add filter UI in `index.html`
2. Add filter logic in `js/eoyr-filters.js`
3. Update API call in `js/eoyr.js`
4. Add filter parameter in Worker

## FAQ

### Q: Can I track private repositories?

**A:** Yes! Just ensure your GitHub token has `repo` scope and access to the private repos.

### Q: How many repos can I track?

**A:** Technically unlimited, but performance may degrade with 50+ repos. Recommended: 10-20 repos.

### Q: Can I use this for multiple organizations?

**A:** Yes, but you'll need separate Worker instances or modify the code to handle multiple orgs.

### Q: How often does the cache update?

**A:** Cache TTL is 1 hour. Webhooks invalidate cache immediately when new commits are pushed.

### Q: Can I customize the week detail pages?

**A:** Yes! Edit `weeks/week-template.html` and the rendering logic in the script tag.

### Q: Does this work with GitHub Enterprise?

**A:** Yes, but you'll need to update the `GITHUB_API_BASE` constant in the Worker to your Enterprise API URL.

### Q: Can I add commit statistics/charts?

**A:** Yes! The data structure supports it. You can add charting libraries (Chart.js, D3.js) and visualize the data.

## Example Configurations

### Single User Account

```json
{
  "organization": "myusername",
  "repos": [
    { "name": "project1", "displayName": "Project 1" },
    { "name": "project2", "displayName": "Project 2" }
  ]
}
```

### Organization with Many Repos

```json
{
  "organization": "mycompany",
  "repos": [
    { "name": "frontend", "displayName": "Frontend App" },
    { "name": "backend", "displayName": "Backend API" },
    { "name": "mobile", "displayName": "Mobile App" }
  ],
  "defaultDateRange": "yearToDate"
}
```

### Personal Projects Only

```json
{
  "organization": "myusername",
  "repos": [
    { "name": "personal-blog", "displayName": "Personal Blog" },
    { "name": "side-project", "displayName": "Side Project" }
  ],
  "defaultDateRange": "lastMonth"
}
```

## Getting Help

If you encounter issues:

1. Check `INSTRUCTIONS.md` for detailed setup
2. Review browser console for errors
3. Check Cloudflare Worker logs
4. Verify GitHub API rate limits
5. Test API endpoints directly

## Contributing

Want to improve this system? Consider:

- Adding more filter options
- Improving mobile responsiveness
- Adding commit statistics
- Supporting more date presets
- Adding export functionality

---

**Happy Tracking!** 🚀

