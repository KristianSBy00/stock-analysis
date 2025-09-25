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
   YahooFinanceQuote,
   YahooFinanceChartData,
   YahooFinanceDividendResponse,
   DividendData,
   DateRange,
   ApiErrorResponse
} from './types';

export enum ApiProvider {
   FINNHUB = 'finnhub',
   API_NINJAS = 'api_ninjas',
   YAHOO_FINANCE = 'yahoo_finance'
}

export interface ApiClientConfig {
   finnhubApiKey?: string;
   apiNinjasApiKey?: string;
   secApiKey?: string;
   timeoutMs?: number;
}

export class ApiClient {
   private readonly finnhubApiKey?: string;
   private readonly apiNinjasApiKey?: string;
   private readonly secApiKey?: string;
   private readonly timeoutMs: number;

   // API Base URLs
   private readonly finnhubBaseUrl = 'https://finnhub.io/api/v1';
   private readonly apiNinjasBaseUrl = 'https://api.api-ninjas.com/v1';
   private readonly secApiBaseUrl = 'https://sec-api.io/';
   private readonly yahooFinanceBaseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';

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
   // YAHOO FINANCE API METHODS
   // ============================================================================

   /**
    * Makes a request to Yahoo Finance API with timeout protection
    */
   private async makeYahooFinanceRequest<T>(endpoint: string): Promise<T> {
      const url = `${this.yahooFinanceBaseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
         const response = await fetch(url, {
            signal: controller.signal,
            headers: {
               'Accept': 'application/json',
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
         });

         clearTimeout(timeoutId);

         if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
         }

         return await response.json() as T;
      } catch (error) {
         clearTimeout(timeoutId);
         throw error;
      }
   }

   /**
    * Get stock quote from Yahoo Finance
    */
   async getYahooFinanceQuote(symbol: string): Promise<YahooFinanceQuote> {
      const endpoint = `/${symbol.toUpperCase()}`;
      const data = await this.makeYahooFinanceRequest<YahooFinanceChartData>(endpoint);

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

      const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose ? (change / previousClose) * 100 : 0;

      return {
         symbol: meta.symbol || symbol.toUpperCase(),
         name: meta.longName || meta.shortName || `${symbol.toUpperCase()} Corporation`,
         price: currentPrice,
         change: change,
         changePercent: changePercent,
         volume: meta.regularMarketVolume || 0,
         marketCap: meta.marketCap || 0,
         currency: meta.currency || 'USD',
         exchange: meta.exchangeName || 'Unknown',
         lastUpdated: meta.regularMarketTime ?
            new Date(meta.regularMarketTime * 1000).toISOString() :
            new Date().toISOString(),
         source: 'Yahoo Finance'
      };
   }

   /**
    * Get dividend history from Yahoo Finance
    */
   async getYahooFinanceDividends(symbol: string, range?: DateRange): Promise<YahooFinanceDividendResponse> {
      const toDate = range?.to ? new Date(range.to).getTime() / 1000 : Math.floor(Date.now() / 1000);
      const fromDate = range?.from ? new Date(range.from).getTime() / 1000 : Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);

      const endpoint = `/${symbol.toUpperCase()}?period1=${fromDate}&period2=${toDate}&interval=1d&events=div&includeAdjustedClose=true`;

      try {
         const response = await this.makeYahooFinanceRequest<{ dividends: DividendData[] }>(endpoint);

         // Parse CSV response from Yahoo Finance
         const csvData = await this.parseYahooFinanceDividendCSV(response);

         return this.processDividendData(symbol, csvData);
      } catch (error) {
         // If the direct API fails, try the CSV download approach
         return this.getYahooFinanceDividendsCSV(symbol, range);
      }
   }

   /**
    * Get dividend history from Yahoo Finance using CSV download
    */
   private async getYahooFinanceDividendsCSV(symbol: string, range?: DateRange): Promise<YahooFinanceDividendResponse> {
      const toDate = range?.to ? new Date(range.to).getTime() / 1000 : Math.floor(Date.now() / 1000);
      const fromDate = range?.from ? new Date(range.from).getTime() / 1000 : Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);

      const url = `${this.yahooFinanceBaseUrl}/${symbol.toUpperCase()}?period1=${fromDate}&period2=${toDate}&interval=1d&events=div&includeAdjustedClose=true`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
         const response = await fetch(url, {
            signal: controller.signal,
            headers: {
               'Accept': 'text/csv',
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
         });

         clearTimeout(timeoutId);

         if (!response.ok) {
            throw new Error(`Yahoo Finance dividend API error: ${response.status} ${response.statusText}`);
         }

         const csvText = await response.text();
         const dividendData = this.parseDividendCSV(csvText);

         return this.processDividendData(symbol, dividendData);
      } catch (error) {
         clearTimeout(timeoutId);
         throw error;
      }
   }

   /**
    * Parse dividend CSV data from Yahoo Finance
    */
   private parseDividendCSV(csvText: string): DividendData[] {
      const lines = csvText.split('\n');
      const dividends: DividendData[] = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
         const line = lines[i].trim();
         if (!line) continue;

         const columns = line.split(',');
         if (columns.length >= 7) {
            const date = columns[0];
            const dividendAmount = parseFloat(columns[6]); // Dividends column
            const currency = 'USD'; // Default currency

            if (!isNaN(dividendAmount) && dividendAmount > 0) {
               dividends.push({
                  date: date,
                  amount: dividendAmount,
                  currency: currency
               });
            }
         }
      }

      return dividends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   }

   /**
    * Parse dividend data from Yahoo Finance API response
    */
   private parseYahooFinanceDividendCSV(response: any): DividendData[] {
      // This method would handle the case where Yahoo Finance returns structured data
      // For now, we'll return an empty array as the CSV approach is more reliable
      return [];
   }

   /**
    * Process dividend data and calculate statistics
    */
   private processDividendData(symbol: string, dividends: DividendData[]): YahooFinanceDividendResponse {
      const totalDividends = dividends.reduce((sum, div) => sum + div.amount, 0);
      const averageDividend = dividends.length > 0 ? totalDividends / dividends.length : 0;
      const lastDividendDate = dividends.length > 0 ? dividends[0].date : undefined;
      const currency = dividends.length > 0 ? dividends[0].currency : 'USD';

      return {
         symbol: symbol.toUpperCase(),
         name: `${symbol.toUpperCase()} Corporation`,
         currency: currency,
         dividends: dividends,
         totalDividends: totalDividends,
         averageDividend: averageDividend,
         lastDividendDate: lastDividendDate,
         source: 'Yahoo Finance'
      };
   }

   /**
    * Convert date string to Unix timestamp
    */
   private static dateToUnixTimestamp(dateString: string): number {
      return Math.floor(new Date(dateString).getTime() / 1000);
   }

   /**
    * Convert Unix timestamp to ISO date string
    */
   private static unixTimestampToDate(timestamp: number): string {
      return new Date(timestamp * 1000).toISOString().split('T')[0];
   }

   // ============================================================================
   // UNIFIED METHODS (with provider selection)
   // ============================================================================

   /**
    * Get quote from specified provider (defaults to Finnhub if available, otherwise API Ninjas, then Yahoo Finance)
    */
   async getQuote(symbol: string, provider?: ApiProvider): Promise<FinnhubQuote | ApiNinjasStockQuote | YahooFinanceQuote> {
      if (provider === ApiProvider.YAHOO_FINANCE) {
         return this.getYahooFinanceQuote(symbol);
      } else if (provider === ApiProvider.API_NINJAS || (!this.finnhubApiKey && this.apiNinjasApiKey)) {
         return this.getApiNinjasQuote(symbol);
      } else if (provider === ApiProvider.FINNHUB || this.finnhubApiKey) {
         return this.getFinnhubQuote(symbol);
      } else {
         // Fallback to Yahoo Finance if no other providers are available
         return this.getYahooFinanceQuote(symbol);
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

   /**
    * Check if Yahoo Finance API is available (always true as it doesn't require API key)
    */
   isYahooFinanceAvailable(): boolean {
      return true;
   }

   /**
    * Create a Yahoo Finance-specific error response
    */
   static createYahooFinanceErrorResponse(error: unknown, operation: string, symbol: string): {
      error: string;
      message: string;
      symbol: string;
      source: string;
      timeout: boolean;
      status: number;
   } {
      const result = ApiClient.createErrorResponse(error, operation, 'Yahoo Finance', symbol);
      return {
         ...result,
         symbol: result.symbol || symbol
      };
   }
}
