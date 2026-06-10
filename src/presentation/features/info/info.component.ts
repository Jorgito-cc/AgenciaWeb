import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

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

  readonly section = signal<string>('');
  readonly isAuthenticated = this.authService.isAuthenticated;

  // Mock data for jobs
  readonly jobs = signal([
    { id: 1, title: 'Desarrollador Fullstack Angular/Node', company: 'TechSolutions', location: 'Remoto', salary: '$2,500 - $3,500', category: 'Tecnología', type: 'Tiempo Completo' },
    { id: 2, title: 'Administrador de Servidores Cloud', company: 'GlobalData', location: 'Bogotá, CO', salary: '$1,800 - $2,400', category: 'Tecnología', type: 'Tiempo Completo' },
    { id: 3, title: 'Gerente Administrativo', company: 'Inversiones Omega', location: 'Lima, PE', salary: '$3,000 - $4,000', category: 'Administración', type: 'Tiempo Completo' },
    { id: 4, title: 'Ejecutivo de Ventas B2B', company: 'SaaSify', location: 'Santiago, CL', salary: '$1,500 + comisiones', category: 'Ventas', type: 'Tiempo Completo' },
    { id: 5, title: 'Especialista en Growth Marketing', company: 'AdVance Agency', location: 'Remoto', salary: '$2,000 - $2,800', category: 'Marketing', type: 'Medio Tiempo' },
    { id: 6, title: 'Agente de Soporte al Cliente Bilingüe', company: 'HelpCenter Inc', location: 'Remoto', salary: '$900 - $1,200', category: 'Atención al cliente', type: 'Tiempo Completo' }
  ]);

  // Mock data for companies
  readonly companies = signal([
    { id: 1, name: 'TechSolutions', sector: 'Tecnología y Software', jobsCount: 14, desc: 'Líder en desarrollo de soluciones a la medida para empresas en LATAM.', bg: '#eff6ff', color: '#3b82f6', letter: 'T' },
    { id: 2, name: 'GlobalData', sector: 'Seguridad e Infraestructura', jobsCount: 5, desc: 'Especialistas en cloud hosting, auditoría de sistemas e infraestructura TI.', bg: '#f5f3ff', color: '#7c3aed', letter: 'G' },
    { id: 3, name: 'Inversiones Omega', sector: 'Servicios Financieros', jobsCount: 8, desc: 'Grupo multinacional de asesoría financiera, contabilidad y auditorías legales.', bg: '#ecfdf5', color: '#10b981', letter: 'I' },
    { id: 4, name: 'AdVance Agency', sector: 'Marketing y Publicidad', jobsCount: 12, desc: 'Agencia creativa enfocada en posicionamiento digital y campañas SEO globales.', bg: '#fffbeb', color: '#f59e0b', letter: 'A' },
    { id: 5, name: 'SaaSify', sector: 'Software como Servicio (SaaS)', jobsCount: 9, desc: 'Plataforma líder en automatización de ventas para medianas empresas.', bg: '#fdf2f8', color: '#ec4899', letter: 'S' }
  ]);

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
