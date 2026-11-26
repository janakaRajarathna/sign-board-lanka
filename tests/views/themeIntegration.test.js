const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('fs');
const vm = require('vm');
const ejs = require('ejs');

const views = [
  { name: 'Owner Dashboard', file: 'owner.ejs', role: 'OWNER' },
  { name: 'PM Dashboard', file: 'pm.ejs', role: 'PROJECT_MANAGER' },
  { name: 'Accounts Dashboard', file: 'accounts.ejs', role: 'ACCOUNTS' },
];

// Read theme.css variables
const themeCss = fs.readFileSync(path.resolve(__dirname, '../../public/css/theme.css'), 'utf8');
const rootMatch = themeCss.match(/:root\s*\{([^}]+)\}/s);
const lightMatch = themeCss.match(/html\[data-theme="light"\]\s*\{([^}]+)\}/s);

function parseBlock(block) {
  const vars = {};
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*--([a-z0-9-]+)\s*:\s*([^;]+);(?:\s*\/\*\s*(.*?)\s*\*\/)?/);
    if (m) {
      vars['--' + m[1]] = m[2].trim();
    }
  }
  return vars;
}

const darkVars = parseBlock(rootMatch[1]);
const lightVars = parseBlock(lightMatch[1]);

describe('Theme System Integration in Dashboard Views', () => {
  for (const { name, file, role } of views) {
    describe(name + ' (' + file + ')', () => {
      let html;
      let tailwindColors;

      it('should render the view without error', async () => {
        const filePath = path.resolve(__dirname, '../../views/dashboards', file);
        html = await ejs.renderFile(filePath, {
          user: { userId: '1', fullName: 'Test User', role },
          csrfToken: 'test_csrf_token_123',
          data: {}
        });
        assert.ok(html && html.length > 0);
      });

      it('should include the shared theme stylesheet link in <head>', () => {
        assert.ok(
          html.includes('<link rel="stylesheet" href="/css/theme.css">') ||
          html.includes('<link rel="stylesheet" href="/css/theme.css"/>'),
          `${file} must include /css/theme.css`
        );
      });

      it('should include the inline anti-flash script in <head>', () => {
        assert.ok(
          html.includes("localStorage.getItem('sbl-theme')"),
          `${file} must include inline anti-flash localStorage script`
        );
        assert.ok(
          html.includes("setAttribute('data-theme',"),
          `${file} anti-flash script must set data-theme attribute`
        );
      });

      it('should include the shared theme manager script tag', () => {
        assert.ok(
          html.includes('<script src="/js/theme.js" defer></script>'),
          `${file} must load /js/theme.js with defer`
        );
      });

      it('should render an accessible theme toggle button with id="theme-toggle" and data-theme-toggle', () => {
        assert.ok(
          html.includes('id="theme-toggle"'),
          `${file} must have button with id="theme-toggle"`
        );
        assert.ok(
          html.includes('data-theme-toggle'),
          `${file} must have button with data-theme-toggle attribute`
        );
        assert.ok(
          html.includes('aria-label="Switch to light theme"'),
          `${file} must provide initial accessible label`
        );
        assert.ok(
          html.includes('light_mode'),
          `${file} must provide light_mode icon for default dark theme`
        );
      });

      it('should parse tailwind.config and extract all colors', () => {
        const match = html.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/);
        assert.ok(match, `${file} must contain a script with id="tailwind-config"`);
        const sandbox = {};
        vm.runInNewContext(match[1].replace(/^tailwind\.config\s*=\s*/, 'config = '), sandbox);
        tailwindColors = sandbox.config.theme.extend.colors;
        assert.ok(tailwindColors, `${file} must have theme.extend.colors`);
        assert.strictEqual(Object.keys(tailwindColors).length, 47, `${file} must configure exactly 47 colors`);
      });

      it('should contain NO hardcoded hex color values in tailwind.config', () => {
        const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
        for (const [token, val] of Object.entries(tailwindColors)) {
          assert.strictEqual(
            hexRegex.test(val),
            false,
            `Token "${token}" in ${file} must not be hardcoded hex, found: ${val}`
          );
        }
      });

      it('should map all 47 tokens to rgb(var(--sbl-*) / <alpha-value>) syntax', () => {
        const pattern = /^rgb\(var\((--sbl-[a-z0-9-]+)\)\s*\/\s*<alpha-value>\)$/;
        for (const [token, val] of Object.entries(tailwindColors)) {
          const match = val.match(pattern);
          assert.ok(
            match,
            `Token "${token}" value "${val}" must match rgb(var(--sbl-${token}) / <alpha-value>)`
          );
          const varName = match[1];
          assert.strictEqual(
            varName,
            '--sbl-' + token,
            `Token "${token}" must map to exact variable "--sbl-${token}", got "${varName}"`
          );
        }
      });

      it('should ensure every referenced CSS variable exists in both theme definitions', () => {
        for (const token of Object.keys(tailwindColors)) {
          const varName = '--sbl-' + token;
          assert.ok(
            darkVars[varName] !== undefined,
            `Variable ${varName} referenced by ${file} must exist in :root (dark theme)`
          );
          assert.ok(
            lightVars[varName] !== undefined,
            `Variable ${varName} referenced by ${file} must exist in html[data-theme="light"]`
          );
        }
      });
    });
  }
});
