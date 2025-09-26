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
      out += `<tr>`;
      out += `<td>${holding.symbol}</td>`;
      out += `<td>${holding.quantity}</td>`;
      out += `<td>${holding.value}</td>`;
      out += `<td><button class="btn btn-danger" onclick="deleteHolding(${holding.id})">Sell All</button></td>`;
      out += '</tr>';
   };
   out += '</tbody>';
   out += '</table>';
   document.getElementById('portfolioHoldingsTableId').innerHTML = out;

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
