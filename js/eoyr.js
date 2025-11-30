/**
 * End of Year Review Dashboard - Main JavaScript
 * Handles API calls, data fetching, and UI rendering
 */

// Configuration
const API_BASE_URL = window.API_BASE_URL || ''; // Set via environment or default to same origin
const API_ENDPOINTS = {
  repos: '/api/repos',
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
  const url = new URL(endpoint, API_BASE_URL || window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
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
 * Fetches weeks data with filters
 * @param {Object} filters - Filter object (from, to, repo)
 * @returns {Promise<Object>} Weeks data
 */
async function fetchWeeks(filters = {}) {
  const params = {};
  
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.repos && filters.repos.length > 0) {
    params.repo = filters.repos.join(',');
  }
  
  return await fetchAPI(API_ENDPOINTS.weeks, params);
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
 * Renders week rows in the listing
 * @param {Array} weeks - Array of week objects
 * @param {Object} sortOptions - Sort options (sortBy, sortOrder)
 */
function renderWeekRows(weeks, sortOptions = {}) {
  const container = document.getElementById('eoyr-week-list');
  if (!container) {
    console.error('Week list container not found');
    return;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  if (weeks.length === 0) {
    container.innerHTML = `
      <div class="eoyr-empty-state">
        <h3>No weeks found</h3>
        <p>Try adjusting your date range or project filters.</p>
      </div>
    `;
    return;
  }
  
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
  
  // Create header row
  const header = document.createElement('div');
  header.className = 'eoyr-week-header';
  header.innerHTML = `
    <div>Week Of</div>
    <div>Projects</div>
    <div>Commits</div>
    <div>View</div>
  `;
  container.appendChild(header);
  
  // Create week rows
  sortedWeeks.forEach(week => {
    const row = document.createElement('a');
    row.className = 'eoyr-week-row';
    row.href = `weeks/week-${week.weekId}.html`;
    
    const dateRange = formatDateRange(week.startDate, week.endDate);
    
    const projectsHTML = week.repos.length > 0
      ? week.repos.map(repo => `<span class="eoyr-week-project-tag">${repo}</span>`).join('')
      : '<span class="eoyr-week-project-tag">No projects</span>';
    
    row.innerHTML = `
      <div class="eoyr-week-date">${dateRange}</div>
      <div class="eoyr-week-projects">${projectsHTML}</div>
      <div class="eoyr-week-commit-count">${week.commitCount}</div>
      <div class="eoyr-week-view">
        View Details
        <svg class="eoyr-week-view-icon" viewBox="0 0 25 25">
          <path d="M0 13.486h21.178l-9.602 9.591 1.413 1.412L23.591 13.9l.001.001L25 12.496l-.002-.002H25l-1.413-1.412h-.002L12.989.5l-1.407 1.406 9.596 9.584H0v1.996z" fill="currentColor" fill-rule="evenodd"></path>
        </svg>
      </div>
    `;
    
    container.appendChild(row);
  });
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

/**
 * Main function to load and render weeks
 * @param {Object} filters - Filter object
 */
async function loadWeeks(filters = {}) {
  showLoading();
  
  try {
    const data = await fetchWeeks(filters);
    const sortOptions = {
      sortBy: filters.sortBy || 'date',
      sortOrder: filters.sortOrder || 'desc'
    };
    renderWeekRows(data.weeks || [], sortOptions);
  } catch (error) {
    console.error('Error loading weeks:', error);
    showError(error.message || 'Failed to load weeks data. Please try again.');
  }
}

/**
 * Initializes the dashboard
 */
async function initDashboard() {
  try {
    // Load repos for filter dropdown
    const repos = await fetchRepos();
    await populateRepoFilter(repos);
    
    // Get initial filters from filter manager
    const filters = window.eoyrFilters?.getFilters();
    if (filters) {
      // Load weeks with initial filters
      await loadWeeks(filters);
    } else {
      // Load weeks with default filters
      await loadWeeks({
        datePreset: 'last3Months',
        sortBy: 'date',
        sortOrder: 'desc'
      });
    }
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showError('Failed to initialize dashboard. Please refresh the page.');
  }
}

// Listen for filter changes
window.addEventListener('eoyr-filters-changed', async (event) => {
  const filters = event.detail;
  await loadWeeks(filters);
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

// Export functions for use in week detail pages
window.eoyrDashboard = {
  fetchWeekDetail,
  formatDateRange,
  fetchAPI
};

