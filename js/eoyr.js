/**
 * End of Year Review Dashboard - Main JavaScript
 * Handles API calls, data fetching, and UI rendering
 * 
 * WEBFLOW DEPENDENCY: Uses class names from wanderlostgalaxy.webflow.css
 * If Webflow re-export changes these, update accordingly:
 * - static-cube, block-wrapper, static-block, cube-top
 * - block-content, block-title-wrapper, block-title
 * - block-year, block-client, block-studio, block-type
 * - block-actions-wrapper, icon-3
 */

// Configuration
const API_BASE_URL = window.API_BASE_URL || 'https://eoyr-dashboard.corehomeweb2.workers.dev'; // Cloudflare Worker URL
const API_ENDPOINTS = {
  repos: '/api/repos',
  commits: '/api/commits',
  weeks: '/api/weeks',
  weekDetail: (weekId) => `/api/weeks/${weekId}`
};

/**
 * Fetches data from API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response
 */
async function fetchAPI(endpoint, params = {}) {
  // Construct full URL
  const baseUrl = API_BASE_URL || window.location.origin;
  const url = new URL(endpoint, baseUrl);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  
  try {
    console.log('Fetching:', url.toString()); // Debug log
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors' // Explicitly enable CORS
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', response.status, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API response:', data); // Debug log
    return data;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

/**
 * Fetches list of available repositories
 * @returns {Promise<Array>} Array of repo objects
 */
async function fetchRepos() {
  const data = await fetchAPI(API_ENDPOINTS.repos);
  return data.repos || [];
}

/**
 * Fetches weeks data with filters (legacy endpoint)
 * @param {Object} filters - Filter object (from, to, day, repo)
 * @returns {Promise<Object>} Weeks data
 */
async function fetchWeeks(filters = {}) {
  const params = {};
  
  // If day mode, use day as both from and to
  if (filters.searchMode === 'day' && filters.day) {
    params.from = filters.day;
    params.to = filters.day;
  } else {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }
  
  if (filters.repos && filters.repos.length > 0) {
    params.repo = filters.repos.join(',');
  }
  
  return await fetchAPI(API_ENDPOINTS.weeks, params);
}

/**
 * Fetches commits data with filters (new endpoint with full commit messages)
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Commits data grouped by day/week/month/year
 */
async function fetchCommits(filters = {}) {
  const params = {};
  
  // Group by parameter
  params.groupBy = filters.groupBy || 'week';
  
  // Date range
  if (filters.searchMode === 'day' && filters.day) {
    params.from = filters.day;
    params.to = filters.day;
  } else {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }
  
  // Repo filter
  if (filters.repos && filters.repos.length > 0) {
    params.repo = filters.repos.join(',');
  }
  
  // Sorting
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;
  
  // Search
  if (filters.search) params.search = filters.search;
  
  return await fetchAPI(API_ENDPOINTS.commits, params);
}

/**
 * Fetches detailed commits for a specific week
 * @param {string} weekId - Week identifier (YYYY-MM-DD)
 * @returns {Promise<Object>} Week detail data
 */
async function fetchWeekDetail(weekId) {
  return await fetchAPI(API_ENDPOINTS.weekDetail(weekId));
}

/**
 * Formats a date range string
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {string} Formatted date range
 */
function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  
  return `${startStr} - ${endStr}`;
}

/**
 * Renders commit groups with full commit messages
 * @param {Object} data - API response with groups array
 * @param {Object} sortOptions - Sort options (sortBy, sortOrder)
 */
function renderCommitGroups(data, sortOptions = {}) {
  console.log('renderCommitGroups called with', data.totalGroups, 'groups,', data.totalCommits, 'commits');
  const container = document.getElementById('eoyr-week-list');
  if (!container) {
    console.error('Week list container not found - looking for #eoyr-week-list');
    return;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  const groups = data.groups || [];
  
  if (groups.length === 0) {
    console.log('No groups to display');
    container.innerHTML = `
      <div class="eoyr-empty-state">
        <h3>No commits found</h3>
        <p>Try adjusting your date range, project filters, or search term.</p>
      </div>
    `;
    return;
  }
  
  console.log('Rendering', groups.length, 'groups');
  
  // Create static-cube wrapper matching stories.html
  const staticCube = document.createElement('div');
  staticCube.className = 'static-cube';
  
  // Render each group
  groups.forEach((group, index) => {
    // Group header block
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'block-wrapper';
    
    const headerBlock = document.createElement('div');
    headerBlock.className = 'static-block';
    
    // Add cube-top SVG only for first block
    if (index === 0) {
      const cubeTop = document.createElement('div');
      cubeTop.className = 'cube-top';
      cubeTop.innerHTML = `<div class="cube-top-svg w-embed">
        <svg viewbox="0 0 1400 218">
          <path d="M140 0h1120l140 218H0z" fill="none" stroke="currentColor"></path>
        </svg>
      </div>`;
      headerBlock.appendChild(cubeTop);
    }
    
    // Group header content (clickable to expand/collapse)
    const headerContent = document.createElement('div');
    headerContent.className = 'block-content group-header';
    headerContent.setAttribute('data-group-id', group.id);
    headerContent.style.cursor = 'pointer';
    
    headerContent.innerHTML = `
      <div class="block-title-wrapper">
        <div class="block-year">
          <h4 class="block-title">${group.label}</h4>
        </div>
        <div class="block-client">
          <h4 class="block-title">${group.repos.join(', ')}</h4>
        </div>
        <div class="block-studio">
          <h4 class="block-title">${group.commitCount} ${group.commitCount === 1 ? 'commit' : 'commits'}</h4>
        </div>
        <div class="block-type">
          <h4 class="block-title">${group.repoCount} ${group.repoCount === 1 ? 'project' : 'projects'}</h4>
        </div>
      </div>
      <div class="block-actions-wrapper">
        <div class="icon-3 group-toggle w-embed">
          <svg viewbox="0 0 25 25" class="expand-icon">
            <path d="M12.5 0L25 12.5 12.5 25 0 12.5 12.5 0z" fill="none" stroke="currentColor" stroke-width="2"></path>
            <path d="M12.5 7v11M7 12.5h11" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </div>
      </div>
    `;
    
    headerBlock.appendChild(headerContent);
    headerWrapper.appendChild(headerBlock);
    staticCube.appendChild(headerWrapper);
    
    // Commits container (initially visible)
    const commitsContainer = document.createElement('div');
    commitsContainer.className = 'commits-container';
    commitsContainer.setAttribute('data-group-commits', group.id);
    
    // Render individual commits
    group.commits.forEach(commit => {
      const commitWrapper = document.createElement('div');
      commitWrapper.className = 'block-wrapper commit-row';
      
      const commitBlock = document.createElement('div');
      commitBlock.className = 'static-block commit-block';
      
      const commitContent = document.createElement('a');
      commitContent.className = 'block-content commit-content w-inline-block';
      commitContent.href = commit.url;
      commitContent.target = '_blank';
      commitContent.rel = 'noopener noreferrer';
      
      // Format commit date
      const commitDate = new Date(commit.date);
      const dateStr = commitDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Truncate long messages
      const maxMessageLength = 100;
      const messageFirstLine = commit.messageFirstLine || commit.message.split('\n')[0];
      const truncatedMessage = messageFirstLine.length > maxMessageLength 
        ? messageFirstLine.substring(0, maxMessageLength) + '...'
        : messageFirstLine;
      
      commitContent.innerHTML = `
        <div class="block-title-wrapper commit-details">
          <div class="commit-sha">
            <span class="sha-badge">${commit.shortSha}</span>
          </div>
          <div class="commit-message-wrapper">
            <h4 class="block-title commit-message">${escapeHtml(truncatedMessage)}</h4>
          </div>
          <div class="commit-meta">
            <span class="commit-repo">${commit.repo}</span>
            <span class="commit-author">${escapeHtml(commit.author)}</span>
            <span class="commit-date">${dateStr}</span>
          </div>
        </div>
        <div class="block-actions-wrapper">
          <div class="icon-3 w-embed">
            <svg viewbox="0 0 25 25">
              <path d="M0 13.486h21.178l-9.602 9.591 1.413 1.412L23.591 13.9l.001.001L25 12.496l-.002-.002H25l-1.413-1.412h-.002L12.989.5l-1.407 1.406 9.596 9.584H0v1.996z" fill="currentColor" fill-rule="evenodd"></path>
            </svg>
          </div>
        </div>
      `;
      
      commitBlock.appendChild(commitContent);
      commitWrapper.appendChild(commitBlock);
      commitsContainer.appendChild(commitWrapper);
    });
    
    staticCube.appendChild(commitsContainer);
  });
  
  container.appendChild(staticCube);
  
  // Add click handlers for group toggling
  setupGroupToggle();
}

/**
 * Escapes HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sets up click handlers for group expand/collapse
 */
function setupGroupToggle() {
  document.querySelectorAll('.group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.preventDefault();
      const groupId = header.getAttribute('data-group-id');
      const commitsContainer = document.querySelector(`[data-group-commits="${groupId}"]`);
      const toggleIcon = header.querySelector('.group-toggle');
      
      if (commitsContainer) {
        const isHidden = commitsContainer.classList.toggle('collapsed');
        if (toggleIcon) {
          toggleIcon.classList.toggle('rotated', isHidden);
        }
      }
    });
  });
}

/**
 * Legacy: Renders week rows in the listing (for backward compatibility)
 * @param {Array} weeks - Array of week objects
 * @param {Object} sortOptions - Sort options (sortBy, sortOrder)
 */
function renderWeekRows(weeks, sortOptions = {}, searchMode = 'range') {
  console.log('renderWeekRows called with', weeks.length, 'weeks, mode:', searchMode);
  const container = document.getElementById('eoyr-week-list');
  if (!container) {
    console.error('Week list container not found - looking for #eoyr-week-list');
    return;
  }
  
  console.log('Container found, clearing and rendering...');
  // Clear existing content
  container.innerHTML = '';
  
  if (weeks.length === 0) {
    console.log('No weeks to display');
    const emptyMessage = searchMode === 'day' 
      ? '<p>No commits found for this day. Try selecting a different date.</p>'
      : '<p>Try adjusting your date range or project filters.</p>';
    container.innerHTML = `
      <div class="eoyr-empty-state">
        <h3>No ${searchMode === 'day' ? 'commits' : 'weeks'} found</h3>
        ${emptyMessage}
      </div>
    `;
    return;
  }
  
  console.log('Rendering', weeks.length, 'week rows');
  
  // Sort weeks
  const sortedWeeks = [...weeks].sort((a, b) => {
    const { sortBy = 'date', sortOrder = 'desc' } = sortOptions;
    
    let comparison = 0;
    
    if (sortBy === 'date') {
      comparison = a.weekId.localeCompare(b.weekId);
    } else if (sortBy === 'commits') {
      comparison = a.commitCount - b.commitCount;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  // Create static-cube wrapper matching stories.html
  const staticCube = document.createElement('div');
  staticCube.className = 'static-cube';
  
  // Create week rows matching stories.html structure
  sortedWeeks.forEach(week => {
    const blockWrapper = document.createElement('div');
    blockWrapper.className = 'block-wrapper';
    
    const staticBlock = document.createElement('div');
    staticBlock.className = 'static-block';
    
    // Add cube-top SVG (matching stories.html structure)
    const cubeTop = document.createElement('div');
    cubeTop.className = 'cube-top';
    cubeTop.innerHTML = `<div class="cube-top-svg w-embed">
      <svg viewbox="0 0 1400 218">
        <path d="M140 0h1120l140 218H0z" fill="none" stroke="currentColor"></path>
      </svg>
    </div>`;
    staticBlock.appendChild(cubeTop);
    
    const blockContent = document.createElement('a');
    blockContent.className = 'block-content w-inline-block';
    blockContent.href = `weeks/week-${week.weekId}.html`;
    
    const dateRange = formatDateRange(week.startDate, week.endDate);
    
    // Format date for display (extract just the date part if it's a single day)
    let displayDate = dateRange;
    if (searchMode === 'day' && week.startDate === week.endDate) {
      const date = new Date(week.startDate);
      displayDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    const projectsHTML = week.repos.length > 0
      ? week.repos.map(repo => repo).join(', ')
      : 'No projects';
    
    blockContent.innerHTML = `
      <div class="block-title-wrapper">
        <div class="block-year">
          <h4 class="block-title">${displayDate}</h4>
        </div>
        <div class="block-client">
          <h4 class="block-title">${projectsHTML}</h4>
        </div>
        <div class="block-studio">
          <h4 class="block-title">${week.commitCount} ${week.commitCount === 1 ? 'commit' : 'commits'}</h4>
        </div>
        <div class="block-type">
          <h4 class="block-title">${week.repoCount} ${week.repoCount === 1 ? 'project' : 'projects'}</h4>
        </div>
      </div>
      <div class="block-actions-wrapper">
        <div class="icon-3 w-embed">
          <svg viewbox="0 0 25 25">
            <path d="M0 13.486h21.178l-9.602 9.591 1.413 1.412L23.591 13.9l.001.001L25 12.496l-.002-.002H25l-1.413-1.412h-.002L12.989.5l-1.407 1.406 9.596 9.584H0v1.996z" fill="currentColor" fill-rule="evenodd"></path>
          </svg>
        </div>
      </div>
    `;
    
    staticBlock.appendChild(blockContent);
    blockWrapper.appendChild(staticBlock);
    staticCube.appendChild(blockWrapper);
  });
  
  container.appendChild(staticCube);
}

/**
 * Shows loading state
 */
function showLoading() {
  const container = document.getElementById('eoyr-week-list');
  if (container) {
    container.innerHTML = `
      <div class="eoyr-loading">
        <div class="eoyr-loading-spinner"></div>
        <p>Loading weeks...</p>
      </div>
    `;
  }
}

/**
 * Shows error state
 * @param {string} message - Error message
 */
function showError(message) {
  const container = document.getElementById('eoyr-week-list');
  if (container) {
    container.innerHTML = `
      <div class="eoyr-empty-state">
        <h3>Error loading data</h3>
        <p>${message}</p>
        <button class="eoyr-filter-button" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

/**
 * Populates repo filter dropdown
 * @param {Array} repos - Array of repo objects
 */
async function populateRepoFilter(repos) {
  const select = document.getElementById('eoyr-filter-repos');
  if (!select) return;
  
  // Clear existing options (except "All")
  while (select.options.length > 0) {
    select.remove(0);
  }
  
  // Add "All" option
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All Projects';
  select.appendChild(allOption);
  
  // Add repo options
  repos.forEach(repo => {
    const option = document.createElement('option');
    option.value = repo.name;
    option.textContent = repo.displayName || repo.name;
    select.appendChild(option);
  });
}

// Debounce to prevent multiple simultaneous loads
let loadWeeksTimeout = null;
let currentLoadAbortController = null;

/**
 * Main function to load and render commits
 * Uses the new /api/commits endpoint with full commit messages
 * @param {Object} filters - Filter object
 */
async function loadCommits(filters = {}) {
  // Cancel any pending load
  if (currentLoadAbortController) {
    currentLoadAbortController.abort();
  }
  
  // Clear any pending timeout
  if (loadWeeksTimeout) {
    clearTimeout(loadWeeksTimeout);
  }
  
  // Debounce the load
  return new Promise((resolve) => {
    loadWeeksTimeout = setTimeout(async () => {
      console.log('loadCommits called with filters:', filters);
      showLoading();
      
      currentLoadAbortController = new AbortController();
      
      try {
        const data = await fetchCommits(filters);
        console.log('Commits data received:', data);
        console.log('Total commits:', data.totalCommits);
        console.log('Total groups:', data.totalGroups);
        
        renderCommitGroups(data);
        console.log('renderCommitGroups completed');
        resolve();
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Load was aborted');
          return;
        }
        console.error('Error loading commits:', error);
        showError(error.message || 'Failed to load commits data. Please try again.');
        resolve();
      } finally {
        currentLoadAbortController = null;
      }
    }, 300); // 300ms debounce
  });
}

/**
 * Legacy: Main function to load and render weeks
 * @param {Object} filters - Filter object
 */
async function loadWeeks(filters = {}) {
  // Use the new loadCommits function
  return loadCommits(filters);
}

/**
 * Initializes the dashboard
 */
async function initDashboard() {
  try {
    console.log('Initializing dashboard...');
    console.log('API_BASE_URL:', API_BASE_URL);
    
    // Wait a bit for filter manager to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Load repos for filter dropdown
    console.log('Fetching repos...');
    const repos = await fetchRepos();
    console.log('Repos loaded:', repos);
    await populateRepoFilter(repos);
    
    // Get initial filters from filter manager
    const filters = window.eoyrFilters?.getFilters();
    console.log('Initial filters:', filters);
    
    // Build effective filters with defaults
    const effectiveFilters = {
      groupBy: filters?.groupBy || 'week',
      sortBy: filters?.sortBy || 'date',
      sortOrder: filters?.sortOrder || 'desc',
      search: filters?.search || '',
      repos: filters?.repos || []
    };
    
    // Add date range - default to last 6 months if not specified
    if (filters && filters.from && filters.to) {
      effectiveFilters.from = filters.from;
      effectiveFilters.to = filters.to;
      effectiveFilters.searchMode = filters.searchMode || 'range';
      if (filters.day) effectiveFilters.day = filters.day;
    } else {
      const today = new Date();
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      effectiveFilters.from = sixMonthsAgo.toISOString().split('T')[0];
      effectiveFilters.to = today.toISOString().split('T')[0];
      effectiveFilters.searchMode = 'range';
    }
    
    console.log('Using effective filters:', effectiveFilters);
    await loadCommits(effectiveFilters);
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    console.error('Error stack:', error.stack);
    showError('Failed to initialize dashboard. Please refresh the page. Error: ' + error.message);
  }
}

// Listen for filter changes
window.addEventListener('eoyr-filters-changed', async (event) => {
  const filters = event.detail;
  await loadCommits(filters);
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

// Export functions for use in week detail pages and external access
window.eoyrDashboard = {
  fetchWeekDetail,
  fetchCommits,
  formatDateRange,
  fetchAPI,
  loadCommits,
  renderCommitGroups
};

