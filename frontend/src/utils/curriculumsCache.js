import api from './api';

const CACHE_TTL_MS = 2 * 60 * 1000;
const cache = new Map();
const inFlight = new Map();

const normalizeParams = (params = {}) =>
  Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});

const keyFor = (params = {}) => JSON.stringify(normalizeParams(params));

export const fetchCurriculumsCached = async (params = {}, options = {}) => {
  const force = Boolean(options.force);
  const key = keyFor(params);
  const now = Date.now();

  if (!force) {
    const cached = cache.get(key);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    if (inFlight.has(key)) {
      return inFlight.get(key);
    }
  }

  const request = api
    .get('/curriculums', {
      params: {
        compact: true,
        ...params,
      },
    })
    .then((response) => {
      const data = response.data;
      cache.set(key, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
};
