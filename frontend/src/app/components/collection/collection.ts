import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Marca } from '../../models/marca.model';
import { Producto } from '../../models/producto.model';
import { mensajeError } from '../../core/utils/api-error';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-collection',
  imports: [FormsModule],
  templateUrl: './collection.html',
  styleUrl: './collection.css'
})
export class Collection {
  private readonly api = inject(ApiService);
  protected readonly cart = inject(CartService);
  protected query = '';
  protected brand = '';
  protected maxPrice = 0;
  protected inStock = false;
  protected sort = 'featured';
  protected readonly searched = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly products = signal<Producto[]>([]);
  protected readonly brands = signal<Marca[]>([]);
  protected readonly filters = signal({ query: '', brand: '', maxPrice: 0, inStock: false, sort: 'featured' });
  protected readonly results = computed(() => {
    const f = this.filters();
    const term = f.query.trim().toLocaleLowerCase();
    const products = this.products().filter(p =>
      (!term || `${p.nombre} ${p.modelo} ${p.marca}`.toLocaleLowerCase().includes(term)) &&
      (!f.brand || p.marcaId === Number(f.brand)) &&
      (!f.maxPrice || p.precio <= f.maxPrice) && (!f.inStock || p.stockTotal > 0));
    if (f.sort === 'price-asc') products.sort((a, b) => a.precio - b.precio);
    if (f.sort === 'price-desc') products.sort((a, b) => b.precio - a.precio);
    if (f.sort === 'newest') products.sort((a, b) => b.id - a.id);
    return products;
  });
  protected readonly selectionDialog = viewChild<ElementRef<HTMLDialogElement>>('selectionDialog');
  protected readonly selected = signal<Producto | null>(null);
  protected readonly selectionError = signal('');
  protected inventoryId = 0;
  protected quantity = 1;

  constructor() {
    effect(() => {
      this.cart.revision();
      void this.load();
    });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [products, brands] = await Promise.all([this.api.productos(), this.api.listar<Marca>('marcas')]);
      this.products.set(products);
      this.brands.set(brands);
    } catch (error) { this.error.set(mensajeError(error)); }
    finally { this.loading.set(false); }
  }

  protected search(): void {
    this.searched.set(true);
    this.filters.set({ query: this.query, brand: this.brand, maxPrice: Number(this.maxPrice), inStock: this.inStock, sort: this.sort });
  }

  protected clearFilters(): void {
    this.query = ''; this.brand = ''; this.maxPrice = 0; this.inStock = false; this.sort = 'featured';
    this.search();
    this.searched.set(false);
  }

  protected chooseSize(product: Producto): void {
    this.selected.set(product);
    this.inventoryId = product.tallas.find(t => t.stock > 0)?.inventarioId ?? 0;
    this.quantity = 1;
    this.selectionError.set('');
    this.selectionDialog()?.nativeElement.showModal();
  }

  protected closeSelection(): void { this.selectionDialog()?.nativeElement.close(); }

  protected addToCart(): void {
    const product = this.selected();
    if (!product) return;
    const error = this.cart.add(product, this.inventoryId, this.quantity);
    this.selectionError.set(error);
    if (error) return;
    this.closeSelection();
  }
}
