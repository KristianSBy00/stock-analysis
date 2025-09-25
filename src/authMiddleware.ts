/**
 * Authentication Middleware
 * Handles request authentication and authorization
 */

import { AuthContext, Env } from './types';
import { AuthManager } from './authManager';
import { JWTUtils } from './jwtUtils';

export class AuthMiddleware {
   private authManager: AuthManager;

   constructor(env: Env) {
      if (!env.JWT_SECRET) {
         throw new Error('JWT_SECRET is required for authentication');
      }
      this.authManager = new AuthManager(env.stock_analysis, env.JWT_SECRET);
   }

   /**
    * Extract and verify authentication from request
    */
   async authenticate(request: Request): Promise<AuthContext | null> {
      try {
         const authHeader = request.headers.get('Authorization');
         const token = JWTUtils.extractTokenFromHeader(authHeader);

         if (!token) {
            return null;
         }

         return await this.authManager.verifyToken(token);
      } catch (error) {
         console.error('Authentication error:', error);
         return null;
      }
   }

   /**
    * Require authentication for a route
    */
   async requireAuth(request: Request): Promise<{ auth: AuthContext } | Response> {
      const auth = await this.authenticate(request);

      if (!auth) {
         return new Response(JSON.stringify({
            error: 'Unauthorized',
            message: 'Authentication required'
         }), {
            status: 401,
            headers: {
               'Content-Type': 'application/json',
               'Access-Control-Allow-Origin': '*',
               'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
               'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
         });
      }

      return { auth };
   }

   /**
    * Get user ID from authenticated request
    */
   async getUserId(request: Request): Promise<number | null> {
      const auth = await this.authenticate(request);
      return auth?.user.id || null;
   }

   /**
    * Check if user owns a resource
    */
   async checkResourceOwnership(
      request: Request,
      resourceUserId: number
   ): Promise<{ auth: AuthContext } | Response> {
      const authResult = await this.requireAuth(request);

      if (authResult instanceof Response) {
         return authResult;
      }

      const { auth } = authResult;

      if (auth.user.id !== resourceUserId) {
         return new Response(JSON.stringify({
            error: 'Forbidden',
            message: 'Access denied to this resource'
         }), {
            status: 403,
            headers: {
               'Content-Type': 'application/json',
               'Access-Control-Allow-Origin': '*',
               'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
               'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
         });
      }

      return { auth };
   }

   /**
    * Handle CORS preflight requests
    */
   handleCors(request: Request): Response | null {
      if (request.method === 'OPTIONS') {
         return new Response(null, {
            status: 200,
            headers: {
               'Access-Control-Allow-Origin': '*',
               'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
               'Access-Control-Allow-Headers': 'Content-Type, Authorization',
               'Access-Control-Max-Age': '86400'
            }
         });
      }
      return null;
   }

   /**
    * Get AuthManager instance
    */
   getAuthManager(): AuthManager {
      return this.authManager;
   }
}
