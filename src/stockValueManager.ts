import { ApiClient } from './apiClient';

import { YahooFinanceQuote } from './types';

interface StockValue {
   symbol: string;
   price: number;
}


export enum StockValueEventType {
   CONNECTED,
   DISCONNECTED,
   STOCK_VALUE_CHANGED
}

interface StockValueListener {
   ws: WebSocket;
   interests: string[];
}

export class StockValueManager {
   private static instance: StockValueManager;
   private listeners: StockValueListener[] = [];
   private apiClient: ApiClient;

   public constructor() {
      this.apiClient = new ApiClient({});
   }

   public start(interval: number) {
      console.log(`[StockValueManager] Starting update interval: ${interval}ms`);
      // Start the stock value manager update loop
      setInterval(() => {
         this.uppdateStockValues().catch(error => {
            console.error('[StockValueManager] Error in update loop:', error);
         });
      }, interval);
   }

   private async uppdateStockValues() {
      console.log(`[StockValueManager] Updating stock values for ${this.listeners.length} listeners`);

      // Cache to avoid fetching the same stock multiple times
      const stockCache: Map<string, StockValue> = new Map();

      for (const listener of this.listeners) {
         if (listener.interests.length === 0) {
            console.log(`[StockValueManager] Listener has no interests, skipping`);
            continue;
         }

         const updates: any[] = [];

         for (const symbol of listener.interests) {
            try {
               let stockValue: StockValue;

               // Check cache first
               if (stockCache.has(symbol)) {
                  stockValue = stockCache.get(symbol)!;
                  console.log(`[StockValueManager] Using cached value for ${symbol}: ${stockValue.price}`);
               } else {
                  // Fetch from API
                  console.log(`[StockValueManager] Fetching quote for ${symbol}`);
                  const quoteData: YahooFinanceQuote = await this.apiClient.getQuote(symbol) as YahooFinanceQuote;
                  stockValue = {
                     symbol: symbol,
                     price: quoteData.price || 0
                  };
                  stockCache.set(symbol, stockValue);
               }

               updates.push({
                  type: 'price_update',
                  symbol: stockValue.symbol,
                  price: stockValue.price,
                  timestamp: new Date().toISOString()
               });
            } catch (error) {
               console.error(`[StockValueManager] Error fetching ${symbol}:`, error);
               updates.push({
                  type: 'error',
                  symbol: symbol,
                  message: 'Failed to fetch price',
                  timestamp: new Date().toISOString()
               });
            }
         }

         if (updates.length > 0) {
            this.sendToClient(listener.ws, updates);
         }
      }
   }

   addInterest(ws: WebSocket, symbol: string) {
      console.log(`[StockValueManager] Adding interest for ${symbol}`);
      for (const listener of this.listeners) {
         if (listener.ws === ws) {
            if (!listener.interests.includes(symbol)) {
               listener.interests.push(symbol);
               console.log(`[StockValueManager] Interest added. Total interests: ${listener.interests.length}`);
            }
            return;
         }
      }
   }

   public removeInterest(ws: WebSocket, symbol: string) {
      console.log(`[StockValueManager] Removing interest for ${symbol}`);
      for (const listener of this.listeners) {
         if (listener.ws === ws) {
            listener.interests = listener.interests.filter(interest => interest !== symbol);
            console.log(`[StockValueManager] Interest removed. Total interests: ${listener.interests.length}`);
            return;
         }
      }
   }

   public addListener(ws: WebSocket, interests: string[]) {
      console.log(`[StockValueManager] Adding listener with ${interests.length} interests`);
      this.listeners.push({ ws, interests });
   }

   public removeListener(ws: WebSocket) {
      console.log(`[StockValueManager] Removing listener`);
      this.listeners = this.listeners.filter(listener => listener.ws !== ws);
   }


   private sendToClient(ws: WebSocket, data: any) {
      try {
         // Check if WebSocket is open and ready to send
         if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
         } else {
            console.log(`WebSocket not ready, state: ${ws.readyState}`);
         }
      } catch (error) {
         console.error("Error sending data to client:", error);
      }
   }
}
