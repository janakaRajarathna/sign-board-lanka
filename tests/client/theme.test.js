const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Mock browser environment for isolated unit testing
function createMockDOM(initialStorage = {}) {
  const storage = { ...initialStorage };
  let storageThrows = false;

  const docEl = {
    attributes: {},
    classList: new Set(),
    setAttribute(name, val) {
      this.attributes[name] = String(val);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    }
  };
  docEl.classList.add = function (cls) { docEl.classList.add_(cls); };
  docEl.classList.remove = function (cls) { docEl.classList.delete(cls); };
  docEl.classList.contains = function (cls) { return docEl.classList.has(cls); };
  docEl.classList.add_ = Set.prototype.add;

  const buttons = [];

  function createMockButton() {
    const btn = {
      attributes: {},
      listeners: {},
      children: [],
      setAttribute(name, val) {
        this.attributes[name] = String(val);
      },
      getAttribute(name) {
        return this.attributes[name] || null;
      },
      querySelector(sel) {
        return this.children[0] || null;
      },
      addEventListener(evt, fn) {
        this.listeners[evt] = this.listeners[evt] || [];
        this.listeners[evt].push(fn);
      },
      click() {
        if (this.listeners['click']) {
          this.listeners['click'].forEach(fn => fn({ preventDefault: () => {} }));
        }
      }
    };
    const icon = {
      textContent: 'light_mode'
    };
    btn.children.push(icon);
    buttons.push(btn);
    return btn;
  }

  const mockLocalStorage = {
    getItem(key) {
      if (storageThrows) throw new Error('SecurityError: localStorage is disabled');
      return storage[key] !== undefined ? storage[key] : null;
    },
    setItem(key, val) {
      if (storageThrows) throw new Error('SecurityError: localStorage is disabled');
      storage[key] = String(val);
    },
    removeItem(key) {
      delete storage[key];
    },
    _setThrows(flag) {
      storageThrows = flag;
    },
    _getStorage() {
      return storage;
    }
  };

  const mockDocument = {
    documentElement: docEl,
    readyState: 'complete',
    querySelectorAll(selector) {
      return buttons;
    },
    addEventListener() {}
  };

  const mockWindow = {
    localStorage: mockLocalStorage,
    document: mockDocument,
    addEventListener() {}
  };

  return {
    window: mockWindow,
    document: mockDocument,
    localStorage: mockLocalStorage,
    docEl,
    createMockButton,
    buttons
  };
}

describe('Shared Theme Manager (public/js/theme.js)', () => {
  let mockEnv;
  let ThemeManager;

  beforeEach(() => {
    mockEnv = createMockDOM();
    globalThis.window = mockEnv.window;
    globalThis.document = mockEnv.document;
    delete require.cache[require.resolve('../../public/js/theme.js')];
    ThemeManager = require('../../public/js/theme.js');
  });

  it('1. should default to dark mode when localStorage has no saved preference', () => {
    assert.strictEqual(ThemeManager.getTheme(), 'dark');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'dark');
    assert.strictEqual(mockEnv.docEl.classList.contains('dark'), true);
    assert.strictEqual(mockEnv.docEl.classList.contains('light'), false);
  });

  it('2. should default to dark mode when localStorage has invalid or corrupt value', () => {
    mockEnv.localStorage.setItem('sbl-theme', 'invalid-theme-value');
    assert.strictEqual(ThemeManager.getTheme(), 'dark');
    assert.strictEqual(ThemeManager.apply(ThemeManager.getTheme()), 'dark');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'dark');
  });

  it('3. should fall back to dark mode safely if localStorage throws SecurityError', () => {
    mockEnv.localStorage._setThrows(true);
    assert.strictEqual(ThemeManager.getTheme(), 'dark');
    assert.strictEqual(ThemeManager.apply('dark'), 'dark');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'dark');
  });

  it('4. should read and apply light mode when localStorage has "light"', () => {
    mockEnv.localStorage.setItem('sbl-theme', 'light');
    assert.strictEqual(ThemeManager.getTheme(), 'light');
    ThemeManager.apply('light');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'light');
    assert.strictEqual(mockEnv.docEl.classList.contains('light'), true);
    assert.strictEqual(mockEnv.docEl.classList.contains('dark'), false);
  });

  it('5. should toggle from dark to light mode without reload and persist to localStorage', () => {
    mockEnv.localStorage.setItem('sbl-theme', 'dark');
    const newTheme = ThemeManager.toggle();
    assert.strictEqual(newTheme, 'light');
    assert.strictEqual(mockEnv.localStorage.getItem('sbl-theme'), 'light');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'light');
    assert.strictEqual(mockEnv.docEl.classList.contains('light'), true);
    assert.strictEqual(mockEnv.docEl.classList.contains('dark'), false);
  });

  it('6. should toggle from light to dark mode without reload and persist to localStorage', () => {
    mockEnv.localStorage.setItem('sbl-theme', 'light');
    const newTheme = ThemeManager.toggle();
    assert.strictEqual(newTheme, 'dark');
    assert.strictEqual(mockEnv.localStorage.getItem('sbl-theme'), 'dark');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'dark');
    assert.strictEqual(mockEnv.docEl.classList.contains('dark'), true);
    assert.strictEqual(mockEnv.docEl.classList.contains('light'), false);
  });

  it('7. should synchronize toggle button attributes, labels, and icons', () => {
    const btn = mockEnv.createMockButton();
    ThemeManager.apply('dark');
    assert.strictEqual(btn.getAttribute('aria-label'), 'Switch to light theme');
    assert.strictEqual(btn.getAttribute('title'), 'Switch to light theme');
    assert.strictEqual(btn.getAttribute('aria-pressed'), 'false');
    assert.strictEqual(btn.children[0].textContent, 'light_mode');

    ThemeManager.apply('light');
    assert.strictEqual(btn.getAttribute('aria-label'), 'Switch to dark theme');
    assert.strictEqual(btn.getAttribute('title'), 'Switch to dark theme');
    assert.strictEqual(btn.getAttribute('aria-pressed'), 'true');
    assert.strictEqual(btn.children[0].textContent, 'dark_mode');
  });

  it('8. should bind click event listener to toggle buttons and handle toggle on click', () => {
    const btn = mockEnv.createMockButton();
    ThemeManager.init();
    assert.strictEqual(btn.getAttribute('data-theme-bound'), 'true');

    // Simulate click
    btn.click();
    assert.strictEqual(mockEnv.localStorage.getItem('sbl-theme'), 'light');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'light');

    // Simulate second click
    btn.click();
    assert.strictEqual(mockEnv.localStorage.getItem('sbl-theme'), 'dark');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'dark');
  });

  it('9. should avoid attaching duplicate event listeners when init is called multiple times', () => {
    const btn = mockEnv.createMockButton();
    ThemeManager.init();
    ThemeManager.init();
    ThemeManager.init();
    assert.strictEqual(btn.listeners['click'].length, 1);
  });

  it('10. should support programmatic setTheme()', () => {
    ThemeManager.setTheme('light');
    assert.strictEqual(mockEnv.localStorage.getItem('sbl-theme'), 'light');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'light');

    ThemeManager.setTheme('dark');
    assert.strictEqual(mockEnv.localStorage.getItem('sbl-theme'), 'dark');
    assert.strictEqual(mockEnv.docEl.getAttribute('data-theme'), 'dark');
  });
});
