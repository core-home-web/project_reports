/**
 * Authentication Module for Multi-Tenant Dashboard
 * Handles GitHub OAuth authentication and session management
 */

const API_BASE_URL = window.API_BASE_URL || (window.API_BASE_URL = window.location.origin);

let currentUser = null;

/**
 * Checks if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated) {
        currentUser = data.user;
        return true;
      }
    }
    
    currentUser = null;
    return false;
  } catch (error) {
    console.error('Auth check error:', error);
    currentUser = null;
    return false;
  }
}

/**
 * Redirects to GitHub OAuth login
 */
function redirectToLogin() {
  window.location.href = `${API_BASE_URL}/auth/github`;
}

/**
 * Handles OAuth callback (called from URL params)
 */
async function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  
  if (error) {
    console.error('OAuth error:', error);
    // Remove error from URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return false;
  }
  
  // Check if we just logged in
  const authenticated = await checkAuth();
  if (authenticated) {
    // Remove any OAuth params from URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }
  
  return false;
}

/**
 * Logs out the current user
 */
async function logout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'GET',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  currentUser = null;
  window.location.href = window.location.origin;
}

/**
 * Gets current user info
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Initializes authentication on page load
 */
async function initAuth() {
  // Check if this is an OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code') || urlParams.has('error')) {
    await handleAuthCallback();
  }
  
  // Check authentication status
  const authenticated = await checkAuth();
  
  // Update UI based on auth status
  updateAuthUI(authenticated);
  
  return authenticated;
}

/**
 * Updates authentication UI elements
 * @param {boolean} authenticated - Whether user is authenticated
 */
function updateAuthUI(authenticated) {
  const loginButton = document.getElementById('auth-login-button');
  const logoutButton = document.getElementById('auth-logout-button');
  const userProfile = document.getElementById('auth-user-profile');
  
  if (authenticated && currentUser) {
    // Show authenticated UI
    if (loginButton) loginButton.style.display = 'none';
    if (logoutButton) logoutButton.style.display = 'block';
    if (userProfile) {
      userProfile.style.display = 'flex';
      const avatar = userProfile.querySelector('.auth-user-avatar');
      const name = userProfile.querySelector('.auth-user-name');
      if (avatar) avatar.src = currentUser.avatar || '';
      if (name) name.textContent = currentUser.name || currentUser.login || 'User';
    }
  } else {
    // Show unauthenticated UI
    if (loginButton) loginButton.style.display = 'block';
    if (logoutButton) logoutButton.style.display = 'none';
    if (userProfile) userProfile.style.display = 'none';
  }
}

// Make functions available globally
window.checkAuth = checkAuth;
window.redirectToLogin = redirectToLogin;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.initAuth = initAuth;

