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

   public async start(interval: number){
      // Start the stock value manager
      setInterval(this.uppdateStockValues.bind(this), interval);
   }

   private async uppdateStockValues(){
      const stocks: StockValue[] = [];

      let out: any[];

      for (const listener of this.listeners) {

         out = [];

         for (const interest of listener.interests) {

            out.push({stock: interest, value: null});

            for (const stock of stocks) {
               if(stock.symbol === interest) {
                  out[out.length - 1].value = stock.price;
               }
               else{
                  const stockValue: YahooFinanceQuote = await this.apiClient.getQuote(interest) as YahooFinanceQuote;
                  out[out.length - 1].price = stockValue.price;
               }
            }
         }

         this.sendToClient(listener.ws, out);
      }
      return stocks;
   }

   addInterest(ws: WebSocket, interests: string) {
      for (const listener of this.listeners) {
         if (listener.ws === ws) {
            listener.interests.push(interests);
            return;
         }
      }
   }


   public addListener(ws: WebSocket, interests: string[]) {
      this.listeners.push({ws, interests});
   }

   public removeListener(ws: WebSocket) {
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
