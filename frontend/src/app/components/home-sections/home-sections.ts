import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Producto } from '../../models/producto.model';
import { mensajeError } from '../../core/utils/api-error';

@Component({
  selector: 'app-home-sections',
  imports: [RouterLink],
  templateUrl: './home-sections.html',
  styleUrl: './home-sections.css'
})
export class HomeSections {
  private readonly api = inject(ApiService);
  protected readonly products = signal<Producto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() {
    void this.api.productos().then(products => this.products.set(products.slice(0, 4)))
      .catch(error => this.error.set(mensajeError(error)))
      .finally(() => this.loading.set(false));
  }
}
