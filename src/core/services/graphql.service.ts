import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GraphQLService {
  private readonly http = inject(HttpClient);
  
  private readonly SPRINGBOOT_URL = 'https://agenciaspring-production.up.railway.app/graphql';
  private readonly FASTAPI_URL = 'http://67.205.151.129:8000/graphql';
  private readonly NESTJS_URL = 'http://3.20.223.117:3000/graphql';

  /**
   * Execute a GraphQL Query
   * @param query GraphQL query string
   * @param variables Variables object
   * @param target Backend microservice (springboot, fastapi, or nestjs)
   */
  query<T>(
    query: string,
    variables?: Record<string, any>,
    target: 'springboot' | 'fastapi' | 'nestjs' = 'springboot'
  ): Observable<{ data?: T; errors?: any[] }> {
    const url = this.resolveUrl(target);
    const headers = this.getHeaders();
    return this.http.post<{ data?: T; errors?: any[] }>(url, { query, variables }, { headers });
  }

  /**
   * Execute a GraphQL Mutation
   * @param mutation GraphQL mutation string
   * @param variables Variables object
   * @param target Backend microservice (springboot, fastapi, or nestjs)
   */
  mutate<T>(
    mutation: string,
    variables?: Record<string, any>,
    target: 'springboot' | 'fastapi' | 'nestjs' = 'springboot'
  ): Observable<{ data?: T; errors?: any[] }> {
    const url = this.resolveUrl(target);
    const headers = this.getHeaders();
    return this.http.post<{ data?: T; errors?: any[] }>(url, { query: mutation, variables }, { headers });
  }

  private resolveUrl(target: 'springboot' | 'fastapi' | 'nestjs'): string {
    switch (target) {
      case 'fastapi': return this.FASTAPI_URL;
      case 'nestjs': return this.NESTJS_URL;
      default: return this.SPRINGBOOT_URL;
    }
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
