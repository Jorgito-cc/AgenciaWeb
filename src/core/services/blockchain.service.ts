import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Block {
  index: number;
  timestamp: number;
  transactions: any[];
  previousHash: string;
  hash: string;
  nonce: number;
}

export interface ValidationResponse {
  valid: boolean;
  length: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private readonly http = inject(HttpClient);
  private readonly BLOCKCHAIN_URL = 'https://blockchain-agencia-production.up.railway.app/api/blockchain';

  getChain(): Observable<Block[]> {
    return this.http.get<Block[]>(this.BLOCKCHAIN_URL);
  }

  validateChain(): Observable<ValidationResponse> {
    return this.http.get<ValidationResponse>(`${this.BLOCKCHAIN_URL}/validate`);
  }

  getPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BLOCKCHAIN_URL}/pending`);
  }
}
