import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-recruiter-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class RecruiterDashboardComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  // Profile data signals
  readonly recruiterId = signal<string>('');
  readonly companyName = signal<string>('');

  // Stats signals
  readonly myOffersCount = signal<number>(0);
  readonly totalPostulationsCount = signal<number>(0);
  readonly hiredCount = signal<number>(0);

  // Pipeline lists
  readonly postulations = signal<any[]>([]);
  readonly loadingData = signal<boolean>(false);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.recruiterId.set(user.id);
      this.loadRecruiterProfileAndData();
    }
  }

  loadRecruiterProfileAndData(): void {
    this.loadingData.set(true);
    
    // 1. Get profile to find their company
    const profileQuery = `
      query ObtenerReclutador($id: UUID!) {
        obtenerReclutador(id: $id) {
          empresa {
            nombre_comercial
          }
        }
      }
    `;

    this.gqlService.query<{ obtenerReclutador: any }>(profileQuery, { id: this.recruiterId() }).subscribe({
      next: (profileRes) => {
        const empresa = profileRes.data?.obtenerReclutador?.empresa;
        if (empresa) {
          this.companyName.set(empresa.nombre_comercial || 'Mi Empresa');
        }
        this.fetchBusinessStatsAndPipeline();
      },
      error: () => {
        this.loadingData.set(false);
        this.toastService.error('Error al cargar perfil de reclutador');
      }
    });
  }

  private fetchBusinessStatsAndPipeline(): void {
    const offersQuery = `
      query ListarOfertasPorReclutador($recruiterId: UUID!) {
        listarOfertasPorReclutador(reclutadorId: $recruiterId) {
          id
          reclutador {
            id
          }
        }
      }
    `;

    const postulationsQuery = `
      query ListarPostulacionesPorReclutador($recruiterId: UUID!) {
        listarPostulacionesPorReclutador(reclutadorId: $recruiterId) {
          id
          fecha
          fase_alcanzada
          id_cv
          candidato {
            nombre
            apellido
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

    const recId = this.recruiterId();

    forkJoin({
      offers: this.gqlService.query<{ listarOfertasPorReclutador: any[] }>(offersQuery, { recruiterId: recId }),
      postulations: this.gqlService.query<{ listarPostulacionesPorReclutador: any[] }>(postulationsQuery, { recruiterId: recId })
    }).subscribe({
      next: (res) => {
        const myOffers = res.offers.data?.listarOfertasPorReclutador || [];
        this.myOffersCount.set(myOffers.length);

        const filteredPosts = res.postulations.data?.listarPostulacionesPorReclutador || [];
        this.postulations.set(filteredPosts);

        // Calculate counts
        this.totalPostulationsCount.set(filteredPosts.length);
        
        const hired = filteredPosts.filter(
          p => (p.fase_alcanzada || '').toLowerCase() === 'contratado'
        );
        this.hiredCount.set(hired.length);

        this.loadingData.set(false);
      },
      error: () => {
        this.loadingData.set(false);
        this.toastService.error('Error al cargar datos del pipeline ATS');
      }
    });
  }

  postulationsByPhase(phase: string): any[] {
    return this.postulations().filter(
      p => (p.fase_alcanzada || 'recibido').toLowerCase() === phase.toLowerCase()
    );
  }

  movePhase(postulationId: string, newPhase: string): void {
    const mutation = `
      mutation ActualizarPostulacion($id: UUID!, $faseAlcanzada: String) {
        actualizarPostulacion(id: $id, fase_alcanzada: $faseAlcanzada) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, {
      id: postulationId,
      faseAlcanzada: newPhase
    }).subscribe({
      next: () => {
        this.toastService.success(`Postulante movido a la fase: ${newPhase.toUpperCase()}`);
        this.fetchBusinessStatsAndPipeline();
      },
      error: (err) => {
        this.toastService.error(err.message || 'Error al actualizar fase del postulante');
      }
    });
  }
}
