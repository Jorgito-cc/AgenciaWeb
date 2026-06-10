import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class AdminUsuariosComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Data signals
  readonly users = signal<any[]>([]);
  readonly reclutadores = signal<any[]>([]);
  readonly candidatos = signal<any[]>([]);
  readonly roles = signal<any[]>([]);
  readonly empresas = signal<any[]>([]);
  
  // Table search and filters signals
  readonly searchTerm = signal<string>('');
  readonly selectedRoleFilter = signal<string>('');
  
  // UI indicators signals
  readonly loadingUsers = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly showProfileModal = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly submittingForm = signal<boolean>(false);

  // Form field signals (Generales)
  readonly formId = signal<string>('');
  readonly formNombre = signal<string>('');
  readonly formApellido = signal<string>('');
  readonly formEmail = signal<string>('');
  readonly formPassword = signal<string>('');
  readonly formTelefono = signal<string>('');
  readonly formRolId = signal<string>('');
  readonly formEstado = signal<string>('ACTIVO');

  // Form field signals (Reclutador)
  readonly formReclutadorId = signal<string>('');
  readonly formCargo = signal<string>('');
  readonly formTelefonoReclutador = signal<string>('');
  readonly formEmpresaId = signal<string>('');

  // Form field signals (Candidato)
  readonly formCandidatoId = signal<string>('');
  readonly formRegistro = signal<string>('');
  readonly formSueldoEsperado = signal<string>('');
  readonly formModalidadPreferida = signal<string>('Presencial');
  readonly formNivelEducativo = signal<string>('');
  readonly formNacionalidad = signal<string>('');

  readonly selectedProfile = signal<any>(null);
  readonly selectedProfileExtended = signal<any>(null);

  // Computed signal to reactively filter user list
  readonly filteredUsers = computed(() => {
    let list = this.users();
    const search = this.searchTerm().toLowerCase().trim();
    const roleFilter = this.selectedRoleFilter();

    if (search) {
      list = list.filter(u => 
        (u.nombre + ' ' + u.apellido).toLowerCase().includes(search) || 
        u.email.toLowerCase().includes(search)
      );
    }

    if (roleFilter) {
      list = list.filter(u => u.rolObj?.nombre === roleFilter);
    }

    return list;
  });

  readonly selectedRoleName = computed(() => {
    const rol = this.roles().find(r => r.id === this.formRolId());
    return rol?.nombre?.toLowerCase() || '';
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadEmpresas();
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadingUsers.set(true);
    // Load Users
    const queryUsers = `
      query {
        listarUsuarios { id nombre apellido email telefono rolObj { id nombre } estado }
        listarReclutadores { id nombre apellido email telefono telefonoReclutador cargo empresa { id nombre_legal nombre_comercial } estado }
        listarCandidatos { id nombre apellido email registro sueldo_esperado modalidad_preferida nivel_educativo nacionalidad estado }
      }
    `;

    this.gqlService.query<any>(queryUsers).subscribe({
      next: (res) => {
        this.users.set(res.data?.listarUsuarios || []);
        this.reclutadores.set(res.data?.listarReclutadores || []);
        this.candidatos.set(res.data?.listarCandidatos || []);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
        this.toastService.error('Error al cargar datos maestros');
      }
    });
  }

  loadRoles(): void {
    const query = `query { listarRoles { id nombre } }`;
    this.gqlService.query<{ listarRoles: any[] }>(query).subscribe({
      next: (res) => this.roles.set(res.data?.listarRoles || [])
    });
  }

  loadEmpresas(): void {
    const query = `query { listarEmpresas { id nombre_comercial } }`;
    this.gqlService.query<{ listarEmpresas: any[] }>(query).subscribe({
      next: (res) => this.empresas.set(res.data?.listarEmpresas || [])
    });
  }

  onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onRoleFilterChange(event: Event): void {
    this.selectedRoleFilter.set((event.target as HTMLSelectElement).value);
  }

  getExtendedProfile(email: string, roleName: string): any {
    if (roleName === 'reclutador') {
      return this.reclutadores().find(r => r.email === email) || null;
    } else if (roleName === 'candidato') {
      return this.candidatos().find(c => c.email === email) || null;
    }
    return null;
  }

  viewProfile(user: any): void {
    this.selectedProfile.set(user);
    const roleName = user.rolObj?.nombre?.toLowerCase() || '';
    this.selectedProfileExtended.set(this.getExtendedProfile(user.email, roleName));
    this.showProfileModal.set(true);
  }

  closeProfileModal(): void {
    this.showProfileModal.set(false);
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.resetForm();
    this.showModal.set(true);
  }

  openEditModal(user: any): void {
    this.isEditing.set(true);
    this.resetForm();
    
    this.formId.set(user.id);
    this.formNombre.set(user.nombre || '');
    this.formApellido.set(user.apellido || '');
    this.formEmail.set(user.email || '');
    this.formTelefono.set(user.telefono || '');
    this.formRolId.set(user.rolObj?.id || '');
    this.formEstado.set(user.estado || 'ACTIVO');

    const roleName = user.rolObj?.nombre?.toLowerCase() || '';
    const extended = this.getExtendedProfile(user.email, roleName);

    if (roleName === 'reclutador' && extended) {
      this.formReclutadorId.set(extended.id);
      this.formCargo.set(extended.cargo || '');
      this.formTelefonoReclutador.set(extended.telefonoReclutador?.toString() || '');
      this.formEmpresaId.set(extended.empresa?.id || '');
    } else if (roleName === 'candidato' && extended) {
      this.formCandidatoId.set(extended.id);
      this.formRegistro.set(extended.registro?.toString() || '');
      this.formSueldoEsperado.set(extended.sueldo_esperado?.toString() || '');
      this.formModalidadPreferida.set(extended.modalidad_preferida || 'Presencial');
      this.formNivelEducativo.set(extended.nivel_educativo || '');
      this.formNacionalidad.set(extended.nacionalidad || '');
    }

    this.showModal.set(true);
  }

  resetForm(): void {
    this.formId.set('');
    this.formNombre.set('');
    this.formApellido.set('');
    this.formEmail.set('');
    this.formPassword.set('');
    this.formTelefono.set('');
    this.formRolId.set('');
    this.formEstado.set('ACTIVO');
    
    this.formReclutadorId.set('');
    this.formCargo.set('');
    this.formTelefonoReclutador.set('');
    this.formEmpresaId.set('');

    this.formCandidatoId.set('');
    this.formRegistro.set('');
    this.formSueldoEsperado.set('');
    this.formModalidadPreferida.set('Presencial');
    this.formNivelEducativo.set('');
    this.formNacionalidad.set('');
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onModalSubmit(event: Event): void {
    event.preventDefault();
    if (!this.formNombre() || !this.formApellido() || !this.formEmail() || !this.formRolId()) {
      this.toastService.warning('Por favor completa los campos base requeridos');
      return;
    }

    this.submittingForm.set(true);

    if (this.isEditing()) {
      this.updateUserAndProfile();
    } else {
      this.createUserAndProfile();
    }
  }

  private createUserAndProfile(): void {
    const roleName = this.selectedRoleName();
    
    const mutationUser = `
      mutation CrearUsuario($nombre: String, $apellido: String, $email: String, $password: String, $telefono: String, $rolId: UUID, $estado: String) {
        crearUsuario(nombre: $nombre, apellido: $apellido, email: $email, password: $password, telefono: $telefono, rol_id: $rolId, estado: $estado) { id }
      }
    `;

    const variablesUser = {
      nombre: this.formNombre(), apellido: this.formApellido(), email: this.formEmail(),
      password: this.formPassword(), telefono: this.formTelefono(), rolId: this.formRolId(), estado: this.formEstado()
    };

    this.gqlService.mutate(mutationUser, variablesUser).subscribe({
      next: () => {
        // If specific profile, create it too
        if (roleName === 'reclutador') {
          this.createReclutadorProfile();
        } else if (roleName === 'candidato') {
          this.createCandidatoProfile();
        } else {
          this.finishSubmit('Usuario creado con éxito');
        }
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error('Error al crear cuenta base de usuario: ' + err.message);
      }
    });
  }

  private createReclutadorProfile(): void {
    const mut = `
      mutation CrearReclutador($nombre: String, $apellido: String, $email: String, $password: String, $telefono: Int, $cargo: String, $empresa_id: UUID, $estado: String) {
        crearReclutador(nombre: $nombre, apellido: $apellido, email: $email, password: $password, telefono: $telefono, cargo: $cargo, empresa_id: $empresa_id, estado: $estado) { id }
      }
    `;
    const vars = {
      nombre: this.formNombre(), apellido: this.formApellido(), email: this.formEmail(), password: this.formPassword(),
      telefono: parseInt(this.formTelefonoReclutador() || '0', 10),
      cargo: this.formCargo(), empresa_id: this.formEmpresaId() || null, estado: this.formEstado()
    };
    this.gqlService.mutate(mut, vars).subscribe({
      next: () => this.finishSubmit('Usuario y perfil de Reclutador creados con éxito'),
      error: (err) => { this.submittingForm.set(false); this.toastService.warning('Usuario creado, pero falló perfil reclutador: ' + err.message); }
    });
  }

  private createCandidatoProfile(): void {
    const mut = `
      mutation CrearCandidato($nombre: String, $apellido: String, $email: String, $password: String, $registro: Int, $sueldo: Float, $modalidad: String, $nivel: String, $nac: String, $estado: String) {
        crearCandidato(nombre: $nombre, apellido: $apellido, email: $email, password: $password, registro: $registro, sueldo_esperado: $sueldo, modalidad_preferida: $modalidad, nivel_educativo: $nivel, nacionalidad: $nac, cluster_id: 0, estado: $estado) { id }
      }
    `;
    const vars = {
      nombre: this.formNombre(), apellido: this.formApellido(), email: this.formEmail(), password: this.formPassword(),
      registro: parseInt(this.formRegistro() || '0', 10), sueldo: parseFloat(this.formSueldoEsperado() || '0'),
      modalidad: this.formModalidadPreferida(), nivel: this.formNivelEducativo(), nac: this.formNacionalidad(), estado: this.formEstado()
    };
    this.gqlService.mutate(mut, vars).subscribe({
      next: () => this.finishSubmit('Usuario y perfil de Candidato creados con éxito'),
      error: (err) => { this.submittingForm.set(false); this.toastService.warning('Usuario creado, pero falló perfil candidato: ' + err.message); }
    });
  }

  private updateUserAndProfile(): void {
    const roleName = this.selectedRoleName();
    
    const mutationUser = `
      mutation ActualizarUsuario($id: UUID!, $nombre: String, $apellido: String, $email: String, $telefono: String, $rolId: UUID, $estado: String) {
        actualizarUsuario(id: $id, nombre: $nombre, apellido: $apellido, email: $email, telefono: $telefono, rol_id: $rolId, estado: $estado) { id }
      }
    `;

    const variablesUser = {
      id: this.formId(), nombre: this.formNombre(), apellido: this.formApellido(),
      email: this.formEmail(), telefono: this.formTelefono(), rolId: this.formRolId(), estado: this.formEstado()
    };

    this.gqlService.mutate(mutationUser, variablesUser).subscribe({
      next: () => {
        if (roleName === 'reclutador') {
          this.formReclutadorId() ? this.updateReclutadorProfile() : this.createReclutadorProfile();
        } else if (roleName === 'candidato') {
          this.formCandidatoId() ? this.updateCandidatoProfile() : this.createCandidatoProfile();
        } else {
          this.finishSubmit('Usuario actualizado con éxito');
        }
      },
      error: (err) => {
        this.submittingForm.set(false);
        this.toastService.error('Error al actualizar cuenta base: ' + err.message);
      }
    });
  }

  private updateReclutadorProfile(): void {
    const mut = `
      mutation ActualizarReclutador($id: UUID!, $nombre: String, $apellido: String, $email: String, $telefono: Int, $cargo: String, $empresa_id: UUID, $estado: String) {
        actualizarReclutador(id: $id, nombre: $nombre, apellido: $apellido, email: $email, telefono: $telefono, cargo: $cargo, empresa_id: $empresa_id, estado: $estado) { id }
      }
    `;
    const vars = {
      id: this.formReclutadorId(), nombre: this.formNombre(), apellido: this.formApellido(), email: this.formEmail(),
      telefono: parseInt(this.formTelefonoReclutador() || '0', 10),
      cargo: this.formCargo(), empresa_id: this.formEmpresaId() || null, estado: this.formEstado()
    };
    this.gqlService.mutate(mut, vars).subscribe({
      next: () => this.finishSubmit('Usuario y perfil Reclutador actualizados'),
      error: (err) => { this.submittingForm.set(false); this.toastService.warning('Usuario base actualizado. Perfil falló: ' + err.message); }
    });
  }

  private updateCandidatoProfile(): void {
    const mut = `
      mutation ActualizarCandidato($id: UUID!, $nombre: String, $apellido: String, $email: String, $registro: Int, $sueldo: Float, $modalidad: String, $nivel: String, $nac: String, $estado: String) {
        actualizarCandidato(id: $id, nombre: $nombre, apellido: $apellido, email: $email, registro: $registro, sueldo_esperado: $sueldo, modalidad_preferida: $modalidad, nivel_educativo: $nivel, nacionalidad: $nac, cluster_id: 0, estado: $estado) { id }
      }
    `;
    const vars = {
      id: this.formCandidatoId(), nombre: this.formNombre(), apellido: this.formApellido(), email: this.formEmail(),
      registro: parseInt(this.formRegistro() || '0', 10), sueldo: parseFloat(this.formSueldoEsperado() || '0'),
      modalidad: this.formModalidadPreferida(), nivel: this.formNivelEducativo(), nac: this.formNacionalidad(), estado: this.formEstado()
    };
    this.gqlService.mutate(mut, vars).subscribe({
      next: () => this.finishSubmit('Usuario y perfil Candidato actualizados'),
      error: (err) => { this.submittingForm.set(false); this.toastService.warning('Usuario base actualizado. Perfil falló: ' + err.message); }
    });
  }

  private finishSubmit(msg: string): void {
    this.submittingForm.set(false);
    this.toastService.success(msg);
    this.closeModal();
    this.loadAllData();
  }

  deleteUser(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    const mutation = `mutation EliminarUsuario($id: UUID!) { eliminarUsuario(id: $id) }`;
    this.gqlService.mutate<{ eliminarUsuario: boolean }>(mutation, { id }).subscribe({
      next: (res) => {
        if (res.data?.eliminarUsuario) {
          this.toastService.success('Usuario eliminado');
          this.loadAllData();
        } else {
          this.toastService.error('No se pudo eliminar el usuario');
        }
      },
      error: (err) => this.toastService.error(err.message || 'Error al eliminar usuario')
    });
  }
}
