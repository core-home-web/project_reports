/**
 * Color Picker for GitHub Activity Reports
 * Allows users to change the theme color across the entire site
 */

// Available color themes
const COLOR_THEMES = {
  green: {
    name: 'Matrix Green',
    primary: '#00ff41',
    dim: '#00cc33',
    glow: 'rgba(0, 255, 65, 0.3)',
    dark: '#001a00'
  },
  white: {
    name: 'Clean White',
    primary: '#ffffff',
    dim: '#cccccc',
    glow: 'rgba(255, 255, 255, 0.3)',
    dark: '#1a1a1a'
  },
  purple: {
    name: 'Neon Purple',
    primary: '#bf00ff',
    dim: '#9900cc',
    glow: 'rgba(191, 0, 255, 0.3)',
    dark: '#1a001a'
  },
  cyan: {
    name: 'Electric Cyan',
    primary: '#00ffff',
    dim: '#00cccc',
    glow: 'rgba(0, 255, 255, 0.3)',
    dark: '#001a1a'
  },
  orange: {
    name: 'Fusion Orange',
    primary: '#ff6600',
    dim: '#cc5200',
    glow: 'rgba(255, 102, 0, 0.3)',
    dark: '#1a0d00'
  },
  pink: {
    name: 'Hot Pink',
    primary: '#ff0080',
    dim: '#cc0066',
    glow: 'rgba(255, 0, 128, 0.3)',
    dark: '#1a000d'
  }
};

// Storage key for theme preference
const THEME_STORAGE_KEY = 'eoyr-color-theme';

/**
 * Apply a color theme to the document
 * @param {string} themeName - Name of the theme to apply
 */
function applyColorTheme(themeName) {
  const theme = COLOR_THEMES[themeName];
  if (!theme) return;
  
  const root = document.documentElement;
  
  // Update CSS variables
  root.style.setProperty('--eoyr-neon-green', theme.primary);
  root.style.setProperty('--eoyr-neon-green-dim', theme.dim);
  root.style.setProperty('--eoyr-neon-green-glow', theme.glow);
  root.style.setProperty('--eoyr-dark-green', theme.dark);
  
  // Also update the legacy blue variable alias
  root.style.setProperty('--eoyr-neon-blue', theme.primary);
  
  // Save preference
  localStorage.setItem(THEME_STORAGE_KEY, themeName);
  
  // Update active state in picker if open
  updatePickerActiveState(themeName);
}

/**
 * Get the currently saved theme or default
 * @returns {string} Theme name
 */
function getSavedTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'green';
}

/**
 * Update the active state in the color picker UI
 * @param {string} activeTheme - Currently active theme name
 */
function updatePickerActiveState(activeTheme) {
  const swatches = document.querySelectorAll('.color-picker-swatch');
  swatches.forEach(swatch => {
    if (swatch.dataset.theme === activeTheme) {
      swatch.classList.add('active');
    } else {
      swatch.classList.remove('active');
    }
  });
}

/**
 * Create and show the color picker modal
 */
function openColorPicker() {
  // Remove existing picker if any
  const existing = document.getElementById('color-picker-modal');
  if (existing) {
    existing.remove();
    return;
  }
  
  const currentTheme = getSavedTheme();
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'color-picker-modal';
  modal.innerHTML = `
    <div class="color-picker-overlay"></div>
    <div class="color-picker-content">
      <div class="color-picker-header">
        <h3 class="color-picker-title">Choose Theme Color</h3>
        <button class="color-picker-close">&times;</button>
      </div>
      <div class="color-picker-swatches">
        ${Object.entries(COLOR_THEMES).map(([key, theme]) => `
          <button class="color-picker-swatch ${key === currentTheme ? 'active' : ''}" 
                  data-theme="${key}" 
                  style="--swatch-color: ${theme.primary}; --swatch-glow: ${theme.glow};">
            <span class="swatch-color"></span>
            <span class="swatch-name">${theme.name}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add styles
  addPickerStyles();
  
  // Event listeners
  modal.querySelector('.color-picker-overlay').addEventListener('click', closeColorPicker);
  modal.querySelector('.color-picker-close').addEventListener('click', closeColorPicker);
  
  modal.querySelectorAll('.color-picker-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      applyColorTheme(swatch.dataset.theme);
    });
  });
  
  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('open');
  });
}

/**
 * Close the color picker modal
 */
function closeColorPicker() {
  const modal = document.getElementById('color-picker-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  }
}

/**
 * Add color picker styles to the document
 */
function addPickerStyles() {
  if (document.getElementById('color-picker-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'color-picker-styles';
  styles.textContent = `
    #color-picker-modal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    #color-picker-modal.open {
      opacity: 1;
    }
    
    .color-picker-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(5px);
    }
    
    .color-picker-content {
      position: relative;
      background: #0a0a0a;
      border: 2px solid var(--eoyr-neon-green, #00ff41);
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 0 40px var(--eoyr-neon-green-glow, rgba(0, 255, 65, 0.3));
      transform: scale(0.9);
      transition: transform 0.3s ease;
    }
    
    #color-picker-modal.open .color-picker-content {
      transform: scale(1);
    }
    
    .color-picker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--eoyr-neon-green-dim, #00cc33);
    }
    
    .color-picker-title {
      font-family: "Audiowide", sans-serif;
      font-size: 1.25rem;
      color: var(--eoyr-neon-green, #00ff41);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .color-picker-close {
      background: none;
      border: none;
      color: var(--eoyr-neon-green, #00ff41);
      font-size: 2rem;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      transition: all 0.2s ease;
    }
    
    .color-picker-close:hover {
      text-shadow: 0 0 15px var(--eoyr-neon-green-glow, rgba(0, 255, 65, 0.5));
      transform: scale(1.1);
    }
    
    .color-picker-swatches {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    
    .color-picker-swatch {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .color-picker-swatch:hover {
      border-color: var(--swatch-color);
      box-shadow: 0 0 15px var(--swatch-glow);
    }
    
    .color-picker-swatch.active {
      border-color: var(--swatch-color);
      background: rgba(255, 255, 255, 0.05);
      box-shadow: 0 0 20px var(--swatch-glow), inset 0 0 20px var(--swatch-glow);
    }
    
    .swatch-color {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--swatch-color);
      box-shadow: 0 0 15px var(--swatch-glow);
      flex-shrink: 0;
    }
    
    .swatch-name {
      font-family: "Exo 2", sans-serif;
      font-size: 0.95rem;
      color: #fff;
    }
    
    @media (max-width: 480px) {
      .color-picker-swatches {
        grid-template-columns: 1fr;
      }
      
      .color-picker-content {
        padding: 1.5rem;
      }
    }
  `;
  
  document.head.appendChild(styles);
}

/**
 * Initialize color picker on page load
 */
function initColorPicker() {
  // Apply saved theme
  const savedTheme = getSavedTheme();
  if (savedTheme) {
    applyColorTheme(savedTheme);
  }
}

// Make functions available globally
window.openColorPicker = openColorPicker;
window.closeColorPicker = closeColorPicker;
window.applyColorTheme = applyColorTheme;

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initColorPicker);
} else {
  initColorPicker();
}

