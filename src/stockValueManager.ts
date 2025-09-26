
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
   private serverConnection: WebSocket | null = null;
   private listeners: StockValueListener[] = [];

   public constructor(finnhubApiKey: string) {
      this.serverConnection = new WebSocket(`wss://ws.finnhub.io?token=${finnhubApiKey}`);
      console.log("connecting to finnhub");

      this.serverConnection.onopen = () => {
         console.log("connected to finnhub");
      };

      this.serverConnection.onmessage = (event) => {
         console.log("Received from Finnhub:", event.data);

         // Forward message to all connected clients
         this.listeners.forEach(listener => {
            if (listener.connection.readyState === WebSocket.OPEN) {
               listener.connection.send(event.data);
            }
         });
      };

      this.serverConnection.onerror = (error) => {
         console.error("Finnhub WebSocket error:", error);
      };

      this.serverConnection.onclose = () => {
         console.log("Finnhub WebSocket connection closed");
      };
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
      ws.onclose = () => {
         console.log("Client WebSocket closed");
         this.removeListener(ws);
      };

      ws.onerror = (error) => {
         console.error("Client WebSocket error:", error);
      };

      if (!this.serverConnection) {
         return;
      }

      // Subscribe to the first interest (you might want to handle multiple)
      this.serverConnection.send(JSON.stringify({
         type: "subscribe",
         symbol: interests[0],
      }));
   }

   private removeListener(ws: WebSocket) {
      this.listeners = this.listeners.filter(listener => listener.connection !== ws);
   }
}
