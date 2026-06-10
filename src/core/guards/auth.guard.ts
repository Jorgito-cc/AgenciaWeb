import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Ensures user is authenticated before accessing private routes
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login
  router.navigate(['/login']);
  return false;
};

/**
 * Enforces role restrictions on specific routes
 * @param allowedRoles list of roles authorized for this route
 */
export const roleGuard = (allowedRoles: ('administrador' | 'reclutador')[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.currentUser();

    if (user && allowedRoles.includes(user.rol)) {
      return true;
    }

    if (!user) {
      router.navigate(['/login']);
    } else {
      // Redirect to their own dashboard if role is incorrect
      router.navigate([user.rol === 'administrador' ? '/admin' : '/reclutador']);
    }
    return false;
  };
};
