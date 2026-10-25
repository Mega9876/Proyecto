export interface Estadisticas {
  totalZapatillasActivas: number; totalClientes: number; pedidosConfirmados: number;
  pedidosCancelados: number; ingresosConfirmados: number; variantesConStockBajo: number;
  masVendidas: { zapatillaId: number; nombre: string; unidadesVendidas: number }[];
}
