/**
 * A simple Cloudflare Workers application built with TypeScript
 * Handles HTTP requests and provides basic stock analysis functionality
 */

import yahooFinance from 'yahoo-finance2';
import { ApiClient, ApiProvider } from './apiClient';
import { Resend } from 'resend';
import { StockAnalysisDB } from './stockAnalasysDB';
import { Env } from './types';

declare type ExecutionContext = any;
declare type ScheduledController = any;



// CORS headers
const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};


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
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      try {
         // Route handling
         switch (path) {

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

            case '/test':
               const symbol = url.searchParams.get('symbol') || 'AAPL';

               // Example using direct fetch to Finnhub API (more reliable than callback-based client)
               if (!env.FINNHUB_API_KEY) {
                  return new Response(JSON.stringify({
                     error: 'Missing configuration',
                     message: 'FINNHUB_API_KEY is not set. Add it via `wrangler secret put FINNHUB_API_KEY`.'
                  }), {
                     status: 500,
                     headers: { 'Content-Type': 'application/json', ...corsHeaders }
                  });
               }

               try {
                  const apiClient = new ApiClient({
                     finnhubApiKey: env.FINNHUB_API_KEY
                  });

                  const insiderData = await apiClient.getFinnhubInsiderTransactions(symbol, { from: '2025-01-01', to: '2025-09-21' });
                  console.log('Insider transactions data:', insiderData);

                  if (insiderData.data && insiderData.data.length > 0) {
                     for (var i = 0; i < insiderData.data.length; i++) {
                        if (['P', 'S', 'V'].includes(insiderData.data[i].transactionCode as string)) {
                           console.log('Insider transaction code:', insiderData.data[i]);
                        }
                     }
                  }
                  return new Response(JSON.stringify({
                     symbol: symbol.toUpperCase(),
                     insiderTransactions: insiderData,
                     source: 'ApiClient (Finnhub)'
                  }), {
                     headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                     }
                  });
               } catch (error) {
                  const errorResponse = ApiClient.createFinnhubErrorResponse(error, 'fetch insider transactions', symbol);

                  return new Response(JSON.stringify(errorResponse), {
                     status: errorResponse.status,
                     headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                     }
                  });
               }

            case '/index.html':
               // Serve the HTML file from assets
               const htmlRequest = new Request(`${url.origin}/static/index.html`);
               const htmlResponse = await env.ASSETS.fetch(htmlRequest);
               return new Response(htmlResponse.body, {
                  headers: {
                     'Content-Type': 'text/html',
                     ...corsHeaders
                  }
               });

            case '/api/yahoo-stocks':
               if (method === 'GET') {
                  const symbol = url.searchParams.get('symbol') || 'AAPL';
                  return await getYahooStockData(symbol, env);
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

            case '/api/api-ninjas/sp500':
               if (method === 'GET') {

                  const response = await getApiNinjasSp500(env);
                  const data = await response.json();
                  const stockAnalysisDB = new StockAnalysisDB(env.API_NINJAS_API_KEY!);
                  await stockAnalysisDB.storeSp500Tickers(env, data, true);
                  return new Response(JSON.stringify(data), {
                     status: 200,
                     headers: { 'Content-Type': 'application/json', ...corsHeaders }
                  });
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
 * Get stock data from Yahoo Finance
 */
async function getYahooStockData(symbol: string, env: { FINNHUB_API_KEY?: string }): Promise<Response> {
   try {
      // Yahoo Finance API endpoint with proper headers
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`;

      const headers: Record<string, string> = {
         'Accept': 'application/json',
      };

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(yahooUrl, {
         headers,
         signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
         throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Check if we have valid data
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
         throw new Error('No data available for symbol: ' + symbol);
      }

      // Extract relevant data from Yahoo Finance response
      const chart = data.chart.result[0];
      const meta = chart.meta;

      if (!meta) {
         throw new Error('Invalid data structure from Yahoo Finance');
      }

      const stockData = {
         symbol: meta.symbol || symbol.toUpperCase(),
         name: meta.longName || meta.shortName || `${symbol.toUpperCase()} Corporation`,
         price: meta.regularMarketPrice || meta.previousClose || 0,
         change: (meta.regularMarketPrice || meta.previousClose || 0) - (meta.previousClose || 0),
         changePercent: meta.previousClose ?
            (((meta.regularMarketPrice || meta.previousClose) - meta.previousClose) / meta.previousClose) * 100 : 0,
         volume: meta.regularMarketVolume || 0,
         marketCap: meta.marketCap || 0,
         currency: meta.currency || 'USD',
         exchange: meta.exchangeName || 'Unknown',
         lastUpdated: meta.regularMarketTime ?
            new Date(meta.regularMarketTime * 1000).toISOString() :
            new Date().toISOString(),
         source: 'Yahoo Finance'
      };

      return new Response(JSON.stringify(stockData), {
         status: 200,
         headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
         }
      });

   } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      console.error('Error fetching Yahoo Finance data:', {
         symbol: symbol.toUpperCase(),
         error: errorMessage,
         isTimeout,
         timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
         error: isTimeout ? 'Request timeout' : 'Failed to fetch stock data from Yahoo Finance',
         message: isTimeout ? 'The request took too long to complete' : errorMessage,
         symbol: symbol.toUpperCase(),
         source: 'Yahoo Finance',
         timeout: isTimeout
      }), {
         status: isTimeout ? 408 : 500,
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
