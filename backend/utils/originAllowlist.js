function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeOrigin(value) {
  return (value || '').trim().replace(/\/$/, '').toLowerCase();
}

function createOriginAllowlist(rawOrigins, options = {}) {
  const defaultOrigin = options.defaultOrigin || '';
  const source = (rawOrigins || '').trim() || defaultOrigin;

  const configuredOrigins = source
    .split(',')
    .map((originRule) => normalizeOrigin(originRule))
    .filter((originRule) => originRule.length > 0);

  const exactOrigins = new Set();
  const wildcardOriginMatchers = [];
  const invalidRules = [];

  configuredOrigins.forEach((originRule) => {
    if (!originRule.includes('*')) {
      exactOrigins.add(originRule);
      return;
    }

    // Wildcard rules are only supported as left-most subdomain labels.
    // Example: https://*.example.com
    const wildcardMatch = originRule.match(/^(https?):\/\/\*\.(.+)$/i);
    const protocol = wildcardMatch?.[1]?.toLowerCase();
    const hostAndPort = wildcardMatch?.[2]?.toLowerCase();

    // Reject broad/ambiguous wildcard formats like https://* or multiple * tokens.
    if (!wildcardMatch || !hostAndPort || hostAndPort.includes('*') || !hostAndPort.includes('.')) {
      invalidRules.push(originRule);
      return;
    }

    const escapedHostAndPort = escapeRegex(hostAndPort);
    wildcardOriginMatchers.push(
      new RegExp(`^${escapeRegex(protocol)}://(?:[a-z0-9-]+\\.)+${escapedHostAndPort}$`, 'i'),
    );
  });

  return {
    exactOrigins,
    wildcardOriginMatchers,
    invalidRules,
  };
}

function isOriginAllowed(origin, originAllowlist) {
  if (!origin || !originAllowlist) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (originAllowlist.exactOrigins.has(normalizedOrigin)) {
    return true;
  }

  return originAllowlist.wildcardOriginMatchers.some((matcher) => matcher.test(normalizedOrigin));
}

module.exports = {
  createOriginAllowlist,
  isOriginAllowed,
  normalizeOrigin,
};
