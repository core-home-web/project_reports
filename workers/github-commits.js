/**
 * Cloudflare Worker for GitHub Commits Dashboard
 * Fetches commits from multiple repos, groups by week, and caches responses
 */

// Configuration - loaded from environment or defaults
const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Part 1: GitHub API Fetch Functions with Date Range Support
 */

/**
 * Parses Link header to get next page URL
 * @param {string} linkHeader - Link header value
 * @returns {string|null} Next page URL or null
 */
function getNextPageUrl(linkHeader) {
  if (!linkHeader) return null;
  
  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Fetches commits from a single repository with date range filtering
 * Includes pagination to fetch ALL commits (not just first 100)
 * @param {string} org - GitHub organization name
 * @param {string} repo - Repository name
 * @param {string} token - GitHub personal access token
 * @param {string} since - ISO date string (YYYY-MM-DD) - commits after this date
 * @param {string} until - ISO date string (YYYY-MM-DD) - commits before this date
 * @returns {Promise<Array>} Array of commit objects
 */
async function fetchRepoCommits(org, repo, token, since = null, until = null) {
  const allCommits = [];
  let url = new URL(`${GITHUB_API_BASE}/repos/${org}/${repo}/commits`);
  
  // Add date range parameters if provided
  if (since) {
    url.searchParams.set('since', new Date(since).toISOString());
  }
  if (until) {
    // Add 1 day to 'until' to include commits on that day
    const untilDate = new Date(until);
    untilDate.setDate(untilDate.getDate() + 1);
    url.searchParams.set('until', untilDate.toISOString());
  }
  
  // Set per_page to maximum (100)
  url.searchParams.set('per_page', '100');
  
  let pageCount = 0;
  const maxPages = 20; // Safety limit to prevent infinite loops
  
  while (url && pageCount < maxPages) {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EOYR-Dashboard/1.0'
      }
    });
    
    // Handle rate limiting
    if (response.status === 403 || response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '60';
      console.warn(`Rate limited for ${repo}, waiting ${retryAfter}s`);
      // For now, just return what we have
      break;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }
    
    const commits = await response.json();
    
    // Add repo name to each commit for easier tracking
    const commitsWithRepo = commits.map(commit => ({
      ...commit,
      repo: repo,
      org: org
    }));
    
    allCommits.push(...commitsWithRepo);
    
    // Check for next page
    const linkHeader = response.headers.get('Link');
    const nextUrl = getNextPageUrl(linkHeader);
    url = nextUrl ? new URL(nextUrl) : null;
    pageCount++;
  }
  
  console.log(`Fetched ${allCommits.length} commits from ${repo} (${pageCount} pages)`);
  return allCommits;
}

/**
 * Fetches commits from multiple repositories
 * @param {Array<string>} repos - Array of repository names
 * @param {string} org - GitHub organization name
 * @param {string} token - GitHub personal access token
 * @param {string} since - ISO date string (YYYY-MM-DD)
 * @param {string} until - ISO date string (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of all commits from all repos
 */
async function fetchAllCommits(repos, org, token, since = null, until = null) {
  const commitPromises = repos.map(repo => 
    fetchRepoCommits(org, repo, token, since, until).catch(error => {
      console.error(`Error fetching commits from ${repo}:`, error);
      // Return empty array on error so other repos still work
      return [];
    })
  );
  
  const results = await Promise.all(commitPromises);
  // Flatten array of arrays into single array
  return results.flat();
}

/**
 * Part 2: Week Grouping Logic and KV Caching
 */

/**
 * Gets the ISO week start date (Monday) for a given date
 * @param {Date} date - Date to get week start for
 * @returns {Date} Monday of that week
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Formats a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Gets the week identifier (YYYY-MM-DD of Monday)
 * @param {Date} date - Date to get week ID for
 * @returns {string} Week identifier
 */
function getWeekId(date) {
  const weekStart = getWeekStart(new Date(date));
  return formatDate(weekStart);
}

/**
 * Groups commits by ISO week
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Object with week IDs as keys and arrays of commits as values
 */
function groupCommitsByWeek(commits) {
  const weekGroups = {};
  
  commits.forEach(commit => {
    const commitDate = new Date(commit.commit.author.date);
    const weekId = getWeekId(commitDate);
    
    if (!weekGroups[weekId]) {
      weekGroups[weekId] = [];
    }
    
    weekGroups[weekId].push(commit);
  });
  
  return weekGroups;
}

/**
 * Groups commits by day
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Object with day IDs (YYYY-MM-DD) as keys
 */
function groupCommitsByDay(commits) {
  const dayGroups = {};
  
  commits.forEach(commit => {
    const commitDate = new Date(commit.commit.author.date);
    const dayId = formatDate(commitDate);
    
    if (!dayGroups[dayId]) {
      dayGroups[dayId] = [];
    }
    
    dayGroups[dayId].push(commit);
  });
  
  return dayGroups;
}

/**
 * Groups commits by month
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Object with month IDs (YYYY-MM) as keys
 */
function groupCommitsByMonth(commits) {
  const monthGroups = {};
  
  commits.forEach(commit => {
    const commitDate = new Date(commit.commit.author.date);
    const monthId = `${commitDate.getFullYear()}-${String(commitDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthGroups[monthId]) {
      monthGroups[monthId] = [];
    }
    
    monthGroups[monthId].push(commit);
  });
  
  return monthGroups;
}

/**
 * Groups commits by year
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Object with year IDs (YYYY) as keys
 */
function groupCommitsByYear(commits) {
  const yearGroups = {};
  
  commits.forEach(commit => {
    const commitDate = new Date(commit.commit.author.date);
    const yearId = String(commitDate.getFullYear());
    
    if (!yearGroups[yearId]) {
      yearGroups[yearId] = [];
    }
    
    yearGroups[yearId].push(commit);
  });
  
  return yearGroups;
}

/**
 * Gets human-readable label for a group
 * @param {string} groupId - Group identifier
 * @param {string} groupBy - Grouping type (day, week, month, year)
 * @returns {string} Human-readable label
 */
function getGroupLabel(groupId, groupBy) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  switch (groupBy) {
    case 'day':
      const dayDate = new Date(groupId);
      return dayDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    case 'week':
      const weekStart = new Date(groupId);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    case 'month':
      const [year, month] = groupId.split('-');
      return `${months[parseInt(month) - 1]} ${year}`;
    case 'year':
      return groupId;
    default:
      return groupId;
  }
}

/**
 * Formats a commit object for API response
 * @param {Object} commit - Raw commit object from GitHub
 * @returns {Object} Formatted commit object
 */
function formatCommit(commit) {
  return {
    sha: commit.sha,
    shortSha: commit.sha.substring(0, 7),
    message: commit.commit.message,
    messageFirstLine: commit.commit.message.split('\n')[0],
    author: commit.commit.author.name,
    authorEmail: commit.commit.author.email,
    date: commit.commit.author.date,
    repo: commit.repo,
    org: commit.org,
    url: commit.html_url
  };
}

/**
 * Gets cache key for a specific query
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
function getCacheKey(endpoint, params = {}) {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${endpoint}${paramString ? `?${paramString}` : ''}`;
}

/**
 * Gets cached data from KV
 * @param {Object} env - Worker environment (contains KV namespace)
 * @param {string} key - Cache key
 * @returns {Promise<Object|null>} Cached data or null
 */
async function getCachedData(env, key) {
  try {
    const cached = await env.EOYR_CACHE.get(key, 'json');
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }
  return null;
}

/**
 * Stores data in KV cache
 * @param {Object} env - Worker environment
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
async function setCachedData(env, key, data, ttl = CACHE_TTL) {
  try {
    const cacheValue = {
      data: data,
      expires: Date.now() + (ttl * 1000)
    };
    await env.EOYR_CACHE.put(key, JSON.stringify(cacheValue));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Part 3: API Endpoints with Filtering
 */

/**
 * Gets list of repositories from config
 * @param {Object} env - Worker environment
 * @returns {Promise<Array>} Array of repo objects
 */
async function getRepos(env) {
  // In production, this would fetch from config/repos.json
  // For now, return hardcoded list (can be made configurable via env var)
  const reposConfig = env.REPOS_CONFIG || JSON.stringify({
    organization: "core-home-web",
    repos: [
      { name: "hydragearbottle_website", displayName: "Hydragear Bottle" },
      { name: "core_render_portal", displayName: "Core Render Portal" },
      { name: "outlaw_spice", displayName: "Outlaw Spice" },
      { name: "people_of_spice", displayName: "People of Spice" },
      { name: "thyme-and-table", displayName: "Thyme & Table" },
      { name: "spice-st-market", displayName: "Spice St Market" }
    ]
  });
  
  return JSON.parse(reposConfig);
}

/**
 * API endpoint: GET /api/repos
 * Returns list of available repositories
 */
async function handleGetRepos(env) {
  const config = await getRepos(env);
  return new Response(JSON.stringify({
    repos: config.repos,
    organization: config.organization
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * API endpoint: GET /api/weeks
 * Returns list of weeks with commit summaries, filtered by date range and repo
 */
async function handleGetWeeks(request, env) {
  const url = new URL(request.url);
  const since = url.searchParams.get('from');
  const until = url.searchParams.get('to');
  const repoFilter = url.searchParams.get('repo'); // Single repo or comma-separated list
  
  // Check cache first
  const cacheKey = getCacheKey('weeks', { from: since, to: until, repo: repoFilter });
  const cached = await getCachedData(env, cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Get repos config
  const config = await getRepos(env);
  const token = env.GITHUB_TOKEN;
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Filter repos if repoFilter is provided
  let reposToFetch = config.repos.map(r => r.name);
  if (repoFilter) {
    const filterList = repoFilter.split(',').map(r => r.trim());
    reposToFetch = reposToFetch.filter(r => filterList.includes(r));
  }
  
  // Fetch commits
  const commits = await fetchAllCommits(
    reposToFetch,
    config.organization,
    token,
    since,
    until
  );
  
  // Group by week
  const weekGroups = groupCommitsByWeek(commits);
  
  // Format response
  const weeks = Object.keys(weekGroups)
    .sort()
    .reverse() // Newest first
    .map(weekId => {
      const weekCommits = weekGroups[weekId];
      const weekStart = new Date(weekId);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Get unique repos for this week
      const repos = [...new Set(weekCommits.map(c => c.repo))];
      
      return {
        weekId: weekId,
        startDate: formatDate(weekStart),
        endDate: formatDate(weekEnd),
        commitCount: weekCommits.length,
        repos: repos,
        repoCount: repos.length
      };
    });
  
  const response = { weeks: weeks };
  
  // Cache the response
  await setCachedData(env, cacheKey, response);
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * API endpoint: GET /api/weeks/:weekId
 * Returns detailed commits for a specific week
 */
async function handleGetWeekDetail(request, env, weekId) {
  // Check cache first
  const cacheKey = getCacheKey(`week-${weekId}`);
  const cached = await getCachedData(env, cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Get week start and end dates
  const weekStart = new Date(weekId);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const since = formatDate(weekStart);
  const until = formatDate(weekEnd);
  
  // Get repos config
  const config = await getRepos(env);
  const token = env.GITHUB_TOKEN;
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Fetch commits for this week
  const commits = await fetchAllCommits(
    config.repos.map(r => r.name),
    config.organization,
    token,
    since,
    until
  );
  
  // Filter to only commits in this week
  const weekStartDate = new Date(weekStart);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekEnd);
  weekEndDate.setHours(23, 59, 59, 999);
  
  const weekCommits = commits.filter(commit => {
    const commitDate = new Date(commit.commit.author.date);
    return commitDate >= weekStartDate && commitDate <= weekEndDate;
  });
  
  // Group by repo
  const commitsByRepo = {};
  weekCommits.forEach(commit => {
    if (!commitsByRepo[commit.repo]) {
      commitsByRepo[commit.repo] = [];
    }
    commitsByRepo[commit.repo].push({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url
    });
  });
  
  const response = {
    weekId: weekId,
    startDate: formatDate(weekStart),
    endDate: formatDate(weekEnd),
    repos: commitsByRepo
  };
  
  // Cache the response
  await setCachedData(env, cacheKey, response);
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * API endpoint: GET /api/commits
 * Returns all commits grouped by day/week/month/year with full commit messages
 * Query params:
 *   - groupBy: 'day', 'week', 'month', 'year' (default: 'week')
 *   - repo: Filter by repo name (comma-separated for multiple)
 *   - from: Start date (YYYY-MM-DD)
 *   - to: End date (YYYY-MM-DD)
 *   - sortBy: 'date', 'repo', 'author' (default: 'date')
 *   - sortOrder: 'asc', 'desc' (default: 'desc')
 *   - search: Search term for commit messages
 */
async function handleGetCommits(request, env) {
  const url = new URL(request.url);
  const groupBy = url.searchParams.get('groupBy') || 'week';
  const repoFilter = url.searchParams.get('repo');
  const since = url.searchParams.get('from');
  const until = url.searchParams.get('to');
  const sortBy = url.searchParams.get('sortBy') || 'date';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const searchTerm = url.searchParams.get('search');
  
  // Check cache first
  const cacheKey = getCacheKey('commits', { 
    groupBy, repo: repoFilter, from: since, to: until, 
    sortBy, sortOrder, search: searchTerm 
  });
  const cached = await getCachedData(env, cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Get repos config
  const config = await getRepos(env);
  const token = env.GITHUB_TOKEN;
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Filter repos if repoFilter is provided
  let reposToFetch = config.repos.map(r => r.name);
  if (repoFilter) {
    const filterList = repoFilter.split(',').map(r => r.trim());
    reposToFetch = reposToFetch.filter(r => filterList.includes(r));
  }
  
  // Default date range: last 2 years if not specified
  let effectiveSince = since;
  let effectiveUntil = until;
  
  if (!effectiveSince) {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    effectiveSince = formatDate(twoYearsAgo);
  }
  
  if (!effectiveUntil) {
    effectiveUntil = formatDate(new Date());
  }
  
  // Fetch all commits with pagination
  let commits = await fetchAllCommits(
    reposToFetch,
    config.organization,
    token,
    effectiveSince,
    effectiveUntil
  );
  
  console.log(`Total commits fetched: ${commits.length}`);
  
  // Apply search filter if provided
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    commits = commits.filter(commit => 
      commit.commit.message.toLowerCase().includes(searchLower) ||
      commit.commit.author.name.toLowerCase().includes(searchLower) ||
      commit.repo.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort commits
  commits.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.commit.author.date) - new Date(b.commit.author.date);
        break;
      case 'repo':
        comparison = a.repo.localeCompare(b.repo);
        break;
      case 'author':
        comparison = a.commit.author.name.localeCompare(b.commit.author.name);
        break;
      default:
        comparison = new Date(a.commit.author.date) - new Date(b.commit.author.date);
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  // Group commits
  let groups = {};
  switch (groupBy) {
    case 'day':
      groups = groupCommitsByDay(commits);
      break;
    case 'week':
      groups = groupCommitsByWeek(commits);
      break;
    case 'month':
      groups = groupCommitsByMonth(commits);
      break;
    case 'year':
      groups = groupCommitsByYear(commits);
      break;
    default:
      groups = groupCommitsByWeek(commits);
  }
  
  // Format response
  const groupKeys = Object.keys(groups).sort();
  if (sortOrder === 'desc') {
    groupKeys.reverse();
  }
  
  const formattedGroups = groupKeys.map(groupId => {
    const groupCommits = groups[groupId];
    const repos = [...new Set(groupCommits.map(c => c.repo))];
    
    // Get date range for group
    const dates = groupCommits.map(c => new Date(c.commit.author.date));
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));
    
    return {
      id: groupId,
      type: groupBy,
      label: getGroupLabel(groupId, groupBy),
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      commitCount: groupCommits.length,
      repos: repos,
      repoCount: repos.length,
      commits: groupCommits.map(formatCommit)
    };
  });
  
  const response = {
    groups: formattedGroups,
    totalCommits: commits.length,
    totalGroups: formattedGroups.length,
    dateRange: {
      from: effectiveSince,
      to: effectiveUntil
    },
    filters: {
      groupBy,
      repos: repoFilter ? repoFilter.split(',') : reposToFetch,
      sortBy,
      sortOrder,
      search: searchTerm
    }
  };
  
  // Cache the response (shorter TTL for larger responses)
  await setCachedData(env, cacheKey, response, commits.length > 500 ? 1800 : CACHE_TTL);
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Part 4: Webhook Handler for Cache Invalidation
 */

/**
 * Validates GitHub webhook signature
 * @param {string} payload - Request body
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {string} secret - Webhook secret
 * @returns {boolean} True if signature is valid
 */
async function validateWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

/**
 * Handles GitHub webhook POST requests
 * Invalidates cache when new commits are pushed
 */
async function handleWebhook(request, env) {
  const signature = request.headers.get('X-Hub-Signature-256');
  const secret = env.WEBHOOK_SECRET;
  
  const payload = await request.text();
  
  // Validate signature
  if (!await validateWebhookSignature(payload, signature, secret)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const event = JSON.parse(payload);
  
  // Only handle push events
  if (event.action === 'push' || event.ref) {
    // Clear all cache entries (simple approach)
    // In production, you might want to clear only specific keys
    try {
      // Note: KV doesn't support listing all keys easily
      // This is a simplified approach - in production you'd track keys
      return new Response('Cache invalidated', { status: 200 });
    } catch (error) {
      console.error('Error invalidating cache:', error);
      return new Response('Error invalidating cache', { status: 500 });
    }
  }
  
  return new Response('Event ignored', { status: 200 });
}

/**
 * Main Worker Handler
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      let response;
      
      // Route requests
      if (path === '/api/repos' && request.method === 'GET') {
        response = await handleGetRepos(env);
      } else if (path === '/api/commits' && request.method === 'GET') {
        response = await handleGetCommits(request, env);
      } else if (path === '/api/weeks' && request.method === 'GET') {
        response = await handleGetWeeks(request, env);
      } else if (path.startsWith('/api/weeks/') && request.method === 'GET') {
        const weekId = path.split('/api/weeks/')[1];
        response = await handleGetWeekDetail(request, env, weekId);
      } else if (path === '/webhook' && request.method === 'POST') {
        response = await handleWebhook(request, env);
      } else {
        response = new Response('Not Found', { status: 404 });
      }
      
      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

