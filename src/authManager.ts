/**
 * Authentication Manager
 * Handles user registration, login, password management, and session management
 */

import {
   User,
   UserSession,
   LoginRequest,
   RegisterRequest,
   AuthResponse,
   AuthContext,
   PasswordResetRequest,
   PasswordResetConfirmRequest,
   EmailVerificationRequest,
   Env
} from './types';
import { JWTUtils } from './jwtUtils';
import { StockAnalysisDB } from './stockAnalasysDB';

export class AuthManager {
   private db: D1Database;
   private jwtSecret: string;

   constructor(db: D1Database, jwtSecret: string) {
      this.db = db;
      this.jwtSecret = jwtSecret;
   }

   /**
    * Register a new user
    */
   async register(request: RegisterRequest): Promise<AuthResponse> {
      try {
         // Check if user already exists
         const existingUser = await this.getUserByEmail(request.email);
         if (existingUser) {
            return {
               success: false,
               message: 'User with this email already exists'
            };
         }

         // Hash password
         const passwordHash = await this.hashPassword(request.password);

         // Create user
         const userId = await StockAnalysisDB.createUser(this.db, request.email, passwordHash);

         const user = await this.getUserById(userId);

         if (!user) {
            return {
               success: false,
               message: 'User created but could not be retrieved'
            };
         }

         // Create session and token
         const session = await this.createSession(userId);
         const token = await JWTUtils.createToken({
            sub: user.id,
            email: user.email,
            jti: session.tokenId,
            type: 'access'
         }, this.jwtSecret);

         return {
            success: true,
            user,
            token,
            expiresAt: session.expiresAt,
            message: 'User registered successfully'
         };

      } catch (error) {
         console.error('Registration error:', error);
         return {
            success: false,
            message: 'Registration failed due to server error'
         };
      }
   }

   /**
    * Login user
    */
   async login(request: LoginRequest, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
      try {
         // Get user by email
         const user = await this.getUserByEmail(request.email);
         if (!user) {
            return {
               success: false,
               message: 'Invalid email or password'
            };
         }

         // Check if user is active
         if (!user.isActive) {
            return {
               success: false,
               message: 'Account is deactivated'
            };
         }

         // Verify password
         const isValidPassword = await this.verifyPassword(request.password, user.password_hash);
         if (!isValidPassword) {
            return {
               success: false,
               message: 'Invalid email or password'
            };
         }

         // Update last login
         await this.updateLastLogin(user.id);

         // Create session and token
         const session = await this.createSession(user.id, userAgent, ipAddress);
         const token = await JWTUtils.createToken({
            sub: user.id,
            email: user.email,
            jti: session.tokenId,
            type: 'access'
         }, this.jwtSecret);

         // Remove password hash from response
         const { password_hash, ...userWithoutPassword } = user;

         return {
            success: true,
            user: userWithoutPassword as User,
            token,
            expiresAt: session.expiresAt,
            message: 'Login successful'
         };

      } catch (error) {
         console.error('Login error:', error);
         return {
            success: false,
            message: 'Login failed due to server error'
         };
      }
   }

   /**
    * Verify JWT token and get user context
    */
   async verifyToken(token: string): Promise<AuthContext | null> {
      try {
         const payload = await JWTUtils.verifyToken(token, this.jwtSecret);
         if (!payload) {
            return null;
         }

         // Check if session exists and is not revoked
         const session = await this.getSessionByTokenId(payload.jti);
         if (!session || session.isRevoked || new Date(session.expiresAt) < new Date()) {
            return null;
         }

         // Get user
         const user = await this.getUserById(payload.sub);
         if (!user || !user.isActive) {
            return null;
         }

         return {
            user,
            session,
            isAuthenticated: true
         };

      } catch (error) {
         console.error('Token verification error:', error);
         return null;
      }
   }

   /**
    * Logout user (revoke session)
    */
   async logout(token: string): Promise<boolean> {
      try {
         const payload = await JWTUtils.verifyToken(token, this.jwtSecret);
         if (!payload) {
            return false;
         }

         await this.db.prepare(`
            UPDATE user_sessions
            SET is_revoked = TRUE
            WHERE token_id = ?
         `).bind(payload.jti).run();

         return true;
      } catch (error) {
         console.error('Logout error:', error);
         return false;
      }
   }

   /**
    * Get user by ID
    */
   private async getUserById(id: number): Promise<(User & { password_hash: string }) | null> {
      try {
         const result = await this.db.prepare(`
            SELECT * FROM users WHERE id = ?
         `).bind(id).first();

         if (!result) {
            return null;
         }

         // Transform snake_case to camelCase
         return {
            id: result.id,
            email: result.email,
            firstName: result.first_name,
            lastName: result.last_name,
            isActive: result.is_active,
            emailVerified: result.email_verified,
            createdAt: result.created_at,
            updatedAt: result.updated_at,
            lastLogin: result.last_login,
            password_hash: result.password_hash
         } as (User & { password_hash: string });
      } catch (error) {
         console.error('Get user by ID error:', error);
         return null;
      }
   }

   /**
    * Get user by email
    */
   private async getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
      try {
         const result = await this.db.prepare(`
            SELECT * FROM users WHERE email = ?
         `).bind(email).first();

         if (!result) {
            return null;
         }

         // Transform snake_case to camelCase
         return {
            id: result.id,
            email: result.email,
            firstName: result.first_name,
            lastName: result.last_name,
            isActive: result.is_active,
            emailVerified: result.email_verified,
            createdAt: result.created_at,
            updatedAt: result.updated_at,
            lastLogin: result.last_login,
            password_hash: result.password_hash
         } as (User & { password_hash: string });
      } catch (error) {
         console.error('Get user by email error:', error);
         return null;
      }
   }

   /**
    * Create user session
    */
   private async createSession(userId: number, userAgent?: string, ipAddress?: string): Promise<UserSession> {
      const tokenId = JWTUtils.generateJWTId();
      const expiresAt = JWTUtils.getTokenExpiry('access').toISOString();

      await this.db.prepare(`
         INSERT INTO user_sessions (user_id, token_id, expires_at, user_agent, ip_address)
         VALUES (?, ?, ?, ?, ?)
      `).bind(userId, tokenId, expiresAt, userAgent || null, ipAddress || null).run();

      return {
         id: 0, // Will be set by database
         userId,
         tokenId,
         expiresAt,
         createdAt: new Date().toISOString(),
         isRevoked: false,
         userAgent,
         ipAddress
      };
   }

   /**
    * Get session by token ID
    */
   private async getSessionByTokenId(tokenId: string): Promise<UserSession | null> {
      try {
         const result = await this.db.prepare(`
            SELECT * FROM user_sessions WHERE token_id = ?
         `).bind(tokenId).first();

         if (!result) {
            return null;
         }

         // Transform snake_case to camelCase
         return {
            id: result.id,
            userId: result.user_id,
            tokenId: result.token_id,
            expiresAt: result.expires_at,
            createdAt: result.created_at,
            isRevoked: result.is_revoked,
            userAgent: result.user_agent,
            ipAddress: result.ip_address
         } as UserSession;
      } catch (error) {
         console.error('Get session error:', error);
         return null;
      }
   }

   /**
    * Update last login timestamp
    */
   private async updateLastLogin(userId: number): Promise<void> {
      try {
         await this.db.prepare(`
            UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
         `).bind(userId).run();
      } catch (error) {
         console.error('Update last login error:', error);
      }
   }

   /**
    * Hash password using Web Crypto API
    */
   private async hashPassword(password: string): Promise<string> {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
   }

   /**
    * Verify password
    */
   private async verifyPassword(password: string, hash: string): Promise<boolean> {
      const passwordHash = await this.hashPassword(password);
      return passwordHash === hash;
   }

   /**
    * Clean up expired sessions
    */
   async cleanupExpiredSessions(): Promise<void> {
      try {
         await this.db.prepare(`
            DELETE FROM user_sessions
            WHERE expires_at < CURRENT_TIMESTAMP OR is_revoked = TRUE
         `).run();
      } catch (error) {
         console.error('Cleanup sessions error:', error);
      }
   }
}
