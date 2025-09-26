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
      first(): Promise<any>;
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
   SEC_API_KEY?: string;
   JWT_SECRET?: string;
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
// Yahoo Finance Types
// ============================================================================

export interface YahooFinanceQuote {
   symbol: string;
   name: string;
   price: number;
   change: number;
   changePercent: number;
   volume: number;
   marketCap: number;
   currency: string;
   exchange: string;
   lastUpdated: string;
   source: string;
}

export interface YahooFinanceChartData {
   chart: {
      result: Array<{
         meta: {
            symbol: string;
            longName?: string;
            shortName?: string;
            regularMarketPrice?: number;
            previousClose?: number;
            regularMarketVolume?: number;
            marketCap?: number;
            currency?: string;
            exchangeName?: string;
            regularMarketTime?: number;
         };
      }>;
   };
}

export interface DividendData {
   date: string;
   amount: number;
   currency: string;
}

export interface Portfolio {
   id: number;
   userId: number;
   portfolioName: string;
   description?: string;
   createdAt: string;
   updatedAt: string;
   holdings: PortfolioHolding[];
}

export interface YahooFinanceDividendResponse {
   symbol: string;
   name: string;
   currency: string;
   dividends: DividendData[];
   totalDividends: number;
   averageDividend: number;
   lastDividendDate?: string;
   nextDividendDate?: string;
   dividendYield?: number;
   source: string;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface User {
   id: number;
   email: string;
   firstName?: string;
   lastName?: string;
   isActive: boolean;
   emailVerified: boolean;
   createdAt: string;
   updatedAt: string;
   lastLogin?: string;
}

export interface UserSession {
   id: number;
   userId: number;
   tokenId: string;
   expiresAt: string;
   createdAt: string;
   isRevoked: boolean;
   userAgent?: string;
   ipAddress?: string;
}

export interface LoginRequest {
   email: string;
   password: string;
}

export interface RegisterRequest {
   email: string;
   password: string;
   firstName?: string;
   lastName?: string;
}

export interface AuthResponse {
   success: boolean;
   user?: User;
   token?: string;
   message?: string;
   expiresAt?: string;
}

export interface PasswordResetRequest {
   email: string;
}

export interface PasswordResetConfirmRequest {
   token: string;
   newPassword: string;
}

export interface EmailVerificationRequest {
   token: string;
}

export interface JWTPayload {
   sub: number; // user ID
   email: string;
   jti: string; // JWT ID for session management
   iat: number; // issued at
   exp: number; // expires at
   type: 'access' | 'refresh';
}

export interface AuthContext {
   user: User;
   session: UserSession;
   isAuthenticated: boolean;
}

// ============================================================================
// Portfolio Types
// ============================================================================

export interface UserPortfolio {
   id: number;
   userId: number;
   portfolioName: string;
   description?: string;
   createdAt: string;
   updatedAt: string;
}

export interface PortfolioHolding {
   id: number;
   portfolioId: number;
   symbol: string;
   quantity: number;
   averageCost: number;
   totalCost: number;
   currentPrice?: number;
   currentValue?: number;
   unrealizedGainLoss?: number;
   unrealizedGainLossPercent?: number;
   lastUpdated: string;
   createdAt: string;
}

export interface PortfolioTransaction {
   id: number;
   portfolioId: number;
   symbol: string;
   transactionType: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT';
   quantity: number; // Positive for BUY, negative for SELL
   pricePerShare: number;
   totalAmount: number;
   fees: number;
   transactionDate: string; // YYYY-MM-DD format
   notes?: string;
   createdAt: string;
}

export interface PortfolioSummary {
   portfolio: UserPortfolio;
   holdings: PortfolioHolding[];
   totalValue: number;
   totalCost: number;
   totalGainLoss: number;
   totalGainLossPercent: number;
   lastUpdated: string;
}

export interface CreatePortfolioRequest {
   userId: string;
   portfolioName: string;
   description?: string;
   isDefault?: boolean;
}

export interface AddTransactionRequest {
   portfolioId: number;
   symbol: string;
   transactionType: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT';
   quantity: number;
   pricePerShare: number;
   fees?: number;
   transactionDate: string;
   notes?: string;
}

export interface UpdateHoldingRequest {
   portfolioId: number;
   symbol: string;
   currentPrice: number;
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
