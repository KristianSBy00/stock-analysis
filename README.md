# Stock Analysis Cloudflare Application

A simple Cloudflare Workers application that provides basic stock analysis functionality.

## Features

- **Health Check**: Monitor application status
- **Stock Information**: Get basic stock data (mock data for demo)
- **Stock Analysis**: Analyze stock trends and provide recommendations
- **CORS Support**: Cross-origin resource sharing enabled
- **Error Handling**: Comprehensive error handling and responses

## API Endpoints

### GET /
Returns API information and available endpoints.

### GET /health
Health check endpoint that returns application status and timestamp.

### GET /api/yahoo-stocks?symbol=AAPL
Get stock price information from Yahoo Finance.
- **symbol** (query parameter): Stock symbol (default: AAPL)

Example:
```bash
curl "https://your-worker.your-subdomain.workers.dev/api/yahoo-stocks?symbol=AAPL"
```

### POST /api/analyze
Analyze stock data and get recommendations.
- **symbol** (required): Stock symbol to analyze
- **timeframe** (optional): Analysis timeframe (default: 1d)

Example:
```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "timeframe": "1d"}'
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Cloudflare account

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

3. **Configure your worker**:
   Edit `wrangler.toml` to customize your worker name and settings.

4. **Add Finnhub API Key**:
   Create a Finnhub account and get an API key, then add it as a secret:
   ```bash
   npx wrangler secret put FINNHUB_API_KEY
   ```
   When prompted, paste your key.

### Development

1. **Start local development server**:
   ```bash
   npm run dev
   ```

2. **Test locally**:
   Open your browser and visit `http://localhost:8787`

### Deployment

1. **Deploy to Cloudflare**:
   ```bash
   npm run deploy
   ```

2. **Deploy to specific environment**:
   ```bash
   npx wrangler deploy --env production
   npx wrangler deploy --env staging
   ```

## Project Structure

```
stock-analysis/
├── src/
│   └── index.js          # Main worker script
├── package.json          # Dependencies and scripts
├── wrangler.toml         # Cloudflare Workers configuration
└── README.md            # This file
```

## Configuration

The `wrangler.toml` file contains configuration for different environments:

- **Default**: Development environment
- **Production**: Production deployment
- **Staging**: Staging environment

## Mock Data

This application uses Yahoo Finance and Finnhub. In a production environment, you would:

1. Integrate with real financial APIs (Yahoo Finance, Finnhub, etc.)
2. Add authentication and rate limiting
3. Implement data caching
4. Add more sophisticated analysis algorithms

## Environment Variables

You can add environment variables in the Cloudflare dashboard or through wrangler:

```bash
npx wrangler secret put API_KEY
```

## Finnhub Endpoints

### GET /api/finnhub/quote?symbol=AAPL
Fetch real-time quote data from Finnhub.
- **symbol** (query parameter): Stock symbol (default: AAPL)

Example:
```bash
curl "http://localhost:8787/api/finnhub/quote?symbol=MSFT"
```

Deployed example:
```bash
curl "https://your-worker.your-subdomain.workers.dev/api/finnhub/quote?symbol=MSFT"
```

Response shape:
```json
{
  "symbol": "MSFT",
  "price": 430.12,
  "change": -1.05,
  "changePercent": -0.24,
  "high": 433.7,
  "low": 428.2,
  "open": 432.1,
  "previousClose": 431.17,
  "lastUpdated": "2025-09-21T12:34:56.000Z",
  "source": "Finnhub"
}
```

### GET /api/finnhub/news?symbol=AAPL&from=2025-09-14&to=2025-09-21
Fetch recent company news from Finnhub. If `from`/`to` are omitted, defaults to the last 7 days.
- **symbol** (query parameter): Stock symbol (default: AAPL)
- **from** (query parameter): YYYY-MM-DD
- **to** (query parameter): YYYY-MM-DD

Example:
```bash
curl "http://localhost:8787/api/finnhub/news?symbol=AAPL&from=2025-09-14&to=2025-09-21"
```

Deployed example:
```bash
curl "https://your-worker.your-subdomain.workers.dev/api/finnhub/news?symbol=AAPL"
```

### GET /api/finnhub/insider-transactions?symbol=AAPL&from=2025-06-23&to=2025-09-21
Fetch insider trading transactions from Finnhub. If `from`/`to` are omitted, defaults to the last 90 days.
- **symbol** (query parameter): Stock symbol (default: AAPL)
- **from** (query parameter): YYYY-MM-DD
- **to** (query parameter): YYYY-MM-DD

Example:
```bash
curl "http://localhost:8787/api/finnhub/insider-transactions?symbol=NVDA&from=2025-08-01&to=2025-09-21"
```

Deployed example:
```bash
curl "https://your-worker.your-subdomain.workers.dev/api/finnhub/insider-transactions?symbol=NVDA"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run dev`
5. Deploy and test
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
