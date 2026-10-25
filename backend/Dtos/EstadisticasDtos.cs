namespace SneakZone.Api.Dtos;

public record MasVendidaRespuesta(int ZapatillaId, string Nombre, int UnidadesVendidas);

public record EstadisticasRespuesta(
    int TotalZapatillasActivas, int TotalClientes,
    int PedidosConfirmados, int PedidosCancelados,
    decimal IngresosConfirmados, int VariantesConStockBajo,
    List<MasVendidaRespuesta> MasVendidas);
