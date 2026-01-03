# Google OAuth Setup Instructions

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen:
   - **User Type: Internal** (recommended - only allows @tip.edu.ph accounts)
     - Note: This option is only available if you're signed in with a Google Workspace account from tip.edu.ph
     - If "Internal" is not available, use "External" and the backend will enforce the domain restriction
   - App name: Student Advising Portal
   - User support email: Your TIP email
   - Developer contact email: Your TIP email
   - Add scopes: `email`, `profile`, `openid`
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: Student Advising Portal
   - **Authorized JavaScript origins** (IMPORTANT):
     - `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `http://localhost:3000`
7. Copy the **Client ID** (it will look like: `123456789-abc123.apps.googleusercontent.com`)

## Step 2: Configure Your Application

### Frontend Configuration (React)

1. Open `frontend/src/App.js`
2. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Google Client ID:

```javascript
<GoogleOAuthProvider clientId="YOUR_ACTUAL_GOOGLE_CLIENT_ID_HERE">
```

### Backend Configuration (Node.js)

1. Create or update `.env` file in the `backend` folder:

```env
GOOGLE_CLIENT_ID=YOUR_ACTUAL_GOOGLE_CLIENT_ID_HERE
```

## Step 3: Email Domain Restriction

The application is configured to only accept emails ending with `@tip.edu.ph`. This is enforced in:

1. **Frontend**: `frontend/src/pages/Login.js` - Line ~65
2. **Backend**: `backend/routes/googleAuthRoutes.js` - Line ~24

To change the allowed domain, update both locations.

## Step 4: Testing

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Navigate to `http://localhost:3000/login`
4. Click "Sign in with Google"
5. Sign in with a `@tip.edu.ph` Google account

## Features

- ✅ Google OAuth 2.0 authentication
- ✅ Email domain restriction (@tip.edu.ph only)
- ✅ Automatic user creation for new Google sign-ins
- ✅ Automatic Student role assignment for new users
- ✅ Auto-activation of inactive accounts on Google sign-in
- ✅ JWT token generation
- ✅ Role-based access control

## Security Notes

- **Use "Internal" user type** if TIP has a Google Workspace - this automatically restricts access to @tip.edu.ph accounts only
- If using "External" user type, the backend enforces domain restrictions, but "Internal" is more secure
- Never commit your `.env` file or expose your Client ID publicly
- Use environment variables for production
- Add your production domain to authorized origins in Google Cloud Console
- Consider adding rate limiting for authentication endpoints
- Implement refresh token rotation for better security

## Troubleshooting

**Error: "The given origin is not allowed for the given client ID"**
- Go to [Google Cloud Console](https://console.cloud.google.com/) → Credentials
- Click on your OAuth 2.0 Client ID
- Under "Authorized JavaScript origins", add `http://localhost:3000`
- Click Save and wait 5-10 minutes for changes to propagate
- Clear browser cache and try again

**Error: "Only TIP email addresses are allowed"**
- Make sure you're signing in with an email that ends with @tip.edu.ph

**Error: "Invalid Client ID"**
- Verify your Client ID is correctly set in both frontend and backend
- Make sure the Client ID doesn't have extra spaces or quotes

**Error: "redirect_uri_mismatch"**
- Add your redirect URI to the authorized redirect URIs in Google Cloud Console

**Google button not showing**
- Check browser console for errors
- Verify @react-oauth/google is installed
- Clear browser cache and reload

**Error: 500 Internal Server Error on `/api/auth/google`**
- Check backend console logs for specific error details
- Verify GOOGLE_CLIENT_ID is set in backend `.env` file
- Ensure PostgreSQL database is connected properly
