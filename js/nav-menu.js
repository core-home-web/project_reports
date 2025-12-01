/**
 * Navigation Menu Helper Functions
 * Handles menu toggle, websites panel highlight, and navigation
 */

// Toggle the fullscreen menu
function toggleMenu() {
  const menuButton = document.querySelector('.nav-toggle-wrapper.w-nav-button');
  if (menuButton) menuButton.click();
}

// Open menu and highlight websites panel
function openMenuToWebsites() {
  toggleMenu();
  // Add highlight class after menu animation
  setTimeout(() => {
    const panel = document.querySelector('.navbar-right-content');
    if (panel) panel.classList.add('websites-highlight');
  }, 300);
}

// Close menu and navigate
function closeMenuAndNavigate(url) {
  const navbar = document.querySelector('.navbar-menu');
  if (navbar && navbar.style.display !== 'none') {
    toggleMenu();
  }
  window.location.href = url;
}

// Remove highlight when menu is closed
function removeWebsitesHighlight() {
  const panel = document.querySelector('.navbar-right-content');
  if (panel) panel.classList.remove('websites-highlight');
}

// Listen for menu close to remove highlight
document.addEventListener('DOMContentLoaded', () => {
  // Watch for menu state changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'style') {
        const navbar = document.querySelector('.navbar-menu');
        if (navbar && navbar.style.display === 'none') {
          removeWebsitesHighlight();
        }
      }
    });
  });

  const navbar = document.querySelector('.navbar-menu');
  if (navbar) {
    observer.observe(navbar, { attributes: true });
  }
});

// Make functions available globally
window.openMenuToWebsites = openMenuToWebsites;
window.closeMenuAndNavigate = closeMenuAndNavigate;
window.toggleMenu = toggleMenu;

