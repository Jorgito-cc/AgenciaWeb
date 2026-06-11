import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Statistics signals
  readonly totalUsers = signal<number>(0);
  readonly totalCompanies = signal<number>(0);
  readonly totalCandidates = signal<number>(0);
  readonly totalOffers = signal<number>(0);
  readonly totalRecruiters = signal<number>(0);
  
  // Loading states signals
  readonly loadingStats = signal<boolean>(false);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loadingStats.set(true);

    const usersQuery = `query { listarUsuarios { id } }`;
    const companiesQuery = `query { listarEmpresas { id } }`;
    const candidatesQuery = `query { listarCandidatos { id } }`;
    const offersQuery = `query { listarOfertas { id } }`;
    const recruitersQuery = `query { listarReclutadores { id } }`;

    forkJoin({
      users: this.gqlService.query<{ listarUsuarios: any[] }>(usersQuery),
      companies: this.gqlService.query<{ listarEmpresas: any[] }>(companiesQuery),
      candidates: this.gqlService.query<{ listarCandidatos: any[] }>(candidatesQuery),
      offers: this.gqlService.query<{ listarOfertas: any[] }>(offersQuery),
      recruiters: this.gqlService.query<{ listarReclutadores: any[] }>(recruitersQuery)
    }).subscribe({
      next: (res) => {
        this.totalUsers.set(res.users.data?.listarUsuarios?.length || 0);
        this.totalCompanies.set(res.companies.data?.listarEmpresas?.length || 0);
        this.totalCandidates.set(res.candidates.data?.listarCandidatos?.length || 0);
        this.totalOffers.set(res.offers.data?.listarOfertas?.length || 0);
        this.totalRecruiters.set(res.recruiters.data?.listarReclutadores?.length || 0);
        this.loadingStats.set(false);
      },
      error: () => {
        this.loadingStats.set(false);
        this.toastService.error('Error al cargar estadísticas en tiempo real');
      }
    });
  }


}
