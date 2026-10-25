import { Injectable, computed, signal } from '@angular/core';
import { Producto } from '../models/producto.model';
import { CartItem } from '../models/cart-item.model';

const storageKey = 'sneakzone-cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly state = signal<CartItem[]>(this.restore());
  readonly items = this.state.asReadonly();
  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.cantidad, 0));
  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.precio * item.cantidad, 0));
  readonly isOpen = signal(false);
  readonly confirmation = signal('');
  readonly revision = signal(0);

  add(product: Producto, inventarioId: number, cantidad: number): string {
    const size = product.tallas.find(t => t.inventarioId === Number(inventarioId));
    if (!product.activa || !size || !Number.isInteger(cantidad) || cantidad < 1) return 'Selecciona una talla y una cantidad válida.';
    const previous = this.items().find(item => item.inventarioId === size.inventarioId);
    if (cantidad + (previous?.cantidad ?? 0) > size.stock) return `Solo hay ${size.stock} unidades en esta talla. Ya tienes ${previous?.cantidad ?? 0} en el carrito.`;
    const item: CartItem = {
      inventarioId: size.inventarioId, productoId: product.id, nombre: product.nombre,
      marca: product.marca, imagenUrl: product.imagenUrl, talla: size.talla, precio: product.precio,
      cantidad: cantidad + (previous?.cantidad ?? 0), stock: size.stock
    };
    this.save(previous ? this.items().map(i => i.inventarioId === item.inventarioId ? item : i) : [...this.items(), item]);
    this.confirmation.set('');
    return '';
  }

  quantity(inventarioId: number, cantidad: number): void {
    const item = this.items().find(i => i.inventarioId === inventarioId);
    if (!item || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > item.stock) return;
    this.save(this.items().map(i => i.inventarioId === inventarioId ? { ...i, cantidad } : i));
  }

  remove(inventarioId: number): void { this.save(this.items().filter(i => i.inventarioId !== inventarioId)); }
  clear(): void { this.save([]); }

  reconcile(products: Producto[]): void {
    this.save(this.items().map(item => {
      const product = products.find(p => p.id === item.productoId && p.activa);
      const size = product?.tallas.find(t => t.inventarioId === item.inventarioId);
      return { ...item, stock: size?.stock ?? 0, precio: product?.precio ?? item.precio };
    }));
  }

  private save(items: CartItem[]): void {
    this.state.set(items);
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {}
  }

  private restore(): CartItem[] {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
      if (!Array.isArray(stored)) return [];
      const seen = new Set<number>();
      return stored.filter((item): item is CartItem => {
        if (!item || !Number.isInteger(item.inventarioId) || item.inventarioId < 1 || seen.has(item.inventarioId) ||
          !Number.isInteger(item.productoId) || item.productoId < 1 || typeof item.nombre !== 'string' ||
          typeof item.marca !== 'string' || !(item.imagenUrl === null || typeof item.imagenUrl === 'string') ||
          !Number.isInteger(item.talla) || !Number.isInteger(item.cantidad) || item.cantidad < 1 ||
          !Number.isInteger(item.stock) || item.stock < 0 || !Number.isFinite(item.precio) || item.precio <= 0) return false;
        seen.add(item.inventarioId);
        return true;
      });
    } catch { return []; }
  }
}
