// Lenis Smooth Scroll Integration
// https://lenis.darkroom.engineering/
// https://github.com/darkroomengineering/lenis

(function() {
  // Wait for Lenis to load from CDN
  function initLenis() {
    if (typeof Lenis === 'undefined') {
      console.warn('Lenis not loaded yet, retrying...');
      setTimeout(initLenis, 100);
      return;
    }
    
    // Get current theme to adjust scroll behavior
    const currentTheme = document.body.getAttribute('data-theme') || 'matrix';
    
    // Theme-specific configurations
    const config = {
      matrix: {
        duration: 1.4,        // Slower, more dramatic
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 0.8, // Smoother wheel response
      },
      plain: {
        duration: 1.0,        // Faster, more responsive
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 1,   // Standard wheel response
      }
    };
    
    const settings = config[currentTheme] || config.matrix;
    
    // Initialize Lenis with theme-specific settings
    const lenis = new Lenis({
      duration: settings.duration,
      easing: settings.easing,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: settings.wheelMultiplier,
      touchMultiplier: 2,
      infinite: false,
      autoRaf: true,  // Automatically use requestAnimationFrame
    });
    
    // Listen for scroll events (optional, for debugging)
    lenis.on('scroll', (e) => {
      // Uncomment to debug scroll events
      // console.log('Lenis scroll:', e);
    });
    
    // Make lenis globally available for potential integrations
    window.lenis = lenis;
    
    // Update Lenis when theme changes
    window.addEventListener('themeChange', () => {
      const newTheme = document.body.getAttribute('data-theme') || 'matrix';
      const newSettings = config[newTheme] || config.matrix;
      
      lenis.options.duration = newSettings.duration;
      lenis.options.wheelMultiplier = newSettings.wheelMultiplier;
      
      console.log(`📜 Lenis updated for ${newTheme} mode`);
    });
    
    console.log(`✨ Lenis smooth scroll initialized (${currentTheme} mode)`);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLenis);
  } else {
    initLenis();
  }
})();

