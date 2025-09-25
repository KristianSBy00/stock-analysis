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
      // Replace the auth container with a welcome message
      const authContainer = document.querySelector('.auth-container');
      authContainer.innerHTML = `
      <div class="auth-header">
        <h1>Welcome, ${profile.user.email}!</h1>
        <p>You are successfully logged in to Stock Analysis</p>
      </div>
      <div style="text-align: center; margin-top: 32px;">
        <button id="getProfileBtn" class="btn btn-primary" style="margin-right: 12px;">Get Profile Info</button>
        <button id="logoutBtn" class="btn btn-secondary">Logout</button>
      </div>
      <div id="profileInfo" class="profile-info hidden" style="margin-top: 24px;">
        <h3>Profile Information</h3>
        <div id="profileContent"></div>
      </div>
    `;

      // Add logout functionality
      document.getElementById('logoutBtn').addEventListener('click', () => {
         this.manager.logout();
      });

      // Add get profile functionality
      document.getElementById('getProfileBtn').addEventListener('click', () => {
         this.handleGetProfile();
      });
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

// Initialize the application
(function init() {
   const manager = new AuthManager('');
   const view = new AuthView();
   new AuthCoordinator(manager, view);
})();
