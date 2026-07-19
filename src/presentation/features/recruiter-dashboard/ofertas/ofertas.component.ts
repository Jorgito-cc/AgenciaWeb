import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-recruiter-ofertas',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './ofertas.component.html',
  styleUrl: './ofertas.component.css'
})
export class RecruiterOfertasComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly recruiterId = signal<string>('');

  // Data lists
  readonly ofertas = signal<any[]>([]);
  readonly categorias = signal<any[]>([]);

  // Search signals
  readonly searchTerm = signal<string>('');

  // UI state indicators
  readonly loadingOfertas = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly submittingForm = signal<boolean>(false);

  // Form field bindings
  readonly formId = signal<string>('');
  readonly formTitulo = signal<string>('');
  readonly formDescripcion = signal<string>('');
  readonly formRequisitos = signal<string>('');
  readonly formSueldo = signal<number>(0);
  readonly formContrato = signal<string>('');
  readonly formModalidad = signal<string>('Presencial');
  readonly formExperiencia = signal<number>(0);
  readonly formCategoriaId = signal<string>('');
  readonly formEstado = signal<string>('ACTIVO');

  readonly filteredOfertas = computed(() => {
    const list = this.ofertas().filter(o => !o.reclutador || !o.reclutador.id || o.reclutador.id === this.recruiterId());
    const search = this.searchTerm().toLowerCase().trim();

    if (search) {
      return list.filter(o =>
        o.titulo?.toLowerCase().includes(search) ||
        o.requisitos?.toLowerCase().includes(search)
      );
    }
    return list;
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.recruiterId.set(user.id);
    }
    this.loadOfertas();
    this.loadCategorias();
  }
  loadOfertas(): void {
    this.loadingOfertas.set(true);
    const query = `
      query ListarOfertasPorReclutador($recruiterId: UUID!) {
        listarOfertasPorReclutador(reclutadorId: $recruiterId) {
          id
          titulo
          descripcion
          contrato
          requisitos
          experiencia_tiempo
          modalidad_trabajo
          estado
          sueldo
          cluster_id
          categoria {
            id
            nombre
          }
          reclutador {
            id
          }
        }
      }
    `;

    this.gqlService.query<{ listarOfertasPorReclutador: any[] }>(query, { recruiterId: this.recruiterId() }).subscribe({
      next: (res) => {
        this.ofertas.set(res.data?.listarOfertasPorReclutador || []);
        this.loadingOfertas.set(false);
      },
      error: () => {
        this.loadingOfertas.set(false);
        this.toastService.error('Error al cargar la lista de ofertas');
      }
    });
  }
  loadCategorias(): void {
    const query = `
      query {
        listarCategorias {
          id
          nombre
        }
      }
    `;
    this.gqlService.query<{ listarCategorias: any[] }>(query).subscribe({
      next: (res) => {
        this.categorias.set(res.data?.listarCategorias || []);
      }
    });
  }

  onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.formId.set('');
    this.formTitulo.set('');
    this.formDescripcion.set('');
    this.formRequisitos.set('');
    this.formSueldo.set(0);
    this.formContrato.set('');
    this.formModalidad.set('Presencial');
    this.formExperiencia.set(0);
    this.formCategoriaId.set('');
    this.formEstado.set('ACTIVO');
    this.showModal.set(true);
  }

  openEditModal(of: any): void {
    this.isEditing.set(true);
    this.formId.set(of.id);
    this.formTitulo.set(of.titulo || '');
    this.formDescripcion.set(of.descripcion || '');
    this.formRequisitos.set(of.requisitos || '');
    this.formSueldo.set(of.sueldo || 0);
    this.formContrato.set(of.contrato || '');
    this.formModalidad.set(of.modalidad_trabajo || 'Presencial');
    this.formExperiencia.set(of.experiencia_tiempo || 0);
    this.formCategoriaId.set(of.categoria?.id || '');
    this.formEstado.set(of.estado || 'ACTIVO');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onModalSubmit(event: Event): void {
    event.preventDefault();
    if (!this.formTitulo() || !this.formDescripcion() || !this.formSueldo() || !this.formCategoriaId()) {
      this.toastService.warning('Por favor llena todos los campos obligatorios');
      return;
    }

    this.submittingForm.set(true);

    if (this.isEditing()) {
      this.updateOferta();
    } else {
      this.createOferta();
    }
  }

  private createOferta(): void {
    const mutation = `
      mutation CrearOferta(
        $titulo: String
        $descripcion: String
        $contrato: String
        $requisitos: String
        $experienciaTiempo: Int
        $modalidadTrabajo: String
        $estado: String
        $sueldo: Float
        $categoriaId: UUID
        $reclutadorId: UUID
      ) {
        crearOferta(
          titulo: $titulo
          descripcion: $descripcion
          contrato: $contrato
          requisitos: $requisitos
          experiencia_tiempo: $experienciaTiempo
          modalidad_trabajo: $modalidadTrabajo
          estado: $estado
          sueldo: $sueldo
          categoria_id: $categoriaId
          reclutador_id: $reclutadorId
        ) {
          id
        }
      }
    `;

    const variables = {
      titulo: this.formTitulo(),
      descripcion: this.formDescripcion(),
      contrato: this.formContrato() || null,
      requisitos: this.formRequisitos() || null,
      experienciaTiempo: this.formExperiencia() || null,
      modalidadTrabajo: this.formModalidad(),
      estado: this.formEstado(),
      sueldo: this.formSueldo(),
      categoriaId: this.formCategoriaId(),
      reclutadorId: this.recruiterId()
    };

    this.gqlService.mutate<{ crearOferta: any }>(mutation, variables).subscribe({
      next: (res) => {
        const id = res.data?.crearOferta?.id;
        if (id) {
          this.triggerClassification(id, 'creada');
        } else {
          this.submittingForm.set(false);
          this.toastService.success('Vacante publicada con éxito');
          this.closeModal();
          this.loadOfertas();
        }
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error(err.message || 'Error al guardar la oferta');
      }
    });
  }

  private updateOferta(): void {
    const mutation = `
      mutation ActualizarOferta(
        $id: UUID!
        $titulo: String
        $descripcion: String
        $contrato: String
        $requisitos: String
        $experienciaTiempo: Int
        $modalidadTrabajo: String
        $estado: String
        $sueldo: Float
        $categoriaId: UUID
        $reclutadorId: UUID
      ) {
        actualizarOferta(
          id: $id
          titulo: $titulo
          descripcion: $descripcion
          contrato: $contrato
          requisitos: $requisitos
          experiencia_tiempo: $experienciaTiempo
          modalidad_trabajo: $modalidadTrabajo
          estado: $estado
          sueldo: $sueldo
          categoria_id: $categoriaId
          reclutador_id: $reclutadorId
        ) {
          id
        }
      }
    `;

    const variables = {
      id: this.formId(),
      titulo: this.formTitulo(),
      descripcion: this.formDescripcion(),
      contrato: this.formContrato() || null,
      requisitos: this.formRequisitos() || null,
      experienciaTiempo: this.formExperiencia() || null,
      modalidadTrabajo: this.formModalidad(),
      estado: this.formEstado(),
      sueldo: this.formSueldo(),
      categoriaId: this.formCategoriaId(),
      reclutadorId: this.recruiterId()
    };

    this.gqlService.mutate<{ actualizarOferta: any }>(mutation, variables).subscribe({
      next: (res) => {
        const id = res.data?.actualizarOferta?.id;
        if (id) {
          this.triggerClassification(id, 'actualizada');
        } else {
          this.submittingForm.set(false);
          this.toastService.success('Vacante actualizada');
          this.closeModal();
          this.loadOfertas();
        }
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error(err.message || 'Error al actualizar la oferta');
      }
    });
  }

  private triggerClassification(id: string, actionText: string): void {
    const mutation = `
      mutation ClasificarOferta($id: UUID!) {
        clasificarOferta(id: $id)
      }
    `;

    this.gqlService.mutate<{ clasificarOferta: number }>(mutation, { id }).subscribe({
      next: (res) => {
        this.submittingForm.set(false);
        const cluster = res.data?.clasificarOferta;
        this.toastService.success(`Vacante ${actionText} y clasificada automáticamente en el Clúster ${cluster}`);
        this.closeModal();
        this.loadOfertas();
      },
      error: () => {
        this.submittingForm.set(false);
        this.toastService.success(`Vacante ${actionText} con éxito (clasificación pendiente)`);
        this.closeModal();
        this.loadOfertas();
      }
    });
  }

  deleteOferta(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta oferta?')) {
      return;
    }

    const mutation = `
      mutation EliminarOferta($id: UUID!) {
        eliminarOferta(id: $id)
      }
    `;

    this.gqlService.mutate<{ eliminarOferta: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarOferta) {
          this.toastService.success('Vacante eliminada con éxito');
          this.loadOfertas();
        } else {
          this.toastService.error('No se pudo eliminar la vacante');
        }
      },
      error: (err) => {
        this.toastService.error(err.message || 'Error al eliminar la vacante');
      }
    });
  }
}
