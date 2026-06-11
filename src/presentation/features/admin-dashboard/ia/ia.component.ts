import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

interface ClusterInfo {
  id: string;
  clusterNumero: number;
  nombre: string;
  tipo: string;
  fechaEntrenamiento: string;
}

@Component({
  selector: 'app-admin-ia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ia.component.html',
  styleUrl: './ia.component.css'
})
export class AdminIAComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Loading existing data states
  readonly loadingCandidatoClusters = signal<boolean>(false);
  readonly loadingOfertaClusters = signal<boolean>(false);

  // Data signals
  readonly candidatoClusters = signal<ClusterInfo[]>([]);
  readonly ofertaClusters = signal<ClusterInfo[]>([]);

  // Computed properties
  readonly candidatosTrained = computed(() => this.candidatoClusters().length > 0);
  readonly ofertasTrained = computed(() => this.ofertaClusters().length > 0);
  
  readonly candidatosLastTrainedDate = computed(() => {
    const list = this.candidatoClusters();
    if (list.length === 0) return null;
    // Get the latest date
    const dates = list.map(c => new Date(c.fechaEntrenamiento).getTime());
    return new Date(Math.max(...dates));
  });

  readonly ofertasLastTrainedDate = computed(() => {
    const list = this.ofertaClusters();
    if (list.length === 0) return null;
    const dates = list.map(c => new Date(c.fechaEntrenamiento).getTime());
    return new Date(Math.max(...dates));
  });

  // Action training states
  readonly trainingCandidatos = signal<boolean>(false);
  readonly trainingOfertas = signal<boolean>(false);

  // Modal signals
  readonly showModal = signal<boolean>(false);
  readonly modalData = signal<{
    type: 'candidatos' | 'ofertas';
    success: boolean;
    title: string;
    message: string;
    total: number;
    k: number;
    clusters: ClusterInfo[];
  }>({
    type: 'candidatos',
    success: false,
    title: '',
    message: '',
    total: 0,
    k: 0,
    clusters: []
  });

  ngOnInit(): void {
    this.loadCandidatoClusters();
    this.loadOfertaClusters();
  }

  loadCandidatoClusters(): void {
    this.loadingCandidatoClusters.set(true);
    const query = `
      query {
        listarClustersPorTipo(tipo: "CANDIDATO") {
          id
          clusterNumero
          nombre
          tipo
          fechaEntrenamiento
        }
      }
    `;

    this.gqlService.query<{ listarClustersPorTipo: ClusterInfo[] }>(query).subscribe({
      next: (res) => {
        // Sort by cluster number
        const list = res.data?.listarClustersPorTipo || [];
        list.sort((a, b) => a.clusterNumero - b.clusterNumero);
        this.candidatoClusters.set(list);
        this.loadingCandidatoClusters.set(false);
      },
      error: () => {
        this.loadingCandidatoClusters.set(false);
        this.toastService.error('Error al cargar clústeres de candidatos');
      }
    });
  }

  loadOfertaClusters(): void {
    this.loadingOfertaClusters.set(true);
    const query = `
      query {
        listarClustersPorTipo(tipo: "OFERTA") {
          id
          clusterNumero
          nombre
          tipo
          fechaEntrenamiento
        }
      }
    `;

    this.gqlService.query<{ listarClustersPorTipo: ClusterInfo[] }>(query).subscribe({
      next: (res) => {
        const list = res.data?.listarClustersPorTipo || [];
        list.sort((a, b) => a.clusterNumero - b.clusterNumero);
        this.ofertaClusters.set(list);
        this.loadingOfertaClusters.set(false);
      },
      error: () => {
        this.loadingOfertaClusters.set(false);
        this.toastService.error('Error al cargar clústeres de ofertas');
      }
    });
  }

  trainCandidatos(): void {
    this.trainingCandidatos.set(true);
    const mutation = `
      mutation {
        entrenarKMeansCandidatos
      }
    `;

    this.gqlService.mutate<{ entrenarKMeansCandidatos: string }>(mutation, {}, 'springboot').subscribe({
      next: (res) => {
        this.trainingCandidatos.set(false);
        const rawResponse = res.data?.entrenarKMeansCandidatos || '';
        
        // Parse the response
        const parsed = this.parseResponse(rawResponse);

        if (parsed.success) {
          this.toastService.success('Entrenamiento de Candidatos finalizado con éxito');
          
          // Re-load from DB so we get the fresh named clusters
          const query = `
            query {
              listarClustersPorTipo(tipo: "CANDIDATO") {
                id
                clusterNumero
                nombre
                tipo
                fechaEntrenamiento
              }
            }
          `;
          
          this.gqlService.query<{ listarClustersPorTipo: ClusterInfo[] }>(query).subscribe({
            next: (resClusters) => {
              const list = resClusters.data?.listarClustersPorTipo || [];
              list.sort((a, b) => a.clusterNumero - b.clusterNumero);
              this.candidatoClusters.set(list);

              // Open modal with the fresh data
              this.modalData.set({
                type: 'candidatos',
                success: true,
                title: 'Resultados del Agrupamiento de Candidatos',
                message: parsed.message || 'Se han agrupado los candidatos según sus similitudes de perfil.',
                total: parsed.total,
                k: parsed.k || list.length,
                clusters: list
              });
              this.showModal.set(true);
            },
            error: () => {
              // Show modal even if re-query fails, just without list
              this.modalData.set({
                type: 'candidatos',
                success: true,
                title: 'Resultados del Agrupamiento de Candidatos',
                message: parsed.message,
                total: parsed.total,
                k: parsed.k,
                clusters: []
              });
              this.showModal.set(true);
            }
          });
        } else {
          this.toastService.error(parsed.message || 'Error en el entrenamiento de candidatos');
        }
      },
      error: (err) => {
        this.trainingCandidatos.set(false);
        this.toastService.error(err.message || 'Error de conexión durante el entrenamiento de candidatos');
      }
    });
  }

  trainOfertas(): void {
    this.trainingOfertas.set(true);
    const mutation = `
      mutation {
        entrenarKMeansOfertas
      }
    `;

    this.gqlService.mutate<{ entrenarKMeansOfertas: string }>(mutation, {}, 'springboot').subscribe({
      next: (res) => {
        this.trainingOfertas.set(false);
        const rawResponse = res.data?.entrenarKMeansOfertas || '';
        
        // Parse response
        const parsed = this.parseResponse(rawResponse);

        if (parsed.success) {
          this.toastService.success('Entrenamiento de Ofertas finalizado con éxito');

          // Re-load from DB so we get the fresh named clusters
          const query = `
            query {
              listarClustersPorTipo(tipo: "OFERTA") {
                id
                clusterNumero
                nombre
                tipo
                fechaEntrenamiento
              }
            }
          `;

          this.gqlService.query<{ listarClustersPorTipo: ClusterInfo[] }>(query).subscribe({
            next: (resClusters) => {
              const list = resClusters.data?.listarClustersPorTipo || [];
              list.sort((a, b) => a.clusterNumero - b.clusterNumero);
              this.ofertaClusters.set(list);

              // Open modal with the fresh data
              this.modalData.set({
                type: 'ofertas',
                success: true,
                title: 'Resultados del Agrupamiento de Ofertas',
                message: parsed.message || 'Se han agrupado las ofertas laborales según categorías y habilidades.',
                total: parsed.total,
                k: parsed.k || list.length,
                clusters: list
              });
              this.showModal.set(true);
            },
            error: () => {
              this.modalData.set({
                type: 'ofertas',
                success: true,
                title: 'Resultados del Agrupamiento de Ofertas',
                message: parsed.message,
                total: parsed.total,
                k: parsed.k,
                clusters: []
              });
              this.showModal.set(true);
            }
          });
        } else {
          this.toastService.error(parsed.message || 'Error en el entrenamiento de ofertas');
        }
      },
      error: (err) => {
        this.trainingOfertas.set(false);
        this.toastService.error(err.message || 'Error de conexión durante el entrenamiento de ofertas');
      }
    });
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  /**
   * Parses Spring Boot response string:
   * e.g. "Entrenamiento de Candidatos completado: {success=true, message=Modelo KMeans Candidates entrenado (K=4), total=2000, asignaciones=[...]}"
   */
  private parseResponse(responseStr: string): { success: boolean; message: string; total: number; k: number } {
    try {
      const successMatch = responseStr.match(/success=([a-zA-Z0-9_]+)/);
      const messageMatch = responseStr.match(/message=([^,{}]+)/);
      const totalMatch = responseStr.match(/total=(\d+)/);
      const kMatch = responseStr.match(/K=(\d+)/);

      const success = successMatch ? successMatch[1] === 'true' : false;
      const message = messageMatch ? messageMatch[1].trim() : '';
      const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const k = kMatch ? parseInt(kMatch[1], 10) : 0;

      return { success, message, total, k };
    } catch (e) {
      return {
        success: false,
        message: 'No se pudo parsear la respuesta del servidor.',
        total: 0,
        k: 0
      };
    }
  }
}
