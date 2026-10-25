import { CartService } from './cart.service';
import { Producto } from '../models/producto.model';

describe('Carrito por producto y talla', () => {
  let cart: CartService;
  const product: Producto = {
    id: 1, nombre: 'Air Force', modelo: 'Low', color: 'Blanco', descripcion: null, imagenUrl: null,
    precio: 750, activa: true, marcaId: 1, marca: 'Nike', stockTotal: 7,
    tallas: [{ inventarioId: 7, talla: 38, stock: 5 }, { inventarioId: 9, talla: 39, stock: 2 }]
  };
  beforeEach(() => { localStorage.clear(); cart = new CartService(); });

  it('agrupa la misma talla y mantiene separadas tallas distintas', () => {
    cart.add(product, 7, 2);
    cart.add(product, 7, 1);
    cart.add(product, 9, 1);
    expect(cart.items().map(i => [i.talla, i.cantidad])).toEqual([[38, 3], [39, 1]]);
    expect(cart.count()).toBe(4);
    expect(cart.total()).toBe(3000);
  });

  it('impide superar el stock acumulado o añadir cantidades fraccionarias', () => {
    cart.add(product, 9, 2);
    expect(cart.add(product, 9, 1)).toContain('Solo hay 2');
    expect(cart.add(product, 7, 1.5)).toContain('cantidad válida');
    cart.quantity(9, 3);
    expect(cart.count()).toBe(2);
  });

  it('recupera artículos después de recargar y persiste las eliminaciones', () => {
    cart.add(product, 7, 2);
    const restored = new CartService();
    expect(restored.count()).toBe(2);
    expect(restored.total()).toBe(1500);
    restored.remove(7);
    expect(new CartService().items()).toEqual([]);
  });

  it('actualiza precio y disponibilidad sin perder artículos cuando cambia el catálogo', () => {
    cart.add(product, 7, 2);
    cart.add(product, 9, 1);
    cart.reconcile([{ ...product, precio: 800, tallas: [{ inventarioId: 7, talla: 38, stock: 1 }] }]);
    expect(cart.items().map(i => [i.stock, i.cantidad])).toEqual([[1, 2], [0, 1]]);
    expect(cart.total()).toBe(2400);
  });

  it('tolera un carrito guardado corrupto', () => {
    localStorage.setItem('sneakzone-cart', '{invalido');
    expect(new CartService().items()).toEqual([]);
    localStorage.setItem('sneakzone-cart', JSON.stringify([{ inventarioId: 1, cantidad: -2 }]));
    expect(new CartService().items()).toEqual([]);
  });
});
