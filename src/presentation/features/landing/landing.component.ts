import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  // Search signals
  readonly searchKeyword = signal<string>('');
  readonly searchLocation = signal<string>('');

  // Access auth state reactively
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;

  onKeywordChange(event: Event): void {
    this.searchKeyword.set((event.target as HTMLInputElement).value);
  }

  onLocationChange(event: Event): void {
    this.searchLocation.set((event.target as HTMLInputElement).value);
  }

  onSearch(event: Event): void {
    event.preventDefault();
    const keyword = this.searchKeyword().trim();
    const location = this.searchLocation().trim();

    if (!keyword && !location) {
      this.toastService.warning('Por favor, ingresa un puesto, palabra clave o ubicación.');
      return;
    }

    this.toastService.info(`Buscando "${keyword || 'Cualquier puesto'}" en "${location || 'Todas las ubicaciones'}"...`);
    
    setTimeout(() => {
      if (this.isAuthenticated()) {
        const user = this.currentUser();
        if (user) {
          this.router.navigate([user.rol === 'administrador' ? '/admin' : '/reclutador']);
        }
      } else {
        this.toastService.info('Inicia sesión para poder postularte a las ofertas de empleo.');
        this.router.navigate(['/login']);
      }
    }, 1500);
  }

  onCategoryClick(categoryName: string): void {
    this.toastService.info(`Explorando categoría: ${categoryName}`);
    if (!this.isAuthenticated()) {
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1000);
    }
  }
}
