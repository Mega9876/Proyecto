using System.ComponentModel.DataAnnotations;
using SneakZone.Api.Models;

namespace SneakZone.Api.Dtos;

public class GuardarZapatillaDto
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Nombre { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 2)]
    public string Modelo { get; set; } = string.Empty;

    [Required, StringLength(50)]
    public string Color { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Descripcion { get; set; }

    [StringLength(500), Url]
    public string? ImagenUrl { get; set; }

    [Range(typeof(decimal), "0.01", "99999999", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)]
    public decimal Precio { get; set; }

    [Range(1, int.MaxValue)]
    public int MarcaId { get; set; }
}

public record TallaRespuesta(int InventarioId, int Talla, int Stock);

public record ZapatillaRespuesta(
    int Id, string Nombre, string Modelo, string Color,
    string? Descripcion, string? ImagenUrl, decimal Precio,
    bool Activa, int MarcaId, string Marca, int StockTotal,
    List<TallaRespuesta> Tallas);

public static class ZapatillaMapeo
{
    public static ZapatillaRespuesta Respuesta(Zapatilla zapatilla) => new(
        zapatilla.Id, zapatilla.Nombre, zapatilla.Modelo, zapatilla.Color,
        zapatilla.Descripcion, zapatilla.ImagenUrl, zapatilla.Precio,
        zapatilla.Activa, zapatilla.MarcaId, zapatilla.Marca.Nombre,
        zapatilla.Inventarios.Sum(i => i.Stock),
        zapatilla.Inventarios.OrderBy(i => i.Talla)
            .Select(i => new TallaRespuesta(i.Id, i.Talla, i.Stock)).ToList());
}
