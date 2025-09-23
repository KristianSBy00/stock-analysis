/**
 * ApiClient - Unified API client for handling all external API interactions
 * Provides a single interface for Finnhub and API Ninjas APIs with timeout protection and consistent error handling
 */

import {
   FinnhubQuote,
   FinnhubNewsItem,
   FinnhubInsiderTransaction,
   FinnhubInsiderTransactionsResponse,
   ApiNinjasSp500Item,
   ApiNinjasSp500Response,
   ApiNinjasStockQuote,
   ApiNinjasCompanyProfile,
   DateRange,
   ApiErrorResponse
} from './types';

export enum ApiProvider {
   FINNHUB = 'finnhub',
   API_NINJAS = 'api_ninjas'
}

export interface ApiClientConfig {
   finnhubApiKey?: string;
   apiNinjasApiKey?: string;
   secApiKey?: string;
   timeoutMs?: number;
}

export class ApiClient {
   //https://api.sec-api.io/mapping/exchange/nasdaq?token=c055419baf93afb8580621efb1b09b5d4da4698a6a7adf2235bed2aeb8f112be
   private readonly finnhubApiKey?: string;
   private readonly apiNinjasApiKey?: string;
   private readonly secApiKey?: string;
   private readonly timeoutMs: number;

   // API Base URLs
   private readonly finnhubBaseUrl = 'https://finnhub.io/api/v1';
   private readonly apiNinjasBaseUrl = 'https://api.api-ninjas.com/v1';
   private readonly secApiBaseUrl = 'https://sec-api.io/';

   constructor(config: ApiClientConfig) {
      this.finnhubApiKey = config.finnhubApiKey;
      this.apiNinjasApiKey = config.apiNinjasApiKey;
      this.secApiKey = config.secApiKey;
      this.timeoutMs = config.timeoutMs ?? 10000; // Default 10 seconds

      // Validate that at least one API key is provided
      if (!this.finnhubApiKey && !this.apiNinjasApiKey && !this.secApiKey) {
         throw new Error('ApiClient requires at least one API key (finnhubApiKey or apiNinjasApiKey or secApiKey)');
      }
   }

   private async makesSecApiRequest<T>(endpoint: string): Promise<T> {
      if (!this.secApiKey) {
         throw new Error('Sec API key is not configured');
      }

      const url = `${this.secApiBaseUrl}${endpoint}`;
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
            throw new Error(`Sec API error: ${response.status} ${response.statusText}`);
         }

         return await response.json() as T;
      } catch (error) {
         clearTimeout(timeoutId);
         throw error;
      }
   }

   /**
    * Makes a request to Finnhub API with timeout protection
    */
   private async makeFinnhubRequest<T>(endpoint: string): Promise<T> {
      if (!this.finnhubApiKey) {
         throw new Error('Finnhub API key is not configured');
      }

      const url = `${this.finnhubBaseUrl}${endpoint}`;
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
    * Makes a request to API Ninjas with timeout protection
    */
   private async makeApiNinjasRequest<T>(endpoint: string): Promise<T> {
      if (!this.apiNinjasApiKey) {
         throw new Error('API Ninjas API key is not configured');
      }

      const url = `${this.apiNinjasBaseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
         const response = await fetch(url, {
            signal: controller.signal,
            headers: {
               'Accept': 'application/json',
               'X-Api-Key': this.apiNinjasApiKey
            }
         });

         clearTimeout(timeoutId);

         if (!response.ok) {
            throw new Error(`API Ninjas error: ${response.status} ${response.statusText}`);
         }

         return await response.json() as T;
      } catch (error) {
         clearTimeout(timeoutId);
         throw error;
      }
   }

   // ============================================================================
   // FINNHUB API METHODS
   // ============================================================================

   /**
    * Get real-time quote for a symbol from Finnhub
    */
   async getFinnhubQuote(symbol: string): Promise<FinnhubQuote> {
      const endpoint = `/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${this.finnhubApiKey}`;
      return this.makeFinnhubRequest<FinnhubQuote>(endpoint);
   }

   async getSecApiExchange(exchange: string): Promise<any> {
      const endpoint = `/mapping/exchange/${exchange}?token=${this.secApiKey}`;
      return this.makesSecApiRequest<any>(endpoint);
   }

   /**
    * Get company news for a symbol within a date range from Finnhub
    */
   async getFinnhubCompanyNews(symbol: string, range?: DateRange): Promise<FinnhubNewsItem[]> {
      const toDate = range?.to ?? new Date().toISOString().slice(0, 10);
      const fromDate = range?.from ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const endpoint = `/company-news?symbol=${encodeURIComponent(symbol.toUpperCase())}&from=${fromDate}&to=${toDate}&token=${this.finnhubApiKey}`;
      const data = await this.makeFinnhubRequest<FinnhubNewsItem[]>(endpoint);
      return Array.isArray(data) ? data : [];
   }

   /**
    * Get insider transactions for a symbol within a date range from Finnhub
    */
   async getFinnhubInsiderTransactions(symbol: string, range?: DateRange): Promise<FinnhubInsiderTransactionsResponse> {
      const toDate = range?.to ?? new Date().toISOString().slice(0, 10);
      const fromDate = range?.from ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const endpoint = `/stock/insider-transactions?symbol=${encodeURIComponent(symbol.toUpperCase())}&from=${fromDate}&to=${toDate}&token=${this.finnhubApiKey}`;
      return this.makeFinnhubRequest<FinnhubInsiderTransactionsResponse>(endpoint);
   }

   // ============================================================================
   // API NINJAS API METHODS
   // ============================================================================

   /**
    * Get S&P 500 companies list from API Ninjas
    */
   async getApiNinjasSp500(): Promise<ApiNinjasSp500Response> {
      const endpoint = '/sp500';
      const data = await this.makeApiNinjasRequest<ApiNinjasSp500Item[]>(endpoint);
      return {
         data: Array.isArray(data) ? data : [],
         count: Array.isArray(data) ? data.length : 0
      };
   }

   /**
    * Get stock quote for a symbol from API Ninjas
    */
   async getApiNinjasQuote(symbol: string): Promise<ApiNinjasStockQuote> {
      const endpoint = `/stock?symbol=${encodeURIComponent(symbol.toUpperCase())}`;
      return this.makeApiNinjasRequest<ApiNinjasStockQuote>(endpoint);
   }

   /**
    * Get company profile for a symbol from API Ninjas
    */
   async getApiNinjasCompanyProfile(symbol: string): Promise<ApiNinjasCompanyProfile> {
      const endpoint = `/stock?symbol=${encodeURIComponent(symbol.toUpperCase())}&profile=true`;
      return this.makeApiNinjasRequest<ApiNinjasCompanyProfile>(endpoint);
   }

   /**
    * Get stock price history for a symbol from API Ninjas
    */
   async getApiNinjasPriceHistory(symbol: string, range?: DateRange): Promise<any> {
      const toDate = range?.to ?? new Date().toISOString().slice(0, 10);
      const fromDate = range?.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const endpoint = `/stock?symbol=${encodeURIComponent(symbol.toUpperCase())}&from=${fromDate}&to=${toDate}`;
      return this.makeApiNinjasRequest<any>(endpoint);
   }

   /**
    * Get market sectors performance from API Ninjas
    */
   async getApiNinjasSectors(): Promise<any> {
      const endpoint = '/sectors';
      return this.makeApiNinjasRequest<any>(endpoint);
   }

   /**
    * Get market indices from API Ninjas
    */
   async getApiNinjasIndices(): Promise<any> {
      const endpoint = '/indices';
      return this.makeApiNinjasRequest<any>(endpoint);
   }

   // ============================================================================
   // UNIFIED METHODS (with provider selection)
   // ============================================================================

   /**
    * Get quote from specified provider (defaults to Finnhub if available, otherwise API Ninjas)
    */
   async getQuote(symbol: string, provider?: ApiProvider): Promise<FinnhubQuote | ApiNinjasStockQuote> {
      if (provider === ApiProvider.API_NINJAS || (!this.finnhubApiKey && this.apiNinjasApiKey)) {
         return this.getApiNinjasQuote(symbol);
      } else if (provider === ApiProvider.FINNHUB || this.finnhubApiKey) {
         return this.getFinnhubQuote(symbol);
      } else {
         throw new Error('No API provider available for quote request');
      }
   }

   // ============================================================================
   // UTILITY METHODS
   // ============================================================================

   /**
    * Check if an error is a timeout error
    */
   static isTimeoutError(error: unknown): boolean {
      return error instanceof Error && error.name === 'AbortError';
   }

   /**
    * Create a standardized error response for API errors
    */
   static createErrorResponse(error: unknown, operation: string, source: string, symbol?: string): {
      error: string;
      message: string;
      symbol?: string;
      source: string;
      timeout: boolean;
      status: number;
   } {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = ApiClient.isTimeoutError(error);

      console.error(`Error in ApiClient.${operation}:`, {
         symbol: symbol?.toUpperCase(),
         error: errorMessage,
         isTimeout,
         source,
         timestamp: new Date().toISOString()
      });

      return {
         error: isTimeout ? 'Request timeout' : `Failed to ${operation} from ${source}`,
         message: isTimeout ? 'The request took too long to complete' : errorMessage,
         symbol: symbol?.toUpperCase(),
         source: source,
         timeout: isTimeout,
         status: isTimeout ? 408 : 500
      };
   }

   /**
    * Create a Finnhub-specific error response
    */
   static createFinnhubErrorResponse(error: unknown, operation: string, symbol: string): {
      error: string;
      message: string;
      symbol: string;
      source: string;
      timeout: boolean;
      status: number;
   } {
      const result = ApiClient.createErrorResponse(error, operation, 'Finnhub API', symbol);
      return {
         ...result,
         symbol: result.symbol || symbol
      };
   }

   /**
    * Create an API Ninjas-specific error response
    */
   static createApiNinjasErrorResponse(error: unknown, operation: string, symbol?: string): {
      error: string;
      message: string;
      symbol?: string;
      source: string;
      timeout: boolean;
      status: number;
   } {
      const result = ApiClient.createErrorResponse(error, operation, 'API Ninjas', symbol);
      return {
         ...result,
         symbol: result.symbol
      };
   }

   /**
    * Check if Finnhub API is available
    */
   isFinnhubAvailable(): boolean {
      return !!this.finnhubApiKey;
   }

   /**
    * Check if API Ninjas API is available
    */
   isApiNinjasAvailable(): boolean {
      return !!this.apiNinjasApiKey;
   }
}
