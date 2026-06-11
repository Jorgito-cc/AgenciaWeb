import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, TitleCasePipe } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-recruiter-postulaciones',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, TitleCasePipe],
  templateUrl: './postulaciones.component.html',
  styleUrl: './postulaciones.component.css'
})
export class RecruiterPostulacionesComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly recruiterId = signal<string>('');

  // Data lists
  readonly postulations = signal<any[]>([]);
  
  // Search query
  readonly searchTerm = signal<string>('');
  
  // Loading indicators
  readonly loadingPostulations = signal<boolean>(false);
  readonly loadingPrediction = signal<boolean>(false);

  // Modals visibility signals
  readonly showDetailModal = signal<boolean>(false);
  readonly showPredictionModal = signal<boolean>(false);

  // Selected item reference
  readonly selectedPostulation = signal<any | null>(null);

  // Match scores signals
  readonly matchScore = signal<number>(0);
  readonly matchRecommendation = signal<string>('');

  // Radial progress stroke math
  readonly circumference = 2 * Math.PI * 70; // Radius = 70, Circumference = 439.82
  readonly dashoffset = computed(() => {
    const score = this.matchScore();
    return this.circumference - (score / 100) * this.circumference;
  });

  // Filter postulations by recruiter's company and search query
  readonly filteredPostulations = computed(() => {
    const list = this.postulations().filter(
      p => p.oferta?.reclutador?.id === this.recruiterId()
    );
    const search = this.searchTerm().toLowerCase().trim();

    if (search) {
      return list.filter(p => 
        (p.candidato?.nombre + ' ' + p.candidato?.apellido).toLowerCase().includes(search) ||
        p.oferta?.titulo?.toLowerCase().includes(search)
      );
    }
    return list;
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.recruiterId.set(user.id);
    }
    this.loadPostulations();
  }

  loadPostulations(): void {
    this.loadingPostulations.set(true);
    const query = `
      query {
        listarPostulaciones {
          id
          fecha
          fase_alcanzada
          id_cv
          candidato {
            id
            nombre
            apellido
            email
            telefono
            nacionalidad
            nivel_educativo
            sueldo_esperado
            modalidad_preferida
          }
          oferta {
            id
            titulo
            reclutador {
              id
            }
          }
        }
      }
    `;

    this.gqlService.query<{ listarPostulaciones: any[] }>(query).subscribe({
      next: (res) => {
        this.postulations.set(res.data?.listarPostulaciones || []);
        this.loadingPostulations.set(false);
      },
      error: () => {
        this.loadingPostulations.set(false);
        this.toastService.error('Error al cargar la lista de postulaciones');
      }
    });
  }

  onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  openDetailModal(postulation: any): void {
    this.selectedPostulation.set(postulation);
    this.showDetailModal.set(true);
    this.predictMatch(postulation.id, false);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedPostulation.set(null);
  }

  predictMatch(postulationId: string, showModal = true): void {
    if (showModal) {
      this.showPredictionModal.set(true);
    }
    this.loadingPrediction.set(true);
    this.matchScore.set(0);

    const mutation = `
      mutation PredecirExitoPostulacion($id: UUID!) {
        predecirExitoPostulacion(id: $id)
      }
    `;

    this.gqlService.mutate<{ predecirExitoPostulacion: string }>(mutation, { id: postulationId }, 'springboot').subscribe({
      next: (res) => {
        const responseString = res.data?.predecirExitoPostulacion || '';
        
        // Parse the Java map toString response using Regex
        const probMatch = /probability=([\d.]+)/.exec(responseString);
        
        let score = 0;
        if (probMatch) {
          const val = parseFloat(probMatch[1]);
          score = val <= 1.0 ? Math.round(val * 100) : Math.round(val);
        }

        score = Math.max(0, Math.min(100, score));
        this.matchScore.set(score);

        if (score >= 70) {
          this.matchRecommendation.set('Compatibilidad Alta - Altamente Recomendado');
        } else if (score >= 40) {
          this.matchRecommendation.set('Compatibilidad Media - Evaluar Perfil');
        } else {
          this.matchRecommendation.set('Compatibilidad Baja - Revisar Alternativas');
        }

        this.loadingPrediction.set(false);
      },
      error: (err) => {
        this.loadingPrediction.set(false);
        if (showModal) {
          this.showPredictionModal.set(false);
        }
        this.toastService.error(err.message || 'Error al conectar con el motor de predicciones');
      }
    });
  }

  closePredictionModal(): void {
    this.showPredictionModal.set(false);
  }
}
