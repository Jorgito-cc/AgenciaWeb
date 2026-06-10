import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.css'
})
export class AdminAuditoriaComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Data signals
  readonly auditoriaLogs = signal<any[]>([]);

  // UI state signals
  readonly loadingData = signal<boolean>(false);
  readonly limite = signal<number>(50);

  ngOnInit(): void {
    this.loadAuditoria();
  }

  loadAuditoria(): void {
    this.loadingData.set(true);
    const query = `
      query ListarAuditoriaGlobal($limite: Int) {
        listarAuditoriaGlobal(limite: $limite) {
          id
          accion
          usuario_id
          created_at
          detalles
          documento {
            id
            nombre_original
            mime_type
            estado
            creado_por
          }
        }
      }
    `;

    this.gqlService.query<{ listarAuditoriaGlobal: any[] }>(query, { limite: this.limite() }, 'nestjs').subscribe({
      next: (res) => {
        this.auditoriaLogs.set(res.data?.listarAuditoriaGlobal || []);
        this.loadingData.set(false);
      },
      error: (err) => {
        this.loadingData.set(false);
        this.toastService.error('Error al cargar la auditoría global. Verifica que el microservicio NestJS esté activo.');
      }
    });
  }

  onLimiteChange(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.limite.set(val);
    this.loadAuditoria();
  }

  refreshLogs(): void {
    this.loadAuditoria();
  }

  getActionBadgeClass(accion: string): string {
    const action = accion?.toUpperCase() || '';
    if (action.includes('SUBIR') || action.includes('CREAR') || action.includes('UPLOAD')) return 'badge-success';
    if (action.includes('ELIMINAR') || action.includes('DELETE') || action.includes('BORRAR')) return 'badge-danger';
    if (action.includes('DESCARGAR') || action.includes('DOWNLOAD') || action.includes('LECTURA')) return 'badge-info';
    return 'badge-warning';
  }

  formatDetails(detalles: any): string {
    if (!detalles) return '-';
    if (typeof detalles === 'string') return detalles;
    try {
      return JSON.stringify(detalles, null, 0).substring(0, 120);
    } catch {
      return '-';
    }
  }
}
