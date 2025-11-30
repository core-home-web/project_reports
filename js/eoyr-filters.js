/**
 * End of Year Review Dashboard - Filter and Sort Logic
 * Handles date range selection, project filtering, and sorting
 */

/**
 * Date Range Presets
 */
const DATE_PRESETS = {
  thisWeek: 'This Week',
  lastWeek: 'Last Week',
  lastMonth: 'Last Month',
  last3Months: 'Last 3 Months',
  yearToDate: 'Year to Date',
  custom: 'Custom Range'
};

/**
 * Gets the start of the current week (Monday)
 * @returns {Date} Monday of current week
 */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Formats a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Parses a YYYY-MM-DD string to Date
 * @param {string} dateString - Date string
 * @returns {Date} Date object
 */
function parseDate(dateString) {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Gets date range for a preset
 * @param {string} preset - Preset name
 * @returns {Object} Object with from and to dates (YYYY-MM-DD)
 */
function getDateRangeForPreset(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let from, to;
  
  switch (preset) {
    case 'thisWeek':
      from = getWeekStart(today);
      to = new Date(from);
      to.setDate(to.getDate() + 6);
      break;
      
    case 'lastWeek':
      const lastWeekStart = getWeekStart(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      from = lastWeekStart;
      to = new Date(from);
      to.setDate(to.getDate() + 6);
      break;
      
    case 'lastMonth':
      to = new Date(today);
      from = new Date(today);
      from.setMonth(from.getMonth() - 1);
      break;
      
    case 'last3Months':
      to = new Date(today);
      from = new Date(today);
      from.setMonth(from.getMonth() - 3);
      break;
      
    case 'yearToDate':
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(today);
      break;
      
    case 'custom':
    default:
      // Return null to indicate custom range should be used
      return null;
  }
  
  return {
    from: formatDate(from),
    to: formatDate(to)
  };
}

/**
 * Filter Manager Class
 */
class FilterManager {
  constructor() {
    this.currentFilters = {
      datePreset: 'last3Months',
      from: null,
      to: null,
      day: null,
      searchMode: 'range', // 'range' or 'day'
      repos: [],
      sortBy: 'date',
      sortOrder: 'desc'
    };
    
    this.loadFromURL();
    this.setupEventListeners();
  }
  
  /**
   * Loads filter state from URL parameters
   */
  loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('from')) {
      this.currentFilters.from = params.get('from');
    }
    if (params.has('to')) {
      this.currentFilters.to = params.get('to');
    }
    if (params.has('day')) {
      this.currentFilters.day = params.get('day');
      this.currentFilters.searchMode = 'day';
    }
    if (params.has('searchMode')) {
      this.currentFilters.searchMode = params.get('searchMode');
    }
    if (params.has('repo')) {
      this.currentFilters.repos = params.get('repo').split(',').map(r => r.trim());
    }
    if (params.has('sortBy')) {
      this.currentFilters.sortBy = params.get('sortBy');
    }
    if (params.has('sortOrder')) {
      this.currentFilters.sortOrder = params.get('sortOrder');
    }
    if (params.has('preset')) {
      this.currentFilters.datePreset = params.get('preset');
    }
    
    // If in day mode and day is set, use it
    if (this.currentFilters.searchMode === 'day' && this.currentFilters.day) {
      // Day mode is active, don't set range
    } else if (!this.currentFilters.from || !this.currentFilters.to) {
      // If no dates are set, use the preset to determine date range
      if (this.currentFilters.datePreset && this.currentFilters.datePreset !== 'custom') {
        const range = getDateRangeForPreset(this.currentFilters.datePreset);
        if (range) {
          this.currentFilters.from = range.from;
          this.currentFilters.to = range.to;
        }
      } else {
        // Default to last 3 months if nothing is set
        const range = getDateRangeForPreset('last3Months');
        if (range) {
          this.currentFilters.from = range.from;
          this.currentFilters.to = range.to;
          this.currentFilters.datePreset = 'last3Months';
        }
      }
    }
  }
  
  /**
   * Updates URL with current filter state
   */
  updateURL() {
    const params = new URLSearchParams();
    
    if (this.currentFilters.searchMode === 'day' && this.currentFilters.day) {
      params.set('day', this.currentFilters.day);
      params.set('searchMode', 'day');
    } else {
      if (this.currentFilters.from) {
        params.set('from', this.currentFilters.from);
      }
      if (this.currentFilters.to) {
        params.set('to', this.currentFilters.to);
      }
      params.set('searchMode', 'range');
    }
    
    if (this.currentFilters.repos.length > 0) {
      params.set('repo', this.currentFilters.repos.join(','));
    }
    if (this.currentFilters.sortBy) {
      params.set('sortBy', this.currentFilters.sortBy);
    }
    if (this.currentFilters.sortOrder) {
      params.set('sortOrder', this.currentFilters.sortOrder);
    }
    if (this.currentFilters.datePreset) {
      params.set('preset', this.currentFilters.datePreset);
    }
    
    const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.pushState({}, '', newURL);
  }
  
  /**
   * Initializes date inputs with default values
   */
  initializeDateInputs() {
    // Set search mode
    const searchModeSelect = document.getElementById('eoyr-search-mode');
    if (searchModeSelect) {
      searchModeSelect.value = this.currentFilters.searchMode || 'range';
      this.toggleSearchMode(this.currentFilters.searchMode || 'range');
    }
    
    // If no dates are set, use default preset
    if (this.currentFilters.searchMode === 'day') {
      const dayInput = document.getElementById('eoyr-date-day');
      if (dayInput && this.currentFilters.day) {
        dayInput.value = this.currentFilters.day;
      } else if (dayInput && !this.currentFilters.day) {
        // Default to today
        dayInput.value = formatDate(new Date());
        this.currentFilters.day = dayInput.value;
      }
    } else {
      if (!this.currentFilters.from || !this.currentFilters.to) {
        const defaultPreset = this.currentFilters.datePreset || 'last3Months';
        const range = getDateRangeForPreset(defaultPreset);
        if (range) {
          this.currentFilters.from = range.from;
          this.currentFilters.to = range.to;
        }
      }
      
      // Set date input values
      const fromInput = document.getElementById('eoyr-date-from');
      const toInput = document.getElementById('eoyr-date-to');
      if (fromInput && this.currentFilters.from) {
        fromInput.value = this.currentFilters.from;
      }
      if (toInput && this.currentFilters.to) {
        toInput.value = this.currentFilters.to;
      }
    }
    
    // Set active preset button
    if (this.currentFilters.datePreset) {
      document.querySelectorAll('.eoyr-date-preset').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.preset === this.currentFilters.datePreset) {
          btn.classList.add('active');
        }
      });
    }
  }
  
  /**
   * Toggles between range and day search modes
   * @param {string} mode - 'range' or 'day'
   */
  toggleSearchMode(mode) {
    const rangeFilters = document.getElementById('eoyr-range-filters');
    const rangeToFilter = document.getElementById('eoyr-range-to-filter');
    const dayFilter = document.getElementById('eoyr-day-filter');
    
    if (mode === 'day') {
      if (rangeFilters) rangeFilters.style.display = 'none';
      if (rangeToFilter) rangeToFilter.style.display = 'none';
      if (dayFilter) dayFilter.style.display = 'flex';
      this.currentFilters.searchMode = 'day';
      this.currentFilters.from = null;
      this.currentFilters.to = null;
    } else {
      if (rangeFilters) rangeFilters.style.display = 'flex';
      if (rangeToFilter) rangeToFilter.style.display = 'flex';
      if (dayFilter) dayFilter.style.display = 'none';
      this.currentFilters.searchMode = 'range';
      this.currentFilters.day = null;
      
      // Restore date range if not set
      if (!this.currentFilters.from || !this.currentFilters.to) {
        const defaultPreset = this.currentFilters.datePreset || 'last3Months';
        const range = getDateRangeForPreset(defaultPreset);
        if (range) {
          this.currentFilters.from = range.from;
          this.currentFilters.to = range.to;
          const fromInput = document.getElementById('eoyr-date-from');
          const toInput = document.getElementById('eoyr-date-to');
          if (fromInput) fromInput.value = range.from;
          if (toInput) toInput.value = range.to;
        }
      }
    }
  }
  
  /**
   * Sets up event listeners for filter controls
   */
  setupEventListeners() {
    // Initialize date inputs first
    this.initializeDateInputs();
    
    // Search mode selector
    const searchModeSelect = document.getElementById('eoyr-search-mode');
    if (searchModeSelect) {
      searchModeSelect.addEventListener('change', () => {
        const mode = searchModeSelect.value;
        this.toggleSearchMode(mode);
        this.updateURL();
        this.applyFilters();
      });
    }
    
    // Date preset buttons
    document.querySelectorAll('.eoyr-date-preset').forEach(button => {
      button.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        this.setDatePreset(preset);
      });
    });
    
    // Custom date inputs (range mode)
    const fromInput = document.getElementById('eoyr-date-from');
    const toInput = document.getElementById('eoyr-date-to');
    
    if (fromInput) {
      fromInput.addEventListener('change', () => {
        this.currentFilters.from = fromInput.value;
        this.currentFilters.datePreset = 'custom';
        this.updateURL();
        this.applyFilters();
      });
    }
    
    if (toInput) {
      toInput.addEventListener('change', () => {
        this.currentFilters.to = toInput.value;
        this.currentFilters.datePreset = 'custom';
        this.updateURL();
        this.applyFilters();
      });
    }
    
    // Day input (single day mode)
    const dayInput = document.getElementById('eoyr-date-day');
    if (dayInput) {
      dayInput.addEventListener('change', () => {
        this.currentFilters.day = dayInput.value;
        this.updateURL();
        this.applyFilters();
      });
    }
    
    // Repo filter (multi-select)
    const repoSelect = document.getElementById('eoyr-filter-repos');
    if (repoSelect) {
      repoSelect.addEventListener('change', () => {
        const selected = Array.from(repoSelect.selectedOptions).map(opt => opt.value);
        this.currentFilters.repos = selected;
        this.updateURL();
        this.applyFilters();
      });
    }
    
    // Sort controls
    const sortBySelect = document.getElementById('eoyr-sort-by');
    const sortOrderSelect = document.getElementById('eoyr-sort-order');
    
    if (sortBySelect) {
      sortBySelect.addEventListener('change', () => {
        this.currentFilters.sortBy = sortBySelect.value;
        this.updateURL();
        this.applyFilters();
      });
    }
    
    if (sortOrderSelect) {
      sortOrderSelect.addEventListener('change', () => {
        this.currentFilters.sortOrder = sortOrderSelect.value;
        this.updateURL();
        this.applyFilters();
      });
    }
    
    // Clear filters button
    const clearButton = document.getElementById('eoyr-clear-filters');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clearFilters();
      });
    }
  }
  
  /**
   * Sets date preset and updates date range
   * @param {string} preset - Preset name
   */
  setDatePreset(preset) {
    this.currentFilters.datePreset = preset;
    
    // Update active preset button
    document.querySelectorAll('.eoyr-date-preset').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.preset === preset) {
        btn.classList.add('active');
      }
    });
    
    // Get date range for preset
    if (preset !== 'custom') {
      const range = getDateRangeForPreset(preset);
      if (range) {
        this.currentFilters.from = range.from;
        this.currentFilters.to = range.to;
        
        // Update date inputs
        const fromInput = document.getElementById('eoyr-date-from');
        const toInput = document.getElementById('eoyr-date-to');
        if (fromInput) fromInput.value = range.from;
        if (toInput) toInput.value = range.to;
      }
    }
    
    this.updateURL();
    this.applyFilters();
  }
  
  /**
   * Clears all filters and resets to defaults
   */
  clearFilters() {
    this.currentFilters = {
      datePreset: 'last3Months',
      from: null,
      to: null,
      day: null,
      searchMode: 'range',
      repos: [],
      sortBy: 'date',
      sortOrder: 'desc'
    };
    
    // Reset UI
    const searchModeSelect = document.getElementById('eoyr-search-mode');
    if (searchModeSelect) {
      searchModeSelect.value = 'range';
      this.toggleSearchMode('range');
    }
    
    const range = getDateRangeForPreset('last3Months');
    const fromInput = document.getElementById('eoyr-date-from');
    const toInput = document.getElementById('eoyr-date-to');
    if (fromInput && range) fromInput.value = range.from;
    if (toInput && range) toInput.value = range.to;
    
    const dayInput = document.getElementById('eoyr-date-day');
    if (dayInput) dayInput.value = '';
    
    const repoSelect = document.getElementById('eoyr-filter-repos');
    if (repoSelect) {
      Array.from(repoSelect.options).forEach(opt => opt.selected = false);
    }
    
    const sortBySelect = document.getElementById('eoyr-sort-by');
    const sortOrderSelect = document.getElementById('eoyr-sort-order');
    if (sortBySelect) sortBySelect.value = 'date';
    if (sortOrderSelect) sortOrderSelect.value = 'desc';
    
    // Update preset buttons
    document.querySelectorAll('.eoyr-date-preset').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.preset === 'last3Months') {
        btn.classList.add('active');
      }
    });
    
    this.updateURL();
    this.applyFilters();
  }
  
  /**
   * Applies current filters and triggers data refresh
   */
  applyFilters() {
    // Dispatch custom event that eoyr.js will listen to
    const event = new CustomEvent('eoyr-filters-changed', {
      detail: { ...this.currentFilters }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * Gets current filter values
   * @returns {Object} Current filter state
   */
  getFilters() {
    return { ...this.currentFilters };
  }
}

// Initialize filter manager when DOM is ready
let filterManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    filterManager = new FilterManager();
  });
} else {
  filterManager = new FilterManager();
}

// Export for use in other scripts
window.eoyrFilters = {
  getFilters: () => filterManager ? filterManager.getFilters() : null,
  FilterManager: FilterManager
};

