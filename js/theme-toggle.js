// Theme Toggle System
// Switches between Matrix (retro/neon) and Plain (B&W Helvetica) themes

(function() {
  const THEME_KEY = 'eoyr-theme';
  const MATRIX_THEME = 'matrix';
  const PLAIN_THEME = 'plain';
  
  // Get current theme from localStorage or default to matrix
  function getCurrentTheme() {
    return localStorage.getItem(THEME_KEY) || MATRIX_THEME;
  }
  
  // Apply theme to page
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    
    // Update toggle button if it exists
    updateToggleButton(theme);
  }
  
  // Toggle between themes
  function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === MATRIX_THEME ? PLAIN_THEME : MATRIX_THEME;
    applyTheme(newTheme);
  }
  
  // Update toggle button appearance
  function updateToggleButton(theme) {
    const toggleButton = document.getElementById('theme-toggle');
    if (!toggleButton) return;
    
    const statusText = toggleButton.querySelector('.toggle-status');
    if (statusText) {
      statusText.textContent = theme === MATRIX_THEME ? 'Matrix Mode' : 'Minimal Mode';
    }
    
    toggleButton.setAttribute('data-theme', theme);
  }
  
  // Initialize theme on page load (before DOM ready to avoid flash)
  const initialTheme = getCurrentTheme();
  if (document.body) {
    applyTheme(initialTheme);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(initialTheme);
    });
  }
  
  // Make toggle function globally available
  window.toggleTheme = toggleTheme;
  window.getCurrentTheme = getCurrentTheme;
  
  // Auto-initialize if toggle button exists
  document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      });
      
      // Set initial state
      updateToggleButton(getCurrentTheme());
    }
  });
})();

