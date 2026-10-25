import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    await auth.refresh();
    if (auth.isAdmin()) return true;
  } catch {}
  return router.createUrlTree(['/administracion/acceso'], { queryParams: { returnUrl: state.url } });
};

export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    await auth.refresh();
    if (auth.isAdmin()) return router.createUrlTree(['/administracion']);
  } catch {}
  return true;
};
