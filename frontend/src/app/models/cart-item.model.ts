export interface CartItem {
  inventarioId: number; productoId: number; nombre: string; marca: string;
  imagenUrl: string | null; talla: number; precio: number; cantidad: number; stock: number;
}
