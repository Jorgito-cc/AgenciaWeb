import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BlockchainService, Block } from '../../../../core/services/blockchain.service';

@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  imports: [CommonModule, DatePipe, SlicePipe],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.css'
})
export class AdminAuditoriaComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);
  private readonly blockchainService = inject(BlockchainService);

  // Data signals
  readonly auditoriaLogs = signal<any[]>([]);
  readonly blocks = signal<Block[]>([]);

  // UI state signals
  readonly selectedTab = signal<'local' | 'blockchain'>('local');
  readonly loadingData = signal<boolean>(false);
  readonly limite = signal<number>(50);
  readonly blockchainValid = signal<boolean>(true);
  readonly blockchainLength = signal<number>(0);
  readonly validationMsg = signal<string>('Cargando estado...');

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

  loadBlockchain(): void {
    this.loadingData.set(true);
    this.blockchainService.getChain().subscribe({
      next: (chain) => {
        this.blocks.set(chain);
        this.blockchainLength.set(chain.length);
        
        // Validate integrity
        this.blockchainService.validateChain().subscribe({
          next: (val) => {
            this.blockchainValid.set(val.valid);
            this.validationMsg.set(val.message);
            this.loadingData.set(false);
          },
          error: () => {
            this.blockchainValid.set(false);
            this.validationMsg.set('Fallo al validar la integridad de la cadena.');
            this.loadingData.set(false);
          }
        });
      },
      error: (err) => {
        this.loadingData.set(false);
        this.toastService.error('Error al conectar con el nodo Blockchain (puerto 3000). Asegúrate de que esté iniciado.');
      }
    });
  }

  changeTab(tab: 'local' | 'blockchain'): void {
    this.selectedTab.set(tab);
    if (tab === 'local') {
      this.loadAuditoria();
    } else {
      this.loadBlockchain();
    }
  }

  onLimiteChange(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.limite.set(val);
    if (this.selectedTab() === 'local') {
      this.loadAuditoria();
    }
  }

  refreshLogs(): void {
    if (this.selectedTab() === 'local') {
      this.loadAuditoria();
    } else {
      this.loadBlockchain();
    }
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
