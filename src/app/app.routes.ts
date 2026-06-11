import { Routes } from '@angular/router';
import { LoginComponent } from '../presentation/features/auth/login/login.component';
import { LayoutComponent } from '../presentation/layout/layout.component';
import { PublicLayoutComponent } from '../presentation/layout/public-layout/public-layout.component';
import { authGuard, roleGuard } from '../core/guards/auth.guard';

export const routes: Routes = [
  // Public Shared Layout Routes
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../presentation/features/landing/landing.component').then(
            (m) => m.LandingComponent
          ),
        pathMatch: 'full'
      },
      { path: 'login', component: LoginComponent },
      {
        path: 'empleos',
        loadComponent: () =>
          import('../presentation/features/info/info.component').then(
            (m) => m.InfoComponent
          )
      },
      {
        path: 'empresas',
        loadComponent: () =>
          import('../presentation/features/info/info.component').then(
            (m) => m.InfoComponent
          )
      },
      {
        path: 'recursos',
        loadComponent: () =>
          import('../presentation/features/info/info.component').then(
            (m) => m.InfoComponent
          )
      },
      {
        path: 'sobre-nosotros',
        loadComponent: () =>
          import('../presentation/features/info/info.component').then(
            (m) => m.InfoComponent
          )
      }
    ]
  },

  // Admin Workspace Routes
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard(['administrador'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/dashboard/dashboard.component').then(
            (m) => m.AdminDashboardComponent
          )
      },
      {
        path: 'ia',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/ia/ia.component').then(
            (m) => m.AdminIAComponent
          )
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/usuarios/usuarios.component').then(
            (m) => m.AdminUsuariosComponent
          )
      },
      {
        path: 'empresas',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/empresas/empresas.component').then(
            (m) => m.AdminEmpresasComponent
          )
      },
      {
        path: 'metadata',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/metadata/metadata.component').then(
            (m) => m.AdminMetadataComponent
          )
      },
      {
        path: 'reclutadores',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/reclutadores/reclutadores.component').then(
            (m) => m.AdminReclutadoresComponent
          )
      },
      {
        path: 'candidatos',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/candidatos/candidatos.component').then(
            (m) => m.AdminCandidatosComponent
          )
      },
      {
        path: 'auditoria',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/auditoria/auditoria.component').then(
            (m) => m.AdminAuditoriaComponent
          )
      },
      {
        path: 'trabajos',
        loadComponent: () =>
          import('../presentation/features/admin-dashboard/trabajos/trabajos.component').then(
            (m) => m.AdminTrabajosComponent
          )
      },
      {
        path: 'soporte',
        loadComponent: () =>
          import('../presentation/features/shared/soporte/soporte').then(
            (m) => m.Soporte
          )
      }
    ]
  },

  // Recruiter Workspace Routes
  {
    path: 'reclutador',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard(['reclutador'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../presentation/features/recruiter-dashboard/dashboard/dashboard.component').then(
            (m) => m.RecruiterDashboardComponent
          )
      },
      {
        path: 'ofertas',
        loadComponent: () =>
          import('../presentation/features/recruiter-dashboard/ofertas/ofertas.component').then(
            (m) => m.RecruiterOfertasComponent
          )
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('../presentation/features/recruiter-dashboard/categorias/categorias.component').then(
            (m) => m.RecruiterCategoriasComponent
          )
      },
      {
        path: 'postulaciones',
        loadComponent: () =>
          import('../presentation/features/recruiter-dashboard/postulaciones/postulaciones.component').then(
            (m) => m.RecruiterPostulacionesComponent
          )
      },
      {
        path: 'soporte',
        loadComponent: () =>
          import('../presentation/features/shared/soporte/soporte').then(
            (m) => m.Soporte
          )
      }
    ]
  },

  // Wildcards
  { path: '**', redirectTo: '' }
];
