import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * HTTP Error Interceptor
 * Handles common HTTP errors and provides consistent error handling
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Client Error: ${error.error.message}`;
        console.error('Client-side error:', error.error.message);
      } else {
        // Server-side error
        switch (error.status) {
          case 0:
            errorMessage = 'Unable to connect to server. Please check your internet connection.';
            break;
          case 400:
            errorMessage = error.error?.msg || error.error?.message || 'Invalid request';
            break;
          case 401:
            errorMessage = 'Session expired. Please login again.';
            // Clear all auth data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            router.navigate(['/login']);
            break;
          case 403:
            errorMessage = 'You do not have permission to perform this action.';
            break;
          case 404:
            errorMessage = error.error?.msg || 'Resource not found';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            break;
          default:
            errorMessage = error.error?.msg || error.error?.message || `Error: ${error.statusText}`;
        }
        
        console.error(`HTTP Error ${error.status}:`, error.message);
      }
      
      // Return error with formatted message
      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        originalError: error,
        timestamp: new Date().toISOString()
      }));
    })
  );
};

/**
 * Auth Token Interceptor
 * Adds JWT token to outgoing requests
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  
  // Skip auth header for public endpoints
  const publicEndpoints = ['/login', '/register', '/request-access'];
  const isPublic = publicEndpoints.some(endpoint => req.url.includes(endpoint));
  
  if (token && !isPublic) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }
  
  return next(req);
};

/**
 * Loading Interceptor
 * Can be used to track loading state for requests
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // This can be enhanced to emit loading state to a service
  // For now, just pass through
  return next(req);
};

/**
 * Retry Interceptor
 * Retries failed requests (except 4xx errors)
 */
import { retry, timer } from 'rxjs';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Don't retry POST/PUT/DELETE to prevent duplicate submissions
  if (req.method !== 'GET') {
    return next(req);
  }
  
  return next(req).pipe(
    retry({
      count: 2,
      delay: (error, retryCount) => {
        // Only retry on server errors (5xx) or network errors
        if (error.status >= 400 && error.status < 500) {
          return throwError(() => error);
        }
        // Exponential backoff: 1s, 2s
        return timer(retryCount * 1000);
      }
    })
  );
};
