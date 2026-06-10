import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-admin-trabajos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trabajos.component.html',
  styleUrl: './trabajos.component.css'
})
export class AdminTrabajosComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Data signals
  readonly trabajos = signal<any[]>([]);

  // New item fields signals
  readonly newNombre = signal<string>('');
  readonly newCodigo = signal<string>('');

  // Inline editing signals
  readonly editingId = signal<string>('');
  readonly editNombre = signal<string>('');
  readonly editCodigo = signal<string>('');

  // Loading
  readonly loadingData = signal<boolean>(false);

  ngOnInit(): void {
    this.loadTrabajos();
  }

  loadTrabajos(): void {
    this.loadingData.set(true);
    const query = `
      query {
        listarTrabajos {
          id
          nombre
          codigo
        }
      }
    `;

    this.gqlService.query<{ listarTrabajos: any[] }>(query).subscribe({
      next: (res) => {
        this.trabajos.set(res.data?.listarTrabajos || []);
        this.loadingData.set(false);
      },
      error: () => {
        this.loadingData.set(false);
        this.toastService.error('Error al cargar la lista de puestos de trabajo');
      }
    });
  }

  cancelEdit(): void {
    this.editingId.set('');
    this.editNombre.set('');
    this.editCodigo.set('');
  }

  // CREATE
  addTrabajo(event: Event): void {
    event.preventDefault();
    if (!this.newNombre()) {
      this.toastService.warning('El nombre del puesto es obligatorio');
      return;
    }

    const mutation = `
      mutation CrearTrabajo($nombre: String, $codigo: String) {
        crearTrabajo(nombre: $nombre, codigo: $codigo) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, {
      nombre: this.newNombre(),
      codigo: this.newCodigo() || null
    }).subscribe({
      next: () => {
        this.newNombre.set('');
        this.newCodigo.set('');
        this.toastService.success('Puesto de trabajo creado con éxito');
        this.loadTrabajos();
      },
      error: (err) => this.toastService.error(err.message || 'Error al crear puesto de trabajo')
    });
  }

  // EDIT (start)
  startEdit(trabajo: any): void {
    this.editingId.set(trabajo.id);
    this.editNombre.set(trabajo.nombre || '');
    this.editCodigo.set(trabajo.codigo || '');
  }

  // UPDATE
  saveEdit(id: string): void {
    if (!this.editNombre()) {
      this.toastService.warning('El nombre no puede estar vacío');
      return;
    }

    const mutation = `
      mutation ActualizarTrabajo($id: UUID!, $nombre: String, $codigo: String) {
        actualizarTrabajo(id: $id, nombre: $nombre, codigo: $codigo) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, {
      id,
      nombre: this.editNombre(),
      codigo: this.editCodigo() || null
    }).subscribe({
      next: () => {
        this.cancelEdit();
        this.toastService.success('Puesto de trabajo actualizado con éxito');
        this.loadTrabajos();
      },
      error: (err) => this.toastService.error(err.message || 'Error al actualizar puesto de trabajo')
    });
  }

  // DELETE
  deleteTrabajo(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este puesto de trabajo?')) return;

    const mutation = `
      mutation EliminarTrabajo($id: UUID!) {
        eliminarTrabajo(id: $id)
      }
    `;

    this.gqlService.mutate<{ eliminarTrabajo: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarTrabajo) {
          this.toastService.success('Puesto de trabajo eliminado con éxito');
          this.loadTrabajos();
        } else {
          this.toastService.error('No se pudo eliminar el puesto de trabajo');
        }
      },
      error: (err) => this.toastService.error(err.message || 'Error al eliminar puesto de trabajo')
    });
  }
}
