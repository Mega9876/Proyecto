import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { Inventario } from '../models/inventario.model';
import { Pedido } from '../models/pedido.model';
import { mensajeError } from '../core/utils/api-error';

describe('Contrato con la API', () => {
  let api: ApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('solicita productos activos para la tienda e inactivos para administración', async () => {
    const store = api.productos();
    http.expectOne('/api/zapatillas?incluirInactivas=false').flush([]);
    await store;
    const admin = api.productos(true);
    http.expectOne('/api/zapatillas?incluirInactivas=true').flush([]);
    await admin;
  });

  it('envía la versión del inventario y muestra conflictos sin ocultarlos', async () => {
    const stock = api.actualizar('inventario', 7, { stock: 8, version: 123 }).catch(mensajeError);
    const request = http.expectOne('/api/inventario/7');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ stock: 8, version: 123 });
    request.flush({ mensaje: 'El stock cambió.' }, { status: 409, statusText: 'Conflict' });
    expect(await stock).toBe('El stock cambió.');
  });

  it('crea pedidos con inventarioId y cancela a través del endpoint del backend', async () => {
    const pending = api.crear<Pedido>('pedidos', { clienteId: 3, items: [{ inventarioId: 7, cantidad: 2 }] });
    const request = http.expectOne('/api/pedidos');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.items).toEqual([{ inventarioId: 7, cantidad: 2 }]);
    request.flush({ id: 9, estado: 'Confirmado', total: 1500 });
    expect((await pending).id).toBe(9);
    const cancel = api.cambiarEstado('pedidos', 9, 'cancelar');
    const cancellation = http.expectOne('/api/pedidos/9/cancelar');
    expect(cancellation.request.method).toBe('PATCH');
    cancellation.flush({ mensaje: 'Pedido cancelado.' });
    await cancel;
  });

  it('conserva la versión del registro que responde PostgreSQL', async () => {
    const pending = api.listar<Inventario>('inventario');
    http.expectOne('/api/inventario').flush([{ id: 7, version: 123, stock: 8 }]);
    expect((await pending)[0].version).toBe(123);
  });
});
