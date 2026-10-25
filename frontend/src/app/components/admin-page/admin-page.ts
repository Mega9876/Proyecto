import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Cliente } from '../../models/cliente.model';
import { Estadisticas } from '../../models/estadisticas.model';
import { Inventario } from '../../models/inventario.model';
import { Marca } from '../../models/marca.model';
import { Pedido } from '../../models/pedido.model';
import { Producto } from '../../models/producto.model';
import { mensajeError } from '../../core/utils/api-error';

interface AdminSection {
  title: string;
  eyebrow: string;
  description: string;
  action: string;
  table: string;
  columns: string[];
  empty: string;
  formTitle: string;
  fields: { label: string; type: string }[];
}

const productFields = [
  { label: 'Nombre del producto', type: 'text' },
  { label: 'Marca', type: 'text' },
  { label: 'Precio (Bs)', type: 'number' },
  { label: 'Descripción', type: 'text' }
];

const sections: Record<string, AdminSection> = {
  resumen: {
    title: 'Vista general', eyebrow: 'Panel general / Sneakzone',
    description: 'Todo lo que pasa en tu tienda, en un solo lugar.',
    action: '+ Agregar producto', table: '', columns: [], empty: '',
    formTitle: 'Nuevo producto', fields: productFields
  },
  productos: {
    title: 'Productos', eyebrow: 'Catálogo / Gestión', description: 'Gestiona los modelos de tu colección.',
    action: '+ Nuevo producto', table: 'Todos los productos',
    columns: ['Producto', 'Marca', 'Precio', 'Stock', 'Estado', 'Acciones'],
    empty: 'No hay productos registrados.', formTitle: 'Nuevo producto', fields: productFields
  },
  marcas: {
    title: 'Marcas', eyebrow: 'Catálogo / Marcas', description: 'Organiza las marcas que dan identidad a tu tienda.',
    action: '+ Nueva marca', table: 'Marcas registradas', columns: ['ID', 'Marca', 'Descripción', 'Acciones'],
    empty: 'No hay marcas.', formTitle: 'Nueva marca',
    fields: [{ label: 'Nombre de la marca', type: 'text' }, { label: 'Descripción', type: 'text' }]
  },
  inventario: {
    title: 'Inventario', eyebrow: 'Almacén / Stock', description: 'Controla tus tallas y existencias en tiempo real.',
    action: '+ Registrar talla', table: 'Existencias', columns: ['Producto', 'Talla', 'Stock', 'Estado', 'Acciones'],
    empty: 'No hay registros.', formTitle: 'Registrar talla',
    fields: [{ label: 'Producto', type: 'text' }, { label: 'Talla', type: 'number' }, { label: 'Stock', type: 'number' }]
  },
  clientes: {
    title: 'Clientes', eyebrow: 'Comunidad / Clientes', description: 'Gestiona la comunidad que mueve SneakZone.',
    action: '+ Nuevo cliente', table: 'Clientes registrados', columns: ['Cliente', 'Correo', 'Teléfono', 'Dirección', 'Acciones'],
    empty: 'No hay clientes.', formTitle: 'Nuevo cliente',
    fields: [{ label: 'Nombre completo', type: 'text' }, { label: 'Correo', type: 'email' }, { label: 'Teléfono', type: 'tel' }, { label: 'Dirección', type: 'text' }]
  },
  pedidos: {
    title: 'Pedidos', eyebrow: 'Ventas / Pedidos', description: 'Revisa las ventas y gestiona las cancelaciones.',
    action: '↻ Actualizar', table: 'Historial de pedidos',
    columns: ['Pedido', 'Cliente', 'Fecha', 'Productos', 'Total', 'Estado', 'Acciones'],
    empty: 'No hay pedidos para mostrar.', formTitle: '', fields: []
  }
};

@Component({
  selector: 'app-admin-page',
  imports: [FormsModule],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.css'
})
export class AdminPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  protected readonly section = computed(() => this.data()['section'] as string);
  protected readonly page = computed(() => sections[this.section()]);
  protected readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('editor');
  private readonly editorForm = viewChild<NgForm>('editorForm');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly message = signal('');
  protected readonly products = signal<Producto[]>([]);
  protected readonly brands = signal<Marca[]>([]);
  protected readonly inventory = signal<Inventario[]>([]);
  protected readonly customers = signal<Cliente[]>([]);
  protected readonly orders = signal<Pedido[]>([]);
  protected readonly summary = signal<Estadisticas | null>(null);
  protected readonly editing = signal<number | null>(null);
  protected readonly editorSection = signal('');
  protected form = this.emptyForm();
  protected query = '';
  protected filter = '';
  protected readonly stats = ['Total de variantes', 'Unidades disponibles', 'Con stock bajo (≤ 3)'];
  protected readonly inventoryStats = computed(() => [this.inventory().length,
    this.inventory().reduce((n, i) => n + i.stock, 0), this.inventory().filter(i => i.stock <= 3).length]);
  private request = 0;

  protected readonly rows = computed(() => {
    const section = this.section();
    if (section === 'productos') return this.products().map(p => ({ id: p.id, cells: [p.nombre, p.marca, `Bs ${p.precio.toFixed(2)}`, p.stockTotal, p.activa ? 'Activo' : 'Inactivo'] }));
    if (section === 'marcas') return this.brands().map(m => ({ id: m.id, cells: [m.id, m.nombre, m.descripcion || '—'] }));
    if (section === 'inventario') return this.inventory().map(i => ({ id: i.id, cells: [i.zapatilla, i.talla, i.stock, i.stock > 3 ? 'Disponible' : 'Stock bajo'] }));
    if (section === 'clientes') return this.customers().map(c => ({ id: c.id, cells: [c.nombre, c.email, c.telefono || '—', c.direccion || '—'] }));
    return this.orders().map(p => ({ id: p.id, cells: [`#${p.id}`, p.cliente, new Date(p.fecha).toLocaleString('es'), p.detalles.map(d => `${d.zapatilla} / ${d.talla} × ${d.cantidad}`).join(', '), `Bs ${p.total.toFixed(2)}`, p.estado] }));
  });

  constructor() {
    effect(() => {
      const section = this.section();
      this.query = ''; this.filter = ''; this.message.set('');
      untracked(() => {
        const dialog = this.dialog()?.nativeElement;
        if (dialog?.open) dialog.close();
      });
      void this.load(section);
    });
  }

  protected visibleRows() {
    const term = this.query.trim().toLocaleLowerCase();
    return this.rows().filter(row => (!term || row.cells.join(' ').toLocaleLowerCase().includes(term)) &&
      (!this.filter || (this.section() === 'inventario'
        ? this.inventory().find(i => i.id === row.id)?.zapatillaId === Number(this.filter)
        : this.orders().find(p => p.id === row.id)?.estado === this.filter)));
  }

  protected async load(section = this.section()): Promise<void> {
    const request = ++this.request;
    this.loading.set(true); this.error.set('');
    try {
      const [products, brands, inventory, customers, orders, summary] = await Promise.all([
        ['productos', 'inventario', 'resumen'].includes(section) ? this.api.productos(true) : Promise.resolve([]),
        ['productos', 'marcas', 'resumen'].includes(section) ? this.api.listar<Marca>('marcas') : Promise.resolve([]),
        section === 'inventario' ? this.api.listar<Inventario>('inventario') : Promise.resolve([]),
        section === 'clientes' ? this.api.listar<Cliente>('clientes') : Promise.resolve([]),
        section === 'pedidos' ? this.api.listar<Pedido>('pedidos') : Promise.resolve([]),
        section === 'resumen' ? this.api.estadisticas() : Promise.resolve(null)
      ]);
      if (request !== this.request) return;
      this.products.set(products); this.brands.set(brands); this.inventory.set(inventory);
      this.customers.set(customers); this.orders.set(orders); this.summary.set(summary);
    } catch (error) { if (request === this.request) this.error.set(mensajeError(error)); }
    finally { if (request === this.request) this.loading.set(false); }
  }

  private emptyForm() {
    return { nombre: '', modelo: '', color: '', descripcion: '', imagenUrl: '', precio: 0,
      marcaId: 0, zapatillaId: 0, talla: 38, stock: 0, version: 0,
      email: '', telefono: '', direccion: '' };
  }

  protected action(): void {
    if (this.section() === 'pedidos') {
      void this.load();
    } else {
      this.editing.set(null);
      this.editorSection.set(this.section() === 'resumen' ? 'productos' : this.section());
      this.form = this.emptyForm();
      this.form.marcaId = this.brands()[0]?.id ?? 0;
      this.form.zapatillaId = this.products().find(p => p.activa)?.id ?? 0;
      this.formError.set('');
      this.editorForm()?.resetForm(this.form);
      this.dialog()?.nativeElement.showModal();
    }
  }

  protected closeDialog(): void {
    if (!this.saving()) this.dialog()?.nativeElement.close();
  }

  protected edit(id: number): void {
    this.editing.set(id); this.editorSection.set(this.section()); this.formError.set('');
    const source = this.section() === 'productos' ? this.products() : this.section() === 'marcas' ? this.brands()
      : this.section() === 'inventario' ? this.inventory() : this.customers();
    this.form = { ...this.emptyForm(), ...source.find(item => item.id === id) } as ReturnType<AdminPage['emptyForm']>;
    this.form.descripcion ??= ''; this.form.imagenUrl ??= ''; this.form.telefono ??= ''; this.form.direccion ??= '';
    this.editorForm()?.resetForm(this.form);
    this.dialog()?.nativeElement.showModal();
  }

  private validateForm(editorForm: NgForm): Record<string, string> {
    const labels: Record<string, string> = { nombre: 'Nombre', marcaId: 'Marca', modelo: 'Modelo', color: 'Color',
      precio: 'Precio', imagenUrl: 'URL de imagen', descripcion: 'Descripción', email: 'Correo',
      telefono: 'Teléfono', direccion: 'Dirección', zapatillaId: 'Producto', talla: 'Talla', stock: 'Stock' };
    const errors: Record<string, string> = {};
    for (const [name, control] of Object.entries(editorForm.controls)) {
      const label = labels[name] ?? name;
      const error = control.errors;
      if (error?.['required']) errors[name] = `${label}: es obligatorio.`;
      else if (error?.['minlength']) errors[name] = `${label}: escribe al menos ${error['minlength'].requiredLength} caracteres.`;
      else if (error?.['maxlength']) errors[name] = `${label}: admite hasta ${error['maxlength'].requiredLength} caracteres.`;
      else if (error?.['min']) errors[name] = `${label}: el mínimo es ${error['min'].min}.`;
      else if (error?.['max']) errors[name] = `${label}: el máximo es ${error['max'].max}.`;
      else if (error?.['email']) errors[name] = `${label}: introduce un correo válido.`;
      else if (error) errors[name] = `${label}: revisa el valor introducido.`;
      if (['nombre', 'modelo', 'color'].includes(name) && typeof control.value === 'string' && !control.value.trim())
        errors[name] = `${label}: es obligatorio.`;
      if (['marcaId', 'zapatillaId'].includes(name) && !(Number(control.value) > 0))
        errors[name] = `${label}: selecciona una opción.`;
      if (['stock', 'talla'].includes(name) && !Number.isInteger(control.value))
        errors[name] = `${label}: introduce un número entero.`;
    }
    if (this.editorSection() === 'productos' && this.form.imagenUrl.trim()) {
      try {
        const url = new URL(this.form.imagenUrl.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch { errors['imagenUrl'] = 'URL de imagen: introduce un enlace completo que empiece por http:// o https://.'; }
    }
    return errors;
  }

  protected async save(editorForm: NgForm): Promise<void> {
    if (this.saving()) return;
    editorForm.form.markAllAsTouched();
    const errors = this.validateForm(editorForm);
    if (Object.keys(errors).length) {
      this.formError.set(Object.values(errors).join(' '));
      this.dialog()?.nativeElement.querySelector<HTMLElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus();
      return;
    }
    this.saving.set(true); this.formError.set('');
    const section = this.editorSection();
    const f = this.form;
    const resource = section === 'productos' ? 'zapatillas' : section;
    const payload = section === 'productos'
      ? { nombre: f.nombre.trim(), modelo: f.modelo.trim(), color: f.color.trim(), descripcion: f.descripcion || null, imagenUrl: f.imagenUrl.trim() || null, precio: f.precio, marcaId: Number(f.marcaId) }
      : section === 'marcas' ? { nombre: f.nombre, descripcion: f.descripcion || null }
      : section === 'clientes' ? { nombre: f.nombre, email: f.email, telefono: f.telefono || null, direccion: f.direccion || null }
      : this.editing() ? { stock: f.stock, version: f.version }
      : { zapatillaId: Number(f.zapatillaId), talla: f.talla, stock: f.stock };
    try {
      const id = this.editing();
      if (id !== null) await this.api.actualizar(resource, id, payload);
      else await this.api.crear(resource, payload);
      this.dialog()?.nativeElement.close();
      this.message.set('Registro guardado correctamente.');
      await this.load();
    } catch (error) { this.formError.set(mensajeError(error)); }
    finally { this.saving.set(false); }
  }

  protected isInactive(id: number): boolean { return this.products().find(p => p.id === id)?.activa === false; }
  protected isCancelled(id: number): boolean { return this.orders().find(p => p.id === id)?.estado === 'Cancelado'; }

  protected async remove(id: number): Promise<void> {
    const section = this.section();
    if (!window.confirm(section === 'pedidos' ? '¿Cancelar este pedido y devolver su stock?' : '¿Confirmar el cambio de este registro?')) return;
    this.saving.set(true); this.error.set('');
    try {
      if (section === 'pedidos') await this.api.cambiarEstado('pedidos', id, 'cancelar');
      else if (section === 'productos' && this.isInactive(id)) await this.api.cambiarEstado('zapatillas', id, 'activar');
      else await this.api.eliminar(section === 'productos' ? 'zapatillas' : section, id);
      this.message.set('Operación realizada correctamente.');
      await this.load();
    } catch (error) { this.error.set(mensajeError(error)); }
    finally { this.saving.set(false); }
  }
}
