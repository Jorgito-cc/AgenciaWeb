import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-admin-candidatos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './candidatos.component.html',
  styleUrl: './candidatos.component.css'
})
export class AdminCandidatosComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Data signals
  readonly candidatos = signal<any[]>([]);

  // Search signal
  readonly searchTerm = signal<string>('');

  // UI indicators signals
  readonly loadingData = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly submittingForm = signal<boolean>(false);

  // Form fields signals
  readonly formId = signal<string>('');
  readonly formNombre = signal<string>('');
  readonly formApellido = signal<string>('');
  readonly formEmail = signal<string>('');
  readonly formPassword = signal<string>('');
  readonly formSueldoEsperado = signal<number>(0);
  readonly formModalidad = signal<string>('');
  readonly formNivelEducativo = signal<string>('');
  readonly formNacionalidad = signal<string>('');
  readonly formEstado = signal<string>('ACTIVO');

  // Computed search filter
  readonly filteredCandidatos = computed(() => {
    let list = this.candidatos();
    const search = this.searchTerm().toLowerCase().trim();

    if (search) {
      list = list.filter(c =>
        (c.nombre + ' ' + c.apellido).toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.nacionalidad?.toLowerCase().includes(search)
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loadCandidatos();
  }

  loadCandidatos(): void {
    this.loadingData.set(true);
    const query = `
      query {
        listarCandidatos {
          id
          nombre
          apellido
          email
          sueldo_esperado
          modalidad_preferida
          nivel_educativo
          nacionalidad
          cluster_id
          estado
        }
      }
    `;

    this.gqlService.query<{ listarCandidatos: any[] }>(query).subscribe({
      next: (res) => {
        this.candidatos.set(res.data?.listarCandidatos || []);
        this.loadingData.set(false);
      },
      error: () => {
        this.loadingData.set(false);
        this.toastService.error('Error al cargar la lista de candidatos');
      }
    });
  }

  onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.formId.set('');
    this.formNombre.set('');
    this.formApellido.set('');
    this.formEmail.set('');
    this.formPassword.set('');
    this.formSueldoEsperado.set(0);
    this.formModalidad.set('');
    this.formNivelEducativo.set('');
    this.formNacionalidad.set('');
    this.formEstado.set('ACTIVO');
    this.showModal.set(true);
  }

  openEditModal(cand: any): void {
    this.isEditing.set(true);
    this.formId.set(cand.id);
    this.formNombre.set(cand.nombre || '');
    this.formApellido.set(cand.apellido || '');
    this.formEmail.set(cand.email || '');
    this.formPassword.set('');
    this.formSueldoEsperado.set(cand.sueldo_esperado || 0);
    this.formModalidad.set(cand.modalidad_preferida || '');
    this.formNivelEducativo.set(cand.nivel_educativo || '');
    this.formNacionalidad.set(cand.nacionalidad || '');
    this.formEstado.set(cand.estado || 'ACTIVO');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onModalSubmit(event: Event): void {
    event.preventDefault();
    if (!this.formNombre() || !this.formApellido() || !this.formEmail()) {
      this.toastService.warning('Por favor completa los campos requeridos');
      return;
    }

    this.submittingForm.set(true);

    if (this.isEditing()) {
      this.updateCandidato();
    } else {
      this.createCandidato();
    }
  }

  private createCandidato(): void {
    const mutation = `
      mutation CrearCandidato(
        $nombre: String
        $apellido: String
        $email: String
        $password: String
        $sueldoEsperado: Float
        $modalidadPreferida: String
        $nivelEducativo: String
        $nacionalidad: String
        $estado: String
      ) {
        crearCandidato(
          nombre: $nombre
          apellido: $apellido
          email: $email
          password: $password
          sueldo_esperado: $sueldoEsperado
          modalidad_preferida: $modalidadPreferida
          nivel_educativo: $nivelEducativo
          nacionalidad: $nacionalidad
          estado: $estado
        ) {
          id
        }
      }
    `;

    const variables = {
      nombre: this.formNombre(),
      apellido: this.formApellido(),
      email: this.formEmail(),
      password: this.formPassword() || null,
      sueldoEsperado: this.formSueldoEsperado() || null,
      modalidadPreferida: this.formModalidad() || null,
      nivelEducativo: this.formNivelEducativo() || null,
      nacionalidad: this.formNacionalidad() || null,
      estado: this.formEstado()
    };

    this.gqlService.mutate(mutation, variables).subscribe({
      next: () => {
        this.submittingForm.set(false);
        this.toastService.success('Candidato registrado con éxito');
        this.closeModal();
        this.loadCandidatos();
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error(err.message || 'Error al registrar candidato');
      }
    });
  }

  private updateCandidato(): void {
    const mutation = `
      mutation ActualizarCandidato(
        $id: UUID!
        $nombre: String
        $apellido: String
        $email: String
        $sueldoEsperado: Float
        $modalidadPreferida: String
        $nivelEducativo: String
        $nacionalidad: String
        $estado: String
      ) {
        actualizarCandidato(
          id: $id
          nombre: $nombre
          apellido: $apellido
          email: $email
          sueldo_esperado: $sueldoEsperado
          modalidad_preferida: $modalidadPreferida
          nivel_educativo: $nivelEducativo
          nacionalidad: $nacionalidad
          estado: $estado
        ) {
          id
        }
      }
    `;

    const variables = {
      id: this.formId(),
      nombre: this.formNombre(),
      apellido: this.formApellido(),
      email: this.formEmail(),
      sueldoEsperado: this.formSueldoEsperado() || null,
      modalidadPreferida: this.formModalidad() || null,
      nivelEducativo: this.formNivelEducativo() || null,
      nacionalidad: this.formNacionalidad() || null,
      estado: this.formEstado()
    };

    this.gqlService.mutate(mutation, variables).subscribe({
      next: () => {
        this.submittingForm.set(false);
        this.toastService.success('Candidato actualizado con éxito');
        this.closeModal();
        this.loadCandidatos();
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error(err.message || 'Error al actualizar candidato');
      }
    });
  }

  deleteCandidato(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este candidato?')) {
      return;
    }

    const mutation = `
      mutation EliminarCandidato($id: UUID!) {
        eliminarCandidato(id: $id)
      }
    `;

    this.gqlService.mutate<{ eliminarCandidato: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarCandidato) {
          this.toastService.success('Candidato eliminado con éxito');
          this.loadCandidatos();
        } else {
          this.toastService.error('No se pudo eliminar el candidato');
        }
      },
      error: (err) => {
        this.toastService.error(err.message || 'Error al eliminar candidato');
      }
    });
  }

  formatCurrency(value: number | null): string {
    if (!value) return '-';
    return '$' + value.toLocaleString('es-CO');
  }
}
