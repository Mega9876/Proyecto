import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../core/config/api.config';
import { Producto } from '../models/producto.model';
import { Estadisticas } from '../models/estadisticas.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  productos(incluirInactivas = false) {
    return this.listar<Producto>('zapatillas', { incluirInactivas });
  }
  listar<T>(recurso: string, params: Record<string, string | number | boolean> = {}) {
    return firstValueFrom(this.http.get<T[]>(`${API_BASE_URL}/${recurso}`, { params }));
  }
  estadisticas() { return firstValueFrom(this.http.get<Estadisticas>(`${API_BASE_URL}/estadisticas`)); }
  crear<T>(recurso: string, datos: object) {
    return firstValueFrom(this.http.post<T>(`${API_BASE_URL}/${recurso}`, datos));
  }
  actualizar(recurso: string, id: number, datos: object) {
    return firstValueFrom(this.http.put(`${API_BASE_URL}/${recurso}/${id}`, datos));
  }
  eliminar(recurso: string, id: number) {
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/${recurso}/${id}`));
  }
  cambiarEstado(recurso: string, id: number, accion: string) {
    return firstValueFrom(this.http.patch(`${API_BASE_URL}/${recurso}/${id}/${accion}`, {}));
  }
}
