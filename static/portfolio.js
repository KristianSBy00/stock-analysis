var myTickers = [];

window.onload = async function () {
   const data = await getPortfolioHoldings();

   const searchParams = new URLSearchParams(window.location.search);
   const portfolioId = searchParams.get('id');
   console.log(portfolioId);

   var out = '<table class="table table-striped">';
   out += '<thead>';
   out += '<tr>';
   out += '<th scope="col">Symbol</th>';
   out += '<th scope="col">Quantity</th>';
   out += '<th scope="col">Value</th>';
   out += '<th scope="col"></th>';
   out += '</tr>';
   out += '</thead>';
   out += '<tbody>';
   for (const holding of data.holdings) {
      myTickers.push(holding.symbol);
      console.log(holding.symbol);
      out += `<tr>`;
      out += `<td>${holding.symbol}</td>`;
      out += `<td>${holding.quantity}</td>`;
      out += `<td><div id="value-${holding.symbol}">${holding.currentPrice}</div></td>`;
      out += `<td><button class="btn btn-danger" onclick="deleteHolding(${holding.id})">Sell All</button></td>`;
      out += '</tr>';
   };
   out += '</tbody>';
   out += '</table>';
   document.getElementById('portfolioHoldingsTableId').innerHTML = out;
   console.log("asking for values");


   const wsUri = "/ws/stock-prices";
   const websocket = new WebSocket(wsUri);

   websocket.addEventListener("open", () => {
      msg = {'type': 'subscribe', 'symbols': data.holdings.map(holding => holding.symbol)};
      websocket.send(JSON.stringify(msg));
      console.log("CONNECTED");
   });

   websocket.addEventListener("message", (event) => {
      console.log(event.data);
      const data = JSON.parse(event.data);

      console.log(data);

      if (data.type === 'price_update') {
         const symbol = data.symbol;
         const price = data.price;
         document.getElementById(`value-${symbol}`).innerHTML = price;
      }
   });

};

async function getPortfolioHoldings() {
   const token = localStorage.getItem('authToken');
   const searchParams = new URLSearchParams(window.location.search);
   const portfolioId = searchParams.get('id');
   console.log(portfolioId);
   const response = await fetch(`/api/portfolios/${portfolioId}/holdings`, {
      method: 'GET',
      headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
      }
   });


   const data = await response.json();
   console.log(data);

   return data;
}


async function deleteHolding(id) {
   const token = localStorage.getItem('authToken');
   const searchParams = new URLSearchParams(window.location.search);
   const portfolioId = searchParams.get('id');
   const response = await fetch(`/api/portfolios/${portfolioId}/holdings/${id}`, {
      method: 'DELETE',
      headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
      }
   });
}

async function getStockValues() {
   var url = '/api/yahoo-stocks?symbols=';
   for (const ticker of myTickers) {
      url += ticker + ',';
   }
   url = url.slice(0, -1);
   console.log(url);
   const response = await fetch(url, {
      method: 'GET',
      headers: {
         'Content-Type': 'application/json',
      }
   });
   const data = await response.json();
   console.log(data);
   return data;
}
