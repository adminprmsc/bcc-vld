import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
	// Public routes (guest only - redirect if already logged in)
	{ path: 'login', loadComponent: () => import('./components/auth/login/login').then(m => m.Login), canActivate: [guestGuard] },
	{ path: 'register', loadComponent: () => import('./components/auth/register/register').then(m => m.Register), canActivate: [guestGuard] },
	{ path: 'request-access', loadComponent: () => import('./components/auth/request-access/request-access').then(m => m.RequestAccess), canActivate: [guestGuard] },
	
	// Protected routes (require authentication)
	{ path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard/dashboard').then(m => m.Dashboard), canActivate: [authGuard] },
	{ path: 'tehsil-dm-dashboard', loadComponent: () => import('./components/dashboard/tehsil-dm-dashboard').then(m => m.TehsilDmDashboard), canActivate: [authGuard] },
	{ path: 'land-activity-dashboard', loadComponent: () => import('./components/dashboard/land-activity-dashboard/land-activity-dashboard').then(m => m.LandActivityDashboard), canActivate: [authGuard] },
	{ path: 'edcs-consultant-dashboard', loadComponent: () => import('./components/dashboard/edcs-consultant-dashboard/edcs-consultant-dashboard').then(m => m.EdcsConsultantDashboard), canActivate: [authGuard, roleGuard(['EDCS Consultant', 'EDCS User', 'Super Admin', 'Admin', 'Tehsil Manager'])] },
	{ path: 'water-quality-dashboard', loadComponent: () => import('./components/dashboard/water-quality-dashboard/water-quality-dashboard').then(m => m.WaterQualityDashboard), canActivate: [authGuard, roleGuard(['RA Environment', 'PCRWR Sampler', 'PCRWR Lab', 'Super Admin', 'Admin'])] },
	{ path: 'requisitions', loadComponent: () => import('./components/requisitions/requisition-list/requisition-list').then(m => m.RequisitionList), canActivate: [authGuard] },
	{ path: 'support', loadComponent: () => import('./components/support/support-center').then(m => m.SupportCenter), canActivate: [authGuard] },
	
	// Default redirect
	{ path: '', redirectTo: 'login', pathMatch: 'full' },
	
	// Wildcard route for 404
	{ path: '**', redirectTo: 'login' }
];
