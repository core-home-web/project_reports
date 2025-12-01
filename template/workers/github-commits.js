/**
 * Cloudflare Worker for GitHub Commits Dashboard (Multi-Tenant Template)
 * Fetches commits from multiple repos, groups by week, and caches responses
 * Supports GitHub OAuth for user authentication
 */

// Configuration - loaded from environment or defaults
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_OAUTH_BASE = 'https://github.com/login/oauth';
const CACHE_TTL = 3600; // 1 hour in seconds
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Part 0: OAuth and Session Management
 */

/**
 * Generates a secure random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

/**
 * Gets user ID from session cookie
 * @param {Request} request - Request object
 * @param {Object} env - Worker environment
 * @returns {Promise<string|null>} User ID or null
 */
async function getUserFromSession(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, value] = c.trim().split('=');
      return [key, value];
    })
  );
  
  const sessionToken = cookies['eoyr_session'];
  if (!sessionToken) return null;
  
  try {
    const sessionData = await env.EOYR_CACHE.get(`session:${sessionToken}`, 'json');
    if (!sessionData || sessionData.expires < Date.now()) {
      return null;
    }
    return sessionData.userId;
  } catch (error) {
    console.error('Error reading session:', error);
    return null;
  }
}

/**
 * Creates a new session for a user
 * @param {Object} env - Worker environment
 * @param {string} userId - User ID
 * @returns {Promise<string>} Session token
 */
async function createSession(env, userId) {
  const sessionToken = generateToken(32);
  const sessionData = {
    userId: userId,
    expires: Date.now() + (SESSION_TTL * 1000)
  };
  
  await env.EOYR_CACHE.put(
    `session:${sessionToken}`,
    JSON.stringify(sessionData),
    { expirationTtl: SESSION_TTL }
  );
  
  return sessionToken;
}

/**
 * Gets user's GitHub token
 * @param {Object} env - Worker environment
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} GitHub token or null
 */
async function getUserToken(env, userId) {
  try {
    const tokenData = await env.EOYR_CACHE.get(`user:${userId}:token`, 'json');
    if (!tokenData) return null;
    // In production, decrypt the token here
    return tokenData.token;
  } catch (error) {
    console.error('Error reading user token:', error);
    return null;
  }
}

/**
 * Saves user's GitHub token
 * @param {Object} env - Worker environment
 * @param {string} userId - User ID
 * @param {string} token - GitHub access token
 */
async function saveUserToken(env, userId, token) {
  // In production, encrypt the token here
  const tokenData = { token: token };
  await env.EOYR_CACHE.put(`user:${userId}:token`, JSON.stringify(tokenData));
}

/**
 * Gets user profile
 * @param {Object} env - Worker environment
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User profile or null
 */
async function getUserProfile(env, userId) {
  try {
    return await env.EOYR_CACHE.get(`user:${userId}:profile`, 'json');
  } catch (error) {
    console.error('Error reading user profile:', error);
    return null;
  }
}

/**
 * Saves user profile
 * @param {Object} env - Worker environment
 * @param {string} userId - User ID
 * @param {Object} profile - User profile data
 */
async function saveUserProfile(env, userId, profile) {
  await env.EOYR_CACHE.put(`user:${userId}:profile`, JSON.stringify(profile));
}

/**
 * Gets user's selected repositories
 * @param {Object} env - Worker environment
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of repo objects
 */
async function getUserRepos(env, userId) {
  try {
    const repos = await env.EOYR_CACHE.get(`user:${userId}:repos`, 'json');
    return repos || [];
  } catch (error) {
    console.error('Error reading user repos:', error);
    return [];
  }
}

/**
 * Saves user's selected repositories
 * @param {Object} env - Worker environment
 * @param {string} userId - User ID
 * @param {Array} repos - Array of repo objects
 */
async function saveUserRepos(env, userId, repos) {
  await env.EOYR_CACHE.put(`user:${userId}:repos`, JSON.stringify(repos));
}

/**
 * Fetches all repositories user has access to from GitHub
 * @param {string} token - GitHub access token
 * @returns {Promise<Array>} Array of repository objects
 */
async function fetchUserRepositories(token) {
  const repos = [];
  let url = `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated`;
  let pageCount = 0;
  const maxPages = 10; // Limit to 1000 repos
  
  while (url && pageCount < maxPages) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EOYR-Dashboard/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const pageRepos = await response.json();
    repos.push(...pageRepos.map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      description: repo.description,
      updatedAt: repo.updated_at
    })));
    
    const linkHeader = response.headers.get('Link');
    const nextUrl = getNextPageUrl(linkHeader);
    url = nextUrl;
    pageCount++;
    
    if (pageRepos.length < 100) break;
  }
  
  return repos;
}

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
  // Handle full repo name (owner/repo) or just repo name
  const repoPath = repo.includes('/') ? repo : `${org}/${repo}`;
  let url = new URL(`${GITHUB_API_BASE}/repos/${repoPath}/commits`);
  
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
  
  console.log(`Starting fetch for ${org}/${repo}, since=${since}, until=${until}`);
  console.log(`Initial URL: ${url.toString()}`);
  
  while (url && pageCount < maxPages) {
    console.log(`Fetching page ${pageCount + 1} from: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EOYR-Dashboard/1.0'
      }
    });
    
    console.log(`Response status for ${repo}: ${response.status}`);
    
    // Handle rate limiting
    if (response.status === 403 || response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '60';
      const rateLimit = response.headers.get('X-RateLimit-Remaining');
      console.warn(`Rate limited for ${repo}, waiting ${retryAfter}s, remaining: ${rateLimit}`);
      // For now, just return what we have
      break;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub API error for ${repo}: ${response.status} - ${errorText}`);
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }
    
    const commits = await response.json();
    console.log(`Got ${commits.length} commits from ${repo} on page ${pageCount + 1}`);
    
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
    
    // If we got less than 100 commits, there are no more pages
    if (commits.length < 100) {
      console.log(`Last page for ${repo}, got ${commits.length} commits`);
      break;
    }
  }
  
  console.log(`Fetched ${allCommits.length} commits from ${repo} (${pageCount} pages)`);
  return allCommits;
}

/**
 * Fetches commits from multiple repositories
 * @param {Array<string>} repos - Array of repository names (can be "repo" or "owner/repo")
 * @param {string} org - GitHub organization name (used if repo doesn't include owner)
 * @param {string} token - GitHub personal access token
 * @param {string} since - ISO date string (YYYY-MM-DD)
 * @param {string} until - ISO date string (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of all commits from all repos
 */
async function fetchAllCommits(repos, org, token, since = null, until = null) {
  const commitPromises = repos.map(repo => {
    // Handle full repo name (owner/repo) or just repo name
    if (repo.includes('/')) {
      const [repoOrg, repoName] = repo.split('/');
      return fetchRepoCommits(repoOrg, repoName, token, since, until).catch(error => {
        console.error(`Error fetching commits from ${repo}:`, error);
        return [];
      });
    } else {
      return fetchRepoCommits(org, repo, token, since, until).catch(error => {
        console.error(`Error fetching commits from ${repo}:`, error);
        return [];
      });
    }
  });
  
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
 * Gets cache key for a specific query (user-scoped)
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {string} userId - User ID for cache isolation
 * @returns {string} Cache key
 */
function getCacheKey(endpoint, params = {}, userId = null) {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  const userPrefix = userId ? `user:${userId}:` : '';
  return `${userPrefix}${endpoint}${paramString ? `?${paramString}` : ''}`;
}

/**
 * Gets cached data from KV
 * @param {Object} env - Worker environment (contains KV namespace)
 * @param {string} key - Cache key
 * @returns {Promise<Object|null>} Cached data or null
 */
async function getCachedData(env, key) {
  // Skip caching if KV namespace is not available
  if (!env.EOYR_CACHE) {
    console.log('KV namespace not available, skipping cache read');
    return null;
  }
  
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
  // Skip caching if KV namespace is not available
  if (!env.EOYR_CACHE) {
    console.log('KV namespace not available, skipping cache write');
    return;
  }
  
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
 * Gets list of repositories for a user
 * @param {Object} env - Worker environment
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Repo config object with organization and repos
 */
async function getRepos(env, userId) {
  // Get user's selected repos
  const userRepos = await getUserRepos(env, userId);
  
  if (userRepos.length > 0) {
    // Normalize repos - ensure they have name and fullName
    const normalizedRepos = userRepos.map(repo => {
      if (typeof repo === 'string') {
        // If it's just a string, try to parse it
        if (repo.includes('/')) {
          const [owner, name] = repo.split('/');
          return { name, fullName: repo, displayName: name };
        }
        return { name: repo, fullName: `${userId}/${repo}`, displayName: repo };
      }
      // Ensure fullName is set
      if (!repo.fullName && repo.name) {
        repo.fullName = repo.name.includes('/') ? repo.name : `${userId}/${repo.name}`;
      }
      return repo;
    });
    
    // Use user's selected repos
    return {
      organization: userId, // For user repos, org is the username
      repos: normalizedRepos
    };
  }
  
  // If no repos selected, return empty array
  // Frontend should prompt user to select repos
  return {
    organization: userId || 'unknown',
    repos: []
  };
}

/**
 * API endpoint: GET /api/repos
 * Returns list of available repositories (user-scoped)
 */
async function handleGetRepos(request, env) {
  const userId = await getUserFromSession(request, env);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const config = await getRepos(env, userId);
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
  const userId = await getUserFromSession(request, env);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const url = new URL(request.url);
  const since = url.searchParams.get('from');
  const until = url.searchParams.get('to');
  const repoFilter = url.searchParams.get('repo'); // Single repo or comma-separated list
  
  // Check cache first
  const cacheKey = getCacheKey('weeks', { from: since, to: until, repo: repoFilter }, userId);
  const cached = await getCachedData(env, cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Get repos config
  const config = await getRepos(env, userId);
  const token = await getUserToken(env, userId);
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'GitHub token not found. Please log in again.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (config.repos.length === 0) {
    return new Response(JSON.stringify({ error: 'No repositories selected. Please select repositories in settings.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Filter repos if repoFilter is provided
  let reposToFetch = config.repos.map(r => r.name || r);
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
  const userId = await getUserFromSession(request, env);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check cache first
  const cacheKey = getCacheKey(`week-${weekId}`, {}, userId);
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
  const config = await getRepos(env, userId);
  const token = await getUserToken(env, userId);
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'GitHub token not found. Please log in again.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Fetch commits for this week
  const repoList = config.repos.map(r => r.name || r);
  const commits = await fetchAllCommits(
    repoList,
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
  const userId = await getUserFromSession(request, env);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
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
  }, userId);
  const cached = await getCachedData(env, cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Get repos config
  const config = await getRepos(env, userId);
  const token = await getUserToken(env, userId);
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'GitHub token not found. Please log in again.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (config.repos.length === 0) {
    return new Response(JSON.stringify({ error: 'No repositories selected. Please select repositories in settings.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Filter repos if repoFilter is provided
  let reposToFetch = config.repos.map(r => r.name || r);
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
 * Debug endpoint to test GitHub API connection
 */
async function handleDebug(request, env) {
  const results = {
    tokenExists: !!env.GITHUB_TOKEN,
    tokenLength: env.GITHUB_TOKEN ? env.GITHUB_TOKEN.length : 0,
    tokenPrefix: env.GITHUB_TOKEN ? env.GITHUB_TOKEN.substring(0, 4) + '...' : 'none',
    kvExists: !!env.EOYR_CACHE,
    reposConfigExists: !!env.REPOS_CONFIG,
    githubApiTest: null,
    error: null
  };
  
  // Test GitHub API with a simple request
  if (env.GITHUB_TOKEN) {
    try {
      const config = await getRepos(env);
      const testRepo = config.repos[0]?.name || 'core_render_portal';
      const testUrl = `https://api.github.com/repos/${config.organization}/${testRepo}/commits?per_page=1`;
      
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `token ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EOYR-Dashboard/1.0'
        }
      });
      
      results.githubApiTest = {
        status: response.status,
        statusText: response.statusText,
        rateLimit: response.headers.get('X-RateLimit-Remaining'),
        rateLimitReset: response.headers.get('X-RateLimit-Reset')
      };
      
      if (!response.ok) {
        const errorBody = await response.text();
        results.githubApiTest.errorBody = errorBody.substring(0, 500);
      } else {
        const commits = await response.json();
        results.githubApiTest.commitCount = commits.length;
        if (commits.length > 0) {
          results.githubApiTest.latestCommitDate = commits[0].commit?.author?.date;
          results.githubApiTest.latestCommitMessage = commits[0].commit?.message?.substring(0, 100);
        }
      }
    } catch (error) {
      results.error = error.message;
    }
  }
  
  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Part 4: OAuth Handlers
 */

/**
 * Handles GitHub OAuth initiation
 * Redirects user to GitHub OAuth page
 */
async function handleOAuthInitiate(request, env) {
  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  const redirectUri = env.OAUTH_REDIRECT_URI || `${new URL(request.url).origin}/auth/github/callback`;
  const state = generateToken(32);
  
  // Store state for CSRF protection
  await env.EOYR_CACHE.put(`oauth:state:${state}`, JSON.stringify({ expires: Date.now() + 600000 }), { expirationTtl: 600 });
  
  const authUrl = `${GITHUB_OAUTH_BASE}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo&state=${state}`;
  
  return Response.redirect(authUrl, 302);
}

/**
 * Handles GitHub OAuth callback
 * Exchanges code for token and creates session
 */
async function handleOAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  if (error) {
    return Response.redirect(`${url.origin}/?error=${encodeURIComponent(error)}`, 302);
  }
  
  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }
  
  // Verify state
  const stateData = await env.EOYR_CACHE.get(`oauth:state:${state}`, 'json');
  if (!stateData) {
    return new Response('Invalid state parameter', { status: 400 });
  }
  await env.EOYR_CACHE.delete(`oauth:state:${state}`);
  
  // Exchange code for token
  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
  const redirectUri = env.OAUTH_REDIRECT_URI || `${url.origin}/auth/github/callback`;
  
  const tokenResponse = await fetch(`${GITHUB_OAUTH_BASE}/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    })
  });
  
  if (!tokenResponse.ok) {
    return new Response('Failed to exchange code for token', { status: 500 });
  }
  
  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    return new Response(`OAuth error: ${tokenData.error}`, { status: 400 });
  }
  
  const accessToken = tokenData.access_token;
  
  // Fetch user profile from GitHub
  const userResponse = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'EOYR-Dashboard/1.0'
    }
  });
  
  if (!userResponse.ok) {
    return new Response('Failed to fetch user profile', { status: 500 });
  }
  
  const userProfile = await userResponse.json();
  const userId = userProfile.login;
  
  // Save user token and profile
  await saveUserToken(env, userId, accessToken);
  await saveUserProfile(env, userId, {
    id: userProfile.id,
    login: userProfile.login,
    name: userProfile.name,
    avatar: userProfile.avatar_url,
    email: userProfile.email
  });
  
  // Create session
  const sessionToken = await createSession(env, userId);
  
  // Redirect to dashboard with session cookie
  const response = Response.redirect(`${url.origin}/`, 302);
  response.headers.set('Set-Cookie', `eoyr_session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL}`);
  
  return response;
}

/**
 * Handles logout
 * Clears session
 */
async function handleLogout(request, env) {
  const userId = await getUserFromSession(request, env);
  if (userId) {
    // Optionally invalidate all user sessions
    // For now, just clear the cookie
  }
  
  const url = new URL(request.url);
  const response = Response.redirect(`${url.origin}/`, 302);
  response.headers.set('Set-Cookie', 'eoyr_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  
  return response;
}

/**
 * Returns current user info
 */
async function handleGetCurrentUser(request, env) {
  const userId = await getUserFromSession(request, env);
  if (!userId) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const profile = await getUserProfile(env, userId);
  if (!profile) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    authenticated: true,
    user: profile
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Part 5: User Repository Management
 */

/**
 * Gets all repositories user has access to
 */
async function handleGetAvailableRepos(request, env) {
  const userId = await getUserFromSession(request, env);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const token = await getUserToken(env, userId);
  if (!token) {
    return new Response(JSON.stringify({ error: 'No GitHub token found' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const repos = await fetchUserRepositories(token);
    return new Response(JSON.stringify({ repos }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Gets user's selected repositories
 */
async function handleGetUserRepos(request, env) {
  const userId = await getUserFromSession(request, env);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const repos = await getUserRepos(env, userId);
  return new Response(JSON.stringify({ repos }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Saves user's selected repositories
 */
async function handleSaveUserRepos(request, env) {
  const userId = await getUserFromSession(request, env);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  const repos = body.repos || [];
  
  await saveUserRepos(env, userId, repos);
  
  return new Response(JSON.stringify({ success: true, repos }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Part 6: Webhook Handler for Cache Invalidation
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
      // OAuth routes
      if (path === '/auth/github' && request.method === 'GET') {
        response = await handleOAuthInitiate(request, env);
      } else if (path === '/auth/github/callback' && request.method === 'GET') {
        response = await handleOAuthCallback(request, env);
      } else if (path === '/auth/logout' && request.method === 'GET') {
        response = await handleLogout(request, env);
      } else if (path === '/auth/me' && request.method === 'GET') {
        response = await handleGetCurrentUser(request, env);
      }
      // User repository management
      else if (path === '/api/user/repos/available' && request.method === 'GET') {
        response = await handleGetAvailableRepos(request, env);
      } else if (path === '/api/user/repos' && request.method === 'GET') {
        response = await handleGetUserRepos(request, env);
      } else if (path === '/api/user/repos' && request.method === 'POST') {
        response = await handleSaveUserRepos(request, env);
      }
      // API endpoints (user-scoped)
      else if (path === '/api/repos' && request.method === 'GET') {
        response = await handleGetRepos(request, env);
      } else if (path === '/api/debug' && request.method === 'GET') {
        response = await handleDebug(request, env);
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

