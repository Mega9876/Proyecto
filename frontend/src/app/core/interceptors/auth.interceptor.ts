import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, filter, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { adminReturnUrl } from '../utils/admin-return-url';
import { API_BASE_URL } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!request.url.startsWith(`${API_BASE_URL}/`)) return next(request);

  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const response = unsafe
    ? next(new HttpRequest('GET', `${API_BASE_URL}/auth/csrf`)).pipe(
      filter((event): event is HttpResponse<unknown> => event instanceof HttpResponse),
      switchMap(event => {
        const token = (event.body as { token?: string } | null)?.token;
        if (!token) return throwError(() => new HttpErrorResponse({ status: 400, error: { mensaje: 'No se pudo validar la sesión. Recarga la página.' } }));
        return next(request.clone({ setHeaders: { 'X-XSRF-TOKEN': token } }));
      }))
    : next(request);

  return response.pipe(catchError(error => {
    if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.startsWith(`${API_BASE_URL}/auth/`)) {
      auth.expired();
      if (router.url.startsWith('/administracion') && !router.url.startsWith('/administracion/acceso')) {
        void router.navigate(['/administracion/acceso'], { queryParams: { returnUrl: adminReturnUrl(router.url) }, replaceUrl: true });
      }
    }
    return throwError(() => error);
  }));
};
