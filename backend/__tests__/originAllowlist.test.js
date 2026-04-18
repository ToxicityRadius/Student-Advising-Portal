const { createOriginAllowlist, isOriginAllowed } = require('../utils/originAllowlist');

describe('originAllowlist utility', () => {
  test('allows exact origins after normalization', () => {
    const allowlist = createOriginAllowlist('https://Student-Advising-Portal.pages.dev/');

    expect(isOriginAllowed('https://student-advising-portal.pages.dev', allowlist)).toBe(true);
    expect(isOriginAllowed('https://student-advising-portal.pages.dev/', allowlist)).toBe(true);
  });

  test('allows configured wildcard subdomains and blocks sibling domains', () => {
    const allowlist = createOriginAllowlist('https://*.student-advising-portal.pages.dev');

    expect(isOriginAllowed('https://preview.student-advising-portal.pages.dev', allowlist)).toBe(
      true,
    );
    expect(isOriginAllowed('https://foo.bar.student-advising-portal.pages.dev', allowlist)).toBe(
      true,
    );
    expect(isOriginAllowed('https://student-advising-portal.pages.dev', allowlist)).toBe(false);
    expect(isOriginAllowed('https://student-advising-portal.pages.dev.evil.com', allowlist)).toBe(
      false,
    );
  });

  test('ignores invalid wildcard rules', () => {
    const allowlist = createOriginAllowlist('https://*,https://api.*.example.com');

    expect(allowlist.invalidRules).toEqual(['https://*', 'https://api.*.example.com']);
    expect(isOriginAllowed('https://anything.example.com', allowlist)).toBe(false);
  });

  test('uses fallback default origin when list is empty', () => {
    const allowlist = createOriginAllowlist('', {
      defaultOrigin: 'http://localhost:3000',
    });

    expect(isOriginAllowed('http://localhost:3000', allowlist)).toBe(true);
    expect(isOriginAllowed('http://localhost:3001', allowlist)).toBe(false);
  });
});
