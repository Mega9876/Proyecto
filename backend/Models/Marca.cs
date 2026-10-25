namespace SneakZone.Api.Models;

public class Marca
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public List<Zapatilla> Zapatillas { get; set; } = new();
}
