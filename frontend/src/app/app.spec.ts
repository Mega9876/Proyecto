import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { HttpErrorResponse, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Producto } from './models/producto.model';
import { CartService } from './services/cart.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { SessionUser } from './models/session-user.model';
import { Marca } from './models/marca.model';

describe('App', () => {
  let products: Producto[];
  let brands: Marca[];
  let requests: { method: string; url: string; body: unknown }[];
  let failOrder: boolean;
  let session: SessionUser | null;
  let failLogin: boolean;
  beforeEach(async () => {
    localStorage.clear();
    products = [];
    brands = [];
    requests = [];
    failOrder = false;
    failLogin = false;
    session = { email: 'admin@example.test', roles: ['Administrador'] };
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute('open', ''); } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute('open'); } });
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(withInterceptors([
        authInterceptor,
        request => {
          requests.push({ method: request.method, url: request.url, body: request.body });
          if (request.url === '/api/auth/me' && !session) return throwError(() => new HttpErrorResponse({ status: 401 }));
          if (request.url === '/api/auth/login') {
            if (failLogin) return throwError(() => new HttpErrorResponse({ status: 401, error: { mensaje: 'Correo o contraseña incorrectos.' } }));
            session = { email: (request.body as { email: string }).email, roles: ['Administrador'] };
          }
          if (request.url === '/api/auth/logout') session = null;
          if (failOrder && request.method === 'POST' && request.url === '/api/checkout') {
            return throwError(() => new HttpErrorResponse({ status: 409, error: { mensaje: 'El stock cambió. Inténtalo de nuevo.' } }));
          }
          const body = request.url === '/api/estadisticas'
            ? { totalZapatillasActivas: 0, totalClientes: 0, pedidosConfirmados: 0, pedidosCancelados: 0, ingresosConfirmados: 0, variantesConStockBajo: 0, masVendidas: [] }
            : request.url === '/api/zapatillas' ? products
            : request.url === '/api/marcas' ? brands
            : request.url === '/api/auth/csrf' ? { token: 'csrf-test' }
            : request.url === '/api/auth/me' || request.url === '/api/auth/login' ? session
            : request.method === 'POST' && request.url === '/api/checkout' ? { id: 9, total: 1500 }
            : [];
          return of(new HttpResponse({ body }));
        }
      ]))],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Sneakzone landing page', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toBe('MOVEYOURWORLD.');
    expect(compiled.querySelector('nav')?.textContent).toContain('Colección');
    expect(compiled.querySelector('.primary-link')?.getAttribute('href')).toBe('/coleccion');
    expect(compiled.querySelector('a[href^="/administracion"]')).toBeNull();
    expect(compiled.querySelector('.style-strip')).not.toBeNull();
    expect(compiled.querySelector('.home-content')).toBeNull();
    expect(compiled.querySelector('.footer')).toBeNull();
  });

  it('should navigate through administration and return to the storefront', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const compiled = fixture.nativeElement as HTMLElement;

    for (const [path, title] of [
      ['', 'Vista general.'], ['productos', 'Productos.'], ['marcas', 'Marcas.'],
      ['inventario', 'Inventario.'], ['clientes', 'Clientes.'], ['pedidos', 'Pedidos.']
    ]) {
      await router.navigateByUrl('/administracion' + (path ? '/' + path : ''));
      await fixture.whenStable();
      expect(compiled.querySelector('h1')?.textContent).toBe(title);
      expect(compiled.querySelectorAll('.sidebar nav .active').length).toBe(1);
      expect(compiled.querySelector('.footer')).toBeNull();
      if (path) {
        expect(compiled.querySelector('table tbody')?.textContent).toContain('No hay');
      }
      if (path === 'inventario') {
        expect(compiled.querySelectorAll('.stat').length).toBe(3);
      }
    }

    compiled.querySelector<HTMLAnchorElement>('.sidebar-bottom a')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/');
    expect(compiled.querySelector('.sidebar')).toBeNull();
    expect(compiled.querySelector('.footer')).toBeNull();
  });

  it('should open the collection and reset its filters', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/coleccion');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toBe('LA COLECCIÓN.');
    expect(compiled.querySelector('nav .active')?.textContent).toBe('Colección');
    expect(compiled.querySelector('.footer')).not.toBeNull();
    expect(compiled.querySelector('.empty-state')?.textContent).toContain('No hay productos disponibles');

    const input = compiled.querySelector<HTMLInputElement>('#buscar')!;
    input.value = 'Air';
    input.dispatchEvent(new Event('input'));
    compiled.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(compiled.querySelector('.empty-state')?.textContent).toContain('Prueba con otra búsqueda');

    compiled.querySelector<HTMLButtonElement>('.empty-state button')!.click();
    await fixture.whenStable();
    expect(input.value).toBe('');
    expect(compiled.querySelector('.empty-state')?.textContent).toContain('Estamos preparando');
  });

  it('muestra productos de la API y filtra por precio', async () => {
    products = [
      { id: 1, nombre: 'Air Force', modelo: 'Low', color: 'Blanco', descripcion: null, imagenUrl: null, precio: 750, activa: true, marcaId: 1, marca: 'Nike', stockTotal: 5, tallas: [{ inventarioId: 7, talla: 38, stock: 5 }] },
      { id: 2, nombre: 'Suede', modelo: 'Classic', color: 'Azul', descripcion: null, imagenUrl: null, precio: 590, activa: true, marcaId: 2, marca: 'Puma', stockTotal: 2, tallas: [{ inventarioId: 8, talla: 40, stock: 2 }] }
    ];
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/coleccion');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.product-card').length).toBe(2);
    const price = compiled.querySelector<HTMLInputElement>('#precio')!;
    price.value = '600';
    price.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.product-card').length).toBe(1);
    expect(compiled.querySelector('.product-card h2')?.textContent).toBe('Suede');
  });

  it('acumula varios productos en el contador y confirma todos en un único pedido', async () => {
    session = null;
    products = [
      { id: 1, nombre: 'Air Force', modelo: 'Low', color: 'Blanco', descripcion: null, imagenUrl: null, precio: 750, activa: true, marcaId: 1, marca: 'Nike', stockTotal: 5, tallas: [{ inventarioId: 7, talla: 38, stock: 5 }] },
      { id: 2, nombre: 'Suede', modelo: 'Classic', color: 'Azul', descripcion: null, imagenUrl: null, precio: 590, activa: true, marcaId: 2, marca: 'Puma', stockTotal: 2, tallas: [{ inventarioId: 8, talla: 40, stock: 2 }] }
    ];
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/coleccion');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    for (const [index, quantity] of [[0, '2'], [1, '1'], [0, '1']] as const) {
      compiled.querySelectorAll<HTMLButtonElement>('.product-card button')[index].click();
      await fixture.whenStable();
      const quantityInput = compiled.querySelector<HTMLInputElement>('.add-to-cart-dialog input[name="quantity"]')!;
      quantityInput.value = quantity;
      quantityInput.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      compiled.querySelector('.add-to-cart-dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    }
    expect(compiled.querySelector('.bag-count')?.textContent).toBe('4');
    expect(requests.some(r => r.method === 'POST')).toBe(false);
    compiled.querySelector<HTMLButtonElement>('.cart-toggle')!.click();
    await fixture.whenStable();
    expect(compiled.querySelector('.cart-dialog')?.hasAttribute('open')).toBe(true);
    expect(compiled.querySelectorAll('.cart-item').length).toBe(2);
    expect(compiled.querySelector('.cart-total')?.textContent).toContain('2840.00');
    compiled.querySelector<HTMLButtonElement>('.checkout-button')!.click();
    await fixture.whenStable();
    for (const [name, value] of [['nombre', 'Ana Perez'], ['email', 'ana@example.com']]) {
      const input = compiled.querySelector<HTMLInputElement>(`.cart-checkout input[name="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.cart-checkout button[type="submit"]')!.click();
    await fixture.whenStable();
    expect(requests.some(r => r.url === '/api/clientes' || r.url === '/api/pedidos')).toBe(false);
    expect(requests.filter(r => r.method === 'POST' && r.url === '/api/checkout').length).toBe(1);
    expect(requests.find(r => r.method === 'POST' && r.url === '/api/checkout')?.body).toEqual({ cliente: { nombre: 'Ana Perez', email: 'ana@example.com', telefono: '', direccion: '' }, items: [{ inventarioId: 7, cantidad: 3 }, { inventarioId: 8, cantidad: 1 }] });
    expect(compiled.querySelector('.api-message')?.textContent).toContain('Pedido #9 confirmado');
    expect(compiled.querySelector('.cart-dialog')?.hasAttribute('open')).toBe(false);
    expect(compiled.querySelector('.bag-count')?.textContent).toBe('0');
    expect(TestBed.inject(CartService).items()).toEqual([]);
  });

  it('permite modificar y eliminar artículos y conserva el carrito al navegar', async () => {
    const product: Producto = { id: 1, nombre: 'Air Force', modelo: 'Low', color: 'Blanco', descripcion: null, imagenUrl: null, precio: 750, activa: true, marcaId: 1, marca: 'Nike', stockTotal: 5, tallas: [{ inventarioId: 7, talla: 38, stock: 5 }] };
    const cart = TestBed.inject(CartService);
    cart.add(product, 7, 2);
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/coleccion');
    await fixture.whenStable();
    await router.navigateByUrl('/');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bag-count')?.textContent).toBe('2');
    compiled.querySelector<HTMLButtonElement>('.cart-toggle')!.click();
    await fixture.whenStable();
    compiled.querySelectorAll<HTMLButtonElement>('.item-controls button')[1].click();
    await fixture.whenStable();
    expect(compiled.querySelector('.bag-count')?.textContent).toBe('3');
    expect(compiled.querySelector('.cart-total')?.textContent).toContain('2250.00');
    compiled.querySelector<HTMLButtonElement>('.remove-item')!.click();
    await fixture.whenStable();
    expect(compiled.querySelector('.bag-count')?.textContent).toBe('0');
    expect(compiled.querySelector('.cart-empty')?.textContent).toContain('Tu carrito está vacío');
  });

  it('conserva todos los artículos cuando el backend rechaza la compra', async () => {
    products = [{ id: 1, nombre: 'Air Force', modelo: 'Low', color: 'Blanco', descripcion: null, imagenUrl: null, precio: 750, activa: true, marcaId: 1, marca: 'Nike', stockTotal: 5, tallas: [{ inventarioId: 7, talla: 38, stock: 5 }] }];
    const cart = TestBed.inject(CartService);
    cart.add(products[0], 7, 2);
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/coleccion');
    cart.isOpen.set(true);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.checkout-button')!.click();
    await fixture.whenStable();
    for (const [name, value] of [['nombre', 'Ana Perez'], ['email', 'ana@example.com']]) {
      const input = compiled.querySelector<HTMLInputElement>(`.cart-checkout input[name="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    failOrder = true;
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.cart-checkout button[type="submit"]')!.click();
    await fixture.whenStable();
    expect(cart.count()).toBe(2);
    expect(compiled.querySelector('.cart-error')?.textContent).toContain('El stock cambió');
    expect(compiled.querySelector('.cart-dialog')?.hasAttribute('open')).toBe(true);
  });

  it('valida y guarda una marca desde administración', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/administracion/marcas');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.page-heading button')!.click();
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!.click();
    await fixture.whenStable();
    expect(compiled.querySelector('dialog [role="alert"]')?.textContent).toContain('Nombre: es obligatorio');
    expect(requests.some(r => r.method === 'POST' && r.url === '/api/marcas')).toBe(false);
    const name = compiled.querySelector<HTMLInputElement>('dialog input[name="nombre"]')!;
    name.value = 'Converse';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(compiled.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!.disabled).toBe(false);
    compiled.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!.click();
    await fixture.whenStable();
    expect(requests.find(r => r.method === 'POST' && r.url === '/api/marcas')?.body).toEqual({ nombre: 'Converse', descripcion: null });
    expect(compiled.querySelector('.notice')?.textContent).toContain('Registro guardado correctamente');
    expect(compiled.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('guarda un producto Puma al pulsar Guardar con la URL de la captura', async () => {
    brands = [{ id: 1, nombre: 'Nike', descripcion: null }, { id: 3, nombre: 'Puma', descripcion: null }];
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/administracion/productos');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.page-heading button')!.click();
    await fixture.whenStable();
    const image = 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_2000,h_2000/global/388549/04/sv01/fnd/PHL/fmt/png/Slipstream-Sneakers';
    for (const [name, value] of [['nombre', 'Sleep stream'], ['modelo', 'Sleep stream'], ['color', 'Azul'], ['precio', '750'], ['imagenUrl', image], ['descripcion', 'Zapatillas puma']]) {
      const input = compiled.querySelector<HTMLInputElement>(`dialog input[name="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    const brand = compiled.querySelector<HTMLSelectElement>('dialog select[name="marcaId"]')!;
    brand.value = Array.from(brand.options).find(option => option.textContent === 'Puma')!.value;
    brand.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const button = compiled.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!;
    expect(button.disabled).toBe(false);
    expect(button.form).toBe(compiled.querySelector('dialog form'));
    expect(button.form?.noValidate).toBe(true);
    expect(Array.from(button.form!.elements).filter(element => element instanceof HTMLInputElement && !element.validity.valid).map(element => (element as HTMLInputElement).name)).toEqual([]);
    button.click();
    await fixture.whenStable();
    expect(requests.find(r => r.method === 'POST' && r.url === '/api/zapatillas')?.body).toEqual({
      nombre: 'Sleep stream', modelo: 'Sleep stream', color: 'Azul', precio: 750,
      imagenUrl: image, descripcion: 'Zapatillas puma', marcaId: 3
    });
    expect(compiled.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('explica campos inválidos y limpia la validación al volver a abrir Nuevo producto', async () => {
    brands = [{ id: 3, nombre: 'Puma', descripcion: null }];
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/administracion/productos');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.page-heading button')!.click();
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!.click();
    await fixture.whenStable();
    const alert = compiled.querySelector('dialog [role="alert"]');
    expect(alert?.textContent).toContain('Nombre: es obligatorio');
    expect(alert?.textContent).toContain('Precio: el mínimo es 0.01');
    expect(document.activeElement).toBe(compiled.querySelector('dialog input[name="nombre"]'));
    expect(requests.some(r => r.method === 'POST' && r.url === '/api/zapatillas')).toBe(false);
    compiled.querySelector<HTMLButtonElement>('dialog .dialog-actions button[type="button"]')!.click();
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.page-heading button')!.click();
    await fixture.whenStable();
    expect(compiled.querySelector('dialog [role="alert"]')).toBeNull();
    expect(compiled.querySelectorAll('dialog .ng-touched').length).toBe(0);
  });

  it('redirige una URL administrativa directa al acceso y vuelve a la sección tras iniciar sesión', async () => {
    session = null;
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/administracion/inventario');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(router.url).toContain('/administracion/acceso');
    expect(compiled.querySelector('.sidebar')).toBeNull();
    expect(compiled.querySelector('.login-card')).not.toBeNull();
    expect(requests.some(r => r.url === '/api/inventario')).toBe(false);
    for (const [id, value] of [['admin-email', 'admin@example.test'], ['admin-password', 'ClaveCorrecta!123']]) {
      const input = compiled.querySelector<HTMLInputElement>('#' + id)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    compiled.querySelector('.login-card form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(router.url).toBe('/administracion/inventario');
    expect(compiled.querySelector('h1')?.textContent).toBe('Inventario.');
    expect(compiled.querySelector('.session-email')?.textContent).toBe('admin@example.test');
    compiled.querySelector<HTMLButtonElement>('.logout-button')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/administracion/acceso');
    expect(compiled.querySelector('.sidebar')).toBeNull();
    await router.navigateByUrl('/administracion/productos');
    await fixture.whenStable();
    expect(router.url).toContain('/administracion/acceso');
  });

  it('muestra el error de acceso sin abrir el panel con una contraseña incorrecta', async () => {
    session = null;
    failLogin = true;
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/administracion/acceso');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    for (const [id, value] of [['admin-email', 'admin@example.test'], ['admin-password', 'Incorrecta!123']]) {
      const input = compiled.querySelector<HTMLInputElement>('#' + id)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    compiled.querySelector('.login-card form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(compiled.querySelector('.login-error')?.textContent).toContain('Correo o contraseña incorrectos');
    expect(compiled.querySelector('.sidebar')).toBeNull();
  });
});
