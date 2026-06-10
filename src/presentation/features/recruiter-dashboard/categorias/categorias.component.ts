import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-recruiter-categorias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class RecruiterCategoriasComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // List signal
  readonly categorias = signal<any[]>([]);

  // Insertion signal
  readonly newCatNombre = signal<string>('');

  // Editing state signals
  readonly editingId = signal<string>('');
  readonly editNombre = signal<string>('');

  ngOnInit(): void {
    this.loadCategorias();
  }

  cancelEdit(): void {
    this.editingId.set('');
    this.editNombre.set('');
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
      },
      error: () => {
        this.toastService.error('Error al cargar las categorías');
      }
    });
  }

  addCategoria(event: Event): void {
    event.preventDefault();
    if (!this.newCatNombre().trim()) return;

    const mutation = `
      mutation CrearCategoria($nombre: String) {
        crearCategoria(nombre: $nombre) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, { nombre: this.newCatNombre().trim() }).subscribe({
      next: () => {
        this.newCatNombre.set('');
        this.toastService.success('Categoría agregada con éxito');
        this.loadCategorias();
      },
      error: (err) => this.toastService.error(err.message || 'Error al guardar categoría')
    });
  }

  startEditCat(cat: any): void {
    this.editingId.set(cat.id);
    this.editNombre.set(cat.nombre || '');
  }

  saveEditCategoria(id: string): void {
    if (!this.editNombre().trim()) return;
    const mutation = `
      mutation ActualizarCategoria($id: UUID!, $nombre: String) {
        actualizarCategoria(id: $id, nombre: $nombre) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, { id, nombre: this.editNombre().trim() }).subscribe({
      next: () => {
        this.cancelEdit();
        this.toastService.success('Categoría actualizada con éxito');
        this.loadCategorias();
      },
      error: (err) => this.toastService.error(err.message || 'Error al actualizar categoría')
    });
  }

  deleteCategoria(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
    const mutation = `
      mutation EliminarCategoria($id: UUID!) {
        eliminarCategoria(id: $id)
      }
    `;
    this.gqlService.mutate<{ eliminarCategoria: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarCategoria) {
          this.toastService.success('Categoría eliminada con éxito');
          this.loadCategorias();
        } else {
          this.toastService.error('No se pudo eliminar la categoría');
        }
      },
      error: (err) => this.toastService.error(err.message || 'Error al eliminar categoría')
    });
  }
}
