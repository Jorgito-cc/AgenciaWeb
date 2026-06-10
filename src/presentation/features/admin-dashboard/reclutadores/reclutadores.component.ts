import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-admin-reclutadores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reclutadores.component.html',
  styleUrl: './reclutadores.component.css'
})
export class AdminReclutadoresComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Data signals
  readonly reclutadores = signal<any[]>([]);
  readonly empresas = signal<any[]>([]);

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
  readonly formTelefono = signal<number>(0);
  readonly formCargo = signal<string>('');
  readonly formEmpresaId = signal<string>('');
  readonly formEstado = signal<string>('ACTIVO');

  // Computed search filter
  readonly filteredReclutadores = computed(() => {
    let list = this.reclutadores();
    const search = this.searchTerm().toLowerCase().trim();

    if (search) {
      list = list.filter(r =>
        (r.nombre + ' ' + r.apellido).toLowerCase().includes(search) ||
        r.email?.toLowerCase().includes(search) ||
        r.cargo?.toLowerCase().includes(search)
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loadReclutadores();
    this.loadEmpresas();
  }

  loadReclutadores(): void {
    this.loadingData.set(true);
    const query = `
      query {
        listarReclutadores {
          id
          nombre
          apellido
          email
          telefonoReclutador
          cargo
          empresa {
            id
            nombre_comercial
          }
          estado
        }
      }
    `;

    this.gqlService.query<{ listarReclutadores: any[] }>(query).subscribe({
      next: (res) => {
        this.reclutadores.set(res.data?.listarReclutadores || []);
        this.loadingData.set(false);
      },
      error: () => {
        this.loadingData.set(false);
        this.toastService.error('Error al cargar la lista de reclutadores');
      }
    });
  }

  loadEmpresas(): void {
    const query = `
      query {
        listarEmpresas {
          id
          nombre_comercial
        }
      }
    `;
    this.gqlService.query<{ listarEmpresas: any[] }>(query).subscribe({
      next: (res) => {
        this.empresas.set(res.data?.listarEmpresas || []);
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
    this.formTelefono.set(0);
    this.formCargo.set('');
    this.formEmpresaId.set('');
    this.formEstado.set('ACTIVO');
    this.showModal.set(true);
  }

  openEditModal(rec: any): void {
    this.isEditing.set(true);
    this.formId.set(rec.id);
    this.formNombre.set(rec.nombre || '');
    this.formApellido.set(rec.apellido || '');
    this.formEmail.set(rec.email || '');
    this.formPassword.set('');
    this.formTelefono.set(rec.telefonoReclutador || 0);
    this.formCargo.set(rec.cargo || '');
    this.formEmpresaId.set(rec.empresa?.id || '');
    this.formEstado.set(rec.estado || 'ACTIVO');
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
      this.updateReclutador();
    } else {
      this.createReclutador();
    }
  }

  private createReclutador(): void {
    const mutation = `
      mutation CrearReclutador(
        $nombre: String
        $apellido: String
        $email: String
        $password: String
        $telefono: Int
        $cargo: String
        $empresaId: UUID
        $estado: String
      ) {
        crearReclutador(
          nombre: $nombre
          apellido: $apellido
          email: $email
          password: $password
          telefono: $telefono
          cargo: $cargo
          empresa_id: $empresaId
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
      telefono: this.formTelefono() || null,
      cargo: this.formCargo() || null,
      empresaId: this.formEmpresaId() || null,
      estado: this.formEstado()
    };

    this.gqlService.mutate(mutation, variables).subscribe({
      next: () => {
        this.submittingForm.set(false);
        this.toastService.success('Reclutador registrado con éxito');
        this.closeModal();
        this.loadReclutadores();
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error(err.message || 'Error al registrar reclutador');
      }
    });
  }

  private updateReclutador(): void {
    const mutation = `
      mutation ActualizarReclutador(
        $id: UUID!
        $nombre: String
        $apellido: String
        $email: String
        $telefono: Int
        $cargo: String
        $empresaId: UUID
        $estado: String
      ) {
        actualizarReclutador(
          id: $id
          nombre: $nombre
          apellido: $apellido
          email: $email
          telefono: $telefono
          cargo: $cargo
          empresa_id: $empresaId
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
      telefono: this.formTelefono() || null,
      cargo: this.formCargo() || null,
      empresaId: this.formEmpresaId() || null,
      estado: this.formEstado()
    };

    this.gqlService.mutate(mutation, variables).subscribe({
      next: () => {
        this.submittingForm.set(false);
        this.toastService.success('Reclutador actualizado con éxito');
        this.closeModal();
        this.loadReclutadores();
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error(err.message || 'Error al actualizar reclutador');
      }
    });
  }

  deleteReclutador(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este reclutador?')) {
      return;
    }

    const mutation = `
      mutation EliminarReclutador($id: UUID!) {
        eliminarReclutador(id: $id)
      }
    `;

    this.gqlService.mutate<{ eliminarReclutador: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarReclutador) {
          this.toastService.success('Reclutador eliminado con éxito');
          this.loadReclutadores();
        } else {
          this.toastService.error('No se pudo eliminar el reclutador');
        }
      },
      error: (err) => {
        this.toastService.error(err.message || 'Error al eliminar reclutador');
      }
    });
  }
}
