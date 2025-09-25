# 🔐 Authentication Setup Guide

This guide will help you set up user authentication for your stock analysis application.

## 📋 Prerequisites

1. **JWT Secret**: You need to set up a JWT secret for token signing
2. **Database Migration**: Run the updated schema to create authentication tables
3. **Environment Variables**: Configure the required environment variables

## 🚀 Setup Steps

### 1. Set JWT Secret

Set your JWT secret using Wrangler:

```bash
wrangler secret put JWT_SECRET
```

When prompted, enter a strong, random secret (at least 32 characters). For example:
```
your-super-secret-jwt-key-that-is-at-least-32-characters-long
```

### 2. Update Database Schema

Run the updated schema to create the authentication tables:

```bash
# If using Wrangler with D1
wrangler d1 execute stock-analysis --file=schema.sql

# Or if using local development
wrangler d1 execute stock-analysis --local --file=schema.sql
```

### 3. Deploy the Application

Deploy your updated application:

```bash
wrangler deploy
```

## 🔑 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get user profile | Yes |
| POST | `/auth/verify` | Verify token | No |

### Portfolio Endpoints (Protected)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/portfolios` | Get user portfolios | Yes |
| POST | `/api/portfolios` | Create portfolio | Yes |
| GET | `/api/portfolios/{id}` | Get single portfolio | Yes |
| PUT | `/api/portfolios/{id}` | Update portfolio | Yes |
| DELETE | `/api/portfolios/{id}` | Delete portfolio | Yes |

## 📝 Usage Examples

### Register a New User

```bash
curl -X POST https://your-app.workers.dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login

```bash
curl -X POST https://your-app.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Access Protected Routes

```bash
curl -X GET https://your-app.workers.dev/api/portfolios \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create a Portfolio

```bash
curl -X POST https://your-app.workers.dev/api/portfolios \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolioName": "My Retirement Portfolio",
    "description": "Long-term retirement savings"
  }'
```

## 🔒 Security Features

- **JWT Tokens**: Stateless authentication with configurable expiry
- **Password Hashing**: SHA-256 password hashing
- **Session Management**: Track active sessions and allow logout
- **CORS Support**: Proper CORS headers for web applications
- **Input Validation**: Email format and password strength validation
- **Resource Ownership**: Users can only access their own portfolios

## 🛠️ Frontend Integration

### Store JWT Token

```javascript
// After successful login
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
if (data.success) {
  localStorage.setItem('authToken', data.token);
}
```

### Use Token in Requests

```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('/api/portfolios', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Handle Authentication Errors

```javascript
if (response.status === 401) {
  // Token expired or invalid
  localStorage.removeItem('authToken');
  // Redirect to login page
  window.location.href = '/login';
}
```

## 🔧 Configuration

### Environment Variables

Add these to your `wrangler.toml` or set as secrets:

```toml
[vars]
JWT_SECRET = "your-jwt-secret-here"  # Or use wrangler secret put
```

### Database Tables Created

- `users` - User accounts and profiles
- `user_sessions` - JWT session management
- `password_reset_tokens` - Password reset functionality
- `email_verification_tokens` - Email verification
- `user_portfolios` - User portfolio containers
- `portfolio_holdings` - Stock positions
- `portfolio_transactions` - Transaction history

## 🚨 Important Notes

1. **JWT Secret**: Keep your JWT secret secure and never commit it to version control
2. **HTTPS**: Always use HTTPS in production for secure token transmission
3. **Token Expiry**: Access tokens expire in 15 minutes by default
4. **Password Requirements**: Minimum 8 characters (customize in `handleRegister`)
5. **Email Validation**: Basic email format validation is included

## 🐛 Troubleshooting

### Common Issues

1. **"JWT_SECRET is required"**: Set the JWT secret using `wrangler secret put JWT_SECRET`
2. **"Authentication required"**: Include the `Authorization: Bearer <token>` header
3. **"Invalid token"**: Token may be expired or malformed
4. **Database errors**: Ensure schema migration was successful

### Debug Mode

Enable debug logging by checking the Cloudflare Workers logs:

```bash
wrangler tail
```

## 🔄 Next Steps

1. **Email Verification**: Implement email verification flow
2. **Password Reset**: Add password reset functionality
3. **Refresh Tokens**: Implement refresh token rotation
4. **Rate Limiting**: Add rate limiting to prevent abuse
5. **Two-Factor Authentication**: Add 2FA support
6. **Social Login**: Integrate OAuth providers

Your authentication system is now ready! Users can register, login, and access their personal stock portfolios securely.
