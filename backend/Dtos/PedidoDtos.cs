using System.ComponentModel.DataAnnotations;
using SneakZone.Api.Models;

namespace SneakZone.Api.Dtos;

public class CrearPedidoDto
{
    [Range(1, int.MaxValue)]
    public int ClienteId { get; set; }

    [Required, MinLength(1)]
    public List<ItemPedidoDto> Items { get; set; } = new();
}

public class ItemPedidoDto
{
    [Range(1, int.MaxValue)]
    public int InventarioId { get; set; }

    [Range(1, 100000)]
    public int Cantidad { get; set; }
}

public record DetallePedidoRespuesta(
    int Id, int InventarioId, int ZapatillaId, string Zapatilla,
    int Talla, int Cantidad, decimal PrecioUnitario, decimal Subtotal);

public record PedidoRespuesta(
    int Id, int ClienteId, string Cliente, DateTimeOffset Fecha,
    EstadoPedido Estado, decimal Total, List<DetallePedidoRespuesta> Detalles);

public static class PedidoMapeo
{
    public static PedidoRespuesta Respuesta(Pedido pedido) => new(
        pedido.Id, pedido.ClienteId, pedido.Cliente.Nombre,
        pedido.Fecha, pedido.Estado, pedido.Total,
        pedido.Detalles.OrderBy(x => x.Id).Select(x => new DetallePedidoRespuesta(
            x.Id, x.InventarioId, x.Inventario.ZapatillaId,
            x.Inventario.Zapatilla.Nombre, x.Inventario.Talla,
            x.Cantidad, x.PrecioUnitario, x.Subtotal)).ToList());
}
