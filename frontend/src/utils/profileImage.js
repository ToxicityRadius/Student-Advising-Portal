export const getApiBaseUrl = () => {
  let url = process.env.REACT_APP_API_URL || '/api';

  if (!process.env.REACT_APP_API_URL && typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      url = `http://${hostname}:${5000}/api`;
    }
  }

  if (!process.env.REACT_APP_API_URL && url === '/api') {
    console.warn(
      'WARNING: REACT_APP_API_URL is not set. Profile images will use relative /api URLs.',
    );
  }
  return url.replace(/\/api\/?$/, '');
};

export const buildProfileImageUrl = (profilePicturePath) => {
  if (!profilePicturePath) {
    return '';
  }

  if (/^https?:\/\//i.test(profilePicturePath)) {
    return profilePicturePath;
  }

  return `${getApiBaseUrl()}${profilePicturePath}`;
};

export const getInitials = (name) => {
  const tokens = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return '?';
  }

  return tokens.map((token) => token[0].toUpperCase()).join('');
};
