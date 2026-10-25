import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { mensajeError } from '../../core/utils/api-error';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  imports: [FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart {
  protected readonly Math = Math;
  protected readonly cart = inject(CartService);
  private readonly api = inject(ApiService);
  protected readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('cartDialog');
  protected readonly checkingOut = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected customer = { nombre: '', email: '', telefono: '', direccion: '' };

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.cart.isOpen()) {
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) dialog.close();
    });
  }

  protected close(): void {
    if (this.saving()) return;
    this.cart.isOpen.set(false);
    this.checkingOut.set(false);
    this.error.set('');
  }

  protected async checkout(): Promise<void> {
    if (this.saving() || !this.cart.count()) return;
    this.saving.set(true); this.error.set('');
    try {
      await this.validate();
      this.checkingOut.set(true);
    } catch (error) { this.error.set(error instanceof Error && !('status' in error) ? error.message : mensajeError(error)); }
    finally { this.saving.set(false); }
  }

  private async validate(): Promise<void> {
    const products = await this.api.productos();
    this.cart.reconcile(products);
    if (!this.cart.count()) throw new Error('El carrito está vacío.');
    if (this.cart.items().some(item => item.cantidad > item.stock)) {
      throw new Error('Algunas tallas ya no tienen suficiente stock. Ajusta las cantidades o elimina los productos no disponibles.');
    }
  }

  protected async placeOrder(): Promise<void> {
    if (this.saving() || !this.cart.count()) return;
    this.saving.set(true); this.error.set('');
    try {
      await this.validate();
      const email = this.customer.email.trim().toLowerCase();
      const order = await this.api.crear<{ id: number; total: number }>('checkout', {
        cliente: { ...this.customer, email },
        items: this.cart.items().map(item => ({ inventarioId: item.inventarioId, cantidad: item.cantidad }))
      });
      this.cart.clear();
      this.cart.confirmation.set(`Pedido #${order.id} confirmado. Total: Bs ${order.total.toFixed(2)}.`);
      this.cart.revision.update(value => value + 1);
      this.cart.isOpen.set(false);
      this.checkingOut.set(false);
    } catch (error) {
      this.error.set(error instanceof Error && !('status' in error) ? error.message : mensajeError(error));
      this.checkingOut.set(false);
    } finally { this.saving.set(false); }
  }
}
