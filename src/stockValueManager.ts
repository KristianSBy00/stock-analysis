
interface StockValue {
   symbol: string;
   value: number;
}

interface StockValueListener {
   connection: WebSocket;
   stockValues: StockValue[];
}


export class StockValueManager {
   private static instance: StockValueManager;


   private listeners: StockValueListener[] = [];

   private constructor() {
      // Private constructor to prevent instantiation
   }
}
