# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for TheMobileProf Backend.

## Prerequisites

- Google Cloud Console account
- Domain name (for production)
- HTTPS enabled (required for OAuth)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Identity API

## Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (unless you have Google Workspace)
3. Fill in the required information:
   - **App name**: TheMobileProf
   - **User support email**: your-email@domain.com
   - **Developer contact information**: your-email@domain.com
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (for development)
6. Save and continue

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Configure:
   - **Name**: TheMobileProf Backend
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback` (development)
     - `https://yourdomain.com/auth/google/callback` (production)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Add these to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

## Step 5: Frontend Integration

### React Example

```jsx
import { GoogleLogin } from '@react-oauth/google';

const GoogleAuthButton = () => {
  const handleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: credentialResponse.credential,
          // Optional: override Google data
          firstName: 'Custom First Name',
          lastName: 'Custom Last Name',
          role: 'student'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Redirect or update UI
      } else {
        console.error('Google auth failed:', data.message);
      }
    } catch (error) {
      console.error('Google auth error:', error);
    }
  };

  const handleError = () => {
    console.error('Google login failed');
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      useOneTap
    />
  );
};
```

### Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
  <div id="g_id_onload"
       data-client_id="YOUR_GOOGLE_CLIENT_ID"
       data-callback="handleCredentialResponse">
  </div>
  <div class="g_id_signin" data-type="standard"></div>

  <script>
    function handleCredentialResponse(response) {
      fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: response.credential
        }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          // Redirect or update UI
        }
      })
      .catch(error => {
        console.error('Google auth error:', error);
      });
    }
  </script>
</body>
</html>
```

## Step 6: Database Migration

Run the database migration to add Google OAuth fields:

```bash
npm run migrate
```

This will:
- Add `google_id`, `google_email`, `auth_provider`, and `email_verified` columns
- Make `password_hash` nullable (for Google users)

## Step 7: Testing

### Test Google Login Flow

1. Start your backend server
2. Use the frontend integration to test Google login
3. Check the database to verify user creation
4. Test both new user registration and existing user login

### Test Account Linking

1. Create a user with email/password
2. Try logging in with Google using the same email
3. Verify the accounts are linked correctly

## Security Considerations

### Environment Variables
- Never commit Google credentials to version control
- Use different credentials for development and production
- Rotate credentials regularly

### HTTPS Requirements
- Google OAuth requires HTTPS in production
- Use Let's Encrypt or similar for free SSL certificates
- Configure proper SSL/TLS settings

### Token Validation
- Always verify Google tokens on the backend
- Check token expiration
- Validate audience and issuer

### Rate Limiting
- Implement rate limiting on OAuth endpoints
- Monitor for suspicious activity
- Set up alerts for failed authentication attempts

## Troubleshooting

### Common Issues

1. **"Invalid Google token" error**
   - Check if `GOOGLE_CLIENT_ID` is correct
   - Verify the token hasn't expired
   - Ensure you're using the correct client ID for your environment

2. **"Email already associated with another Google account"**
   - This happens when trying to link an email that's already used by another Google account
   - Users need to use the original Google account or contact support

3. **"Please use Google login for this account"**
   - User tried to login with email/password but account is Google OAuth
   - Redirect them to use Google login instead

4. **CORS issues**
   - Ensure your frontend domain is in the authorized origins
   - Check that your backend CORS settings allow the frontend domain

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=oauth:*
```

## Production Deployment

### Environment Variables
```env
# Production Google OAuth
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
```

### Domain Configuration
1. Update OAuth consent screen with production domain
2. Add production domain to authorized origins
3. Configure redirect URIs for production
4. Remove development URLs from production credentials

### Monitoring
- Set up logging for OAuth events
- Monitor authentication success/failure rates
- Track user registration sources
- Set up alerts for unusual activity

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google` | POST | Google OAuth login/signup |
| `/api/auth/register` | POST | Email/password registration |
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/me` | GET | Get current user info |
| `/api/auth/change-password` | POST | Change password (local only) |

## Support

For issues with Google OAuth setup:
1. Check Google Cloud Console logs
2. Verify environment variables
3. Test with Google's OAuth playground
4. Review Google OAuth documentation

---

**Note**: This setup provides a seamless authentication experience where users can choose between traditional email/password or Google OAuth, with automatic account linking when using the same email address. 