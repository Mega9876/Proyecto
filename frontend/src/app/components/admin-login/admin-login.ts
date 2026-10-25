import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { adminReturnUrl } from '../../core/utils/admin-return-url';
import { mensajeError } from '../../core/utils/api-error';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css'
})
export class AdminLogin {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected email = '';
  protected password = '';
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected async login(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true); this.error.set('');
    try {
      await this.auth.login(this.email.trim(), this.password);
      if (!this.auth.isAdmin()) { this.error.set('Esta cuenta no tiene permisos de administración.'); return; }
      this.password = '';
      await this.router.navigateByUrl(adminReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')), { replaceUrl: true });
    } catch (error) { this.error.set(mensajeError(error)); }
    finally { this.saving.set(false); }
  }
}
