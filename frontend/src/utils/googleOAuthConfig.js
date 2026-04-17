const PLACEHOLDER_CLIENT_IDS = new Set([
  'your_google_client_id_here',
  'your_actual_google_client_id_here',
]);

export const getGoogleClientId = () => {
  const rawClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
  if (!rawClientId) {
    return null;
  }

  if (PLACEHOLDER_CLIENT_IDS.has(rawClientId.toLowerCase())) {
    return null;
  }

  if (!rawClientId.endsWith('.apps.googleusercontent.com')) {
    return null;
  }

  return rawClientId;
};

export const isGoogleOAuthConfigured = Boolean(getGoogleClientId());
