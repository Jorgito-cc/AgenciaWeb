import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  public readonly themeService = inject(ThemeService);

  // Layout responsiveness state
  readonly isCollapsed = signal<boolean>(false);
  readonly isMobileActive = signal<boolean>(false);

  // Computeds derived from AuthService
  readonly isAdmin = computed(() => this.authService.isAdmin());
  readonly isReclutador = computed(() => this.authService.isReclutador());
  
  readonly userFullName = computed(() => {
    const user = this.authService.currentUser();
    return user ? `${user.nombre} ${user.apellido}` : 'Usuario';
  });

  readonly userRole = computed(() => {
    return this.authService.currentUser()?.rol || '';
  });

  readonly userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 'US';
    const first = user.nombre?.[0] || '';
    const last = user.apellido?.[0] || '';
    return (first + last).toUpperCase();
  });

  toggleSidebar(): void {
    if (window.innerWidth <= 768) {
      this.isMobileActive.update(v => !v);
    } else {
      this.isCollapsed.update(v => !v);
    }
  }

  closeMobileSidebar(): void {
    if (window.innerWidth <= 768 && this.isMobileActive()) {
      this.isMobileActive.set(false);
    }
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
