export interface Talla { inventarioId: number; talla: number; stock: number }

export interface Producto {
  id: number; nombre: string; modelo: string; color: string; descripcion: string | null;
  imagenUrl: string | null; precio: number; activa: boolean; marcaId: number;
  marca: string; stockTotal: number; tallas: Talla[];
}
