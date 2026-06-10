import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-admin-metadata',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './metadata.component.html',
  styleUrl: './metadata.component.css'
})
export class AdminMetadataComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  readonly activeTab = signal<'roles' | 'categorias' | 'habilidades'>('roles');

  // Lists signals
  readonly roles = signal<any[]>([]);
  readonly categorias = signal<any[]>([]);
  readonly habilidades = signal<any[]>([]);

  // Insertion signals
  readonly newRolNombre = signal<string>('');
  readonly newRolDesc = signal<string>('');
  readonly newCatNombre = signal<string>('');
  readonly newHabNombre = signal<string>('');

  // Editing state signals
  readonly editingId = signal<string>('');
  readonly editNombre = signal<string>('');
  readonly editDesc = signal<string>('');

  ngOnInit(): void {
    this.loadRoles();
    this.loadCategorias();
    this.loadHabilidades();
  }

  setTab(tab: 'roles' | 'categorias' | 'habilidades'): void {
    this.activeTab.set(tab);
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingId.set('');
    this.editNombre.set('');
    this.editDesc.set('');
  }

  // ==========================================
  // ROLES ACTIONS
  // ==========================================

  loadRoles(): void {
    const query = `
      query {
        listarRoles {
          id
          nombre
          description
        }
      }
    `;
    this.gqlService.query<{ listarRoles: any[] }>(query).subscribe(res => {
      this.roles.set(res.data?.listarRoles || []);
    });
  }

  addRol(event: Event): void {
    event.preventDefault();
    if (!this.newRolNombre()) return;

    const mutation = `
      mutation CrearRol($nombre: String, $description: String) {
        crearRol(nombre: $nombre, description: $description) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, {
      nombre: this.newRolNombre(),
      description: this.newRolDesc() || null
    }).subscribe({
      next: () => {
        this.newRolNombre.set('');
        this.newRolDesc.set('');
        this.toastService.success('Rol agregado con éxito');
        this.loadRoles();
      },
      error: (err) => this.toastService.error(err.message || 'Error al guardar rol')
    });
  }

  startEditRol(rol: any): void {
    this.editingId.set(rol.id);
    this.editNombre.set(rol.nombre || '');
    this.editDesc.set(rol.description || '');
  }

  saveEditRol(id: string): void {
    if (!this.editNombre()) return;
    const mutation = `
      mutation ActualizarRol($id: UUID!, $nombre: String, $description: String) {
        actualizarRol(id: $id, nombre: $nombre, description: $description) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, {
      id,
      nombre: this.editNombre(),
      description: this.editDesc() || null
    }).subscribe({
      next: () => {
        this.cancelEdit();
        this.toastService.success('Rol actualizado con éxito');
        this.loadRoles();
      },
      error: (err) => this.toastService.error(err.message || 'Error al actualizar rol')
    });
  }

  deleteRol(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este rol?')) return;
    const mutation = `
      mutation EliminarRol($id: UUID!) {
        eliminarRol(id: $id)
      }
    `;
    this.gqlService.mutate<{ eliminarRol: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarRol) {
          this.toastService.success('Rol eliminado con éxito');
          this.loadRoles();
        } else {
          this.toastService.error('No se pudo eliminar el rol');
        }
      },
      error: (err) => this.toastService.error(err.message || 'Error al eliminar rol')
    });
  }

  // ==========================================
  // CATEGORIES ACTIONS
  // ==========================================

  loadCategorias(): void {
    const query = `
      query {
        listarCategorias {
          id
          nombre
        }
      }
    `;
    this.gqlService.query<{ listarCategorias: any[] }>(query).subscribe(res => {
      this.categorias.set(res.data?.listarCategorias || []);
    });
  }

  addCategoria(event: Event): void {
    event.preventDefault();
    if (!this.newCatNombre()) return;

    const mutation = `
      mutation CrearCategoria($nombre: String) {
        crearCategoria(nombre: $nombre) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, { nombre: this.newCatNombre() }).subscribe({
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
    if (!this.editNombre()) return;
    const mutation = `
      mutation ActualizarCategoria($id: UUID!, $nombre: String) {
        actualizarCategoria(id: $id, nombre: $nombre) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, { id, nombre: this.editNombre() }).subscribe({
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

  // ==========================================
  // SKILLS ACTIONS
  // ==========================================

  loadHabilidades(): void {
    const query = `
      query {
        listarHabilidades {
          id
          nombre
        }
      }
    `;
    this.gqlService.query<{ listarHabilidades: any[] }>(query).subscribe(res => {
      this.habilidades.set(res.data?.listarHabilidades || []);
    });
  }

  addHabilidad(event: Event): void {
    event.preventDefault();
    if (!this.newHabNombre()) return;

    const mutation = `
      mutation CrearHabilidad($nombre: String) {
        crearHabilidad(nombre: $nombre) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, { nombre: this.newHabNombre() }).subscribe({
      next: () => {
        this.newHabNombre.set('');
        this.toastService.success('Habilidad agregada con éxito');
        this.loadHabilidades();
      },
      error: (err) => this.toastService.error(err.message || 'Error al guardar habilidad')
    });
  }

  startEditHab(hab: any): void {
    this.editingId.set(hab.id);
    this.editNombre.set(hab.nombre || '');
  }

  saveEditHabilidad(id: string): void {
    if (!this.editNombre()) return;
    const mutation = `
      mutation ActualizarHabilidad($id: UUID!, $nombre: String) {
        actualizarHabilidad(id: $id, nombre: $nombre) {
          id
        }
      }
    `;

    this.gqlService.mutate(mutation, { id, nombre: this.editNombre() }).subscribe({
      next: () => {
        this.cancelEdit();
        this.toastService.success('Habilidad actualizada con éxito');
        this.loadHabilidades();
      },
      error: (err) => this.toastService.error(err.message || 'Error al actualizar habilidad')
    });
  }

  deleteHabilidad(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta habilidad?')) return;
    const mutation = `
      mutation EliminarHabilidad($id: UUID!) {
        eliminarHabilidad(id: $id)
      }
    `;
    this.gqlService.mutate<{ eliminarHabilidad: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarHabilidad) {
          this.toastService.success('Habilidad eliminada con éxito');
          this.loadHabilidades();
        } else {
          this.toastService.error('No se pudo eliminar la habilidad');
        }
      },
      error: (err) => this.toastService.error(err.message || 'Error al eliminar habilidad')
    });
  }
}
