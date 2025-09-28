
interface StockValue {
   symbol: string;
   value: number;
}

interface StockValueListener {
   connection: WebSocket;
   stockValues: StockValue[];
}

export enum StockValueEventType {
   CONNECTED,
   DISCONNECTED,
   STOCK_VALUE_CHANGED
}

export class StockValueManager {
   private static instance: StockValueManager;
   private listeners: StockValueListener[] = [];
   private finnhubApiKey: string;

   public constructor(finnhubApiKey: string) {
      this.finnhubApiKey = finnhubApiKey;
      console.log("StockValueManager initialized");
   }

   public addListener(ws: WebSocket, interests: string[]) {
      const listener: StockValueListener = {
         connection: ws,
         stockValues: [],
      };
      this.listeners.push(listener);
      console.log("added listener");
      console.log(this.listeners);

      // Set up client WebSocket event handlers
      ws.addEventListener("close", () => {
         console.log("Client WebSocket closed");
         this.removeListener(ws);
      });

      ws.addEventListener("error", (error) => {
         console.error("Client WebSocket error:", error);
      });

      // Send a welcome message
      this.sendToClient(ws, {
         type: "connected",
         message: "Connected to stock value stream",
         symbol: interests[0] || "BINANCE:BTCUSDT"
      });

      // Start sending mock data for testing
      this.startMockDataStream(ws, interests[0] || "BINANCE:BTCUSDT");
   }

   private removeListener(ws: WebSocket) {
      this.listeners = this.listeners.filter(listener => listener.connection !== ws);
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

   private startMockDataStream(ws: WebSocket, symbol: string) {
      // Send mock stock data every 5 seconds
      const interval = setInterval(() => {
         if (ws.readyState === WebSocket.OPEN) {
            const mockData = {
               type: "trade",
               data: [{
                  s: symbol,
                  p: (Math.random() * 100000 + 50000).toFixed(2),
                  v: Math.floor(Math.random() * 1000) + 1,
                  t: Date.now()
               }]
            };
            this.sendToClient(ws, mockData);
         } else {
            clearInterval(interval);
         }
      }, 5000);

      // Clean up interval when WebSocket closes
      ws.addEventListener("close", () => {
         clearInterval(interval);
      });
   }
}
