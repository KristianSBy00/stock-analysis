/**
 * Centralized type definitions for the stock analysis application
 * All interfaces and types should be defined here to avoid duplication
 */

// ============================================================================
// Database Types
// ============================================================================

declare global {
   interface D1Database {
      prepare(query: string): D1PreparedStatement;
   }
   
   interface D1PreparedStatement {
      bind(...values: any[]): D1PreparedStatement;
      run(): Promise<D1Result>;
      all(): Promise<D1Result>;
   }
   
   interface D1Result {
      results: any[];
      success: boolean;
      meta: any;
   }
}

export interface InsiderTransaction {
   symbol: string;
   insiderName: string;
   transactionDate: string;
   shares: number;
}

export interface Env {
   stock_analysis: D1Database;  
   ASSETS?: any;
   FINNHUB_API_KEY?: string;
   API_NINJAS_API_KEY?: string;
   RESEND_API_KEY?: string;
   MY_GMAIL_ADDRESS?: string;
   ENVIRONMENT?: string;
}

// ============================================================================
// Common Types
// ============================================================================

export interface DateRange {
   from?: string | null;
   to?: string | null;
}

// ============================================================================
// API Ninjas Types
// ============================================================================

export interface ApiNinjasSp500Item {
   ticker?: string;
   name?: string;
   sector?: string;
   industry?: string;
   market_cap?: number;
   price?: number;
   change?: number;
   change_percent?: number;
   volume?: number;
   last_updated?: string;
}

export interface ApiNinjasSp500Response {
   data?: ApiNinjasSp500Item[];
   count?: number;
}

export interface ApiNinjasStockQuote {
   symbol?: string;
   name?: string;
   price?: number;
   change?: number;
   change_percent?: number;
   volume?: number;
   market_cap?: number;
   sector?: string;
   industry?: string;
   last_updated?: string;
}

export interface ApiNinjasCompanyProfile {
   symbol?: string;
   name?: string;
   country?: string;
   industry?: string;
   sector?: string;
   market_cap?: number;
   employees?: number;
   website?: string;
   description?: string;
   ceo?: string;
   address?: string;
   city?: string;
   state?: string;
   zip?: string;
   phone?: string;
   fax?: string;
   logo?: string;
   exchange?: string;
   currency?: string;
}

// ============================================================================
// Finnhub Types
// ============================================================================

export interface FinnhubQuote {
   c?: number; // current price
   d?: number; // change
   dp?: number; // percent change
   h?: number; // high
   l?: number; // low
   o?: number; // open
   pc?: number; // previous close
   t?: number; // timestamp
}

export interface FinnhubNewsItem {
   category?: string;
   datetime?: number;
   headline?: string;
   id?: number;
   image?: string;
   related?: string;
   source?: string;
   summary?: string;
   url?: string;
}

export interface FinnhubInsiderTransaction {
   symbol?: string;
   name?: string;
   share?: number;
   change?: number;
   filer?: string;
   filingDate?: string; // YYYY-MM-DD
   transactionDate?: string; // YYYY-MM-DD
   transactionCode?: string; // e.g., P (Purchase), S (Sale)
   transactionPrice?: number;
   total?: number; // total value
   type?: string; // Officer/Director
}

export interface FinnhubInsiderTransactionsResponse {
   symbol?: string;
   data?: FinnhubInsiderTransaction[];
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface ApiErrorResponse {
   error: string;
   message: string;
   symbol?: string;
   source: string;
   timeout: boolean;
   status: number;
}