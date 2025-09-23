/**
 * FinnhubClient - A dedicated class for handling all Finnhub API interactions
 * Provides timeout protection and consistent error handling for all Finnhub endpoints
 */

import { 
   FinnhubQuote, 
   FinnhubNewsItem, 
   FinnhubInsiderTransaction, 
   FinnhubInsiderTransactionsResponse, 
   DateRange,
   ApiErrorResponse 
} from './types';

export class FinnhubClient {
   private readonly apiKey: string;
   private readonly baseUrl: string = 'https://finnhub.io/api/v1';
   private readonly timeoutMs: number = 10000; // 10 seconds

   constructor(apiKey: string) {
      if (!apiKey) {
         throw new Error('FinnhubClient requires a valid API key');
      }
      this.apiKey = apiKey;
   }

   /**
    * Makes a request to Finnhub API with timeout protection
    */
   private async makeRequest<T>(endpoint: string): Promise<T> {
      const url = `${this.baseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
         const response = await fetch(url, {
            signal: controller.signal,
            headers: {
               'Accept': 'application/json'
            }
         });

         clearTimeout(timeoutId);

         if (!response.ok) {
            throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
         }

         return await response.json() as T;
      } catch (error) {
         clearTimeout(timeoutId);
         throw error;
      }
   }

   /**
    * Get real-time quote for a symbol
    */
   async getQuote(symbol: string): Promise<FinnhubQuote> {
      const endpoint = `/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${this.apiKey}`;
      return this.makeRequest<FinnhubQuote>(endpoint);
   }

   /**
    * Get company news for a symbol within a date range
    */
   async getCompanyNews(symbol: string, range?: DateRange): Promise<FinnhubNewsItem[]> {
      const toDate = range?.to ?? new Date().toISOString().slice(0, 10);
      const fromDate = range?.from ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      
      const endpoint = `/company-news?symbol=${encodeURIComponent(symbol.toUpperCase())}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
      const data = await this.makeRequest<FinnhubNewsItem[]>(endpoint);
      return Array.isArray(data) ? data : [];
   }

   /**
    * Get insider transactions for a symbol within a date range
    */
   async getInsiderTransactions(symbol: string, range?: DateRange): Promise<FinnhubInsiderTransactionsResponse> {
      const toDate = range?.to ?? new Date().toISOString().slice(0, 10);
      const fromDate = range?.from ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      
      const endpoint = `/stock/insider-transactions?symbol=${encodeURIComponent(symbol.toUpperCase())}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
      return this.makeRequest<FinnhubInsiderTransactionsResponse>(endpoint);
   }

   /**
    * Check if an error is a timeout error
    */
   static isTimeoutError(error: unknown): boolean {
      return error instanceof Error && error.name === 'AbortError';
   }

   /**
    * Create a standardized error response for Finnhub API errors
    */
   static createErrorResponse(error: unknown, operation: string, symbol: string): {
      error: string;
      message: string;
      symbol: string;
      source: string;
      timeout: boolean;
      status: number;
   } {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = FinnhubClient.isTimeoutError(error);
      
      console.error(`Error in FinnhubClient.${operation}:`, {
         symbol: symbol.toUpperCase(),
         error: errorMessage,
         isTimeout,
         timestamp: new Date().toISOString()
      });
      
      return {
         error: isTimeout ? 'Request timeout' : `Failed to ${operation} from Finnhub`,
         message: isTimeout ? 'The request took too long to complete' : errorMessage,
         symbol: symbol.toUpperCase(),
         source: 'Finnhub API',
         timeout: isTimeout,
         status: isTimeout ? 408 : 500
      };
   }
}