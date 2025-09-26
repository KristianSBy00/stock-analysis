function hello_world() {
   console.log("Hello World");
}

async function login() {
   const email = document.getElementById('emailId').value;
   const password = document.getElementById('passwordId').value;
   const response = await fetch(`/auth/login`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
   });

   const data = await response.json();

   if (!response.ok) {
      throw new Error(data.message || 'Login failed');
   }

   if (data.token) {
      localStorage.setItem('authToken', data.token);
   }

   console.log(data);
}

async function whoami() {
   const token = localStorage.getItem('authToken');

   const response = await fetch(`/auth/me`, {
      method: 'GET',
      headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
      }
   });

   const data = await response.json();

   if (!response.ok) {
      throw new Error(data.message || 'Login failed');
   }

   console.log(data);
}

async function getPortfolios() {
   const token = localStorage.getItem('authToken');
   const response = await fetch(`/api/portfolios`, {
      method: 'GET',
      headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
      }
   });

   const data = await response.json();
   console.log(data);
}

async function addCompanyToPortfolio() {
   const token = localStorage.getItem('authToken');
   const portfolioId = document.getElementById('portfolioId').value;
   const symbol = document.getElementById('symbolId').value;
   const quantity = document.getElementById('quantityId').value;
   const response = await fetch(`/api/portfolios/${portfolioId}/holdings`, {
      method: 'POST',
      headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         symbol: symbol,
         quantity: quantity,
      }),
   });

   const data = await response.json();
   console.log(data);
}

async function getPortfolioHoldings() {
   const token = localStorage.getItem('authToken');
   const portfolioId = document.getElementById('portfolioId').value;
   const response = await fetch(`/api/portfolios/${portfolioId}/holdings`, {
      method: 'GET',
      headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
      }
   });

   const data = await response.json();
   console.log(data);

   var totalValue = 0;

   for (const holding of data.holdings) {
      const stockValue = await getStockValue(holding.symbol) * holding.quantity;
      console.log(stockValue);
      totalValue += stockValue;
   }

   console.log(totalValue);
}


async function getStockValue(stockTicker) {
   const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${stockTicker}`, {
      method: 'GET',
      headers: {
         'Content-Type': 'application/json',
      }
   });

   const data = await response.json();
   return data.chart.result[0].meta.regularMarketPrice;
}
