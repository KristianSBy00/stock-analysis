
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
   private serverSocket: WebSocket;

   public constructor(finnhubApiKey: string) {
      this.finnhubApiKey = finnhubApiKey;
      console.log("StockValueManager initialized");

      this.serverSocket = new WebSocket('wss://ws.finnhub.io?token=' + this.finnhubApiKey);
      this.serverSocket.addEventListener('open', function (event) {
         console.log("Server WebSocket opened");
      });
      this.serverSocket.addEventListener('message', function (event) {
         console.log("Server WebSocket message:", event.data);
      });


      this.serverSocket.addEventListener('error', function (event) {
         console.error("Server WebSocket error:", event);
      });

      this.serverSocket.send(JSON.stringify({ 'type': 'subscribe-pr', 'symbol': 'BINANCE:BTCUSDT' }))

   }

   public addListener(ws: WebSocket, interests: string[]) {
      

      // Start sending mock data for testing
      //this.startMockDataStream(ws, interests[0]);
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
