import { Injectable, inject, signal, computed } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { map, switchMap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import * as bcrypt from 'bcryptjs';

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  rol: 'administrador' | 'reclutador';
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly gqlService = inject(GraphQLService);
  
  // Reactively track logged in user
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.rol === 'administrador');
  readonly isReclutador = computed(() => this.currentUser()?.rol === 'reclutador');

  constructor() {
    this.loadSession();
  }

  /**
   * Log in with traditional email/password credentials
   */
  loginWithPassword(email: string, password: string): Observable<User> {
    const query = `
      query GetUserForAuth($email: String!) {
        getUserByEmail(email: $email) {
          id
          nombre
          apellido
          email
          password
          telefono
          rolObj {
            nombre
          }
        }
      }
    `;

    return this.gqlService.query<{ getUserByEmail: any }>(
      query,
      { email },
      'springboot'
    ).pipe(
      switchMap(res => {
        const userObj = res.data?.getUserByEmail;
        if (!userObj) {
          return throwError(() => new Error('Usuario no registrado en el sistema'));
        }

        if (!userObj.password) {
          return throwError(() => new Error('El usuario no tiene una contraseña configurada'));
        }

        try {
          const isMatch = bcrypt.compareSync(password, userObj.password);
          if (!isMatch) {
            return throwError(() => new Error('Contraseña incorrecta'));
          }
        } catch (e) {
          console.error('Bcrypt validation error:', e);
          return throwError(() => new Error('Error al validar la contraseña'));
        }

        const rol = userObj.rolObj?.nombre || 'candidato';
        const normalizedRol = rol.toLowerCase();
        
        if (normalizedRol !== 'administrador' && normalizedRol !== 'reclutador') {
          return throwError(() => new Error('Acceso denegado: Rol no autorizado para la interfaz web.'));
        }

        const mockToken = btoa(JSON.stringify({ 
          sub: userObj.id, 
          email: userObj.email, 
          rol: normalizedRol, 
          exp: Math.floor(Date.now() / 1000) + 3600 
        }));

        const user: User = {
          id: userObj.id,
          nombre: userObj.nombre,
          apellido: userObj.apellido,
          email: userObj.email,
          telefono: userObj.telefono,
          rol: normalizedRol as 'administrador' | 'reclutador',
          token: mockToken
        };

        localStorage.setItem('auth_token', mockToken);
        localStorage.setItem('auth_user', JSON.stringify(user));
        this.currentUser.set(user);
        
        return new Observable<User>(subscriber => {
          subscriber.next(user);
          subscriber.complete();
        });
      })
    );
  }

  /**
   * Log in with Face biometrics (image frame in base64 format)
   */
  loginWithImage(email: string, imageBase64: string): Observable<User> {
    const mutation = `
      mutation LoginUserWithImage($email: String!, $imageBase64: String!) {
        loginUserWithImage(email: $email, imageBase64: $imageBase64) {
          success
          message
          token
          error
        }
      }
    `;

    return this.gqlService.mutate<{ loginUserWithImage: any }>(
      mutation,
      { email, imageBase64 },
      'fastapi'
    ).pipe(
      switchMap(res => {
        const data = res.data?.loginUserWithImage;
        if (!data || !data.success || !data.token) {
          return throwError(() => new Error(data?.error || data?.message || 'Error de reconocimiento facial'));
        }
        return this.fetchUserInfo(email, data.token);
      })
    );
  }

  /**
   * Clears the user session data
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
  }

  private fetchUserInfo(email: string, token: string): Observable<User> {
    const query = `
      query GetUserByEmail($email: String!) {
        getUserByEmail(email: $email) {
          id
          nombre
          apellido
          email
          telefono
          rolObj {
            nombre
          }
        }
      }
    `;

    // Save token temporarily so GraphQL service can include it in the request headers
    localStorage.setItem('auth_token', token);

    return this.gqlService.query<{ getUserByEmail: any }>(
      query,
      { email },
      'springboot'
    ).pipe(
      map(res => {
        const userObj = res.data?.getUserByEmail;
        if (!userObj) {
          this.logout();
          throw new Error('No se encontró información del usuario en la base de datos principal.');
        }

        const rol = userObj.rolObj?.nombre || 'candidato';
        const normalizedRol = rol.toLowerCase();
        
        if (normalizedRol !== 'administrador' && normalizedRol !== 'reclutador') {
          this.logout();
          throw new Error('Acceso denegado: Rol no autorizado para la interfaz web.');
        }

        const user: User = {
          id: userObj.id,
          nombre: userObj.nombre,
          apellido: userObj.apellido,
          email: userObj.email,
          telefono: userObj.telefono,
          rol: normalizedRol as 'administrador' | 'reclutador',
          token
        };

        localStorage.setItem('auth_user', JSON.stringify(user));
        this.currentUser.set(user);
        return user;
      })
    );
  }

  private loadSession(): void {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUser.set(user);
      } catch (e) {
        this.logout();
      }
    }
  }
}
