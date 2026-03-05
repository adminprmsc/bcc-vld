import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Auth Guard - Protects routes that require authentication
 * Redirects to login if no valid token exists
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  if (!token) {
    router.navigate(['/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }
  
  // Basic JWT expiration check
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    
    if (Date.now() >= expiry) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url, expired: 'true' } 
      });
      return false;
    }
  } catch (e) {
    // Invalid token format
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.navigate(['/login']);
    return false;
  }
  
  return true;
};

/**
 * Role Guard Factory - Protects routes based on user role
 * Usage: canActivate: [roleGuard(['Admin', 'Super Admin'])]
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return (route, state) => {
    const router = inject(Router);
    const userJson = localStorage.getItem('user');
    
    if (!userJson) {
      router.navigate(['/login']);
      return false;
    }
    
    try {
      const user = JSON.parse(userJson);
      const userRole = user.role || '';
      
      if (allowedRoles.includes(userRole)) {
        return true;
      }
      
      // User doesn't have required role - redirect to appropriate dashboard
      console.warn(`Access denied: User role "${userRole}" not in allowed roles:`, allowedRoles);
      router.navigate(['/dashboard']);
      return false;
    } catch (e) {
      router.navigate(['/login']);
      return false;
    }
  };
}

/**
 * Helper function to check if a JWT token is valid and not expired
 */
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    return Date.now() < expiry;
  } catch {
    return false;
  }
}

/**
 * Guest Guard - Protects routes that should only be accessible when NOT logged in
 * E.g., login and register pages
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  // Only redirect if token exists AND is valid (not expired)
  if (token && isTokenValid(token)) {
    // Already logged in with valid token, redirect to dashboard
    router.navigate(['/dashboard']);
    return false;
  }
  
  // If token exists but is invalid/expired, clean it up
  if (token && !isTokenValid(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
  }
  
  return true;
};
