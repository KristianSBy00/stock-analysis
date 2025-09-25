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
