/**
 * Navigation Menu Helper Functions
 * Handles menu toggle, websites panel highlight, and navigation
 */

// Toggle the fullscreen menu
function toggleMenu() {
  const menuButton = document.querySelector('.nav-toggle-wrapper.w-nav-button');
  if (menuButton) menuButton.click();
}

// Open menu and highlight websites panel with flashing effect
function openMenuToWebsites() {
  toggleMenu();
  
  // Add highlight class after menu animation starts
  setTimeout(() => {
    const panel = document.querySelector('.navbar-right-content');
    if (panel) {
      // Remove any existing highlight class first
      panel.classList.remove('websites-highlight');
      
      // Force reflow to restart animation
      void panel.offsetWidth;
      
      // Add highlight class to trigger flashing animation
      panel.classList.add('websites-highlight');
      
      // Scroll to the panel
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Remove class after animation completes (4 flashes × 0.4s = 1.6s)
      setTimeout(() => {
        panel.classList.remove('websites-highlight');
      }, 1600);
    }
  }, 300);
}

// Close menu and navigate
function closeMenuAndNavigate(url) {
  removeWebsitesHighlight();
  const navbar = document.querySelector('.navbar-menu');
  if (navbar && navbar.style.display !== 'none') {
    toggleMenu();
  }
  if (url) {
    window.location.href = url;
  }
}

// Just close menu (for View all reports link)
function closeMenu() {
  removeWebsitesHighlight();
  toggleMenu();
}

// Remove highlight
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
window.closeMenu = closeMenu;
window.toggleMenu = toggleMenu;

