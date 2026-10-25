import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { adminReturnUrl } from '../utils/admin-return-url';

describe('Protección de solicitudes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('obtiene un token de la sesión actual antes de cada operación que modifica datos', async () => {
    const client = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);
    for (const token of ['anonimo', 'administrador']) {
      const pending = firstValueFrom(client.post('/api/marcas', { nombre: 'Nike' }));
      http.expectOne('/api/auth/csrf').flush({ token });
      const request = http.expectOne('/api/marcas');
      expect(request.request.headers.get('X-XSRF-TOKEN')).toBe(token);
      request.flush({});
      await pending;
    }
  });

  it('no modifica las lecturas públicas del catálogo', async () => {
    const client = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);
    const pending = firstValueFrom(client.get('/api/zapatillas'));
    http.expectNone('/api/auth/csrf');
    http.expectOne('/api/zapatillas').flush([]);
    await pending;
  });

  it('solo admite destinos de retorno dentro del panel', () => {
    expect(adminReturnUrl('/administracion/pedidos')).toBe('/administracion/pedidos');
    expect(adminReturnUrl('https://otro.example')).toBe('/administracion');
    expect(adminReturnUrl('//otro.example')).toBe('/administracion');
    expect(adminReturnUrl('/administracion/acceso')).toBe('/administracion');
  });
});
