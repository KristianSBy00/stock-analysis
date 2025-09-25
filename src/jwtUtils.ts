/**
 * JWT utility functions for authentication
 * Handles token creation, validation, and management
 */

import { JWTPayload } from './types';

export class JWTUtils {
   private static readonly ALGORITHM = 'HS256';
   private static readonly ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
   private static readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

   /**
    * Create a JWT token
    */
   static async createToken(
      payload: Omit<JWTPayload, 'iat' | 'exp'>,
      secret: string,
      type: 'access' | 'refresh' = 'access'
   ): Promise<string> {
      const now = Math.floor(Date.now() / 1000);
      const expiry = type === 'access'
         ? now + this.ACCESS_TOKEN_EXPIRY
         : now + this.REFRESH_TOKEN_EXPIRY;

      const tokenPayload: JWTPayload = {
         ...payload,
         iat: now,
         exp: expiry,
         type
      };

      // Simple JWT implementation for Cloudflare Workers
      const header = this.base64UrlEncode(JSON.stringify({ alg: this.ALGORITHM, typ: 'JWT' }));
      const payloadEncoded = this.base64UrlEncode(JSON.stringify(tokenPayload));
      const signature = await this.createSignature(header, payloadEncoded, secret);

      return `${header}.${payloadEncoded}.${signature}`;
   }

   /**
    * Verify and decode a JWT token
    */
   static async verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
      try {
         const parts = token.split('.');
         if (parts.length !== 3) {
            return null;
         }

         const [header, payload, signature] = parts;

         // Verify signature
         const expectedSignature = await this.createSignature(header, payload, secret);
         if (signature !== expectedSignature) {
            return null;
         }

         // Decode payload
         const decodedPayload = JSON.parse(this.base64UrlDecode(payload)) as JWTPayload;

         // Check expiration
         const now = Math.floor(Date.now() / 1000);
         if (decodedPayload.exp < now) {
            return null;
         }

         return decodedPayload;
      } catch (error) {
         console.error('JWT verification error:', error);
         return null;
      }
   }

   /**
    * Extract token from Authorization header
    */
   static extractTokenFromHeader(authHeader: string | null): string | null {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return null;
      }
      return authHeader.substring(7);
   }

   /**
    * Generate a random JWT ID for session management
    */
   static generateJWTId(): string {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
   }

   /**
    * Create HMAC signature
    */
   private static async createSignature(header: string, payload: string, secret: string): Promise<string> {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
         'raw',
         encoder.encode(secret),
         { name: 'HMAC', hash: 'SHA-256' },
         false,
         ['sign']
      );

      const signature = await crypto.subtle.sign(
         'HMAC',
         key,
         encoder.encode(`${header}.${payload}`)
      );

      return this.base64UrlEncode(new Uint8Array(signature));
   }

   /**
    * Base64 URL encode
    */
   private static base64UrlEncode(data: string | Uint8Array): string {
      if (typeof data === 'string') {
         // For strings, use btoa directly
         return btoa(data)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
      } else {
         // For Uint8Array (binary data), convert to base64 manually
         const base64 = this.arrayBufferToBase64(data.buffer as ArrayBuffer);
         return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
      }
   }

   /**
    * Convert ArrayBuffer to base64 string
    */
   private static arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
         binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
   }

   /**
    * Base64 URL decode
    */
   private static base64UrlDecode(str: string): string {
      // Add padding if needed
      const padded = str + '='.repeat((4 - str.length % 4) % 4);
      const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
      return atob(base64);
   }

   /**
    * Get token expiry time
    */
   static getTokenExpiry(type: 'access' | 'refresh'): Date {
      const now = new Date();
      const expirySeconds = type === 'access'
         ? this.ACCESS_TOKEN_EXPIRY
         : this.REFRESH_TOKEN_EXPIRY;

      return new Date(now.getTime() + (expirySeconds * 1000));
   }
}
