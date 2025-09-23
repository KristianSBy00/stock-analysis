/**
 * ApiNinjasClient - A dedicated class for handling all API Ninjas API interactions
 * Provides timeout protection and consistent error handling for all API Ninjas endpoints
 */

import { 
  ApiNinjasSp500Item, 
  ApiNinjasSp500Response, 
  ApiNinjasStockQuote, 
  ApiNinjasCompanyProfile, 
  DateRange,
  ApiErrorResponse 
} from './types';

export class ApiNinjasClient {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.api-ninjas.com/v1';
  private readonly timeoutMs: number = 10000; // 10 seconds

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ApiNinjasClient requires a valid API key');
    }
    this.apiKey = apiKey;
  }

  /**
   * Makes a request to API Ninjas with timeout protection
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': this.apiKey
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

  /**
   * Get S&P 500 companies list
   */
  async getSp500(): Promise<ApiNinjasSp500Response> {
    const endpoint = '/sp500';
    const data = await this.makeRequest<ApiNinjasSp500Item[]>(endpoint);
    return {
      data: Array.isArray(data) ? data : [],
      count: Array.isArray(data) ? data.length : 0
    };
  }

  /**
   * Get stock quote for a symbol
   */
  async getQuote(symbol: string): Promise<ApiNinjasStockQuote> {
    const endpoint = `/stock?symbol=${encodeURIComponent(symbol.toUpperCase())}`;
    return this.makeRequest<ApiNinjasStockQuote>(endpoint);
  }

  /**
   * Get company profile for a symbol
   */
  async getCompanyProfile(symbol: string): Promise<ApiNinjasCompanyProfile> {
    const endpoint = `/stock?symbol=${encodeURIComponent(symbol.toUpperCase())}&profile=true`;
    return this.makeRequest<ApiNinjasCompanyProfile>(endpoint);
  }

  /**
   * Get stock price history for a symbol
   */
  async getPriceHistory(symbol: string, range?: DateRange): Promise<any> {
    const toDate = range?.to ?? new Date().toISOString().slice(0, 10);
    const fromDate = range?.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    const endpoint = `/stock?symbol=${encodeURIComponent(symbol.toUpperCase())}&from=${fromDate}&to=${toDate}`;
    return this.makeRequest<any>(endpoint);
  }

  /**
   * Get market sectors performance
   */
  async getSectors(): Promise<any> {
    const endpoint = '/sectors';
    return this.makeRequest<any>(endpoint);
  }

  /**
   * Get market indices
   */
  async getIndices(): Promise<any> {
    const endpoint = '/indices';
    return this.makeRequest<any>(endpoint);
  }

  /**
   * Check if an error is a timeout error
   */
  static isTimeoutError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  /**
   * Create a standardized error response for API Ninjas errors
   */
  static createErrorResponse(error: unknown, operation: string, symbol?: string): {
    error: string;
    message: string;
    symbol?: string;
    source: string;
    timeout: boolean;
    status: number;
  } {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = ApiNinjasClient.isTimeoutError(error);
    
    console.error(`Error in ApiNinjasClient.${operation}:`, {
      symbol: symbol?.toUpperCase(),
      error: errorMessage,
      isTimeout,
      timestamp: new Date().toISOString()
    });
    
    return {
      error: isTimeout ? 'Request timeout' : `Failed to ${operation} from API Ninjas`,
      message: isTimeout ? 'The request took too long to complete' : errorMessage,
      symbol: symbol?.toUpperCase(),
      source: 'API Ninjas',
      timeout: isTimeout,
      status: isTimeout ? 408 : 500
    };
  }
}