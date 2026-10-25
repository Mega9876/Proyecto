import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SessionUser } from '../models/session-user.model';
import { API_BASE_URL } from '../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<SessionUser | null>(null);
  readonly user = this.session.asReadonly();
  readonly isAdmin = computed(() => this.user()?.roles.includes('Administrador') ?? false);

  async refresh(): Promise<SessionUser | null> {
    try {
      const user = await firstValueFrom(this.http.get<SessionUser>(`${API_BASE_URL}/auth/me`));
      this.session.set(user);
      return user;
    } catch (error) {
      this.session.set(null);
      if (error instanceof HttpErrorResponse && error.status === 401) return null;
      throw error;
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.session.set(null);
    const user = await firstValueFrom(this.http.post<SessionUser>(`${API_BASE_URL}/auth/login`, { email, password }));
    this.session.set(user);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API_BASE_URL}/auth/logout`, {}));
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && error.status === 401)) throw error;
    }
    this.session.set(null);
  }

  expired(): void { this.session.set(null); }
}
