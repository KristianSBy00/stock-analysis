
interface StockValue {
   symbol: string;
   value: number;
}


export enum StockValueEventType {
   CONNECTED,
   DISCONNECTED,
   STOCK_VALUE_CHANGED
}

export class StockValueManager {
   private static instance: StockValueManager;
   private finnhubApiKey: string;

   private listeners: Map<WebSocket, string[]> = new Map();
   private stocksToTrack: string[] = [];

   public constructor(finnhubApiKey: string) {
      this.finnhubApiKey = finnhubApiKey;
      console.log("StockValueManager initialized");
   }

   public async start(interval: number){
      // Start the stock value manager
      setInterval(this.uppdateStockValues.bind(this), interval);
   }

   private uppdateStockValues(){
      const stocks = new Map<string, number>();

      this.listeners.forEach((ws, interests) => {

         let out = {};
      });
   }


   public addListener(ws: WebSocket, interests: string[]) {
      return;
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
