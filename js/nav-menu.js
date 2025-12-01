/**
 * Navigation Menu Helper Functions
 * Handles menu toggle, websites panel highlight, and navigation
 */

// Toggle the fullscreen menu
function toggleMenu() {
  const menuButton = document.querySelector('.nav-toggle-wrapper.w-nav-button');
  if (menuButton) menuButton.click();
}

// Highlight individual project cards with flashing effect (called from menu Websites link)
function highlightProjectCards() {
  const cards = document.querySelectorAll('.project-card');
  
  if (cards.length > 0) {
    // Scroll to the first card
    cards[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add flash class to each card
    cards.forEach(card => {
      // Remove any existing flash class first
      card.classList.remove('card-flash');
      
      // Force reflow to restart animation
      void card.offsetWidth;
      
      // Add flash class to trigger animation
      card.classList.add('card-flash');
    });
    
    // Remove class after animation completes (4 flashes × 0.3s = 1.2s)
    setTimeout(() => {
      cards.forEach(card => {
        card.classList.remove('card-flash');
      });
    }, 1200);
  }
}

// Open menu and highlight websites panel with flashing effect (called from nav bar WEBSITES link)
function openMenuToWebsites() {
  toggleMenu();
  
  // Add highlight class after menu animation starts
  setTimeout(() => {
    highlightProjectCards();
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
window.highlightProjectCards = highlightProjectCards;

