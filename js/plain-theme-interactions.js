// Plain Theme Interactive Features
// Adds special interactions for Minimal Mode

(function() {
  // Flash website cards when WEBSITES nav link is clicked
  function flashWebsiteCards() {
    const websiteCards = document.querySelectorAll('.navbar-right-item.project-card');
    
    websiteCards.forEach(card => {
      // Remove class if already present (to restart animation)
      card.classList.remove('flash-highlight');
      
      // Trigger reflow to restart animation
      void card.offsetWidth;
      
      // Add flash animation class
      card.classList.add('flash-highlight');
      
      // Remove class after animation completes (4 flashes × 0.3s = 1.2s)
      setTimeout(() => {
        card.classList.remove('flash-highlight');
      }, 1200);
    });
  }
  
  // Attach click handler to WEBSITES nav links
  document.addEventListener('DOMContentLoaded', () => {
    // Find all nav links with WEBSITES text
    const navLinks = document.querySelectorAll('.nav-link-desktop, .nav-link-item');
    
    navLinks.forEach(link => {
      const linkText = link.querySelector('.nav-link-text');
      if (linkText && linkText.textContent.trim() === 'WEBSITES') {
        link.addEventListener('click', (e) => {
          // Only flash in plain theme
          const currentTheme = document.body.getAttribute('data-theme');
          if (currentTheme === 'plain') {
            e.preventDefault(); // Prevent navigation
            flashWebsiteCards();
          }
        });
      }
    });
  });
})();

