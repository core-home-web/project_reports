/**
 * Color Picker for GitHub Activity Reports
 * Allows users to change the theme color across the entire site
 * Features: Grid view and Mobiscroll-style wheel picker with live preview
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
    name: 'Retro Amber',
    primary: '#ffb700',
    dim: '#cc9200',
    glow: 'rgba(255, 183, 0, 0.3)',
    dark: '#1a1300'
  },
  pink: {
    name: 'Hot Pink',
    primary: '#ff0080',
    dim: '#cc0066',
    glow: 'rgba(255, 0, 128, 0.3)',
    dark: '#1a000d'
  }
};

// Storage keys
const THEME_STORAGE_KEY = 'eoyr-color-theme';
const PICKER_MODE_KEY = 'eoyr-picker-mode';

// Theme keys array for wheel navigation
const THEME_KEYS = Object.keys(COLOR_THEMES);

// Current picker state
let currentPickerMode = 'grid'; // 'grid' or 'wheel'
let wheelSelectedIndex = 0;
let originalTheme = null;

/**
 * Convert hex color to RGB components
 * @param {string} hex - Hex color code
 * @returns {object} RGB components {r, g, b}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 255, b: 65 }; // fallback to green
}

/**
 * Apply a color theme to the document
 * @param {string} themeName - Name of the theme to apply
 * @param {boolean} save - Whether to save to localStorage
 */
function applyColorTheme(themeName, save = true) {
  const theme = COLOR_THEMES[themeName];
  if (!theme) return;
  
  const root = document.documentElement;
  const rgb = hexToRgb(theme.primary);
  
  // Update CSS variables
  root.style.setProperty('--eoyr-neon-green', theme.primary);
  root.style.setProperty('--eoyr-neon-green-dim', theme.dim);
  root.style.setProperty('--eoyr-neon-green-glow', theme.glow);
  root.style.setProperty('--eoyr-dark-green', theme.dark);
  
  // Set translucent color variations for backgrounds and borders
  root.style.setProperty('--eoyr-neon-green-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
  root.style.setProperty('--eoyr-neon-green-bg-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
  root.style.setProperty('--eoyr-neon-green-bg-hover', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
  root.style.setProperty('--eoyr-neon-green-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
  
  // Also update the legacy blue variable alias
  root.style.setProperty('--eoyr-neon-blue', theme.primary);
  
  // Save preference
  if (save) {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }
  
  // Update active state in picker if open
  updatePickerActiveState(themeName);
  
  // Update Spline 3D logo color (if loaded)
  if (typeof applySplineColor === 'function') {
    applySplineColor();
  }
}

/**
 * Get the currently saved theme or default
 * @returns {string} Theme name
 */
function getSavedTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'green';
}

/**
 * Get saved picker mode
 * @returns {string} Picker mode ('grid' or 'wheel')
 */
function getSavedPickerMode() {
  return localStorage.getItem(PICKER_MODE_KEY) || 'grid';
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
  
  // Update wheel items
  const wheelItems = document.querySelectorAll('.wheel-item');
  wheelItems.forEach((item, index) => {
    if (THEME_KEYS[index] === activeTheme) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
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
  originalTheme = currentTheme;
  currentPickerMode = getSavedPickerMode();
  wheelSelectedIndex = THEME_KEYS.indexOf(currentTheme);
  if (wheelSelectedIndex === -1) wheelSelectedIndex = 0;
  
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
      
      <div class="picker-mode-toggle">
        <button class="mode-toggle-btn ${currentPickerMode === 'grid' ? 'active' : ''}" data-mode="grid">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Grid
        </button>
        <button class="mode-toggle-btn ${currentPickerMode === 'wheel' ? 'active' : ''}" data-mode="wheel">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 3v18M3 12h18"/>
          </svg>
          Wheel
        </button>
      </div>
      
      <div class="picker-views">
        <div class="picker-view picker-grid ${currentPickerMode === 'grid' ? 'active' : ''}">
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
        
        <div class="picker-view picker-wheel ${currentPickerMode === 'wheel' ? 'active' : ''}">
          <div class="wheel-container">
            <div class="wheel-highlight"></div>
            <div class="wheel-scroller" id="wheel-scroller">
              ${THEME_KEYS.map((key, index) => {
                const theme = COLOR_THEMES[key];
                return `
                  <div class="wheel-item ${index === wheelSelectedIndex ? 'selected' : ''}" 
                       data-theme="${key}" 
                       data-index="${index}"
                       style="--item-color: ${theme.primary}; --item-glow: ${theme.glow};">
                    <span class="wheel-item-color" style="background: ${theme.primary}; box-shadow: 0 0 15px ${theme.glow};"></span>
                    <span class="wheel-item-name">${theme.name}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <p class="wheel-hint">Scroll or drag to change • Color updates live</p>
        </div>
      </div>
      
      <div class="picker-actions">
        <button class="picker-btn picker-cancel">Cancel</button>
        <button class="picker-btn picker-confirm">Apply</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add styles
  addPickerStyles();
  
  // Event listeners
  modal.querySelector('.color-picker-overlay').addEventListener('click', cancelColorPicker);
  modal.querySelector('.color-picker-close').addEventListener('click', cancelColorPicker);
  modal.querySelector('.picker-cancel').addEventListener('click', cancelColorPicker);
  modal.querySelector('.picker-confirm').addEventListener('click', confirmColorPicker);
  
  // Mode toggle
  modal.querySelectorAll('.mode-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPickerMode(btn.dataset.mode);
    });
  });
  
  // Grid swatches
  modal.querySelectorAll('.color-picker-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const themeName = swatch.dataset.theme;
      // Update wheelSelectedIndex to keep in sync
      const themeIndex = THEME_KEYS.indexOf(themeName);
      if (themeIndex !== -1) {
        wheelSelectedIndex = themeIndex;
      }
      applyColorTheme(themeName, false);
    });
  });
  
  // Wheel items
  modal.querySelectorAll('.wheel-item').forEach(item => {
    item.addEventListener('click', () => {
      scrollToWheelIndex(parseInt(item.dataset.index));
    });
  });
  
  // Setup wheel scroll
  setupWheelScroll();
  
  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('open');
    // Center the wheel on current theme
    setTimeout(() => scrollToWheelIndex(wheelSelectedIndex, false), 100);
  });
}

/**
 * Switch between grid and wheel picker modes
 * @param {string} mode - 'grid' or 'wheel'
 */
function switchPickerMode(mode) {
  currentPickerMode = mode;
  localStorage.setItem(PICKER_MODE_KEY, mode);
  
  const modal = document.getElementById('color-picker-modal');
  if (!modal) return;
  
  // Update toggle buttons
  modal.querySelectorAll('.mode-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Update views
  modal.querySelectorAll('.picker-view').forEach(view => {
    view.classList.toggle('active', view.classList.contains(`picker-${mode}`));
  });
  
  // If switching to wheel, center on current selection
  if (mode === 'wheel') {
    const currentTheme = getSavedTheme();
    wheelSelectedIndex = THEME_KEYS.indexOf(currentTheme);
    setTimeout(() => scrollToWheelIndex(wheelSelectedIndex, false), 50);
  }
}

/**
 * Setup wheel scroll behavior
 */
function setupWheelScroll() {
  const scroller = document.getElementById('wheel-scroller');
  if (!scroller) return;
  
  let isScrolling = false;
  let scrollTimeout;
  
  // Mouse wheel scroll
  scroller.addEventListener('wheel', (e) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? 1 : -1;
    const newIndex = Math.max(0, Math.min(THEME_KEYS.length - 1, wheelSelectedIndex + direction));
    if (newIndex !== wheelSelectedIndex) {
      scrollToWheelIndex(newIndex);
    }
  }, { passive: false });
  
  // Touch/drag scroll
  let touchStartY = 0;
  let touchMoveY = 0;
  
  scroller.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  scroller.addEventListener('touchmove', (e) => {
    touchMoveY = e.touches[0].clientY;
    const diff = touchStartY - touchMoveY;
    if (Math.abs(diff) > 30) {
      const direction = diff > 0 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(THEME_KEYS.length - 1, wheelSelectedIndex + direction));
      if (newIndex !== wheelSelectedIndex) {
        scrollToWheelIndex(newIndex);
        touchStartY = touchMoveY;
      }
    }
  }, { passive: true });
  
  // Scroll event for live preview
  scroller.addEventListener('scroll', () => {
    if (isScrolling) return;
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      // Find which item is in center
      const scrollerRect = scroller.getBoundingClientRect();
      const centerY = scrollerRect.top + scrollerRect.height / 2;
      
      const items = scroller.querySelectorAll('.wheel-item');
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const distance = Math.abs(centerY - itemCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      
      if (closestIndex !== wheelSelectedIndex) {
        wheelSelectedIndex = closestIndex;
        updateWheelSelection();
        applyColorTheme(THEME_KEYS[wheelSelectedIndex], false);
      }
    }, 50);
  });
}

/**
 * Scroll wheel to specific index
 * @param {number} index - Index to scroll to
 * @param {boolean} smooth - Use smooth scrolling
 */
function scrollToWheelIndex(index, smooth = true) {
  wheelSelectedIndex = index;
  const scroller = document.getElementById('wheel-scroller');
  if (!scroller) return;
  
  const item = scroller.querySelector(`[data-index="${index}"]`);
  if (!item) return;
  
  const scrollerHeight = scroller.clientHeight;
  const itemHeight = item.offsetHeight;
  const itemTop = item.offsetTop;
  const targetScroll = itemTop - (scrollerHeight / 2) + (itemHeight / 2);
  
  scroller.scrollTo({
    top: targetScroll,
    behavior: smooth ? 'smooth' : 'auto'
  });
  
  updateWheelSelection();
  applyColorTheme(THEME_KEYS[index], false);
}

/**
 * Update wheel visual selection
 */
function updateWheelSelection() {
  const items = document.querySelectorAll('.wheel-item');
  items.forEach((item, index) => {
    item.classList.toggle('selected', index === wheelSelectedIndex);
  });
}

/**
 * Confirm color selection and close
 */
function confirmColorPicker() {
  const currentTheme = THEME_KEYS[wheelSelectedIndex] || getSavedTheme();
  applyColorTheme(currentTheme, true);
  closeColorPicker();
}

/**
 * Cancel color selection and restore original
 */
function cancelColorPicker() {
  if (originalTheme) {
    applyColorTheme(originalTheme, true);
  }
  closeColorPicker();
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
    
    /* Mode Toggle */
    .picker-mode-toggle {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      padding: 0.25rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
    }
    
    .mode-toggle-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: 2px solid transparent;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.5);
      font-family: "Exo 2", sans-serif;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .mode-toggle-btn:hover {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .mode-toggle-btn.active {
      background: var(--eoyr-neon-green, #00ff41);
      color: #0a0a0a;
      border-color: var(--eoyr-neon-green, #00ff41);
      box-shadow: 0 0 15px var(--eoyr-neon-green-glow, rgba(0, 255, 65, 0.3));
    }
    
    .mode-toggle-btn svg {
      flex-shrink: 0;
    }
    
    /* Picker Views */
    .picker-views {
      position: relative;
      min-height: 200px;
    }
    
    .picker-view {
      display: none;
    }
    
    .picker-view.active {
      display: block;
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Grid View */
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
    
    /* Wheel View */
    .wheel-container {
      position: relative;
      height: 200px;
      overflow: hidden;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.3);
    }
    
    .wheel-highlight {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 60px;
      transform: translateY(-50%);
      background: var(--eoyr-neon-green-bg, rgba(0, 255, 65, 0.1));
      border-top: 2px solid var(--eoyr-neon-green, #00ff41);
      border-bottom: 2px solid var(--eoyr-neon-green, #00ff41);
      pointer-events: none;
      z-index: 1;
    }
    
    .wheel-scroller {
      height: 100%;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 70px 0;
    }
    
    .wheel-scroller::-webkit-scrollbar {
      display: none;
    }
    
    .wheel-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      height: 60px;
      padding: 0 1.5rem;
      scroll-snap-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      opacity: 0.4;
      transform: scale(0.9);
    }
    
    .wheel-item.selected {
      opacity: 1;
      transform: scale(1);
    }
    
    .wheel-item:hover:not(.selected) {
      opacity: 0.7;
    }
    
    .wheel-item-color {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: transform 0.3s ease;
    }
    
    .wheel-item.selected .wheel-item-color {
      transform: scale(1.2);
    }
    
    .wheel-item-name {
      font-family: "Exo 2", sans-serif;
      font-size: 1.1rem;
      color: #fff;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .wheel-item.selected .wheel-item-name {
      color: var(--item-color);
      text-shadow: 0 0 10px var(--item-glow);
    }
    
    .wheel-hint {
      text-align: center;
      margin: 1rem 0 0;
      font-family: "Exo 2", sans-serif;
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.4);
    }
    
    /* Actions */
    .picker-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--eoyr-neon-green-dim, #00cc33);
    }
    
    .picker-btn {
      flex: 1;
      padding: 0.875rem 1.5rem;
      border-radius: 6px;
      font-family: "Exo 2", sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .picker-cancel {
      background: transparent;
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.6);
    }
    
    .picker-cancel:hover {
      border-color: rgba(255, 255, 255, 0.4);
      color: #fff;
    }
    
    .picker-confirm {
      background: var(--eoyr-neon-green, #00ff41);
      border: 2px solid var(--eoyr-neon-green, #00ff41);
      color: #0a0a0a;
      box-shadow: 0 0 15px var(--eoyr-neon-green-glow, rgba(0, 255, 65, 0.3));
    }
    
    .picker-confirm:hover {
      box-shadow: 0 0 25px var(--eoyr-neon-green-glow, rgba(0, 255, 65, 0.5));
      transform: translateY(-2px);
    }
    
    @media (max-width: 480px) {
      .color-picker-swatches {
        grid-template-columns: 1fr;
      }
      
      .color-picker-content {
        padding: 1.5rem;
      }
      
      .picker-actions {
        flex-direction: column;
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
