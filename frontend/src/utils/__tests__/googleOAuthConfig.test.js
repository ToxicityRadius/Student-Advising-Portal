import { getGoogleClientId } from '../googleOAuthConfig';

describe('googleOAuthConfig', () => {
  const originalClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  afterEach(() => {
    if (originalClientId === undefined) {
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
    } else {
      process.env.REACT_APP_GOOGLE_CLIENT_ID = originalClientId;
    }
  });

  test('returns null when client id is missing', () => {
    delete process.env.REACT_APP_GOOGLE_CLIENT_ID;

    expect(getGoogleClientId()).toBeNull();
  });

  test('returns null for placeholder client id', () => {
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'your_google_client_id_here';

    expect(getGoogleClientId()).toBeNull();
  });

  test('returns null for invalid client id format', () => {
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'not-a-valid-google-client-id';

    expect(getGoogleClientId()).toBeNull();
  });

  test('returns trimmed client id for valid value', () => {
    process.env.REACT_APP_GOOGLE_CLIENT_ID =
      ' 131713767896-abc123def456.apps.googleusercontent.com ';

    expect(getGoogleClientId()).toBe('131713767896-abc123def456.apps.googleusercontent.com');
  });
});
