export const getApiBaseUrl = () => {
  return (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
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
