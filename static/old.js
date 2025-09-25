/**
 * Authentication Manager
 * Handles API communication for login and registration
 */
class AuthManager {
   constructor(baseUrl = '') {
      this.baseUrl = baseUrl;
   }

   async login(email, password) {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
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

      return data;
   }

   async register(email, password) {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.message || 'Registration failed');
      }

      return data;
   }

   async getProfile() {
      const token = localStorage.getItem('authToken');
      if (!token) {
         throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseUrl}/auth/me`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         }
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.message || 'Failed to get profile');
      }

      return data;
   }

   logout() {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userProfile');
      window.location.reload();
   }

   isAuthenticated() {
      return !!localStorage.getItem('authToken');
   }
}

/**
 * Authentication View
 * Handles UI updates and form management
 */
class AuthView {
   constructor() {
      this.loginForm = document.getElementById('loginForm');
      this.registerForm = document.getElementById('registerForm');
      this.errorMessage = document.getElementById('errorMessage');
      this.successMessage = document.getElementById('successMessage');
      this.registerErrorMessage = document.getElementById('registerErrorMessage');
      this.registerSuccessMessage = document.getElementById('registerSuccessMessage');
   }

   showLoginForm() {
      this.loginForm.classList.remove('hidden');
      this.registerForm.classList.add('hidden');
      this.clearMessages();
   }

   showRegisterForm() {
      this.loginForm.classList.add('hidden');
      this.registerForm.classList.remove('hidden');
      this.clearMessages();
   }

   showError(message, isRegister = false) {
      const errorEl = isRegister ? this.registerErrorMessage : this.errorMessage;
      const successEl = isRegister ? this.registerSuccessMessage : this.successMessage;

      errorEl.textContent = message;
      errorEl.style.display = 'block';
      successEl.style.display = 'none';
   }

   showSuccess(message, isRegister = false) {
      const errorEl = isRegister ? this.registerErrorMessage : this.successMessage;
      const successEl = isRegister ? this.registerSuccessMessage : this.successMessage;

      successEl.textContent = message;
      successEl.style.display = 'block';
      errorEl.style.display = 'none';
   }

   clearMessages() {
      this.errorMessage.style.display = 'none';
      this.successMessage.style.display = 'none';
      this.registerErrorMessage.style.display = 'none';
      this.registerSuccessMessage.style.display = 'none';
   }

   setLoading(buttonId, isLoading) {
      const button = document.getElementById(buttonId);
      const textSpan = document.getElementById(`${buttonId}Text`);
      const loadingSpan = document.getElementById(`${buttonId}Loading`);

      if (isLoading) {
         button.disabled = true;
         textSpan.classList.add('hidden');
         loadingSpan.classList.remove('hidden');
      } else {
         button.disabled = false;
         textSpan.classList.remove('hidden');
         loadingSpan.classList.add('hidden');
      }
   }

   addInputError(inputId) {
      const input = document.getElementById(inputId);
      input.classList.add('error');
   }

   removeInputError(inputId) {
      const input = document.getElementById(inputId);
      input.classList.remove('error');
   }

   clearForm(formId) {
      const form = document.getElementById(formId);
      form.reset();
      this.clearMessages();

      // Remove error styling from all inputs
      const inputs = form.querySelectorAll('.form-input');
      inputs.forEach(input => input.classList.remove('error'));
   }
}

/**
 * Authentication Coordinator
 * Orchestrates authentication flow and form handling
 */
class AuthCoordinator {
   constructor(manager, view) {
      this.manager = manager;
      this.view = view;
      this.attachEventListeners();
      this.checkAuthenticationStatus();
   }

   attachEventListeners() {
      // Form switching
      document.getElementById('showRegisterLink').addEventListener('click', (e) => {
         e.preventDefault();
         this.view.showRegisterForm();
      });

      document.getElementById('showLoginLink').addEventListener('click', (e) => {
         e.preventDefault();
         this.view.showLoginForm();
      });

      // Login form
      document.getElementById('loginFormElement').addEventListener('submit', (e) => {
         e.preventDefault();
         this.handleLogin();
      });

      // Registration form
      document.getElementById('registerFormElement').addEventListener('submit', (e) => {
         e.preventDefault();
         this.handleRegister();
      });

      // Clear errors on input focus
      const inputs = document.querySelectorAll('.form-input');
      inputs.forEach(input => {
         input.addEventListener('focus', () => {
            this.view.removeInputError(input.id);
         });
      });
   }

   async checkAuthenticationStatus() {
      if (this.manager.isAuthenticated()) {
         try {
            const profile = await this.manager.getProfile();
            this.showAuthenticatedView(profile);
         } catch (error) {
            console.error('Authentication check failed:', error);
            this.manager.logout();
         }
      }
   }

   showAuthenticatedView(profile) {
      // Replace the auth container with the dashboard
      const authContainer = document.querySelector('.auth-container');
      authContainer.innerHTML = `
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div>
            <h1 class="dashboard-title">Stock Analysis Dashboard</h1>
            <p style="margin: 8px 0 0 0; color: #6b7280;">Welcome back, ${profile.user.email}</p>
          </div>
          <div>
            <button id="logoutBtn" class="btn btn-secondary">Logout</button>
          </div>
        </div>

        <div class="nav-tabs">
          <button class="nav-tab active" data-tab="portfolios">Portfolios</button>
          <button class="nav-tab" data-tab="profile">Profile</button>
        </div>

        <!-- Portfolios Tab -->
        <div id="portfoliosTab" class="tab-content active">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">My Portfolios</h2>
            <button id="createPortfolioBtn" class="btn btn-primary">Create Portfolio</button>
          </div>

          <div id="portfoliosContainer" class="portfolio-grid">
            <!-- Portfolios will be loaded here -->
          </div>
        </div>

        <!-- Profile Tab -->
        <div id="profileTab" class="tab-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Profile Information</h2>
            <button id="getProfileBtn" class="btn btn-primary">Refresh Profile</button>
          </div>
          <div id="profileInfo" class="profile-info">
            <h3>Profile Information</h3>
            <div id="profileContent"></div>
          </div>
        </div>
      </div>

      <!-- Portfolio Modal -->
      <div id="portfolioModal" class="form-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title" id="portfolioModalTitle">Create Portfolio</h2>
            <button class="modal-close" id="closePortfolioModal">&times;</button>
          </div>
          <form id="portfolioForm">
            <div class="form-group">
              <label for="portfolioName">Portfolio Name</label>
              <input type="text" id="portfolioName" class="form-input" placeholder="Enter portfolio name" required />
            </div>
            <div class="form-group">
              <label for="portfolioDescription">Description (Optional)</label>
              <textarea id="portfolioDescription" class="form-input" placeholder="Enter portfolio description" rows="3"></textarea>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
              <button type="button" id="cancelPortfolioBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" id="savePortfolioBtn" class="btn btn-primary">Save Portfolio</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Portfolio Details Modal -->
      <div id="portfolioDetailsModal" class="form-modal">
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h2 class="modal-title" id="portfolioDetailsTitle">Portfolio Details</h2>
            <button class="modal-close" id="closePortfolioDetailsModal">&times;</button>
          </div>
          <div id="portfolioDetailsContent">
            <!-- Portfolio details will be loaded here -->
          </div>
        </div>
      </div>

      <!-- Add Stock Modal -->
      <div id="addStockModal" class="form-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">Add Stock to Portfolio</h2>
            <button class="modal-close" id="closeAddStockModal">&times;</button>
          </div>
          <form id="addStockForm">
            <div class="add-holding-form">
              <div class="form-group">
                <label for="stockSymbol">Stock Symbol</label>
                <input type="text" id="stockSymbol" class="form-input" placeholder="e.g., AAPL" required />
              </div>
              <div class="form-group">
                <label for="stockQuantity">Quantity</label>
                <input type="number" id="stockQuantity" class="form-input" placeholder="10" step="0.01" required />
              </div>
              <div class="form-group">
                <label for="stockPrice">Price per Share</label>
                <input type="number" id="stockPrice" class="form-input" placeholder="150.00" step="0.01" required />
              </div>
              <div class="form-group">
                <label for="stockFees">Fees</label>
                <input type="number" id="stockFees" class="form-input" placeholder="9.99" step="0.01" value="0" />
              </div>
              <div class="form-group full-width">
                <label for="stockDate">Transaction Date</label>
                <input type="date" id="stockDate" class="form-input" required />
              </div>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
              <button type="button" id="cancelAddStockBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" id="saveAddStockBtn" class="btn btn-primary">Add Stock</button>
            </div>
          </form>
        </div>
      </div>
    `;

      // Initialize portfolio management
      this.initializePortfolioManagement();
   }

   async handleLogin() {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      // Basic validation
      if (!email || !password) {
         this.view.showError('Please fill in all fields');
         return;
      }

      if (!this.isValidEmail(email)) {
         this.view.showError('Please enter a valid email address');
         this.view.addInputError('loginEmail');
         return;
      }

      try {
         this.view.setLoading('loginBtn', true);
         this.view.clearMessages();

         const result = await this.manager.login(email, password);

         // Store authentication data
         localStorage.setItem('authToken', result.token);
         localStorage.setItem('userProfile', JSON.stringify(result.user));

         this.view.showSuccess('Login successful! Redirecting...');

         // Redirect to authenticated view
         setTimeout(() => {
            this.showAuthenticatedView(result);
         }, 1000);

      } catch (error) {
         this.view.showError(error.message || 'Login failed. Please try again.');
      } finally {
         this.view.setLoading('loginBtn', false);
      }
   }

   async handleRegister() {
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Basic validation
      if (!email || !password || !confirmPassword) {
         this.view.showError('Please fill in all fields', true);
         return;
      }

      if (!this.isValidEmail(email)) {
         this.view.showError('Please enter a valid email address', true);
         this.view.addInputError('registerEmail');
         return;
      }

      if (password.length < 6) {
         this.view.showError('Password must be at least 6 characters long', true);
         this.view.addInputError('registerPassword');
         return;
      }

      if (password !== confirmPassword) {
         this.view.showError('Passwords do not match', true);
         this.view.addInputError('confirmPassword');
         return;
      }

      try {
         this.view.setLoading('registerBtn', true);
         this.view.clearMessages();

         const result = await this.manager.register(email, password);

         // Store authentication data
         localStorage.setItem('authToken', result.token);
         localStorage.setItem('userProfile', JSON.stringify(result.user));

         this.view.showSuccess('Registration successful! Redirecting...', true);

         // Redirect to authenticated view
         setTimeout(() => {
            this.showAuthenticatedView(result);
         }, 1000);

      } catch (error) {
         this.view.showError(error.message || 'Registration failed. Please try again.', true);
      } finally {
         this.view.setLoading('registerBtn', false);
      }
   }

   async handleGetProfile() {
      try {
         const profileInfo = document.getElementById('profileInfo');
         const profileContent = document.getElementById('profileContent');
         const getProfileBtn = document.getElementById('getProfileBtn');

         // Show loading state
         getProfileBtn.disabled = true;
         getProfileBtn.textContent = 'Loading...';

         const profile = await this.manager.getProfile();

         // Display profile information
         profileContent.innerHTML = `
            <div class="profile-details">
               <p><strong>Email:</strong> ${profile.user.email}</p>
               <p><strong>User ID:</strong> ${profile.user.id}</p>
               <p><strong>Created At:</strong> ${new Date(profile.user.created_at).toLocaleString()}</p>
               <p><strong>Last Updated:</strong> ${new Date(profile.user.updated_at).toLocaleString()}</p>
            </div>
         `;

         profileInfo.classList.remove('hidden');

         // Reset button state
         getProfileBtn.disabled = false;
         getProfileBtn.textContent = 'Get Profile Info';

      } catch (error) {
         console.error('Failed to get profile:', error);
         const profileContent = document.getElementById('profileContent');
         profileContent.innerHTML = `
            <div class="error-message">
               <p>Failed to load profile: ${error.message}</p>
            </div>
         `;
         document.getElementById('profileInfo').classList.remove('hidden');

         // Reset button state
         const getProfileBtn = document.getElementById('getProfileBtn');
         getProfileBtn.disabled = false;
         getProfileBtn.textContent = 'Get Profile Info';
      }
   }

   isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
   }
}

/**
 * Portfolio Manager
 * Handles API communication for portfolio operations
 */
class PortfolioManager {
   constructor(baseUrl = '') {
      this.baseUrl = baseUrl;
   }

   async getPortfolios() {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         }
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to fetch portfolios');
      }
      return data;
   }

   async createPortfolio(portfolioData) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(portfolioData)
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to create portfolio');
      }
      return data;
   }

   async updatePortfolio(portfolioId, portfolioData) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios/${portfolioId}`, {
         method: 'PUT',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(portfolioData)
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to update portfolio');
      }
      return data;
   }

   async deletePortfolio(portfolioId) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios/${portfolioId}`, {
         method: 'DELETE',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         }
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to delete portfolio');
      }
      return data;
   }

   async getPortfolioHoldings(portfolioId) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios/${portfolioId}/holdings`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         }
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to fetch portfolio holdings');
      }
      return data;
   }

   async addStockToPortfolio(portfolioId, stockData) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios/${portfolioId}/holdings`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(stockData)
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to add stock to portfolio');
      }
      return data;
   }

   async updatePortfolioHolding(portfolioId, stockData) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios/${portfolioId}/holdings`, {
         method: 'PUT',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(stockData)
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to update portfolio holding');
      }
      return data;
   }

   async removeStockFromPortfolio(portfolioId, symbol) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios/${portfolioId}/holdings?symbol=${symbol}`, {
         method: 'DELETE',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         }
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to remove stock from portfolio');
      }
      return data;
   }

   async getPortfolioSummary(portfolioId) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseUrl}/api/portfolios/${portfolioId}/summary`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         }
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Failed to fetch portfolio summary');
      }
      return data;
   }
}

/**
 * Portfolio View
 * Handles UI updates for portfolio management
 */
class PortfolioView {
   constructor() {
      this.portfoliosContainer = null;
      this.currentPortfolioId = null;
   }

   renderPortfolios(portfolios) {
      if (!this.portfoliosContainer) {
         this.portfoliosContainer = document.getElementById('portfoliosContainer');
      }

      if (portfolios.length === 0) {
         this.portfoliosContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
               <div class="empty-state-icon">📊</div>
               <h3>No Portfolios Yet</h3>
               <p>Create your first portfolio to start tracking your investments</p>
            </div>
         `;
         return;
      }

      this.portfoliosContainer.innerHTML = portfolios.map(portfolio => `
         <div class="portfolio-card">
            <div class="portfolio-header">
               <h3 class="portfolio-name">${portfolio.portfolio_name}</h3>
               <div class="portfolio-actions">
                  <button class="btn-small btn-view" onclick="portfolioCoordinator.viewPortfolio(${portfolio.id})">View</button>
                  <button class="btn-small btn-edit" onclick="portfolioCoordinator.editPortfolio(${portfolio.id})">Edit</button>
                  <button class="btn-small btn-delete" onclick="portfolioCoordinator.deletePortfolio(${portfolio.id})">Delete</button>
               </div>
            </div>
            <div class="portfolio-description">${portfolio.description || 'No description provided'}</div>
            <div class="portfolio-stats">
               <div class="stat-item">
                  <div class="stat-value">-</div>
                  <div class="stat-label">Holdings</div>
               </div>
               <div class="stat-item">
                  <div class="stat-value">-</div>
                  <div class="stat-label">Value</div>
               </div>
            </div>
         </div>
      `).join('');
   }

   showPortfolioModal(isEdit = false, portfolio = null) {
      const modal = document.getElementById('portfolioModal');
      const title = document.getElementById('portfolioModalTitle');
      const form = document.getElementById('portfolioForm');

      if (isEdit && portfolio) {
         title.textContent = 'Edit Portfolio';
         document.getElementById('portfolioName').value = portfolio.portfolio_name;
         document.getElementById('portfolioDescription').value = portfolio.description || '';
         form.dataset.portfolioId = portfolio.id;
      } else {
         title.textContent = 'Create Portfolio';
         form.reset();
         delete form.dataset.portfolioId;
      }

      modal.classList.add('active');
   }

   hidePortfolioModal() {
      const modal = document.getElementById('portfolioModal');
      modal.classList.remove('active');
   }

   showAddStockModal(portfolioId) {
      const modal = document.getElementById('addStockModal');
      const form = document.getElementById('addStockForm');

      form.reset();
      form.dataset.portfolioId = portfolioId;

      // Set today's date as default
      document.getElementById('stockDate').value = new Date().toISOString().split('T')[0];

      modal.classList.add('active');
   }

   hideAddStockModal() {
      const modal = document.getElementById('addStockModal');
      modal.classList.remove('active');
   }

   showPortfolioDetails(portfolioSummary) {
      const modal = document.getElementById('portfolioDetailsModal');
      const title = document.getElementById('portfolioDetailsTitle');
      const content = document.getElementById('portfolioDetailsContent');

      title.textContent = portfolioSummary.portfolio.portfolio_name;

      const holdings = portfolioSummary.holdings || [];
      const totalValue = portfolioSummary.totalValue || 0;
      const totalCost = portfolioSummary.totalCost || 0;
      const totalGainLoss = portfolioSummary.totalGainLoss || 0;
      const totalGainLossPercent = portfolioSummary.totalGainLossPercent || 0;

      content.innerHTML = `
         <div class="summary-cards">
            <div class="summary-card">
               <div class="summary-card-title">Total Value</div>
               <div class="summary-card-value">$${totalValue.toFixed(2)}</div>
            </div>
            <div class="summary-card">
               <div class="summary-card-title">Total Cost</div>
               <div class="summary-card-value">$${totalCost.toFixed(2)}</div>
            </div>
            <div class="summary-card">
               <div class="summary-card-title">Gain/Loss</div>
               <div class="summary-card-value ${totalGainLoss >= 0 ? 'positive' : 'negative'}">$${totalGainLoss.toFixed(2)}</div>
               <div class="summary-card-change ${totalGainLossPercent >= 0 ? 'positive' : 'negative'}">${totalGainLossPercent.toFixed(2)}%</div>
            </div>
         </div>

         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0;">Holdings</h3>
            <button class="btn btn-primary" onclick="portfolioCoordinator.showAddStockModal(${portfolioSummary.portfolio.id})">Add Stock</button>
         </div>

         ${holdings.length === 0 ? `
            <div class="empty-state">
               <div class="empty-state-icon">📈</div>
               <h3>No Holdings</h3>
               <p>Add stocks to this portfolio to start tracking your investments</p>
            </div>
         ` : `
            <table class="holdings-table">
               <thead>
                  <tr>
                     <th>Symbol</th>
                     <th>Quantity</th>
                     <th>Avg Cost</th>
                     <th>Current Price</th>
                     <th>Current Value</th>
                     <th>Gain/Loss</th>
                     <th>Actions</th>
                  </tr>
               </thead>
               <tbody>
                  ${holdings.map(holding => `
                     <tr>
                        <td><strong>${holding.symbol}</strong></td>
                        <td>${holding.quantity}</td>
                        <td>$${holding.average_cost.toFixed(2)}</td>
                        <td>$${holding.current_price ? holding.current_price.toFixed(2) : '-'}</td>
                        <td>$${holding.current_value ? holding.current_value.toFixed(2) : '-'}</td>
                        <td class="${holding.unrealized_gain_loss >= 0 ? 'positive' : 'negative'}">
                           ${holding.unrealized_gain_loss ? `$${holding.unrealized_gain_loss.toFixed(2)} (${holding.unrealized_gain_loss_percent.toFixed(2)}%)` : '-'}
                        </td>
                        <td>
                           <button class="btn-small btn-delete" onclick="portfolioCoordinator.removeStock('${holding.symbol}')">Remove</button>
                        </td>
                     </tr>
                  `).join('')}
               </tbody>
            </table>
         `}
      `;

      modal.classList.add('active');
      this.currentPortfolioId = portfolioSummary.portfolio.id;
   }

   hidePortfolioDetails() {
      const modal = document.getElementById('portfolioDetailsModal');
      modal.classList.remove('active');
   }

   showError(message) {
      alert(`Error: ${message}`);
   }

   showSuccess(message) {
      alert(`Success: ${message}`);
   }
}

/**
 * Portfolio Coordinator
 * Orchestrates portfolio management flow
 */
class PortfolioCoordinator {
   constructor(manager, view) {
      this.manager = manager;
      this.view = view;
      this.portfolios = [];
      this.attachEventListeners();
   }

   attachEventListeners() {
      // Tab switching
      document.addEventListener('click', (e) => {
         if (e.target.classList.contains('nav-tab')) {
            this.switchTab(e.target.dataset.tab);
         }
      });

      // Portfolio modal events
      document.getElementById('createPortfolioBtn').addEventListener('click', () => {
         this.view.showPortfolioModal();
      });

      document.getElementById('closePortfolioModal').addEventListener('click', () => {
         this.view.hidePortfolioModal();
      });

      document.getElementById('cancelPortfolioBtn').addEventListener('click', () => {
         this.view.hidePortfolioModal();
      });

      document.getElementById('portfolioForm').addEventListener('submit', (e) => {
         e.preventDefault();
         this.handlePortfolioSubmit();
      });

      // Add stock modal events
      document.getElementById('closeAddStockModal').addEventListener('click', () => {
         this.view.hideAddStockModal();
      });

      document.getElementById('cancelAddStockBtn').addEventListener('click', () => {
         this.view.hideAddStockModal();
      });

      document.getElementById('addStockForm').addEventListener('submit', (e) => {
         e.preventDefault();
         this.handleAddStockSubmit();
      });

      // Portfolio details modal events
      document.getElementById('closePortfolioDetailsModal').addEventListener('click', () => {
         this.view.hidePortfolioDetails();
      });

      // Profile tab events
      document.getElementById('getProfileBtn').addEventListener('click', () => {
         this.handleGetProfile();
      });
   }

   switchTab(tabName) {
      // Update tab buttons
      document.querySelectorAll('.nav-tab').forEach(tab => {
         tab.classList.remove('active');
      });
      document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => {
         content.classList.remove('active');
      });
      document.getElementById(`${tabName}Tab`).classList.add('active');

      // Load data for the active tab
      if (tabName === 'portfolios') {
         this.loadPortfolios();
      }
   }

   async loadPortfolios() {
      try {
         const response = await this.manager.getPortfolios();
         this.portfolios = response.portfolios;
         this.view.renderPortfolios(this.portfolios);
      } catch (error) {
         this.view.showError(error.message);
      }
   }

   async handlePortfolioSubmit() {
      const form = document.getElementById('portfolioForm');
      const portfolioId = form.dataset.portfolioId;
      const portfolioData = {
         portfolioName: document.getElementById('portfolioName').value,
         description: document.getElementById('portfolioDescription').value
      };

      try {
         if (portfolioId) {
            await this.manager.updatePortfolio(portfolioId, portfolioData);
            this.view.showSuccess('Portfolio updated successfully');
         } else {
            await this.manager.createPortfolio(portfolioData);
            this.view.showSuccess('Portfolio created successfully');
         }

         this.view.hidePortfolioModal();
         this.loadPortfolios();
      } catch (error) {
         this.view.showError(error.message);
      }
   }

   async viewPortfolio(portfolioId) {
      try {
         const response = await this.manager.getPortfolioSummary(portfolioId);
         this.view.showPortfolioDetails(response.summary);
      } catch (error) {
         this.view.showError(error.message);
      }
   }

   async editPortfolio(portfolioId) {
      const portfolio = this.portfolios.find(p => p.id === portfolioId);
      if (portfolio) {
         this.view.showPortfolioModal(true, portfolio);
      }
   }

   async deletePortfolio(portfolioId) {
      if (confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
         try {
            await this.manager.deletePortfolio(portfolioId);
            this.view.showSuccess('Portfolio deleted successfully');
            this.loadPortfolios();
         } catch (error) {
            this.view.showError(error.message);
         }
      }
   }

   showAddStockModal(portfolioId) {
      this.view.showAddStockModal(portfolioId);
   }

   async handleAddStockSubmit() {
      const form = document.getElementById('addStockForm');
      const portfolioId = form.dataset.portfolioId;
      const stockData = {
         symbol: document.getElementById('stockSymbol').value.toUpperCase(),
         quantity: parseFloat(document.getElementById('stockQuantity').value),
         pricePerShare: parseFloat(document.getElementById('stockPrice').value),
         fees: parseFloat(document.getElementById('stockFees').value) || 0,
         transactionDate: document.getElementById('stockDate').value
      };

      try {
         await this.manager.addStockToPortfolio(portfolioId, stockData);
         this.view.showSuccess('Stock added to portfolio successfully');
         this.view.hideAddStockModal();
         // Refresh the portfolio details if modal is open
         if (this.view.currentPortfolioId) {
            this.viewPortfolio(this.view.currentPortfolioId);
         }
      } catch (error) {
         this.view.showError(error.message);
      }
   }

   async removeStock(symbol) {
      if (confirm(`Are you sure you want to remove ${symbol} from this portfolio?`)) {
         try {
            await this.manager.removeStockFromPortfolio(this.view.currentPortfolioId, symbol);
            this.view.showSuccess('Stock removed from portfolio successfully');
            // Refresh the portfolio details
            this.viewPortfolio(this.view.currentPortfolioId);
         } catch (error) {
            this.view.showError(error.message);
         }
      }
   }

   async handleGetProfile() {
      try {
         const profileInfo = document.getElementById('profileInfo');
         const profileContent = document.getElementById('profileContent');
         const getProfileBtn = document.getElementById('getProfileBtn');

         // Show loading state
         getProfileBtn.disabled = true;
         getProfileBtn.textContent = 'Loading...';

         const profile = await this.manager.getProfile();

         // Display profile information
         profileContent.innerHTML = `
            <div class="profile-details">
               <p><strong>Email:</strong> ${profile.user.email}</p>
               <p><strong>User ID:</strong> ${profile.user.id}</p>
               <p><strong>Created At:</strong> ${new Date(profile.user.created_at).toLocaleString()}</p>
               <p><strong>Last Updated:</strong> ${new Date(profile.user.updated_at).toLocaleString()}</p>
            </div>
         `;

         // Reset button state
         getProfileBtn.disabled = false;
         getProfileBtn.textContent = 'Refresh Profile';

      } catch (error) {
         console.error('Failed to get profile:', error);
         const profileContent = document.getElementById('profileContent');
         profileContent.innerHTML = `
            <div class="error-message">
               <p>Failed to load profile: ${error.message}</p>
            </div>
         `;

         // Reset button state
         const getProfileBtn = document.getElementById('getProfileBtn');
         getProfileBtn.disabled = false;
         getProfileBtn.textContent = 'Refresh Profile';
      }
   }
}

// Global portfolio coordinator instance
let portfolioCoordinator;

// Initialize the application
(function init() {
   const manager = new AuthManager('');
   const view = new AuthView();
   const authCoordinator = new AuthCoordinator(manager, view);

   // Add portfolio management initialization to AuthCoordinator
   authCoordinator.initializePortfolioManagement = function () {
      const portfolioManager = new PortfolioManager('');
      const portfolioView = new PortfolioView();
      portfolioCoordinator = new PortfolioCoordinator(portfolioManager, portfolioView);

      // Load portfolios on initialization
      portfolioCoordinator.loadPortfolios();
   };
})();
