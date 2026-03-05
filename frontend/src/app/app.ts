import { Component, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AppHeader } from './components/shared/app-header';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeader, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('lds-fe');
  currentUser: any = null;
  readonly showHeader = signal(true);

  constructor(private readonly router: Router) {
    this.loadCurrentUser();
    this.updateHeaderVisibility(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.updateHeaderVisibility(event.urlAfterRedirects);
        // Reload user on navigation in case login just happened
        this.loadCurrentUser();
      });
  }

  private loadCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
  }

  onLogout() {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  onUpdateProfile() {
    alert('Profile update coming soon!');
  }

  private updateHeaderVisibility(url: string) {
  const authRoutes = ['/login', '/register', '/request-access', '/'];
    const normalized = (url || '').split('?')[0];
    const shouldHide = authRoutes.some(route => route === normalized || (route !== '/' && normalized.startsWith(route + '/')));
    this.showHeader.set(!shouldHide);
  }
}
