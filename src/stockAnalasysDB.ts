/**
 * Database manager for stock analysis data
 * Handles storage and retrieval of insider transactions and other stock data
 */

import { InsiderTransaction, Env } from './types';

export class StockAnalysisDB {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('StockAnalysisDB requires a valid API key');
    }
    this.apiKey = apiKey;
  }

  /**
   * Store an insider transaction in the database
   * @param env - Cloudflare Workers environment containing database binding
   * @param transaction - The insider transaction data to store
   * @throws Error if the transaction data is invalid or database operation fails
   */
  /**
   * Store S&P 500 tickers efficiently using chunked batch insert to avoid SQLite variable limits
   * @param env - Cloudflare Workers environment containing database binding
   * @param sp500Companies - S&P 500 companies data containing ticker information
   * @param clearExisting - Whether to clear existing data first (default: true)
   * @throws Error if the data is invalid or database operation fails
   */
  async storeSp500Tickers(env: Env, sp500Companies: any, clearExisting: boolean = true): Promise<void> {
    try {
      // Validate input data
      if (!sp500Companies || !sp500Companies.data || !Array.isArray(sp500Companies.data)) {
        throw new Error('Invalid S&P 500 data: expected array of companies');
      }

      // Extract unique tickers and validate them
      const tickers = sp500Companies.data
        .map((company: any) => company?.ticker?.trim())
        .filter((ticker: string) => ticker && typeof ticker === 'string')
        .filter((ticker: string, index: number, arr: string[]) => arr.indexOf(ticker) === index); // Remove duplicates

      if (tickers.length === 0) {
        throw new Error('No valid tickers found in S&P 500 data');
      }

      // Clear existing data if requested (must happen first)
      if (clearExisting) {
        console.log('Clearing existing S&P 500 tickers...');
        await env.stock_analysis.prepare('DELETE FROM sp500_tickers').run();
        console.log('Existing tickers cleared');
      }

      // Process tickers in chunks to avoid SQLite variable limit (max ~999 variables)
      const CHUNK_SIZE = 100; // Conservative chunk size
      const chunks = [];
      for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
        chunks.push(tickers.slice(i, i + CHUNK_SIZE));
      }

      // Process each chunk
      for (const chunk of chunks) {
        const placeholders = chunk.map(() => '(?)').join(', ');
        const values = chunk;

        if (clearExisting) {
          // Simple batch insert when clearing existing data
          await env.stock_analysis.prepare(`
            INSERT INTO sp500_tickers (ticker)
            VALUES ${placeholders}
          `).bind(...values).run();
        } else {
          // Use upsert logic when preserving existing data
          await env.stock_analysis.prepare(`
            INSERT OR IGNORE INTO sp500_tickers (ticker)
            VALUES ${placeholders}
          `).bind(...values).run();
        }
      }

      console.log(`Successfully stored ${tickers.length} S&P 500 tickers${clearExisting ? ' (cleared existing data)' : ' (preserved existing data)'}`);
    } catch (error) {
      console.error('Failed to store S&P 500 tickers:', error);
      throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store S&P 500 tickers with individual upsert for maximum compatibility
   * Use this version if the batch insert approach has issues with your D1 database
   * @param env - Cloudflare Workers environment containing database binding
   * @param sp500Companies - S&P 500 companies data containing ticker information
   * @throws Error if the data is invalid or database operation fails
   */
  async storeSp500TickersIndividual(env: Env, sp500Companies: any): Promise<void> {
    try {
      // Validate input data
      if (!sp500Companies || !sp500Companies.data || !Array.isArray(sp500Companies.data)) {
        throw new Error('Invalid S&P 500 data: expected array of companies');
      }

      // Extract unique tickers and validate them
      const tickers = sp500Companies.data
        .map((company: any) => company?.ticker?.trim())
        .filter((ticker: string) => ticker && typeof ticker === 'string')
        .filter((ticker: string, index: number, arr: string[]) => arr.indexOf(ticker) === index); // Remove duplicates

      if (tickers.length === 0) {
        throw new Error('No valid tickers found in S&P 500 data');
      }

      // Use individual upsert statements for maximum compatibility
      const upsertStatement = env.stock_analysis.prepare(`
        INSERT OR IGNORE INTO sp500_tickers (ticker)
        VALUES (?)
      `);

      // Process in smaller batches to avoid overwhelming the database
      const BATCH_SIZE = 50; // Process 50 tickers at a time
      const batches = [];
      for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
        batches.push(tickers.slice(i, i + BATCH_SIZE));
      }

      // Execute each batch in parallel, but limit concurrent operations
      for (const batch of batches) {
        const promises = batch.map((ticker: string) => upsertStatement.bind(ticker).run());
        await Promise.all(promises);
      }

      console.log(`Successfully stored ${tickers.length} S&P 500 tickers using individual upserts in ${batches.length} batches`);
    } catch (error) {
      console.error('Failed to store S&P 500 tickers:', error);
      throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve all stored S&P 500 tickers
   * @param env - Cloudflare Workers environment containing database binding
   * @returns Array of ticker strings
   */
  async getSp500Tickers(env: Env): Promise<string[]> {
    try {
      const result = await env.stock_analysis.prepare(`
        SELECT ticker FROM sp500_tickers
        ORDER BY ticker ASC
      `).all();

      return result.results.map((row: any) => row.ticker);
    } catch (error) {
      console.error('Failed to retrieve S&P 500 tickers:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a ticker exists in the S&P 500 list
   * @param env - Cloudflare Workers environment containing database binding
   * @param ticker - The ticker symbol to check
   * @returns Boolean indicating if the ticker exists
   */
  async isSp500Ticker(env: Env, ticker: string): Promise<boolean> {
    try {
      const result = await env.stock_analysis.prepare(`
        SELECT 1 FROM sp500_tickers WHERE ticker = ?
      `).bind(ticker).all();

      return result.results.length > 0;
    } catch (error) {
      console.error('Failed to check S&P 500 ticker:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async storeInsiderTransaction(env: Env, transaction: InsiderTransaction): Promise<void> {
    try {
      // Validate transaction data
      if (!transaction.symbol || !transaction.insiderName || !transaction.transactionDate || typeof transaction.shares !== 'number') {
        throw new Error('Invalid transaction data: missing required fields');
      }

      await env.stock_analysis.prepare(`
        INSERT INTO insider_transactions (symbol, insider_name, transaction_date, shares)
        VALUES (?, ?, ?, ?)
      `).bind(
        transaction.symbol,
        transaction.insiderName,
        transaction.transactionDate,
        transaction.shares
      ).run();
    } catch (error) {
      console.error('Failed to store insider transaction:', error);
      throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve insider transactions for a specific symbol
   * @param env - Cloudflare Workers environment containing database binding
   * @param symbol - Stock symbol to query
   * @returns Array of insider transactions
   */
  async getInsiderTransactions(env: Env, symbol: string): Promise<InsiderTransaction[]> {
    try {
      const result = await env.stock_analysis.prepare(`
        SELECT symbol, insider_name as insiderName, transaction_date as transactionDate, shares
        FROM insider_transactions
        WHERE symbol = ?
        ORDER BY transaction_date DESC
      `).bind(symbol).all();

      return result.results as InsiderTransaction[];
    } catch (error) {
      console.error('Failed to retrieve insider transactions:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all insider transactions
   * @param env - Cloudflare Workers environment containing database binding
   * @param limit - Maximum number of transactions to return (default: 100)
   * @returns Array of insider transactions
   */
  async getAllInsiderTransactions(env: Env, limit: number = 100): Promise<InsiderTransaction[]> {
    try {
      const result = await env.stock_analysis.prepare(`
        SELECT symbol, insider_name as insiderName, transaction_date as transactionDate, shares
        FROM insider_transactions
        ORDER BY transaction_date DESC
        LIMIT ?
      `).bind(limit).all();

      return result.results as InsiderTransaction[];
    } catch (error) {
      console.error('Failed to retrieve all insider transactions:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}