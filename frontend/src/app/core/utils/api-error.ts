import { HttpErrorResponse } from '@angular/common/http';

export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 429) return 'Demasiados intentos. Espera un minuto antes de volver a intentarlo.';
    if (error.status === 0 || error.status === 502 || error.status === 504) {
      return 'No se pudo conectar con la API. Comprueba que el backend esté iniciado en el puerto 5168.';
    }
    const body = error.error;
    if (body?.mensaje) return body.mensaje;
    if (body?.errors) return Object.values(body.errors).flat().join(' ');
    if (body?.detail) return body.detail;
    if (error.status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo.';
    if (error.status === 403) return 'No tienes permisos para realizar esta operación.';
    if (error.status === 400) return 'No se pudo validar la solicitud. Recarga la página e inténtalo de nuevo.';
    return 'No se pudo completar la operación. Revisa la conexión del backend con PostgreSQL.';
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
