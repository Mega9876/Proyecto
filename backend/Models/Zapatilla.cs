namespace SneakZone.Api.Models;

public class Zapatilla
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? ImagenUrl { get; set; }
    public decimal Precio { get; set; }
    public bool Activa { get; set; } = true;
    public int MarcaId { get; set; }
    public Marca Marca { get; set; } = null!;
    public List<Inventario> Inventarios { get; set; } = new();
}
