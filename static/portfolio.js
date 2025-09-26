window.onload = async function () {
   const data = await getPortfolioHoldings();
   document.getElementById('prtfolioTextId').innerHTML = 'Portfolio ' + JSON.stringify(data) + '!';
};

async function getPortfolioHoldings() {
   const token = localStorage.getItem('authToken');
   const searchParams = new URLSearchParams(window.location.search);
   const portfolioId = searchParams.get('portfolio-id');
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
