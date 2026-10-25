import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../../core/utils/api-error';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly signingOut = signal(false);
  protected readonly error = signal('');

  protected async logout(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true); this.error.set('');
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/administracion/acceso', { replaceUrl: true });
    } catch (error) { this.error.set(mensajeError(error)); }
    finally { this.signingOut.set(false); }
  }

  protected readonly links = [
    { path: '/administracion', label: 'Resumen', icon: '◫', exact: true },
    { path: '/administracion/productos', label: 'Productos', icon: '◇', exact: false },
    { path: '/administracion/marcas', label: 'Marcas', icon: '◎', exact: false },
    { path: '/administracion/inventario', label: 'Inventario', icon: '▦', exact: false },
    { path: '/administracion/clientes', label: 'Clientes', icon: '♧', exact: false },
    { path: '/administracion/pedidos', label: 'Pedidos', icon: '⇄', exact: false }
  ];
}
