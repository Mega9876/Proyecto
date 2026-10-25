namespace SneakZone.Api.Models;

public class Inventario
{
    public int Id { get; set; }
    public int ZapatillaId { get; set; }
    public Zapatilla Zapatilla { get; set; } = null!;
    public int Talla { get; set; }
    public int Stock { get; set; }
    public uint Version { get; set; }
    public List<DetallePedido> DetallesPedido { get; set; } = new();
}
