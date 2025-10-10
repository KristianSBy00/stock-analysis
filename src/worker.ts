/**
 * A simple Cloudflare Workers application built with TypeScript
 * Handles HTTP requests and provides basic stock analysis functionality
 */

import { ApiClient, ApiProvider } from './apiClient';
import { Resend } from 'resend';
import { StockAnalysisDB } from './stockAnalasysDB';
import { Env, LoginRequest, RegisterRequest, UserPortfolio, Portfolio } from './types';
import { AuthMiddleware } from './authMiddleware';
import { StockValueManager } from './stockValueManager';
declare type ExecutionContext = any;
declare type ScheduledController = any;

declare global {
   class WebSocketPair {
      constructor();
      0: WebSocket;
      1: WebSocket;
   }

   interface ResponseInit {
      webSocket?: WebSocket;
   }
}

// CORS headers
const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

let stockValueManager: StockValueManager | null = null;

export default {
   async scheduled(
      controller: ScheduledController,
      env: Env,
      ctx: ExecutionContext,
   ): Promise<void> {
      try {
         console.log("Cron job triggered at:", new Date().toISOString());
         const resend = new Resend(env.RESEND_API_KEY);
         const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: env.MY_GMAIL_ADDRESS as string,
            subject: 'Cron Job',
            text: 'Cron job executed successfully at ' + new Date().toISOString() + ' in ' + env.ENVIRONMENT,
         });

         if (error) {
            console.error('Failed to send email:', error);
         } else if (data) {
            console.log(`Email ${data.id} has been sent successfully`);
         }
      } catch (error) {
         console.error('Cron job failed:', error);
         // Don't throw - cron jobs should handle errors gracefully
      }
   },

   async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      // CRITICAL: This should ALWAYS log when the worker receives ANY request
      console.log('🔥 WORKER FETCH CALLED - THIS SHOULD ALWAYS APPEAR 🔥');

      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // Log all incoming connections
      console.log(`[${new Date().toISOString()}] ${method} ${path} - Connection from ${request.headers.get('CF-Connecting-IP') || 'unknown IP'}`);
      const headersObj: Record<string, string> = {};
      request.headers.forEach((value, key) => {
         headersObj[key] = value;
      });
      console.log(`Request headers:`, headersObj);

      try {
         // Handle CORS preflight
         const corsResponse = new AuthMiddleware(env).handleCors(request);
         if (corsResponse) {
            return corsResponse;
         }

         // Route handling
         switch (path) {

            // ============================================================================
            // Authentication Routes
            // ============================================================================

            case '/auth/register':
               if (method === 'POST') {
                  return await handleRegister(request, env);
               }
               break;

            case '/auth/login':
               if (method === 'POST') {
                  return await handleLogin(request, env);
               }
               break;

            case '/auth/logout':
               if (method === 'POST') {
                  return await handleLogout(request, env);
               }
               break;

            case '/auth/me':
               if (method === 'GET') {
                  return await handleGetProfile(request, env);
               }
               break;

            case '/auth/verify':
               if (method === 'POST') {
                  return await handleVerifyToken(request, env);
               }
               break;

            // ============================================================================
            // Portfolio Routes (Protected)
            // ============================================================================

            case '/api/portfolios':
               if (method === 'GET') {
                  return await handleGetUserPortfolios(request, env);
               } else if (method === 'POST') {
                  return await handleCreatePortfolio(request, env);
               }
               break;

            // '/api/portfolios/{portfolioId}/'
            case path.match(/^\/api\/portfolios\/\d+\//) ? path : 'no-match':
               // Handle portfolio-specific routes with dynamic ID
               if (path.match(/^\/api\/portfolios\/\d+\/holdings\/\d+\//) ? path : 'no-match') {
                  if (method === 'GET') {
                     return await handleGetPortfolioHoldings(request, env);
                  } else if (method === 'POST') {
                     return await handleAddStockToPortfolio(request, env);
                  } else if (method === 'PUT') {
                     return await handleUpdatePortfolioHolding(request, env);
                  } else if (method === 'DELETE') {
                     console.log('Removing stock from portfolio');
                     return await handleRemoveStockFromPortfolio(request, env);
                  }
               }
               else {
                  // Handle basic portfolio CRUD operations
                  if (method === 'GET') {
                     return await handleGetPortfolio(request, env);
                  } else if (method === 'PUT') {
                     return await handleUpdatePortfolio(request, env);
                  } else if (method === 'DELETE') {
                     return await handleDeletePortfolio(request, env);
                  }
               }


            // ============================================================================
            // Public API Routes
            // ============================================================================

            case '/ws/stock-prices':
               if (method === 'GET') {
                  // Create WebSocket pair
                  const webSocketPair = new WebSocketPair();
                  const [client, server] = Object.values(webSocketPair);
                  await handleWebSocketSession(client, env);

                  // Return the WebSocket response
                  return new Response(null, {
                     status: 101,
                     webSocket: client,
                     headers: {
                        'Upgrade': 'websocket',
                        'Connection': 'Upgrade',
                        'Sec-WebSocket-Protocol': 'websocket',
                        ...corsHeaders
                     }
                  });
               }
               break;

            case '/send_email':
               console.log(env.MY_GMAIL_ADDRESS as string);
               const resend = new Resend(env.RESEND_API_KEY);
               const { data } = await resend.emails.send({
                  from: 'onboarding@resend.dev',
                  to: env.MY_GMAIL_ADDRESS as string,
                  subject: 'API requested mail',
                  text: 'This mail is sent by the API request from the user in ' + env.ENVIRONMENT,
               });

               if (data) {
                  console.log(`Email ${data.id} has been sent`);
               }
               else {
                  console.log('Email not sent');
               }

               return new Response(JSON.stringify({
                  message: 'Email sent',
                  data: data
               }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
               });

            case '/test_cron':
               // Manually trigger the cron logic for testing
               try {
                  console.log("Manual cron test triggered at:", new Date().toISOString());

                  const resend = new Resend(env.RESEND_API_KEY);
                  const { data, error } = await resend.emails.send({
                     from: 'onboarding@resend.dev',
                     to: env.MY_GMAIL_ADDRESS as string,
                     subject: 'Manual Cron Test',
                     text: 'Manual cron test executed at ' + new Date().toISOString() + ' in ' + env.ENVIRONMENT,
                  });

                  if (error) {
                     console.error('Failed to send email:', error);
                     return new Response(JSON.stringify({
                        success: false,
                        error: error
                     }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                     });
                  } else if (data) {
                     console.log(`Email ${data.id} has been sent successfully`);
                     return new Response(JSON.stringify({
                        success: true,
                        message: `Email ${data.id} sent successfully`,
                        timestamp: new Date().toISOString()
                     }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                     });
                  }
               } catch (error) {
                  console.error('Manual cron test failed:', error);
                  return new Response(JSON.stringify({
                     success: false,
                     error: error instanceof Error ? error.message : 'Unknown error'
                  }), {
                     status: 500,
                     headers: { 'Content-Type': 'application/json', ...corsHeaders }
                  });
               }

            case '/123':
               console.log('=== TEST ENDPOINT HIT ===');

               try {
                  // Test the Finnhub WebSocket connection
                  console.log(`Creating WebSocket connection to Finnhub: wss://ws.finnhub.io?token=${env.FINNHUB_API_KEY}`);
                  const socket = new WebSocket(`wss://ws.finnhub.io?token=${env.FINNHUB_API_KEY}`);

                  socket.addEventListener('open', function (event) {
                     console.log('Finnhub WebSocket connection opened');
                     socket.send(JSON.stringify({ 'type': 'subscribe-pr', 'symbol': 'BINANCE:BTCUSDT' }));
                  });

                  socket.addEventListener('message', function (event) {
                     console.log('Message from Finnhub server:', event.data);
                  });

                  socket.addEventListener('error', function (event) {
                     console.error('Finnhub WebSocket error:', event);
                  });

                  socket.addEventListener('close', function (event) {
                     console.log('Finnhub WebSocket connection closed');
                  });

                  return new Response(JSON.stringify({
                     success: true,
                     message: 'Finnhub WebSocket connection initiated (check server logs)',
                     timestamp: new Date().toISOString()
                  }), {
                     status: 200,
                     headers: { 'Content-Type': 'application/json', ...corsHeaders }
                  });

               } catch (error) {
                  console.error('Failed to create WebSocket connection:', error);
                  return new Response(JSON.stringify({
                     success: false,
                     message: 'Failed to create WebSocket connection',
                     error: error instanceof Error ? error.message : 'Unknown error'
                  }), {
                     status: 500,
                     headers: { 'Content-Type': 'application/json', ...corsHeaders }
                  });
               }

               return new Response(JSON.stringify({
                  success: true,
                  message: 'Normal test completed',
                  timestamp: new Date().toISOString(),
                  method: method,
                  path: path
               }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
               });

            case '/logging':
               console.log('=== TEST LOGGING ENDPOINT HIT ===');
               console.log('This is a test log message at:', new Date().toISOString());
               console.log('Request method:', method);
               console.log('Request path:', path);
               console.log('Request URL:', request.url);

               return new Response(JSON.stringify({
                  success: true,
                  message: 'Logging test completed',
                  timestamp: new Date().toISOString(),
                  method: method,
                  path: path
               }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
               });

            case '/api/yahoo-stocks':
               if (method === 'GET') {

                  const rawSymbols = url.searchParams.get('symbols');

                  if (rawSymbols) {
                     const symbols = rawSymbols.split(',');
                     return await getYahooStockData(symbols, env);
                  }
                  else {
                     return new Response(JSON.stringify({
                        error: 'No symbols provided',
                        message: 'No symbols provided'
                     }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                     });
                  }
               }
               break;

            case '/api/dividends':
               if (method === 'GET') {
                  const symbol = url.searchParams.get('symbol') || 'AAPL';
                  const fromParam = url.searchParams.get('from');
                  const toParam = url.searchParams.get('to');
                  return await getStockDividends(symbol, env, { from: fromParam, to: toParam });
               }
               break;

            case '/api/quote':
               if (method === 'GET') {
                  const symbol = url.searchParams.get('symbol') || 'AAPL';
                  const provider = url.searchParams.get('provider') as 'finnhub' | 'api_ninjas' | 'yahoo_finance' | undefined;
                  return await getUnifiedQuote(symbol, env, provider);
               }
               break;

            case '/api/finnhub/quote':
               if (method === 'GET') {
                  const symbol = url.searchParams.get('symbol') || 'AAPL';
                  return await getFinnhubQuote(symbol, env);
               }
               break;

            case '/api/finnhub/news':
               if (method === 'GET') {
                  const symbol = url.searchParams.get('symbol') || 'AAPL';
                  const toParam = url.searchParams.get('to');
                  const fromParam = url.searchParams.get('from');
                  return await getFinnhubCompanyNews(symbol, env, { from: fromParam, to: toParam });
               }
               break;

            case '/api/finnhub/insider-transactions':
               if (method === 'GET') {
                  const symbol = url.searchParams.get('symbol') || 'AAPL';
                  const toParam = url.searchParams.get('to');
                  const fromParam = url.searchParams.get('from');
                  return await getFinnhubInsiderTransactions(symbol, env, { from: fromParam, to: toParam });
               }
               break;

            case '/api/api-ninjas/quote':
               if (method === 'GET') {
                  const symbol = url.searchParams.get('symbol') || 'AAPL';
                  return await getApiNinjasQuote(symbol, env);
               }
               break;

            case '/api/api-ninjas/profile':
               if (method === 'GET') {
                  const symbol = url.searchParams.get('symbol') || 'AAPL';
                  return await getApiNinjasProfile(symbol, env);
               }
               break;

            default:
               return new Response(JSON.stringify({
                  error: 'Not Found',
                  message: 'The requested endpoint does not exist'
               }), {
                  status: 404,
                  headers: {
                     'Content-Type': 'application/json',
                     ...corsHeaders
                  }
               });
         }

         // Fallback return (should never reach here)
         return new Response(JSON.stringify({
            error: 'Method Not Allowed',
            message: `${method} method not allowed for ${path}`
         }), {
            status: 405,
            headers: {
               'Content-Type': 'application/json',
               ...corsHeaders
            }
         });

      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         return new Response(JSON.stringify({
            error: 'Internal Server Error',
            message: errorMessage
         }), {
            status: 500,
            headers: {
               'Content-Type': 'application/json',
               ...corsHeaders
            }
         });
      }
   }
};

/**
 * Handle WebSocket session for stock values
 */
async function handleWebSocketSession(websocket: WebSocket, env: Env) {
   console.log(`[WebSocket Session] Initializing WebSocket session`);

   // Accept the WebSocket connection first
   (websocket as any).accept();

   // Initialize stock value manager if needed
   if (!stockValueManager) {
      console.log(`[WebSocket Session] Creating new StockValueManager`);
      stockValueManager = new StockValueManager();
   } else {
      console.log(`[WebSocket Session] Using existing StockValueManager`);
   }

   // Add the WebSocket to the manager
   console.log(`[WebSocket Session] Adding WebSocket listener for BINANCE:BTCUSDT`);
   stockValueManager.addListener(websocket, ["BINANCE:BTCUSDT"]);

   // Handle WebSocket events
   websocket.addEventListener("close", () => {
      console.log("[WebSocket Session] WebSocket connection closed");
      stockValueManager?.removeListener(websocket);
   });

   websocket.addEventListener("error", (error) => {
      console.error("[WebSocket Session] WebSocket error:", error);
      stockValueManager?.removeListener(websocket);
   });

   websocket.addEventListener("message", (event) => {
      console.log("[WebSocket Session] Message from client:", event.data);
      stockValueManager?.addInterest(websocket, event.data);
   });

   console.log(`[WebSocket Session] WebSocket session initialized successfully`);
}

/**
 * Handle WebSocket proxy to Finnhub
 */
async function handleWebSocketProxy(request: Request, env: Env): Promise<Response> {
   try {
      console.log(`[WebSocket Proxy] Starting WebSocket proxy to Finnhub`);

      // Check if FINNHUB_API_KEY is available
      if (!env.FINNHUB_API_KEY) {
         return new Response(JSON.stringify({
            error: 'Missing configuration',
            message: 'FINNHUB_API_KEY is not set. Add it via `wrangler secret put FINNHUB_API_KEY`.'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Create WebSocket pair
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept the WebSocket connection
      server.accept();

      // Create connection to Finnhub WebSocket
      const finnhubUrl = `wss://ws.finnhub.io?token=${env.FINNHUB_API_KEY}`;
      console.log(`[WebSocket Proxy] Connecting to Finnhub: ${finnhubUrl}`);

      const finnhubSocket = new WebSocket(finnhubUrl);

      // Handle Finnhub WebSocket events
      finnhubSocket.addEventListener('open', () => {
         console.log('[WebSocket Proxy] Connected to Finnhub WebSocket');
      });

      finnhubSocket.addEventListener('message', (event) => {
         console.log('[WebSocket Proxy] Message from Finnhub:', event.data);
         try {
            // Forward message to client
            if (server.readyState === WebSocket.OPEN) {
               server.send(event.data);
            }
         } catch (error) {
            console.error('[WebSocket Proxy] Error forwarding message to client:', error);
         }
      });

      finnhubSocket.addEventListener('error', (error) => {
         console.error('[WebSocket Proxy] Finnhub WebSocket error:', error);
         try {
            if (server.readyState === WebSocket.OPEN) {
               server.send(JSON.stringify({
                  type: 'error',
                  message: 'Connection to Finnhub failed'
               }));
            }
         } catch (sendError) {
            console.error('[WebSocket Proxy] Error sending error message to client:', sendError);
         }
      });

      finnhubSocket.addEventListener('close', (event) => {
         console.log('[WebSocket Proxy] Finnhub WebSocket closed:', event.code, event.reason);
         try {
            if (server.readyState === WebSocket.OPEN) {
               server.send(JSON.stringify({
                  type: 'close',
                  code: event.code,
                  reason: event.reason
               }));
            }
         } catch (sendError) {
            console.error('[WebSocket Proxy] Error sending close message to client:', sendError);
         }
      });

      // Handle client WebSocket events
      server.addEventListener('message', (event: MessageEvent) => {
         console.log('[WebSocket Proxy] Message from client:', event.data);
         try {
            // Forward message to Finnhub
            if (finnhubSocket.readyState === WebSocket.OPEN) {
               finnhubSocket.send(event.data);
            } else {
               console.warn('[WebSocket Proxy] Finnhub WebSocket not open, cannot forward message');
               server.send(JSON.stringify({
                  type: 'error',
                  message: 'Not connected to Finnhub'
               }));
            }
         } catch (error) {
            console.error('[WebSocket Proxy] Error forwarding message to Finnhub:', error);
         }
      });

      server.addEventListener('close', () => {
         console.log('[WebSocket Proxy] Client WebSocket closed');
         try {
            if (finnhubSocket.readyState === WebSocket.OPEN) {
               finnhubSocket.close();
            }
         } catch (error) {
            console.error('[WebSocket Proxy] Error closing Finnhub WebSocket:', error);
         }
      });

      server.addEventListener('error', (error: Event) => {
         console.error('[WebSocket Proxy] Client WebSocket error:', error);
      });

      // Return the WebSocket response
      return new Response(null, {
         status: 101,
         webSocket: client,
         headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
            'Sec-WebSocket-Protocol': 'websocket',
            ...corsHeaders
         }
      });

   } catch (error) {
      console.error('[WebSocket Proxy] Error creating WebSocket proxy:', error);
      return new Response(JSON.stringify({
         error: 'WebSocket proxy failed',
         message: error instanceof Error ? error.message : 'Unknown error'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Get stock data from Yahoo Finance using ApiClient
 */
async function getYahooStockData(symbols: string[], env: Env): Promise<Response> {
   try {
      const apiClient = new ApiClient({
         finnhubApiKey: env.FINNHUB_API_KEY,
         apiNinjasApiKey: env.API_NINJAS_API_KEY,
         secApiKey: env.SEC_API_KEY
      });

      const allStockData = [];

      for (const symbol of symbols) {
         const stockData = await apiClient.getYahooFinanceQuote(symbol);
         allStockData.push(stockData);
      }

      return new Response(JSON.stringify(allStockData), {
         status: 200,
         headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
         }
      });


   } catch (error) {
      const errorResponse = ApiClient.createYahooFinanceErrorResponse(error, 'fetch quote', symbols.join(','));

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
         }
      });
   }
}

/**
 * Get unified quote from any available provider using ApiClient
 */
async function getUnifiedQuote(symbol: string, env: Env, provider?: 'finnhub' | 'api_ninjas' | 'yahoo_finance'): Promise<Response> {
   try {
      const apiClient = new ApiClient({
         finnhubApiKey: env.FINNHUB_API_KEY,
         apiNinjasApiKey: env.API_NINJAS_API_KEY,
         secApiKey: env.SEC_API_KEY
      });

      const quoteData = await apiClient.getQuote(symbol, provider as any);

      return new Response(JSON.stringify({
         symbol: symbol.toUpperCase(),
         source: 'ApiClient (Unified)',
         ...quoteData
      }), {
         status: 200,
         headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
         }
      });

   } catch (error) {
      const errorResponse = ApiClient.createErrorResponse(error, 'fetch quote', 'Unified API', symbol);

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
         }
      });
   }
}

/**
 * Get stock dividend information using ApiClient
 */
async function getStockDividends(
   symbol: string,
   env: Env,
   range?: { from?: string | null; to?: string | null }
): Promise<Response> {
   try {
      const apiClient = new ApiClient({
         finnhubApiKey: env.FINNHUB_API_KEY,
         apiNinjasApiKey: env.API_NINJAS_API_KEY,
         secApiKey: env.SEC_API_KEY
      });

      const dividendData = await apiClient.getYahooFinanceDividends(symbol, range);

      return new Response(JSON.stringify(dividendData), {
         status: 200,
         headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
         }
      });

   } catch (error) {
      const errorResponse = ApiClient.createYahooFinanceErrorResponse(error, 'fetch dividends', symbol);

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
         }
      });
   }
}

/**
 * Get real-time quote from Finnhub using FinnhubClient
 */
async function getFinnhubQuote(symbol: string, env: { FINNHUB_API_KEY?: string }): Promise<Response> {
   try {
      if (!env.FINNHUB_API_KEY) {
         return new Response(JSON.stringify({
            error: 'Missing configuration',
            message: 'FINNHUB_API_KEY is not set. Add it via `wrangler secret put FINNHUB_API_KEY`.'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const apiClient = new ApiClient({
         finnhubApiKey: env.FINNHUB_API_KEY
      });
      const quoteData = await apiClient.getFinnhubQuote(symbol);

      const payload = {
         symbol: symbol.toUpperCase(),
         price: quoteData.c ?? 0,
         change: quoteData.d ?? 0,
         changePercent: quoteData.dp ?? 0,
         high: quoteData.h ?? 0,
         low: quoteData.l ?? 0,
         open: quoteData.o ?? 0,
         previousClose: quoteData.pc ?? 0,
         lastUpdated: quoteData.t ? new Date((quoteData.t as number) * 1000).toISOString() : new Date().toISOString(),
         source: 'ApiClient (Finnhub)'
      };

      return new Response(JSON.stringify(payload), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   } catch (error) {
      const errorResponse = ApiClient.createFinnhubErrorResponse(error, 'fetch quote', symbol);

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Get company news from Finnhub using FinnhubClient
 */
async function getFinnhubCompanyNews(
   symbol: string,
   env: { FINNHUB_API_KEY?: string },
   range?: { from?: string | null; to?: string | null }
): Promise<Response> {
   try {
      if (!env.FINNHUB_API_KEY) {
         return new Response(JSON.stringify({
            error: 'Missing configuration',
            message: 'FINNHUB_API_KEY is not set. Add it via `wrangler secret put FINNHUB_API_KEY`.'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const apiClient = new ApiClient({
         finnhubApiKey: env.FINNHUB_API_KEY
      });
      const newsData = await apiClient.getFinnhubCompanyNews(symbol, range);

      // Default to the last 7 days if dates not provided
      const toDate = range?.to ?? new Date().toISOString().slice(0, 10);
      const fromDate = range?.from ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const news = newsData.map(item => ({
         datetime: item.datetime ? new Date(item.datetime * 1000).toISOString() : undefined,
         headline: item.headline,
         summary: item.summary,
         url: item.url,
         image: item.image,
         source: item.source,
         category: item.category
      }));

      return new Response(JSON.stringify({
         symbol: symbol.toUpperCase(),
         from: fromDate,
         to: toDate,
         count: news.length,
         news
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   } catch (error) {
      const errorResponse = ApiClient.createFinnhubErrorResponse(error, 'fetch company news', symbol);

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Get insider transactions from Finnhub using FinnhubClient
 */
async function getFinnhubInsiderTransactions(
   symbol: string,
   env: { FINNHUB_API_KEY?: string },
   range?: { from?: string | null; to?: string | null }
): Promise<Response> {
   try {
      if (!env.FINNHUB_API_KEY) {
         return new Response(JSON.stringify({
            error: 'Missing configuration',
            message: 'FINNHUB_API_KEY is not set. Add it via `wrangler secret put FINNHUB_API_KEY`.'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const apiClient = new ApiClient({
         finnhubApiKey: env.FINNHUB_API_KEY
      });
      const data = await apiClient.getFinnhubInsiderTransactions(symbol, range);

      // Default to last 90 days if not provided (Finnhub allows since/from filters)
      const toDate = range?.to ?? new Date().toISOString().slice(0, 10);
      const fromDate = range?.from ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const items = Array.isArray(data?.data) ? data.data : [];

      const transactions = items.map(item => ({
         symbol: (item.symbol || symbol).toUpperCase(),
         insiderName: item.name ?? item.filer,
         role: item.type,
         transactionDate: item.transactionDate,
         filingDate: item.filingDate,
         code: item.transactionCode,
         shares: item.share ?? undefined,
         change: item.change ?? undefined,
         price: item.transactionPrice ?? undefined,
         totalValue: item.total ?? undefined
      }));

      return new Response(JSON.stringify({
         symbol: symbol.toUpperCase(),
         from: fromDate,
         to: toDate,
         count: transactions.length,
         transactions
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   } catch (error) {
      const errorResponse = ApiClient.createFinnhubErrorResponse(error, 'fetch insider transactions', symbol);

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Get S&P 500 companies from API Ninjas
 */
async function getApiNinjasSp500(env: { API_NINJAS_API_KEY?: string }): Promise<Response> {
   try {
      if (!env.API_NINJAS_API_KEY) {
         return new Response(JSON.stringify({
            error: 'Missing configuration',
            message: 'API_NINJAS_API_KEY is not set. Add it via `wrangler secret put API_NINJAS_API_KEY`.'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const apiClient = new ApiClient({
         apiNinjasApiKey: env.API_NINJAS_API_KEY
      });
      const sp500Data = await apiClient.getApiNinjasSp500();

      return new Response(JSON.stringify({
         source: 'ApiClient (API Ninjas)',
         count: sp500Data.count,
         data: sp500Data.data
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   } catch (error) {
      const errorResponse = ApiClient.createApiNinjasErrorResponse(error, 'fetch S&P 500 data');

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Get stock quote from API Ninjas
 */
async function getApiNinjasQuote(symbol: string, env: { API_NINJAS_API_KEY?: string }): Promise<Response> {
   try {
      if (!env.API_NINJAS_API_KEY) {
         return new Response(JSON.stringify({
            error: 'Missing configuration',
            message: 'API_NINJAS_API_KEY is not set. Add it via `wrangler secret put API_NINJAS_API_KEY`.'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const apiClient = new ApiClient({
         apiNinjasApiKey: env.API_NINJAS_API_KEY
      });
      const quoteData = await apiClient.getApiNinjasQuote(symbol);

      return new Response(JSON.stringify({
         symbol: symbol.toUpperCase(),
         source: 'ApiClient (API Ninjas)',
         ...quoteData
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   } catch (error) {
      const errorResponse = ApiClient.createApiNinjasErrorResponse(error, 'fetch quote', symbol);

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Get company profile from API Ninjas
 */
async function getApiNinjasProfile(symbol: string, env: { API_NINJAS_API_KEY?: string }): Promise<Response> {
   try {
      if (!env.API_NINJAS_API_KEY) {
         return new Response(JSON.stringify({
            error: 'Missing configuration',
            message: 'API_NINJAS_API_KEY is not set. Add it via `wrangler secret put API_NINJAS_API_KEY`.'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const apiClient = new ApiClient({
         apiNinjasApiKey: env.API_NINJAS_API_KEY
      });
      const profileData = await apiClient.getApiNinjasCompanyProfile(symbol);

      return new Response(JSON.stringify({
         symbol: symbol.toUpperCase(),
         source: 'ApiClient (API Ninjas)',
         ...profileData
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   } catch (error) {
      const errorResponse = ApiClient.createApiNinjasErrorResponse(error, 'fetch company profile', symbol);

      return new Response(JSON.stringify(errorResponse), {
         status: errorResponse.status,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

// ============================================================================
// Authentication Handler Functions
// ============================================================================

/**
 * Handle user registration
 */
async function handleRegister(request: Request, env: Env): Promise<Response> {
   try {
      console.log('Register request received');
      console.log('Environment check - JWT_SECRET exists:', !!env.JWT_SECRET);
      console.log('Environment check - stock_analysis DB exists:', !!env.stock_analysis);

      const body = await request.json() as RegisterRequest;
      console.log('Request body parsed successfully:', { email: body.email, hasPassword: !!body.password });

      // Validate required fields
      if (!body.email || !body.password) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Email and password are required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Invalid email format'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Validate password strength
      if (body.password.length < 8) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Password must be at least 8 characters long'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      console.log('Creating AuthManager...');
      const authManager = new AuthMiddleware(env).getAuthManager();
      console.log('AuthManager created successfully');

      console.log('Calling authManager.register...');
      const result = await authManager.register(body);
      console.log('Registration result:', result);

      return new Response(JSON.stringify(result), {
         status: result.success ? 201 : 400,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      console.error('Register function error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return new Response(JSON.stringify({
         success: false,
         message: 'Invalid request format'
      }), {
         status: 400,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle user login
 */
async function handleLogin(request: Request, env: Env): Promise<Response> {
   try {
      const body = await request.json() as LoginRequest;

      // Validate required fields
      if (!body.email || !body.password) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Email and password are required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const authManager = new AuthMiddleware(env).getAuthManager();
      const userAgent = request.headers.get('User-Agent') || undefined;
      const ipAddress = request.headers.get('CF-Connecting-IP') || undefined;

      const result = await authManager.login(body, userAgent, ipAddress);

      return new Response(JSON.stringify(result), {
         status: result.success ? 200 : 401,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Invalid request format'
      }), {
         status: 400,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle user logout
 */
async function handleLogout(request: Request, env: Env): Promise<Response> {
   try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
         return new Response(JSON.stringify({
            success: false,
            message: 'No token provided'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const authManager = new AuthMiddleware(env).getAuthManager();
      const success = await authManager.logout(token);

      return new Response(JSON.stringify({
         success,
         message: success ? 'Logged out successfully' : 'Logout failed'
      }), {
         status: success ? 200 : 400,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Logout failed'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle get user profile
 */
async function handleGetProfile(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   return new Response(JSON.stringify({
      success: true,
      user: auth.user
   }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
   });
}

/**
 * Handle token verification
 */
async function handleVerifyToken(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const auth = await authMiddleware.authenticate(request);

   return new Response(JSON.stringify({
      success: !!auth,
      isAuthenticated: !!auth,
      user: auth?.user || null
   }), {
      status: auth ? 200 : 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
   });
}

// ============================================================================
// Portfolio Handler Functions (Protected Routes)
// ============================================================================

/**
 * Handle get user portfolios
 */
async function handleGetUserPortfolios(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      // Get portfolios for the authenticated user
      const portfolios = await StockAnalysisDB.getPortfolios(env, auth.user.id);

      console.log('Portfolios data:');
      console.log(JSON.stringify(portfolios, null, 2));

      return new Response(JSON.stringify({
         success: true,
         portfolios: portfolios
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to fetch portfolios'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle create portfolio
 */
async function handleCreatePortfolio(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const body = await request.json();
      const { portfolioName, description } = body;

      if (!portfolioName) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio name is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const result = await env.stock_analysis.prepare(`
         INSERT INTO user_portfolios (user_id, portfolio_name, description)
         VALUES (?, ?, ?)
      `).bind(auth.user.id, portfolioName, description || null).run();

      if (!result.success) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Failed to create portfolio'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      return new Response(JSON.stringify({
         success: true,
         message: 'Portfolio created successfully',
         portfolioId: result.meta.last_row_id
      }), {
         status: 201,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to create portfolio'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle get single portfolio
 */
async function handleGetPortfolio(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = url.pathname.split('/').pop();

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const result = await env.stock_analysis.prepare(`
         SELECT * FROM user_portfolios
         WHERE id = ? AND user_id = ?
      `).bind(portfolioId, auth.user.id).first();

      if (!result) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      return new Response(JSON.stringify({
         success: true,
         portfolio: result
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to fetch portfolio'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle update portfolio
 */
async function handleUpdatePortfolio(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = url.pathname.split('/').pop();
      const body = await request.json();
      const { portfolioName, description } = body;

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const result = await env.stock_analysis.prepare(`
         UPDATE user_portfolios
         SET portfolio_name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?
      `).bind(portfolioName, description || null, portfolioId, auth.user.id).run();

      if (!result.success) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Failed to update portfolio'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      return new Response(JSON.stringify({
         success: true,
         message: 'Portfolio updated successfully'
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to update portfolio'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle delete portfolio
 */
async function handleDeletePortfolio(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = url.pathname.split('/').pop();

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const result = await env.stock_analysis.prepare(`
         DELETE FROM user_portfolios
         WHERE id = ? AND user_id = ?
      `).bind(portfolioId, auth.user.id).run();

      if (!result.success) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Failed to delete portfolio'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      return new Response(JSON.stringify({
         success: true,
         message: 'Portfolio deleted successfully'
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to delete portfolio'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

// ============================================================================
// Portfolio Holdings Handler Functions (Protected Routes)
// ============================================================================

/**
 * Handle get portfolio holdings
 */
async function handleGetPortfolioHoldings(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = parseInt(url.pathname.split('/')[3]); // Extract portfolio ID from /api/portfolios/{id}/holdings

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Verify portfolio belongs to user
      const isUsersPortfolio = await StockAnalysisDB.isUsersPortfolio(env, portfolioId, auth.user.id);

      if (!isUsersPortfolio) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Get portfolio holdings
      const holdingsResult = await StockAnalysisDB.getPortfolioHoldings(env, portfolioId);

      return new Response(JSON.stringify({
         success: true,
         holdings: holdingsResult
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   }
   catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to fetch portfolio holdings'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle add stock to portfolio
 */
async function handleAddStockToPortfolio(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = parseInt(url.pathname.split('/')[3]);
      const body = await request.json();
      const { symbol, quantity } = body;

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      if (!symbol || !quantity) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Symbol, quantity, price per share, and transaction date are required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Verify portfolio belongs to user
      const isUsersPortfolio = await StockAnalysisDB.isUsersPortfolio(env, portfolioId, auth.user.id);

      if (!isUsersPortfolio) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      await StockAnalysisDB.addPortfolioHolding(env, portfolioId, symbol, quantity);

      // Get portfolio holdings
      const holdingsResult = await StockAnalysisDB.getPortfolioHoldings(env, portfolioId);

      return new Response(JSON.stringify({
         success: true,
         holdings: holdingsResult
      }), {
         status: 201,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to add stock to portfolio'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle update portfolio holding
 */
async function handleUpdatePortfolioHolding(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = url.pathname.split('/')[3];
      const body = await request.json();
      const { symbol, currentPrice } = body;

      if (!portfolioId || !symbol || !currentPrice) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID, symbol, and current price are required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Verify portfolio belongs to user
      const portfolioResult = await env.stock_analysis.prepare(`
         SELECT id FROM user_portfolios
         WHERE id = ? AND user_id = ?
      `).bind(portfolioId, auth.user.id).first();

      if (!portfolioResult) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Get current holding
      const holding = await env.stock_analysis.prepare(`
         SELECT * FROM portfolio_holdings
         WHERE portfolio_id = ? AND symbol = ?
      `).bind(portfolioId, symbol).first();

      if (!holding) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Holding not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Calculate new values
      const currentValue = holding.quantity * currentPrice;
      const unrealizedGainLoss = currentValue - holding.total_cost;
      const unrealizedGainLossPercent = (unrealizedGainLoss / holding.total_cost) * 100;

      // Update holding
      await env.stock_analysis.prepare(`
         UPDATE portfolio_holdings
         SET current_price = ?, current_value = ?, unrealized_gain_loss = ?,
             unrealized_gain_loss_percent = ?, last_updated = CURRENT_TIMESTAMP
         WHERE portfolio_id = ? AND symbol = ?
      `).bind(currentPrice, currentValue, unrealizedGainLoss, unrealizedGainLossPercent, portfolioId, symbol).run();

      return new Response(JSON.stringify({
         success: true,
         message: 'Holding updated successfully'
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to update holding'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle remove stock from portfolio
 */
async function handleRemoveStockFromPortfolio(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = parseInt(url.pathname.split('/')[3]);
      console.log(portfolioId);

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID and symbol are required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Verify portfolio belongs to user
      const isUsersPortfolio = await StockAnalysisDB.isUsersPortfolio(env, portfolioId, auth.user.id);

      console.log(isUsersPortfolio);

      if (!isUsersPortfolio) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }
      const holdingId = parseInt(url.pathname.split('/')[5]);
      const isHoldingInPortfolio = await StockAnalysisDB.isHoldingInPortfolio(env, holdingId, portfolioId);

      console.log(isHoldingInPortfolio);

      if (!isHoldingInPortfolio) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Holding not found in portfolio'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Remove holding
      try {
         await StockAnalysisDB.deletePortfolioHolding(env, holdingId);
      } catch (error) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Failed to remove stock from portfolio'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      return new Response(JSON.stringify({
         success: true,
         message: 'Stock removed from portfolio successfully'
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to remove stock from portfolio'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle get portfolio transactions
 */
async function handleGetPortfolioTransactions(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = url.pathname.split('/')[3];

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Verify portfolio belongs to user
      const portfolioResult = await env.stock_analysis.prepare(`
         SELECT id FROM user_portfolios
         WHERE id = ? AND user_id = ?
      `).bind(portfolioId, auth.user.id).first();

      if (!portfolioResult) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Get transactions
      const transactionsResult = await env.stock_analysis.prepare(`
         SELECT * FROM portfolio_transactions
         WHERE portfolio_id = ?
         ORDER BY transaction_date DESC, created_at DESC
      `).bind(portfolioId).all();

      return new Response(JSON.stringify({
         success: true,
         transactions: transactionsResult.results
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to fetch portfolio transactions'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle add portfolio transaction
 */
async function handleAddPortfolioTransaction(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = url.pathname.split('/')[3];
      const body = await request.json();
      const { symbol, transactionType, quantity, pricePerShare, fees = 0, transactionDate, notes } = body;

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      if (!symbol || !transactionType || !quantity || !pricePerShare || !transactionDate) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Symbol, transaction type, quantity, price per share, and transaction date are required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Verify portfolio belongs to user
      const portfolioResult = await env.stock_analysis.prepare(`
         SELECT id FROM user_portfolios
         WHERE id = ? AND user_id = ?
      `).bind(portfolioId, auth.user.id).first();

      if (!portfolioResult) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      const totalAmount = quantity * pricePerShare;

      // Add transaction record
      const transactionResult = await env.stock_analysis.prepare(`
         INSERT INTO portfolio_transactions (portfolio_id, symbol, transaction_type, quantity, price_per_share, total_amount, fees, transaction_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(portfolioId, symbol, transactionType, quantity, pricePerShare, totalAmount, fees, transactionDate, notes || null).run();

      if (!transactionResult.success) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Failed to add transaction'
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      return new Response(JSON.stringify({
         success: true,
         message: 'Transaction added successfully',
         transactionId: transactionResult.meta.last_row_id
      }), {
         status: 201,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to add transaction'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}

/**
 * Handle get portfolio summary
 */
async function handleGetPortfolioSummary(request: Request, env: Env): Promise<Response> {
   const authMiddleware = new AuthMiddleware(env);
   const authResult = await authMiddleware.requireAuth(request);

   if (authResult instanceof Response) {
      return authResult;
   }

   const { auth } = authResult;

   try {
      const url = new URL(request.url);
      const portfolioId = url.pathname.split('/')[3];

      if (!portfolioId) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio ID is required'
         }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Verify portfolio belongs to user and get portfolio info
      const portfolioResult = await env.stock_analysis.prepare(`
         SELECT * FROM user_portfolios
         WHERE id = ? AND user_id = ?
      `).bind(portfolioId, auth.user.id).first();

      if (!portfolioResult) {
         return new Response(JSON.stringify({
            success: false,
            message: 'Portfolio not found'
         }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
         });
      }

      // Get portfolio holdings
      const holdingsResult = await env.stock_analysis.prepare(`
         SELECT * FROM portfolio_holdings
         WHERE portfolio_id = ?
         ORDER BY symbol ASC
      `).bind(portfolioId).all();

      const holdings = holdingsResult.results;

      // Calculate portfolio summary
      const totalValue = holdings.reduce((sum: number, holding: any) => sum + (holding.current_value || 0), 0);
      const totalCost = holdings.reduce((sum: number, holding: any) => sum + (holding.total_cost || 0), 0);
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

      const summary = {
         portfolio: portfolioResult,
         holdings: holdings,
         totalValue: totalValue,
         totalCost: totalCost,
         totalGainLoss: totalGainLoss,
         totalGainLossPercent: totalGainLossPercent,
         lastUpdated: new Date().toISOString()
      };

      return new Response(JSON.stringify({
         success: true,
         summary: summary
      }), {
         status: 200,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

   } catch (error) {
      return new Response(JSON.stringify({
         success: false,
         message: 'Failed to fetch portfolio summary'
      }), {
         status: 500,
         headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
   }
}
