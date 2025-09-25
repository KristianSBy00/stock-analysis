# Portfolio Management API Documentation

This document describes the portfolio management functionality that allows users to create portfolios and assign stocks to them.

## Overview

The portfolio system provides comprehensive functionality for:
- Creating and managing multiple portfolios per user
- Adding stocks to portfolios with transaction tracking
- Updating stock prices and calculating performance
- Viewing portfolio summaries with gain/loss calculations
- Complete transaction history

## API Endpoints

### Portfolio Management

#### 1. Get All Portfolios
```
GET /api/portfolios
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "portfolios": [
    {
      "id": 1,
      "user_id": 1,
      "portfolio_name": "Retirement",
      "description": "Long-term retirement portfolio",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. Create Portfolio
```
POST /api/portfolios
Authorization: Bearer <token>
Content-Type: application/json

{
  "portfolioName": "Trading Portfolio",
  "description": "Short-term trading portfolio"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Portfolio created successfully",
  "portfolioId": 2
}
```

#### 3. Get Single Portfolio
```
GET /api/portfolios/{id}
Authorization: Bearer <token>
```

#### 4. Update Portfolio
```
PUT /api/portfolios/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "portfolioName": "Updated Portfolio Name",
  "description": "Updated description"
}
```

#### 5. Delete Portfolio
```
DELETE /api/portfolios/{id}
Authorization: Bearer <token>
```

### Portfolio Holdings Management

#### 6. Get Portfolio Holdings
```
GET /api/portfolios/{id}/holdings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "holdings": [
    {
      "id": 1,
      "portfolio_id": 1,
      "symbol": "AAPL",
      "quantity": 10,
      "average_cost": 150.00,
      "total_cost": 1500.00,
      "current_price": 155.00,
      "current_value": 1550.00,
      "unrealized_gain_loss": 50.00,
      "unrealized_gain_loss_percent": 3.33,
      "last_updated": "2024-01-01T12:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 7. Add Stock to Portfolio
```
POST /api/portfolios/{id}/holdings
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "quantity": 10,
  "pricePerShare": 150.00,
  "fees": 9.99,
  "transactionDate": "2024-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock added to portfolio successfully"
}
```

#### 8. Update Portfolio Holding (Price Update)
```
PUT /api/portfolios/{id}/holdings
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "currentPrice": 155.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Holding updated successfully"
}
```

#### 9. Remove Stock from Portfolio
```
DELETE /api/portfolios/{id}/holdings?symbol=AAPL
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Stock removed from portfolio successfully"
}
```

### Transaction Management

#### 10. Get Portfolio Transactions
```
GET /api/portfolios/{id}/transactions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "portfolio_id": 1,
      "symbol": "AAPL",
      "transaction_type": "BUY",
      "quantity": 10,
      "price_per_share": 150.00,
      "total_amount": 1500.00,
      "fees": 9.99,
      "transaction_date": "2024-01-01",
      "notes": "Initial purchase",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 11. Add Portfolio Transaction
```
POST /api/portfolios/{id}/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "transactionType": "BUY",
  "quantity": 5,
  "pricePerShare": 160.00,
  "fees": 4.99,
  "transactionDate": "2024-01-15",
  "notes": "Additional purchase"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction added successfully",
  "transactionId": 2
}
```

### Portfolio Summary

#### 12. Get Portfolio Summary
```
GET /api/portfolios/{id}/summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "portfolio": {
      "id": 1,
      "user_id": 1,
      "portfolio_name": "Retirement",
      "description": "Long-term retirement portfolio",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "holdings": [
      {
        "id": 1,
        "portfolio_id": 1,
        "symbol": "AAPL",
        "quantity": 15,
        "average_cost": 153.33,
        "total_cost": 2300.00,
        "current_price": 155.00,
        "current_value": 2325.00,
        "unrealized_gain_loss": 25.00,
        "unrealized_gain_loss_percent": 1.09,
        "last_updated": "2024-01-01T12:00:00Z",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "totalValue": 2325.00,
    "totalCost": 2300.00,
    "totalGainLoss": 25.00,
    "totalGainLossPercent": 1.09,
    "lastUpdated": "2024-01-01T12:00:00Z"
  }
}
```

## Database Schema

The portfolio system uses the following database tables:

### user_portfolios
- `id` (INTEGER PRIMARY KEY)
- `user_id` (INTEGER, Foreign Key to users table)
- `portfolio_name` (TEXT NOT NULL)
- `description` (TEXT)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### portfolio_holdings
- `id` (INTEGER PRIMARY KEY)
- `portfolio_id` (INTEGER, Foreign Key to user_portfolios)
- `symbol` (TEXT NOT NULL)
- `quantity` (REAL NOT NULL)
- `average_cost` (REAL NOT NULL)
- `total_cost` (REAL NOT NULL)
- `current_price` (REAL)
- `current_value` (REAL)
- `unrealized_gain_loss` (REAL)
- `unrealized_gain_loss_percent` (REAL)
- `last_updated` (DATETIME)
- `created_at` (DATETIME)

### portfolio_transactions
- `id` (INTEGER PRIMARY KEY)
- `portfolio_id` (INTEGER, Foreign Key to user_portfolios)
- `symbol` (TEXT NOT NULL)
- `transaction_type` (TEXT NOT NULL, CHECK: 'BUY', 'SELL', 'DIVIDEND', 'SPLIT')
- `quantity` (REAL NOT NULL)
- `price_per_share` (REAL NOT NULL)
- `total_amount` (REAL NOT NULL)
- `fees` (REAL DEFAULT 0)
- `transaction_date` (TEXT NOT NULL, YYYY-MM-DD format)
- `notes` (TEXT)
- `created_at` (DATETIME)

## Usage Examples

### Creating a Portfolio and Adding Stocks

1. **Create a new portfolio:**
```bash
curl -X POST https://your-domain.com/api/portfolios \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolioName": "My Investment Portfolio",
    "description": "Diversified investment portfolio"
  }'
```

2. **Add stocks to the portfolio:**
```bash
curl -X POST https://your-domain.com/api/portfolios/1/holdings \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "quantity": 10,
    "pricePerShare": 150.00,
    "fees": 9.99,
    "transactionDate": "2024-01-01"
  }'
```

3. **Update stock prices:**
```bash
curl -X PUT https://your-domain.com/api/portfolios/1/holdings \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "currentPrice": 155.00
  }'
```

4. **Get portfolio summary:**
```bash
curl -X GET https://your-domain.com/api/portfolios/1/summary \
  -H "Authorization: Bearer your-jwt-token"
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- `400 Bad Request` - Missing or invalid parameters
- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Portfolio or resource not found
- `500 Internal Server Error` - Server-side error

Error response format:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Security

- All portfolio endpoints require authentication via JWT token
- Users can only access their own portfolios
- Portfolio ownership is verified on every request
- Input validation is performed on all parameters

## Performance Considerations

- Database indexes are created on frequently queried columns
- Portfolio summaries are calculated in real-time
- Transaction history is ordered by date for efficient retrieval
- Holdings are updated with current market prices when requested
