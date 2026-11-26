/**
 * Sign Board Lanka ERP — Shared Theme Manager
 *
 * Requirements:
 * - Default theme is Dark Mode.
 * - Stored preference in browser localStorage under key 'sbl-theme' ('dark' | 'light').
 * - Immediate theme application on html[data-theme="dark"|"light"] and class="dark"|"light".
 * - Safe fallback to Dark Mode if localStorage is unavailable or corrupt.
 * - Accessible toggle button synchronization across all dashboards.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SBLTheme = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'sbl-theme';
  var THEME_DARK = 'dark';
  var THEME_LIGHT = 'light';

  /**
   * Safely retrieve the stored theme preference from localStorage.
   * Defaults to 'dark' if localStorage is unavailable, disabled, or contains invalid data.
   */
  function getStoredTheme() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        var saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === THEME_LIGHT || saved === THEME_DARK) {
          return saved;
        }
      }
    } catch (e) {
      // SecurityError or QuotaExceededError in restricted browser contexts
    }
    return THEME_DARK;
  }

  /**
   * Safely persist the theme preference to localStorage.
   */
  function saveTheme(theme) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch (e) {
      // Inaccessible or quota exceeded
    }
  }

  /**
   * Update the document element attributes and classes to apply the theme.
   */
  function applyTheme(theme) {
    var activeTheme = (theme === THEME_LIGHT) ? THEME_LIGHT : THEME_DARK;

    if (typeof document !== 'undefined' && document.documentElement) {
      var docEl = document.documentElement;
      docEl.setAttribute('data-theme', activeTheme);

      if (activeTheme === THEME_DARK) {
        docEl.classList.add('dark');
        docEl.classList.remove('light');
      } else {
        docEl.classList.remove('dark');
        docEl.classList.add('light');
      }
    }

    updateToggleButtons(activeTheme);
    return activeTheme;
  }

  /**
   * Synchronize all toggle controls on the page with the current theme state.
   */
  function updateToggleButtons(theme) {
    if (typeof document === 'undefined') return;

    var isDark = (theme === THEME_DARK);
    var label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
    var iconName = isDark ? 'light_mode' : 'dark_mode';

    var buttons = document.querySelectorAll('[data-theme-toggle], #theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-pressed', isDark ? 'false' : 'true');

      // Update nested icon if present
      var icon = btn.querySelector('[data-theme-icon], .theme-toggle-icon, #theme-toggle-icon');
      if (icon) {
        icon.textContent = iconName;
      }
    }
  }

  /**
   * Toggle between Dark and Light modes immediately.
   */
  function toggleTheme() {
    var current = getStoredTheme();
    var nextTheme = (current === THEME_DARK) ? THEME_LIGHT : THEME_DARK;
    saveTheme(nextTheme);
    applyTheme(nextTheme);
    return nextTheme;
  }

  /**
   * Bind event listeners to theme toggle buttons, preventing duplicates.
   */
  function initListeners() {
    if (typeof document === 'undefined') return;

    var currentTheme = getStoredTheme();
    applyTheme(currentTheme);

    var buttons = document.querySelectorAll('[data-theme-toggle], #theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.getAttribute('data-theme-bound') === 'true') {
        continue;
      }
      btn.setAttribute('data-theme-bound', 'true');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleTheme();
      });
    }
  }

  // Self-execute theme application immediately when loaded in browser
  if (typeof window !== 'undefined') {
    applyTheme(getStoredTheme());

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initListeners);
    } else {
      initListeners();
    }

    // Listen to storage events for multi-tab synchronization
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) {
        var updated = (e.newValue === THEME_LIGHT) ? THEME_LIGHT : THEME_DARK;
        applyTheme(updated);
      }
    });
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    getTheme: getStoredTheme,
    setTheme: function (theme) {
      var validTheme = (theme === THEME_LIGHT) ? THEME_LIGHT : THEME_DARK;
      saveTheme(validTheme);
      return applyTheme(validTheme);
    },
    toggle: toggleTheme,
    apply: applyTheme,
    init: initListeners
  };
});
