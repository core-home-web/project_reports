/**
 * Repository Selector Module
 * Handles fetching and selecting GitHub repositories
 */

const API_BASE_URL = window.API_BASE_URL || window.location.origin;

let availableRepos = [];
let selectedRepos = [];

/**
 * Fetches all repositories user has access to
 * @returns {Promise<Array>} Array of repository objects
 */
async function fetchAvailableRepos() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/repos/available`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        window.redirectToLogin();
        return [];
      }
      throw new Error(`Failed to fetch repos: ${response.status}`);
    }
    
    const data = await response.json();
    availableRepos = data.repos || [];
    return availableRepos;
  } catch (error) {
    console.error('Error fetching available repos:', error);
    return [];
  }
}

/**
 * Loads user's selected repositories
 * @returns {Promise<Array>} Array of selected repo objects
 */
async function loadSelectedRepos() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/repos`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        window.redirectToLogin();
        return [];
      }
      throw new Error(`Failed to load selected repos: ${response.status}`);
    }
    
    const data = await response.json();
    selectedRepos = data.repos || [];
    return selectedRepos;
  } catch (error) {
    console.error('Error loading selected repos:', error);
    return [];
  }
}

/**
 * Saves user's selected repositories
 * @param {Array} repos - Array of repo objects to save
 * @returns {Promise<boolean>} True if successful
 */
async function saveRepos(repos) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/repos`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ repos })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        window.redirectToLogin();
        return false;
      }
      throw new Error(`Failed to save repos: ${response.status}`);
    }
    
    selectedRepos = repos;
    return true;
  } catch (error) {
    console.error('Error saving repos:', error);
    return false;
  }
}

/**
 * Renders repository selection UI
 * @param {Array} repos - Available repositories
 * @param {Array} selected - Selected repository names
 * @param {HTMLElement} container - Container element to render into
 */
function renderRepoList(repos, selected, container) {
  if (!container) return;
  
  container.innerHTML = '';
  
  if (repos.length === 0) {
    container.innerHTML = '<p class="repo-selector-empty">No repositories found. Make sure you have access to at least one repository.</p>';
    return;
  }
  
  // Create search input
  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'repo-selector-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search repositories...';
  searchInput.className = 'repo-selector-search-input';
  searchWrapper.appendChild(searchInput);
  container.appendChild(searchWrapper);
  
  // Create repo list
  const repoList = document.createElement('div');
  repoList.className = 'repo-selector-list';
  container.appendChild(repoList);
  
  let filteredRepos = repos;
  
  // Filter function
  const filterRepos = () => {
    const searchTerm = searchInput.value.toLowerCase();
    filteredRepos = repos.filter(repo => 
      repo.name.toLowerCase().includes(searchTerm) ||
      (repo.fullName && repo.fullName.toLowerCase().includes(searchTerm)) ||
      (repo.description && repo.description.toLowerCase().includes(searchTerm))
    );
    
    renderRepoItems(filteredRepos, selected, repoList);
  };
  
  searchInput.addEventListener('input', filterRepos);
  
  // Initial render
  renderRepoItems(filteredRepos, selected, repoList);
}

/**
 * Renders repository items in the list
 * @param {Array} repos - Repositories to render
 * @param {Array} selected - Selected repository names
 * @param {HTMLElement} container - Container element
 */
function renderRepoItems(repos, selected, container) {
  container.innerHTML = '';
  
  if (repos.length === 0) {
    container.innerHTML = '<p class="repo-selector-empty">No repositories match your search.</p>';
    return;
  }
  
  repos.forEach(repo => {
    const isSelected = selected.some(s => 
      (typeof s === 'string' ? s : s.name) === repo.name ||
      (s.fullName && s.fullName === repo.fullName)
    );
    
    const item = document.createElement('div');
    item.className = `repo-selector-item ${isSelected ? 'selected' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `repo-${repo.name}`;
    checkbox.checked = isSelected;
    checkbox.addEventListener('change', () => {
      toggleRepo(repo, checkbox.checked);
    });
    
    const label = document.createElement('label');
    label.htmlFor = `repo-${repo.name}`;
    label.className = 'repo-selector-label';
    
    const name = document.createElement('div');
    name.className = 'repo-selector-name';
    name.textContent = repo.name;
    
    const fullName = document.createElement('div');
    fullName.className = 'repo-selector-fullname';
    fullName.textContent = repo.fullName || '';
    
    if (repo.description) {
      const desc = document.createElement('div');
      desc.className = 'repo-selector-description';
      desc.textContent = repo.description;
      label.appendChild(desc);
    }
    
    label.appendChild(name);
    if (repo.fullName) label.appendChild(fullName);
    
    item.appendChild(checkbox);
    item.appendChild(label);
    container.appendChild(item);
  });
}

/**
 * Toggles a repository in the selection
 * @param {Object} repo - Repository object
 * @param {boolean} selected - Whether to select or deselect
 */
function toggleRepo(repo, selected) {
  if (selected) {
    // Add to selection
    if (!selectedRepos.some(r => (typeof r === 'string' ? r : r.name) === repo.name)) {
      selectedRepos.push({
        name: repo.name,
        fullName: repo.fullName,
        displayName: repo.name
      });
    }
  } else {
    // Remove from selection
    selectedRepos = selectedRepos.filter(r => 
      (typeof r === 'string' ? r : r.name) !== repo.name
    );
  }
}

/**
 * Initializes repository selector
 * @param {HTMLElement} container - Container element
 */
async function initRepoSelector(container) {
  if (!container) return;
  
  // Show loading state
  container.innerHTML = '<p class="repo-selector-loading">Loading repositories...</p>';
  
  try {
    // Load available and selected repos in parallel
    const [available, selected] = await Promise.all([
      fetchAvailableRepos(),
      loadSelectedRepos()
    ]);
    
    // Get selected repo names
    const selectedNames = selected.map(r => typeof r === 'string' ? r : r.name);
    
    // Render UI
    renderRepoList(available, selectedNames, container);
    
    // Update selectedRepos to match loaded selection
    selectedRepos = selected.length > 0 ? selected : available
      .filter(r => selectedNames.includes(r.name))
      .map(r => ({
        name: r.name,
        fullName: r.fullName,
        displayName: r.name
      }));
  } catch (error) {
    console.error('Error initializing repo selector:', error);
    container.innerHTML = '<p class="repo-selector-error">Error loading repositories. Please try again.</p>';
  }
}

/**
 * Gets currently selected repositories
 * @returns {Array} Array of selected repo objects
 */
function getSelectedRepos() {
  return selectedRepos;
}

// Make functions available globally
window.fetchAvailableRepos = fetchAvailableRepos;
window.loadSelectedRepos = loadSelectedRepos;
window.saveRepos = saveRepos;
window.renderRepoList = renderRepoList;
window.initRepoSelector = initRepoSelector;
window.getSelectedRepos = getSelectedRepos;

