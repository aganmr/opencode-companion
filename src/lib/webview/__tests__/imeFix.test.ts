import { imeFixScript } from '../imeFix';

describe('imeFixScript (WebView IME fix)', () => {
  it('is a non-empty string', () => {
    expect(typeof imeFixScript).toBe('string');
    expect(imeFixScript.length).toBeGreaterThan(0);
  });

  it('is syntactically valid JavaScript', () => {
    // new Function parses without executing — catches syntax errors.
    expect(() => new Function(imeFixScript)).not.toThrow();
  });

  it('hooks the visualViewport resize event and scrolls the focused input', () => {
    expect(imeFixScript).toContain('visualViewport');
    expect(imeFixScript).toContain('resize');
    expect(imeFixScript).toContain('scrollIntoView');
  });

  it('handles plain inputs, textareas and contenteditable elements', () => {
    expect(imeFixScript).toContain('TEXTAREA');
    expect(imeFixScript).toContain('isContentEditable');
  });

  it('no-ops on engines without visualViewport', () => {
    // Early guard so pages on engines lacking the API are untouched.
    expect(imeFixScript).toMatch(/if\s*\(\s*!\s*window\.visualViewport\s*\)\s*\{\s*return;\s*\}/);
  });
});
