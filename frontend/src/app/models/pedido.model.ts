export interface Pedido {
  id: number; clienteId: number; cliente: string; fecha: string;
  estado: 'Confirmado' | 'Cancelado'; total: number;
  detalles: { inventarioId: number; zapatilla: string; talla: number; cantidad: number; subtotal: number }[];
}
