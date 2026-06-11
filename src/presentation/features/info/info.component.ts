import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { GraphQLService } from '../../../core/services/graphql.service';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './info.component.html',
  styleUrl: './info.component.css'
})
export class InfoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly graphqlService = inject(GraphQLService);

  readonly section = signal<string>('');
  readonly isAuthenticated = this.authService.isAuthenticated;

  // Empty signals by default (no static mock data)
  readonly jobs = signal<any[]>([]);
  readonly companies = signal<any[]>([]);

  // Mock data for resources
  readonly resources = signal([
    { id: 1, title: 'Cómo escribir un CV de Impacto en 2026', readTime: '5 min', desc: 'Guía paso a paso con plantillas editables para captar la atención de reclutadores tecnológicos.', tag: 'CV & Perfil' },
    { id: 2, title: 'Preparación para Entrevistas Técnicas', readTime: '8 min', desc: 'Preguntas clave de algoritmos, arquitectura de software y habilidades blandas necesarias para pasar filtros.', tag: 'Entrevistas' },
    { id: 3, title: 'Guía de Negociación Salarial B2B', readTime: '6 min', desc: 'Consejos prácticos y datos de mercado sobre cómo justificar tu remuneración y pactar bonificaciones.', tag: 'Carrera Profesional' },
    { id: 4, title: 'Marca Personal en LinkedIn para Desarrolladores', readTime: '4 min', desc: 'Optimiza tu perfil para recibir ofertas pasivas directamente de recruiters corporativos.', tag: 'Redes Profesionales' }
  ]);

  // Search keyword for jobs page
  readonly jobFilter = signal<string>('');

  ngOnInit(): void {
    // Detect route configuration path
    this.route.url.subscribe(urlSegments => {
      const path = urlSegments[0]?.path || '';
      this.section.set(path);
      if (path === 'empleos') {
        this.fetchRealJobs();
      } else if (path === 'empresas') {
        this.fetchRealCompanies();
      }
    });
  }

  fetchRealJobs(): void {
    const query = `
      query {
        listarOfertas {
          id
          titulo
          descripcion
          contrato
          requisitos
          experiencia_tiempo
          modalidad_trabajo
          sueldo
          categoria {
            nombre
          }
          reclutador {
            empresa {
              nombre_comercial
            }
          }
        }
      }
    `;

    this.graphqlService.query<any>(query, {}, 'springboot').subscribe({
      next: (response) => {
        if (response?.data?.listarOfertas) {
          const mappedJobs = response.data.listarOfertas.map((item: any) => ({
            id: item.id,
            title: item.titulo,
            company: item.reclutador?.empresa?.nombre_comercial || 'Empresa Aliada',
            location: item.modalidad_trabajo || 'Remoto',
            salary: item.sueldo ? `$${item.sueldo.toLocaleString()}` : 'A convenir',
            category: item.categoria?.nombre || 'General',
            type: item.contrato || 'Tiempo Completo'
          }));
          this.jobs.set(mappedJobs);
        }
      },
      error: (err) => {
        console.error('Error fetching real jobs from SpringBoot:', err);
      }
    });
  }

  fetchRealCompanies(): void {
    const query = `
      query {
        listarEmpresas {
          id
          nombre_comercial
          direccion
          celular
        }
      }
    `;

    this.graphqlService.query<any>(query, {}, 'springboot').subscribe({
      next: (response) => {
        if (response?.data?.listarEmpresas) {
          const colors = [
            { bg: '#eff6ff', color: '#3b82f6' },
            { bg: '#f5f3ff', color: '#7c3aed' },
            { bg: '#ecfdf5', color: '#10b981' },
            { bg: '#fffbeb', color: '#f59e0b' },
            { bg: '#fdf2f8', color: '#ec4899' }
          ];
          const mappedCompanies = response.data.listarEmpresas.map((item: any, idx: number) => {
            const style = colors[idx % colors.length];
            return {
              id: item.id,
              name: item.nombre_comercial || 'Empresa Asociada',
              sector: 'Socio Comercial',
              jobsCount: 0,
              desc: item.direccion || 'Sin dirección registrada.',
              bg: style.bg,
              color: style.color,
              letter: (item.nombre_comercial || 'E')[0].toUpperCase()
            };
          });
          this.companies.set(mappedCompanies);
        }
      },
      error: (err) => {
        console.error('Error fetching real companies from SpringBoot:', err);
      }
    });
  }

  onJobSearch(event: Event): void {
    this.jobFilter.set((event.target as HTMLInputElement).value);
  }

  applyToJob(jobTitle: string): void {
    if (this.isAuthenticated()) {
      this.toastService.success(`¡Postulación enviada exitosamente para: ${jobTitle}!`);
    } else {
      this.toastService.warning('Debes iniciar sesión para postularte a esta oferta.');
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
    }
  }

  getFilteredJobs() {
    const filter = this.jobFilter().toLowerCase().trim();
    if (!filter) return this.jobs();
    return this.jobs().filter(j =>
      j.title.toLowerCase().includes(filter) ||
      j.company.toLowerCase().includes(filter) ||
      j.category.toLowerCase().includes(filter) ||
      j.location.toLowerCase().includes(filter)
    );
  }
}
