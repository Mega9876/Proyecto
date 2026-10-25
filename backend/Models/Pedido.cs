namespace SneakZone.Api.Models;

public enum EstadoPedido
{
    Confirmado,
    Cancelado
}

public class Pedido
{
    public int Id { get; set; }
    public DateTimeOffset Fecha { get; set; } = DateTimeOffset.UtcNow;
    public EstadoPedido Estado { get; set; } = EstadoPedido.Confirmado;
    public decimal Total { get; set; }
    public int ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    public List<DetallePedido> Detalles { get; set; } = new();
}
