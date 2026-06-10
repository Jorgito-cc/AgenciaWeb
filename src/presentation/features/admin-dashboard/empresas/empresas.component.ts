import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-admin-empresas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empresas.component.html',
  styleUrl: './empresas.component.css'
})
export class AdminEmpresasComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Data signals
  readonly empresas = signal<any[]>([]);
  
  // Search signal
  readonly searchTerm = signal<string>('');
  
  // UI indicators signals
  readonly loadingEmpresas = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly submittingForm = signal<boolean>(false);

  // Form fields signals
  readonly formId = signal<string>('');
  readonly formNombreComercial = signal<string>('');
  readonly formNombreLegal = signal<string>('');
  readonly formNit = signal<number>(0);
  readonly formDireccion = signal<string>('');
  readonly formCelular = signal<number>(0);

  // Computed search filter
  readonly filteredEmpresas = computed(() => {
    let list = this.empresas();
    const search = this.searchTerm().toLowerCase().trim();

    if (search) {
      list = list.filter(e => 
        e.nombre_comercial?.toLowerCase().includes(search) || 
        e.nombre_legal?.toLowerCase().includes(search) ||
        String(e.nit).includes(search)
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loadEmpresas();
  }

  loadEmpresas(): void {
    this.loadingEmpresas.set(true);
    const query = `
      query {
        listarEmpresas {
          id
          nombre_legal
          nombre_comercial
          nit
          direccion
          celular
        }
      }
    `;

    this.gqlService.query<{ listarEmpresas: any[] }>(query).subscribe({
      next: (res) => {
        this.empresas.set(res.data?.listarEmpresas || []);
        this.loadingEmpresas.set(false);
      },
      error: () => {
        this.loadingEmpresas.set(false);
        this.toastService.error('Error al cargar la lista de empresas');
      }
    });
  }

  onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.formId.set('');
    this.formNombreComercial.set('');
    this.formNombreLegal.set('');
    this.formNit.set(0);
    this.formDireccion.set('');
    this.formCelular.set(0);
    this.showModal.set(true);
  }

  openEditModal(emp: any): void {
    this.isEditing.set(true);
    this.formId.set(emp.id);
    this.formNombreComercial.set(emp.nombre_comercial || '');
    this.formNombreLegal.set(emp.nombre_legal || '');
    this.formNit.set(emp.nit || 0);
    this.formDireccion.set(emp.direccion || '');
    this.formCelular.set(emp.celular || 0);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onModalSubmit(event: Event): void {
    event.preventDefault();
    if (!this.formNombreComercial()) {
      this.toastService.warning('El nombre comercial es obligatorio');
      return;
    }

    this.submittingForm.set(true);

    if (this.isEditing()) {
      this.updateEmpresa();
    } else {
      this.createEmpresa();
    }
  }

  private createEmpresa(): void {
    const mutation = `
      mutation CrearEmpresa(
        $nombreLegal: String
        $nombreComercial: String
        $nit: Int
        $direccion: String
        $celular: Int
      ) {
        crearEmpresa(
          nombre_legal: $nombreLegal
          nombre_comercial: $nombreComercial
          nit: $nit
          direccion: $direccion
          celular: $celular
        ) {
          id
        }
      }
    `;

    const variables = {
      nombreLegal: this.formNombreLegal(),
      nombreComercial: this.formNombreComercial(),
      nit: this.formNit() || null,
      direccion: this.formDireccion() || null,
      celular: this.formCelular() || null
    };

    this.gqlService.mutate(mutation, variables).subscribe({
      next: () => {
        this.submittingForm.set(false);
        this.toastService.success('Empresa registrada con éxito');
        this.closeModal();
        this.loadEmpresas();
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error(err.message || 'Error al registrar empresa');
      }
    });
  }

  private updateEmpresa(): void {
    const mutation = `
      mutation ActualizarEmpresa(
        $id: UUID!
        $nombreLegal: String
        $nombreComercial: String
        $nit: Int
        $direccion: String
        $celular: Int
      ) {
        actualizarEmpresa(
          id: $id
          nombre_legal: $nombreLegal
          nombre_comercial: $nombreComercial
          nit: $nit
          direccion: $direccion
          celular: $celular
        ) {
          id
        }
      }
    `;

    const variables = {
      id: this.formId(),
      nombreLegal: this.formNombreLegal(),
      nombreComercial: this.formNombreComercial(),
      nit: this.formNit() || null,
      direccion: this.formDireccion() || null,
      celular: this.formCelular() || null
    };

    this.gqlService.mutate(mutation, variables).subscribe({
      next: () => {
        this.submittingForm.set(false);
        this.toastService.success('Datos de empresa actualizados');
        this.closeModal();
        this.loadEmpresas();
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error(err.message || 'Error al actualizar empresa');
      }
    });
  }

  deleteEmpresa(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta empresa?')) {
      return;
    }

    const mutation = `
      mutation EliminarEmpresa($id: UUID!) {
        eliminarEmpresa(id: $id)
      }
    `;

    this.gqlService.mutate<{ eliminarEmpresa: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarEmpresa) {
          this.toastService.success('Empresa eliminada con éxito');
          this.loadEmpresas();
        } else {
          this.toastService.error('No se pudo eliminar la empresa');
        }
      },
      error: (err) => {
        this.toastService.error(err.message || 'Error al eliminar empresa');
      }
    });
  }
}
